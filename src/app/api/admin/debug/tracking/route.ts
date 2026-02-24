import { NextRequest, NextResponse } from 'next/server';
import { 
  getDebugOverview, 
  getDebugViews, 
  getDebugConversions, 
  getDebugCampaignBudgets, 
  getDebugCampaignBudget,
  runFraudTest,
  getDebugCreatorRiskSummary,
  getDebugCreatorRisk
} from '@/server/tracking/trackingService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'overview';
  
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 });
  }

  try {
    switch (type) {
      case 'overview': {
        const result = await getDebugOverview();
        return NextResponse.json(result);
      }

      case 'views': {
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const views = await getDebugViews(limit, offset);
        return NextResponse.json({ views });
      }

      case 'conversions': {
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const conversions = await getDebugConversions(limit, offset);
        return NextResponse.json({ conversions });
      }

      case 'campaign-budget': {
        const campaignId = searchParams.get('campaignId');
        
        if (!campaignId) {
          const campaigns = await getDebugCampaignBudgets();
          return NextResponse.json({ campaigns });
        }

        const budget = await getDebugCampaignBudget(campaignId);
        if (!budget) {
          return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }
        return NextResponse.json(budget);
      }

      case 'fraud-test': {
        const userAgent = searchParams.get('userAgent') || 'Mozilla/5.0';
        const ipVelocity = parseInt(searchParams.get('ipVelocity') || '1');
        const result = await runFraudTest(userAgent, ipVelocity);
        return NextResponse.json(result);
      }

      case 'creator-risk': {
        const creatorId = searchParams.get('creatorId');
        
        if (!creatorId) {
          const result = await getDebugCreatorRiskSummary();
          return NextResponse.json(result);
        }

        const result = await getDebugCreatorRisk(creatorId);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: 'Unknown debug type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: 'Debug query failed' }, { status: 500 });
  }
}
