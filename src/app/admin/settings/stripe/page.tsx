'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';

interface StripeSettings {
  id: string;
  mode: 'TEST' | 'LIVE';
  isActive: boolean;
  publishableKeyMasked: string | null;
  secretKeyMasked: string | null;
  webhookSecretMasked: string | null;
  connectAccountIdMasked: string | null;
  updatedAt: string;
  updatedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface FormData {
  mode: 'TEST' | 'LIVE';
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  connectAccountId: string;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    accountId?: string;
    accountName?: string;
    mode: 'TEST' | 'LIVE';
  };
}

export default function SuperAdminStripeSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();

  const getLocalizedPath = (path: string) => path;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<StripeSettings | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [formData, setFormData] = useState<FormData>({
    mode: 'TEST',
    publishableKey: '',
    secretKey: '',
    webhookSecret: '',
    connectAccountId: '',
  });

  const [showSecrets, setShowSecrets] = useState({
    publishableKey: false,
    secretKey: false,
    webhookSecret: false,
    connectAccountId: false,
  });

  const userRoles = (session?.user as any)?.roles || [];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/stripe-settings');
        const data = await res.json();

        if (res.ok) {
          setSettings(data.settings);
          if (data.settings) {
            setFormData({
              mode: data.settings.mode,
              publishableKey: '',
              secretKey: '',
              webhookSecret: '',
              connectAccountId: '',
            });
          }
        } else if (res.status === 403) {
          toast({
            title: 'Access Denied',
            description: 'You need SUPERADMIN role to access this page',
            variant: 'destructive',
          });
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
        toast({
          title: 'Error',
          description: 'Failed to load Stripe settings',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status, router, toast]);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);

    try {
      const body: Record<string, string | undefined> = {
        mode: formData.mode,
      };

      // Only include fields that have values
      if (formData.publishableKey) body.publishableKey = formData.publishableKey;
      if (formData.secretKey) body.secretKey = formData.secretKey;
      if (formData.webhookSecret) body.webhookSecret = formData.webhookSecret;
      if (formData.connectAccountId) body.connectAccountId = formData.connectAccountId;

      const res = await fetch('/api/admin/stripe-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Settings Saved',
          description: 'Stripe settings have been updated successfully',
        });
        setSettings(data.settings);
        // Clear form fields after save
        setFormData({
          mode: formData.mode,
          publishableKey: '',
          secretKey: '',
          webhookSecret: '',
          connectAccountId: '',
        });
      } else {
        toast({
          title: 'Save Failed',
          description: data.error || 'Failed to save settings',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/stripe-settings/test-connection', {
        method: 'POST',
      });

      const data = await res.json();
      setTestResult(data);

      if (data.success) {
        toast({
          title: 'Connection Successful',
          description: data.message,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      });
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="max-w-2xl">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!userRoles.includes('SUPERADMIN')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You need SUPERADMIN role to access this page
          </p>
          <Link href={getLocalizedPath('/dashboard')}>
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={getLocalizedPath('/dashboard/admin')} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Admin Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stripe Settings</h1>
            <p className="text-gray-600">Configure payment provider credentials for the platform</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Security Notice */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Security Notice</h3>
                <p className="text-sm text-amber-700 mt-1">
                  All credentials are encrypted before storage. Never share API keys with anyone.
                  Test mode credentials are recommended for development.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Settings */}
        {settings && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Mode:</span>
                  <Badge variant={settings.mode === 'LIVE' ? 'default' : 'secondary'} className="ml-2">
                    {settings.mode}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-2">{formatDate(settings.updatedAt)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Updated By:</span>
                  <span className="ml-2">
                    {settings.updatedBy?.name || settings.updatedBy?.email || 'Unknown'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Form */}
        <Card>
          <CardHeader>
            <CardTitle>API Credentials</CardTitle>
            <CardDescription>
              Enter new values to update. Leave empty to keep existing credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mode */}
            <div className="space-y-2">
              <Label htmlFor="mode">Environment Mode</Label>
              <Select
                value={formData.mode}
                onValueChange={(value: 'TEST' | 'LIVE') =>
                  setFormData((prev) => ({ ...prev, mode: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEST">Test Mode</SelectItem>
                  <SelectItem value="LIVE">Live Mode</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Test mode uses Stripe's test environment. Live mode processes real payments.
              </p>
            </div>

            {/* Publishable Key */}
            <div className="space-y-2">
              <Label htmlFor="publishableKey">Publishable Key</Label>
              {settings?.publishableKeyMasked && (
                <p className="text-xs text-gray-500 mb-1">
                  Current: <code className="bg-gray-100 px-1 rounded">{settings.publishableKeyMasked}</code>
                </p>
              )}
              <div className="relative">
                <Input
                  id="publishableKey"
                  type={showSecrets.publishableKey ? 'text' : 'password'}
                  placeholder="pk_test_... or pk_live_..."
                  value={formData.publishableKey}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, publishableKey: e.target.value }))
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() =>
                    setShowSecrets((prev) => ({ ...prev, publishableKey: !prev.publishableKey }))
                  }
                >
                  {showSecrets.publishableKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Secret Key */}
            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              {settings?.secretKeyMasked && (
                <p className="text-xs text-gray-500 mb-1">
                  Current: <code className="bg-gray-100 px-1 rounded">{settings.secretKeyMasked}</code>
                </p>
              )}
              <div className="relative">
                <Input
                  id="secretKey"
                  type={showSecrets.secretKey ? 'text' : 'password'}
                  placeholder="sk_test_... or sk_live_..."
                  value={formData.secretKey}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, secretKey: e.target.value }))
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() =>
                    setShowSecrets((prev) => ({ ...prev, secretKey: !prev.secretKey }))
                  }
                >
                  {showSecrets.secretKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Webhook Secret */}
            <div className="space-y-2">
              <Label htmlFor="webhookSecret">Webhook Secret</Label>
              {settings?.webhookSecretMasked && (
                <p className="text-xs text-gray-500 mb-1">
                  Current: <code className="bg-gray-100 px-1 rounded">{settings.webhookSecretMasked}</code>
                </p>
              )}
              <div className="relative">
                <Input
                  id="webhookSecret"
                  type={showSecrets.webhookSecret ? 'text' : 'password'}
                  placeholder="whsec_..."
                  value={formData.webhookSecret}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, webhookSecret: e.target.value }))
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() =>
                    setShowSecrets((prev) => ({ ...prev, webhookSecret: !prev.webhookSecret }))
                  }
                >
                  {showSecrets.webhookSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Connect Account ID */}
            <div className="space-y-2">
              <Label htmlFor="connectAccountId">Stripe Connect Account ID (Optional)</Label>
              {settings?.connectAccountIdMasked && (
                <p className="text-xs text-gray-500 mb-1">
                  Current: <code className="bg-gray-100 px-1 rounded">{settings.connectAccountIdMasked}</code>
                </p>
              )}
              <div className="relative">
                <Input
                  id="connectAccountId"
                  type={showSecrets.connectAccountId ? 'text' : 'password'}
                  placeholder="acct_..."
                  value={formData.connectAccountId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, connectAccountId: e.target.value }))
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() =>
                    setShowSecrets((prev) => ({ ...prev, connectAccountId: !prev.connectAccountId }))
                  }
                >
                  {showSecrets.connectAccountId ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Required for Stripe Connect integrations to pay out creators.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Test Result */}
        {testResult && (
          <Card className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <h3 className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </h3>
                  <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </p>
                  {testResult.details && (
                    <div className="text-sm mt-2 space-y-1">
                      <p><span className="font-medium">Mode:</span> {testResult.details.mode}</p>
                      {testResult.details.accountId && (
                        <p><span className="font-medium">Account:</span> {testResult.details.accountId}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || !settings}
          >
            {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Test Connection
          </Button>
        </div>
      </div>
    </div>
  );
}
