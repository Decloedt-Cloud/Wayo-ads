import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/server-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function formatCurrency(cents: number, currency: string = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(date: Date | null) {
  if (!date) return '-';
  return date.toLocaleDateString();
}

function invoiceTypeLabel(type: string, roleType: string) {
  if (type === 'DEPOSIT') return 'Wallet Deposit';
  if (type === 'BILLING') return 'Campaign Budget';
  if (type === 'PAYOUT' && roleType === 'CREATOR') return 'Creator Payout';
  if (type === 'EARNINGS') return 'Ad Earnings';
  return type;
}

function invoiceStatusVariant(status: string) {
  if (status === 'PAID') return 'default';
  if (status === 'PENDING') return 'outline';
  if (status === 'CANCELLED') return 'destructive';
  return 'outline';
}

export default async function CreatorInvoicesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const roles = (user as any).roles || [];
  if (!roles.includes('CREATOR')) {
    redirect('/dashboard');
  }

  const invoices = await (db as any).invoice.findMany({
    where: {
      userId: user.id,
      roleType: 'CREATOR',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/creator/wallet">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500">
              View and download invoices for your earnings and payouts.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No invoices yet. Start earning from ad views to generate invoices.
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invoice.invoiceNumber}</span>
                      <Badge variant={invoiceStatusVariant(invoice.status)} className="text-xs">
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {invoiceTypeLabel(invoice.invoiceType, invoice.roleType)} ·{' '}
                      {formatDate(invoice.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold flex items-center gap-1">
                        {invoice.invoiceType === 'PAYOUT' || invoice.invoiceType === 'EARNINGS' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : null}
                        {formatCurrency(invoice.totalAmountCents - (invoice.taxAmountCents || 0))}
                      </div>
                      {invoice.taxAmountCents > 0 && (
                        <div className="text-xs text-gray-500">
                          + {formatCurrency(invoice.taxAmountCents)} tax
                        </div>
                      )}
                      {invoice.invoiceType === 'EARNINGS' && (
                        <div className="text-xs text-green-600">
                          Gross earnings (before platform fee)
                        </div>
                      )}
                      {invoice.invoiceType === 'PAYOUT' && (
                        <div className="text-xs text-blue-600">
                          Net payout after platform fee
                        </div>
                      )}
                    </div>
                    <a
                      href={`/api/invoices/${invoice.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="sm" variant="outline" className="gap-1">
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                    </a>
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
