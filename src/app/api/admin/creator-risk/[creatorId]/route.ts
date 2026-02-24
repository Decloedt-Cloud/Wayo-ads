import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/server-auth';
import { setCreatorRisk, forceCreatorRisk, capCreatorAllocation, unfreezeCreator } from '@/server/admin/creatorRiskService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    await requireSuperAdmin();
    
    const body = await request.json();
    const { action, value } = body;

    switch (action) {
      case 'set_risk': {
        const result = await setCreatorRisk(creatorId, value || 'MEDIUM');
        return NextResponse.json(result);
      }
      
      case 'force_risk': {
        const result = await forceCreatorRisk(creatorId, value || 'HIGH');
        return NextResponse.json(result);
      }
      
      case 'cap_allocation': {
        const maxAllocation = parseInt(value) || 5000;
        const result = await capCreatorAllocation(creatorId, maxAllocation);
        return NextResponse.json(result);
      }
      
      case 'unfreeze': {
        const result = await unfreezeCreator(creatorId);
        return NextResponse.json(result);
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing creator risk:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message.startsWith('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to manage creator risk' }, { status: 500 });
  }
}
