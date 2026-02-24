import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireRole('ADVERTISER');
    } catch (roleError: any) {
      return NextResponse.json(
        { error: roleError.message || 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    const whereClause: any = {
      advertiserId: user.id,
      pacingEnabled: true,
    };

    if (campaignId) {
      whereClause.id = campaignId;
    } else {
      whereClause.status = 'ACTIVE';
    }

    let campaigns;
    try {
      campaigns = await (db.campaign as any).findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          totalBudgetCents: true,
          spentBudgetCents: true,
          dailyBudgetCents: true,
          pacingMode: true,
          pacingEnabled: true,
          campaignStartDate: true,
          campaignEndDate: true,
          deliveryProgressPercent: true,
          isOverDelivering: true,
          isUnderDelivering: true,
          targetSpendPerHourCents: true,
          status: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      return NextResponse.json(
        { error: 'Database query failed: ' + dbError.message },
        { status: 500 }
      );
    }

    const now = new Date();
    const pacingStatuses = campaigns.map((campaign: any) => {
      const startDate = campaign.campaignStartDate || now;
      const hoursElapsed = Math.max(1, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60));
      const campaignDurationHours = campaign.campaignEndDate
        ? (campaign.campaignEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
        : hoursElapsed * 2;

      const hoursRemaining = Math.max(0, campaignDurationHours - hoursElapsed);
      const targetSpendPerHour = campaign.targetSpendPerHourCents || 
        Math.floor(campaign.totalBudgetCents / campaignDurationHours);
      const actualSpendPerHour = Math.floor(campaign.spentBudgetCents / hoursElapsed);
      
      const deliveryProgress = campaign.totalBudgetCents > 0
        ? (campaign.spentBudgetCents / campaign.totalBudgetCents) * 100
        : 0;

      const targetProgressPercent = (hoursElapsed / campaignDurationHours) * 100;
      const variance = deliveryProgress - targetProgressPercent;

      const isOverDelivering = variance > 20;
      const isUnderDelivering = variance < -50;

      let predictedExhaustionDate: string | null = null;
      if (actualSpendPerHour > 0 && campaign.spentBudgetCents < campaign.totalBudgetCents) {
        const hoursUntilExhaustion = (campaign.totalBudgetCents - campaign.spentBudgetCents) / actualSpendPerHour;
        predictedExhaustionDate = new Date(now.getTime() + hoursUntilExhaustion * 60 * 60 * 1000).toISOString();
      }

      let recommendedAction: 'BOOST' | 'MAINTAIN' | 'REDUCE' | 'NONE' = 'NONE';
      if (isUnderDelivering) {
        recommendedAction = 'BOOST';
      } else if (isOverDelivering) {
        recommendedAction = 'REDUCE';
      } else if (Math.abs(variance) < 10) {
        recommendedAction = 'MAINTAIN';
      }

      return {
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        pacingEnabled: campaign.pacingEnabled,
        pacingMode: campaign.pacingMode,
        status: campaign.status,
        totalBudgetCents: campaign.totalBudgetCents,
        spentBudgetCents: campaign.spentBudgetCents,
        dailyBudgetCents: campaign.dailyBudgetCents,
        campaignDurationHours,
        targetSpendPerHourCents: targetSpendPerHour,
        actualSpendPerHourCents: actualSpendPerHour,
        deliveryProgressPercent: deliveryProgress,
        isOverDelivering,
        isUnderDelivering,
        hoursElapsed,
        hoursRemaining,
        predictedExhaustionDate,
        recommendedAction,
      };
    });

    return NextResponse.json({
      campaigns: pacingStatuses,
    });
  } catch (error: any) {
    console.error('Error fetching pacing data:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pacing data' },
      { status: 500 }
    );
  }
}
