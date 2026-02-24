import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authError = await requireSuperAdmin();
    if (authError) {
      return authError;
    }

    const campaigns = await (db.campaign as any).findMany({
      where: {
        pacingEnabled: true,
        status: 'ACTIVE',
      },
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
        advertiser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const now = new Date();
    const pacingStatuses = campaigns.map((campaign) => {
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
        advertiserName: campaign.advertiser?.name || campaign.advertiser?.email || 'Unknown',
        pacingEnabled: campaign.pacingEnabled,
        pacingMode: campaign.pacingMode,
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
      summary: {
        totalCampaigns: pacingStatuses.length,
        overDelivering: pacingStatuses.filter(c => c.isOverDelivering).length,
        underDelivering: pacingStatuses.filter(c => c.isUnderDelivering).length,
        onTrack: pacingStatuses.length - pacingStatuses.filter(c => c.isOverDelivering).length - pacingStatuses.filter(c => c.isUnderDelivering).length,
        totalBudget: pacingStatuses.reduce((sum, c) => sum + c.totalBudgetCents, 0),
        totalSpent: pacingStatuses.reduce((sum, c) => sum + c.spentBudgetCents, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching pacing data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pacing data' },
      { status: 500 }
    );
  }
}
