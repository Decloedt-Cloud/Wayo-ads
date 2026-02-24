'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Search,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/currency';

interface Creator {
  id: string;
  name: string | null;
  email: string;
}

interface Withdrawal {
  id: string;
  amountCents: number;
  platformFeeCents: number | null;
  grossAmountCents: number;
  currency: string;
  status: string;
  psReference: string | null;
  failureReason: string | null;
  createdAt: string;
  processedAt: string | null;
  creator: Creator | null;
}

export default function AdminWithdrawalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [summary, setSummary] = useState<Record<string, { count: number; amountCents: number }>>({});
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const getLocalizedPath = (path: string) => path;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchWithdrawals();
    }
  }, [status, session, statusFilter]);

  async function fetchWithdrawals() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }
      
      const res = await fetch(`/api/admin/withdrawals?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setWithdrawals(data.withdrawals);
        setSummary(data.summary);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessWithdrawal(withdrawalId: string, action: 'approve' | 'cancel') {
    setProcessingId(withdrawalId);
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId, action }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: action === 'approve' ? 'Withdrawal approved' : 'Withdrawal cancelled',
          description: action === 'approve' 
            ? 'The payout has been processed and an invoice has been generated.'
            : 'The withdrawal has been cancelled and funds returned to creator.',
        } as any);
        fetchWithdrawals();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to process withdrawal',
          variant: 'destructive',
        } as any);
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: 'Error',
        description: 'Failed to process withdrawal',
        variant: 'destructive',
      } as any);
    } finally {
      setProcessingId(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'PROCESSING':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'PAID':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>;
      case 'FAILED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (status === 'loading' || loading && withdrawals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#F47A1F]" />
      </div>
    );
  }

  const pendingCount = summary['PENDING']?.count || 0;
  const processingCount = summary['PROCESSING']?.count || 0;
  const paidCount = summary['PAID']?.count || 0;

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href={getLocalizedPath('/dashboard/admin')}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Creator Withdrawals</h1>
          <p className="text-gray-600">Review and process creator payout requests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary['PENDING']?.amountCents || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingCount}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary['PROCESSING']?.amountCents || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidCount}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary['PAID']?.amountCents || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <DollarSign className="h-4 w-4 text-[#F47A1F]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Withdrawal Requests</CardTitle>
            <CardDescription>Manage creator payout requests</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#F47A1F]" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No withdrawal requests found
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#F47A1F]/10">
                      <CreditCard className="h-5 w-5 text-[#F47A1F]" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {withdrawal.creator?.name || withdrawal.creator?.email || 'Unknown Creator'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {withdrawal.creator?.email}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatDate(withdrawal.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(withdrawal.amountCents, withdrawal.currency)}
                    </div>
                    {withdrawal.platformFeeCents && withdrawal.platformFeeCents > 0 && (
                      <div className="text-xs text-gray-500">
                        <span className="line-through">
                          {formatCurrency(withdrawal.grossAmountCents, withdrawal.currency)}
                        </span>
                        {' '} - {formatCurrency(withdrawal.platformFeeCents, withdrawal.currency)} fee
                      </div>
                    )}
                    {withdrawal.psReference && (
                      <div className="text-xs text-gray-400">
                        Ref: {withdrawal.psReference}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(withdrawal.status)}
                    
                    {withdrawal.status === 'PENDING' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleProcessWithdrawal(withdrawal.id, 'approve')}
                          disabled={processingId === withdrawal.id}
                        >
                          {processingId === withdrawal.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessWithdrawal(withdrawal.id, 'cancel')}
                          disabled={processingId === withdrawal.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
