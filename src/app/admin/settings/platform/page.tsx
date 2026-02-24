'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Percent,
  Currency,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { useLanguage } from '@/app/translations';
import { CURRENCY_OPTIONS, getCurrencySymbol, formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

interface PlatformSettings {
  id: string;
  platformFeeRate: number;
  platformFeeDescription: string | null;
  defaultCurrency: string;
  minimumWithdrawalCents: number;
  pendingHoldDays: number;
  updatedAt: string;
  updatedByUserId: string | null;
}

export default function PlatformSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  const getLocalizedPath = (path: string) => path;

  // Form state
  const [platformFeePercentage, setPlatformFeePercentage] = useState('3');
  const [platformFeeDescription, setPlatformFeeDescription] = useState('3% (ex VAT)');
  const [defaultCurrency, setDefaultCurrency] = useState('EUR');
  const [minimumWithdrawal, setMinimumWithdrawal] = useState('10');
  const [pendingHoldDays, setPendingHoldDays] = useState('7');

  // Load settings
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    async function loadSettings() {
      if (status !== 'authenticated') return;

      try {
        const res = await fetch('/api/admin/platform-settings');
        
        if (res.status === 403) {
          toast.error('Access denied. Superadmin privileges required.');
          router.push('/dashboard/admin');
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to load settings');
        }

        const data = await res.json();
        setSettings(data.settings);
        
        // Set form values
        setPlatformFeePercentage((data.settings.platformFeeRate * 100).toString());
        setPlatformFeeDescription(data.settings.platformFeeDescription || '');
        setDefaultCurrency(data.settings.defaultCurrency);
        setMinimumWithdrawal((data.settings.minimumWithdrawalCents / 100).toString());
        setPendingHoldDays(data.settings.pendingHoldDays.toString());
      } catch (error) {
        console.error('Failed to load platform settings:', error);
        toast.error('Failed to load platform settings');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [status, router]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const feePercentage = parseFloat(platformFeePercentage);
      if (isNaN(feePercentage) || feePercentage < 0 || feePercentage > 100) {
        toast.error('Platform fee must be between 0% and 100%');
        setSaving(false);
        return;
      }

      const minWithdrawal = parseFloat(minimumWithdrawal);
      if (isNaN(minWithdrawal) || minWithdrawal < 1) {
        toast.error('Minimum withdrawal must be at least €1');
        setSaving(false);
        return;
      }

      const holdDays = parseInt(pendingHoldDays);
      if (isNaN(holdDays) || holdDays < 0 || holdDays > 365) {
        toast.error('Hold period must be between 0 and 365 days');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/admin/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformFeePercentage: feePercentage,
          platformFeeDescription: platformFeeDescription || `${feePercentage}% (ex VAT)`,
          defaultCurrency,
          minimumWithdrawalCents: Math.round(minWithdrawal * 100),
          pendingHoldDays: holdDays,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSettings(data.settings);
      toast.success('Platform settings updated successfully');
    } catch (error) {
      console.error('Failed to save platform settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Calculate preview
  const feePercentage = parseFloat(platformFeePercentage) || 0;
  const exampleGross = 100; // €1.00
  const exampleFee = exampleGross * (feePercentage / 100);
  const exampleNet = exampleGross - exampleFee;

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#F47A1F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={getLocalizedPath('/dashboard/admin')}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Platform Settings</h1>
                <p className="text-sm text-gray-500">Configure platform-wide settings</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Info Alert */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Platform Configuration</AlertTitle>
          <AlertDescription>
            These settings affect all campaigns and transactions on the platform.
            Changes take effect immediately for new transactions.
          </AlertDescription>
        </Alert>

        {/* Platform Fee Settings */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Percent className="h-5 w-5 text-[#F47A1F]" />
              </div>
              <div>
                <CardTitle>Platform Fee</CardTitle>
                <CardDescription>
                  The fee percentage deducted from creator payouts
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="feeRate">Fee Rate (%)</Label>
                <div className="relative">
                  <Input
                    id="feeRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={platformFeePercentage}
                    onChange={(e) => setPlatformFeePercentage(e.target.value)}
                    placeholder="3"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500">
                  Enter the fee as a percentage (e.g., 3 for 3%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feeDescription">Display Description</Label>
                <Input
                  id="feeDescription"
                  value={platformFeeDescription}
                  onChange={(e) => setPlatformFeeDescription(e.target.value)}
                  placeholder="3% (ex VAT)"
                />
                <p className="text-xs text-gray-500">
                  How the fee is displayed to users
                </p>
              </div>
            </div>

            {/* Fee Preview */}
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="font-medium mb-3 text-sm">Fee Preview</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500">Gross Payout</p>
                  <p className="font-semibold">{formatCurrency(exampleGross * 100, defaultCurrency)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Platform Fee</p>
                  <p className="font-semibold text-[#F47A1F]">{formatCurrency(exampleFee * 100, defaultCurrency)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Creator Receives</p>
                  <p className="font-semibold text-green-600">{formatCurrency(exampleNet * 100, defaultCurrency)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency & Withdrawal Settings */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Currency className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Currency & Withdrawals</CardTitle>
                <CardDescription>
                  Configure default currency and withdrawal limits
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <select
                  id="currency"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#F47A1F]"
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Platform default currency for new wallets and campaigns
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minWithdrawal">Minimum Withdrawal ({getCurrencySymbol(defaultCurrency)})</Label>
                <Input
                  id="minWithdrawal"
                  type="number"
                  min="1"
                  step="1"
                  value={minimumWithdrawal}
                  onChange={(e) => setMinimumWithdrawal(e.target.value)}
                  placeholder="10"
                />
                <p className="text-xs text-gray-500">
                  Minimum amount creators can withdraw
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout Timing Settings */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Payout Timing</CardTitle>
                <CardDescription>
                  Configure when creator earnings become available
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="holdDays">Pending Hold Period (Days)</Label>
              <Input
                id="holdDays"
                type="number"
                min="0"
                max="365"
                value={pendingHoldDays}
                onChange={(e) => setPendingHoldDays(e.target.value)}
                placeholder="7"
              />
              <p className="text-xs text-gray-500">
                Number of days before earnings become available for withdrawal.
                Set to 0 for immediate availability.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {settings && (
              <span>
                Last updated: {new Date(settings.updatedAt).toLocaleString()}
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#F47A1F] hover:bg-[#e56f1a]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
