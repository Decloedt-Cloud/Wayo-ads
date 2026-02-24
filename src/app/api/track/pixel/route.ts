import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashIP, hashUserAgent, calculateFraudScore, isViewSuspicious, config } from '@/lib/tracking';
import { recordValidViewPayout } from '@/server/finance/financeService';
import { createPayoutQueueEntry, getLatestAnomalyScore } from '@/server/payouts/payoutService';

interface PixelRequest {
  visitId: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const visitId = searchParams.get('visitId');

  if (!visitId) {
    return new NextResponse(null, {
      status: 400,
      headers: {
        'Content-Type': 'image/gif',
      },
    });
  }

  try {
    const visitEvent = await db.visitEvent.findUnique({
      where: { id: visitId },
      include: {
        campaign: {
          select: {
            id: true,
            status: true,
            payoutMode: true,
            fraudScoreThreshold: true,
            cpmCents: true,
            budgetLock: {
              select: {
                lockedCents: true,
              },
            },
          },
        },
      },
    });

    if (!visitEvent) {
      return pixelResponse(400);
    }

    if (!visitEvent.isRecorded) {
      return pixelResponse(400);
    }

    if (visitEvent.isValidated) {
      return pixelResponse(200);
    }

    if (visitEvent.campaign.status !== 'ACTIVE') {
      await db.visitEvent.update({
        where: { id: visitId },
        data: {
          isValidated: true,
          validationMethod: 'PIXEL',
          validatedAt: new Date(),
        },
      });
      return pixelResponse(200);
    }

    const fraudThreshold = visitEvent.campaign.fraudScoreThreshold || 50;
    const passesFraudCheck = visitEvent.fraudScore < fraudThreshold;
    const isSuspicious = isViewSuspicious(visitEvent.fraudScore);

    if (!passesFraudCheck || isSuspicious) {
      await db.visitEvent.update({
        where: { id: visitId },
        data: {
          isValidated: true,
          validationMethod: 'PIXEL',
          validatedAt: new Date(),
          isSuspicious: true,
        },
      });
      return pixelResponse(200);
    }

    await db.visitEvent.update({
      where: { id: visitId },
      data: {
        isValidated: true,
        validationMethod: 'PIXEL',
        validatedAt: new Date(),
      },
    });

    if (visitEvent.campaign.payoutMode === 'CPA_ONLY') {
      return pixelResponse(200);
    }

    const payoutResult = await recordValidViewPayout({
      campaignId: visitEvent.campaignId,
      creatorId: visitEvent.creatorId,
      visitEventId: visitId,
    });

    if (payoutResult.success) {
      const anomalyScore = await getLatestAnomalyScore(visitEvent.creatorId);
      
      await createPayoutQueueEntry({
        creatorId: visitEvent.creatorId,
        campaignId: visitEvent.campaignId,
        amountCents: payoutResult.netPayoutCents,
        type: 'VIEW_PAYOUT',
        riskScore: anomalyScore,
      });

      await db.visitEvent.update({
        where: { id: visitId },
        data: {
          isBillable: true,
        },
      });

      console.log('[PIXEL_VALIDATION] View validated and queued for payout', {
        visitId,
        campaignId: visitEvent.campaignId,
        payoutCents: payoutResult.netPayoutCents,
        anomalyScore,
      });
    } else if (payoutResult.error === 'INSUFFICIENT_BUDGET') {
      console.warn('[PIXEL_VALIDATION] View validated but budget exhausted', {
        visitId,
        campaignId: visitEvent.campaignId,
      });
    }

    return pixelResponse(200);
  } catch (error) {
    console.error('[PIXEL_VALIDATION] Error processing pixel', {
      visitId,
      error: error instanceof Error ? error.message : String(error),
    });
    return pixelResponse(500);
  }
}

function pixelResponse(status: number): NextResponse {
  const gif = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  return new NextResponse(gif, {
    status,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
