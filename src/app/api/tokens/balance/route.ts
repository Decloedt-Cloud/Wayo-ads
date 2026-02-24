import { NextRequest, NextResponse } from 'next/server';
import { getTokenBalance, getTokenTransactions, getOrCreateTokenWallet } from '@/server/tokens';
import { requireRole } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('CREATOR');

    const balance = await getTokenBalance(user.id);

    if (!balance) {
      await getOrCreateTokenWallet(user.id);
      const newBalance = await getTokenBalance(user.id);
      return NextResponse.json({ balance: newBalance });
    }

    return NextResponse.json({ balance });
  } catch (error) {
    console.error('[TokenBalance] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get token balance' },
      { status: 500 }
    );
  }
}
