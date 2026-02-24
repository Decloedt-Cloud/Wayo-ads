import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/server-auth';
import { getWalletTransactions } from '@/server/wallets';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('ADVERTISER');

    const transactions = await getWalletTransactions(user.id);

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
