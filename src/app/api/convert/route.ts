import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { calculateConversionPayout, getAttributionWindowStart } from '@/lib/tracking';

const convertSchema = z.object({
  campaignId: z.string(),
  type: z.enum(['SIGNUP', 'PURCHASE', 'SUBSCRIPTION', 'OTHER']),
  revenueCents: z.number().int().min(0).optional().default(0),
  visitorId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

interface AttributionResult {
  campaignId: string;
  creatorId: string | null;
  attributionModel: string;
  isValid: boolean;
  reason?: string;
}

async function resolveAttribution(
  visitorId: string,
  requestedCampaignId: string,
  cookies: Record<string, string>,
  creatorIdFromRequest?: string
): Promise<AttributionResult> {
  const lastTouchCampaignId = cookies['last_touch_campaign_id'];
  const lastTouchCreatorId = cookies['last_touch_creator_id'];
  const lastTouchTs = cookies['last_touch_ts'];

  const attributionWindowStart = getAttributionWindowStart();

  if (lastTouchCampaignId && lastTouchTs) {
    const touchTime = parseInt(lastTouchTs, 10);
    const windowMs = env.ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    
    if (Date.now() - touchTime < windowMs) {
      const visitExists = await db.visitEvent.findFirst({
        where: {
          visitorId,
          campaignId: lastTouchCampaignId,
          isValidated: true,
          occurredAt: { gte: attributionWindowStart },
        },
      });

      if (visitExists) {
        return {
          campaignId: lastTouchCampaignId,
          creatorId: lastTouchCreatorId || null,
          attributionModel: 'LAST_CLICK',
          isValid: true,
        };
      }
    }
  }

  const firstVisit = await db.visitEvent.findFirst({
    where: {
      visitorId,
      campaignId: requestedCampaignId,
      isValidated: true,
      occurredAt: { gte: attributionWindowStart },
    },
    orderBy: { occurredAt: 'asc' },
  });

  if (firstVisit) {
    return {
      campaignId: requestedCampaignId,
      creatorId: firstVisit.creatorId,
      attributionModel: 'FIRST_CLICK',
      isValid: true,
    };
  }

  return {
    campaignId: requestedCampaignId,
    creatorId: null,
    attributionModel: 'DIRECT',
    isValid: false,
    reason: 'no_valid_visit_in_attribution_window',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = convertSchema.parse(body);

    let visitorId = validated.visitorId;
    
    if (!visitorId) {
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const [key, ...v] = c.trim().split('=');
          return [key, v.join('=')];
        })
      );
      visitorId = cookies['visitor_id'];
    }

    if (!visitorId) {
      return NextResponse.json({ 
        error: 'No visitor ID provided or found in cookies' 
      }, { status: 400 });
    }

    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [key, ...v] = c.trim().split('=');
        return [key, v.join('=')];
      })
    );

    const attribution = await resolveAttribution(
      visitorId,
      validated.campaignId,
      cookies
    );

    if (!attribution.isValid) {
      await db.conversionEvent.create({
        data: {
          campaignId: validated.campaignId,
          visitorId,
          type: validated.type,
          revenueCents: validated.revenueCents,
          attributedTo: attribution.reason || 'INVALID',
        },
      });

      return NextResponse.json({
        success: false,
        reason: attribution.reason || 'invalid_attribution',
        message: 'Conversion recorded but not attributed - no valid visit in attribution window',
      });
    }

    const campaign = await db.campaign.findUnique({
      where: { id: attribution.campaignId },
      select: { 
        id: true, 
        status: true, 
        attributionModel: true,
        totalBudgetCents: true,
        spentBudgetCents: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Campaign is not active' 
      }, { status: 400 });
    }

    const existingConversion = await db.conversionEvent.findFirst({
      where: {
        visitorId,
        campaignId: attribution.campaignId,
      },
      orderBy: { occurredAt: 'desc' },
    });

    if (existingConversion && validated.type !== 'PURCHASE') {
      return NextResponse.json({
        success: false,
        reason: 'duplicate_conversion',
        message: 'This visitor has already converted for this campaign',
      });
    }

    const conversionEvent = await db.conversionEvent.create({
      data: {
        campaignId: attribution.campaignId,
        creatorId: attribution.creatorId,
        visitorId,
        type: validated.type,
        revenueCents: validated.revenueCents,
        attributedTo: attribution.attributionModel,
      },
    });

    if (validated.revenueCents > 0 && attribution.creatorId) {
      const payoutAmount = calculateConversionPayout(validated.revenueCents);
      
      if (payoutAmount > 0) {
        await db.$transaction(async (tx) => {
          const campaign = await tx.campaign.findUnique({
            where: { id: attribution.campaignId },
            select: { totalBudgetCents: true, spentBudgetCents: true },
          });

          if (!campaign) return;

          const spent = await tx.ledgerEntry.aggregate({
            where: { 
              campaignId: attribution.campaignId,
              type: { in: ['VIEW_PAYOUT', 'CONVERSION_PAYOUT', 'PLATFORM_FEE'] },
              amountCents: { gt: 0 },
            },
            _sum: { amountCents: true },
          });

          const spentCents = (spent._sum.amountCents || 0);
          const remainingCents = campaign.totalBudgetCents - spentCents;

          if (remainingCents >= payoutAmount) {
            const PLATFORM_FEE_RATE = 0.20;
            const platformFee = Math.floor(payoutAmount * PLATFORM_FEE_RATE);
            const netPayout = payoutAmount - platformFee;

            await tx.ledgerEntry.create({
              data: {
                campaignId: attribution.campaignId,
                creatorId: attribution.creatorId!,
                type: 'CONVERSION_PAYOUT',
                amountCents: netPayout,
                refEventId: conversionEvent.id,
                description: `Conversion payout: ${validated.type}`,
              },
            });

            await tx.ledgerEntry.create({
              data: {
                campaignId: attribution.campaignId,
                creatorId: attribution.creatorId!,
                type: 'PLATFORM_FEE',
                amountCents: platformFee,
                refEventId: conversionEvent.id,
                description: `Platform fee for conversion`,
              },
            });

            const creatorBalance = await tx.creatorBalance.findUnique({
              where: { creatorId: attribution.creatorId! },
            });

            if (creatorBalance) {
              await tx.creatorBalance.update({
                where: { creatorId: attribution.creatorId! },
                data: {
                  availableCents: { increment: netPayout },
                  totalEarnedCents: { increment: netPayout },
                },
              });
            }
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      conversion: {
        id: conversionEvent.id,
        type: conversionEvent.type,
        revenueCents: conversionEvent.revenueCents,
        attributedTo: attribution.attributionModel,
        creatorId: attribution.creatorId,
      },
    });
  } catch (error) {
    console.error('Error tracking conversion:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to track conversion' }, { status: 500 });
  }
}
