'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Send,
  Shield,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/app/translations';

interface EmailSettings {
  id: string;
  host: string | null;
  port: number;
  secure: boolean;
  usernameMasked: string | null;
  fromEmail: string | null;
  fromName: string | null;
  replyToEmail: string | null;
  isEnabled: boolean;
  updatedAt: string;
  updatedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface FormData {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  isEnabled: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
}

const COMMON_SMTP_PORTS = [
  { value: '25', label: '25 (SMTP)' },
  { value: '465', label: '465 (SMTPS)' },
  { value: '587', label: '587 (Submission)' },
  { value: '2525', label: '2525 (Alternate)' },
];

export default function SuperAdminEmailSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();

  const getLocalizedPath = (path: string) => path;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testEmail, setTestEmail] = useState('');

  const [formData, setFormData] = useState<FormData>({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'Wayo Ads',
    replyToEmail: '',
    isEnabled: false,
  });

  const [showPassword, setShowPassword] = useState(false);

  const userRoles = (session?.user as any)?.roles || [];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/email-settings');
        const data = await res.json();

        if (res.ok) {
          setSettings(data.settings);
          if (data.settings) {
            setFormData({
              host: data.settings.host || '',
              port: data.settings.port || 587,
              secure: data.settings.secure || false,
              username: '',
              password: '',
              fromEmail: data.settings.fromEmail || '',
              fromName: data.settings.fromName || 'Wayo Ads',
              replyToEmail: data.settings.replyToEmail || '',
              isEnabled: data.settings.isEnabled || false,
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
          description: 'Failed to load email settings',
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

    if (!formData.host.trim()) {
      toast({ title: 'Validation Error', description: 'SMTP Host is required', variant: 'destructive' });
      setSaving(false);
      return;
    }
    if (!formData.fromEmail.trim()) {
      toast({ title: 'Validation Error', description: 'From Email is required', variant: 'destructive' });
      setSaving(false);
      return;
    }
    if (formData.fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.fromEmail)) {
      toast({ title: 'Validation Error', description: 'From Email must be a valid email address', variant: 'destructive' });
      setSaving(false);
      return;
    }
    if (formData.replyToEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.replyToEmail)) {
      toast({ title: 'Validation Error', description: 'Reply-To Email must be a valid email address', variant: 'destructive' });
      setSaving(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        host: formData.host,
        port: Number(formData.port),
        secure: formData.secure,
        fromEmail: formData.fromEmail,
        fromName: formData.fromName || undefined,
        replyToEmail: formData.replyToEmail || undefined,
        isEnabled: formData.isEnabled,
      };

      // Only include credentials if provided
      if (formData.username) body.username = formData.username;
      if (formData.password) body.password = formData.password;

      const res = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Settings Saved',
          description: 'Email settings have been updated successfully',
        });
        setSettings(data.settings);
        // Clear password field after save
        setFormData((prev) => ({ ...prev, password: '' }));
      } else {
        let errorMessage = data.error || 'Failed to save settings';
        if (data.details && Array.isArray(data.details)) {
          const fieldErrors = data.details.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
          errorMessage = fieldErrors || errorMessage;
        }
        toast({
          title: 'Save Failed',
          description: errorMessage,
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

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'Missing Email',
        description: 'Please enter an email address to send the test to',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/email-settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      const data = await res.json();
      setTestResult(data);

      if (data.success) {
        toast({
          title: 'Test Email Sent',
          description: data.message,
        });
      } else {
        toast({
          title: 'Test Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Failed to send test email',
      });
      toast({
        title: 'Error',
        description: 'Failed to send test email',
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
          <Mail className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
            <p className="text-gray-600">Configure SMTP for transactional emails</p>
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
                  SMTP passwords are encrypted before storage. Use app-specific passwords for services like Gmail.
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
                  <span className="text-gray-500">Status:</span>
                  <Badge variant={settings.isEnabled ? 'default' : 'secondary'} className="ml-2">
                    {settings.isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Host:</span>
                  <span className="ml-2">{settings.host || 'Not set'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Port:</span>
                  <span className="ml-2">{settings.port}</span>
                </div>
                <div>
                  <span className="text-gray-500">Security:</span>
                  <span className="ml-2">{settings.secure ? 'TLS' : 'StartTLS'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-2">{formatDate(settings.updatedAt)}</span>
                </div>
                {settings.updatedBy && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Updated By:</span>
                    <span className="ml-2">
                      {settings.updatedBy.name || settings.updatedBy.email}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Form */}
        <Card>
          <CardHeader>
            <CardTitle>SMTP Configuration</CardTitle>
            <CardDescription>
              Configure your SMTP server settings for sending transactional emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isEnabled">Enable Email Sending</Label>
                <p className="text-sm text-gray-500">
                  Toggle to enable or disable all email sending
                </p>
              </div>
              <Switch
                id="isEnabled"
                checked={formData.isEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isEnabled: checked }))
                }
              />
            </div>

            {/* Host */}
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host</Label>
              <Input
                id="host"
                placeholder="smtp.gmail.com"
                value={formData.host}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, host: e.target.value }))
                }
              />
              <p className="text-xs text-gray-500">
                The hostname of your SMTP server (e.g., smtp.gmail.com, smtp.sendgrid.net)
              </p>
            </div>

            {/* Port & Security */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Select
                  value={formData.port.toString()}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      port: parseInt(value),
                      secure: parseInt(value) === 465,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_SMTP_PORTS.map((port) => (
                      <SelectItem key={port.value} value={port.value}>
                        {port.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secure">Security</Label>
                <Select
                  value={formData.secure ? 'tls' : 'starttls'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      secure: value === 'tls',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starttls">StartTLS</SelectItem>
                    <SelectItem value="tls">TLS/SSL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              {settings?.usernameMasked && (
                <p className="text-xs text-gray-500 mb-1">
                  Current: <code className="bg-gray-100 px-1 rounded">{settings.usernameMasked}</code>
                </p>
              )}
              <Input
                id="username"
                placeholder="user@example.com"
                value={formData.username}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, username: e.target.value }))
                }
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                {formData.host.includes('outlook') || formData.host.includes('office365') || formData.host.includes('microsoft') 
                  ? 'App Password' 
                  : 'Password'}
              </Label>
              {(formData.host.includes('outlook') || formData.host.includes('office365') || formData.host.includes('microsoft')) && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-2">
                  <p className="text-xs text-blue-800">
                    <strong>Microsoft 365 detected:</strong> Regular passwords won't work. 
                    <a 
                      href="https://support.microsoft.com/en-us/account-billing/sign-in-to-your-account-manage-app-passwords-2ea8debb-8576-4d42-8bc7-2ed7538060c4" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline ml-1"
                    >
                      Generate an App Password
                    </a>
                  </p>
                </div>
              )}
              {settings?.usernameMasked && (
                <p className="text-xs text-gray-500 mb-1">
                  Leave empty to keep existing password
                </p>
              )}
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                For Gmail, use an App Password from your Google Account settings
              </p>
            </div>

            {/* From Email */}
            <div className="space-y-2">
              <Label htmlFor="fromEmail">From Email</Label>
              <Input
                id="fromEmail"
                type="email"
                placeholder="noreply@yourdomain.com"
                value={formData.fromEmail}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, fromEmail: e.target.value }))
                }
              />
              <p className="text-xs text-gray-500">
                The email address that appears as the sender
              </p>
            </div>

            {/* From Name */}
            <div className="space-y-2">
              <Label htmlFor="fromName">From Name</Label>
              <Input
                id="fromName"
                placeholder="Wayo Ads"
                value={formData.fromName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, fromName: e.target.value }))
                }
              />
              <p className="text-xs text-gray-500">
                The name that appears alongside the sender email
              </p>
            </div>

            {/* Reply-To */}
            <div className="space-y-2">
              <Label htmlFor="replyToEmail">Reply-To Email (Optional)</Label>
              <Input
                id="replyToEmail"
                type="email"
                placeholder="support@yourdomain.com"
                value={formData.replyToEmail}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, replyToEmail: e.target.value }))
                }
              />
              <p className="text-xs text-gray-500">
                Where replies should be sent (if different from From Email)
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
                    {testResult.success ? 'Email Sent Successfully' : 'Failed to Send Email'}
                  </h3>
                  <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Email Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>
              Send a test email to verify your SMTP settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleTestEmail}
                disabled={testing || !settings}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Settings
          </Button>
        </div>

        {/* Common SMTP Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Common SMTP Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium">Gmail</p>
                <p className="text-gray-500">Host: smtp.gmail.com | Port: 587 | Use App Password</p>
              </div>
              <div>
                <p className="font-medium">SendGrid</p>
                <p className="text-gray-500">Host: smtp.sendgrid.net | Port: 587 | Username: apikey</p>
              </div>
              <div>
                <p className="font-medium">Amazon SES</p>
                <p className="text-gray-500">Host: email-smtp.[region].amazonaws.com | Port: 587</p>
              </div>
              <div>
                <p className="font-medium">Mailgun</p>
                <p className="text-gray-500">Host: smtp.mailgun.org | Port: 587</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
