import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server-auth';
import { getOrCreateWallet, getWalletTransactions } from '@/server/wallets';
import { canSimulate } from '@/server/payments/psp';

// GET /api/wallet - Get wallet info and transactions
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create wallet
    const wallet = await getOrCreateWallet(user.id);

    // Get recent transactions
    const transactions = await getWalletTransactions(user.id, 20, 0);

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        availableCents: wallet.availableCents,
        pendingCents: wallet.pendingCents,
        currency: wallet.currency,
      },
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amountCents: tx.amountCents,
        currency: tx.currency,
        description: tx.description,
        createdAt: tx.createdAt,
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
      })),
      canSimulate: canSimulate(),
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }
}
