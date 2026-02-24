'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Send, Users, User, Shield, AlertTriangle, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const notificationTypes = [
  { value: 'SYSTEM_ANNOUNCEMENT', label: 'System Announcement' },
  { value: 'FRAUD_DETECTED', label: 'Fraud Alert' },
  { value: 'SUSPICIOUS_ACTIVITY', label: 'Security Alert' },
  { value: 'CREDENTIALS_INVALID', label: 'Credentials Issue' },
  { value: 'WEBHOOK_FAILURE', label: 'Webhook Failure' },
  { value: 'PAYMENT_FAILED', label: 'Payment Issue' },
];

const priorityOptions = [
  { value: 'P0_CRITICAL', label: 'Critical (P0)', description: 'Red banner, immediate attention', icon: AlertCircle },
  { value: 'P1_HIGH', label: 'High (P1)', description: 'Orange banner, important', icon: AlertTriangle },
  { value: 'P2_NORMAL', label: 'Normal (P2)', description: 'Standard notification', icon: Info },
  { value: 'P3_LOW', label: 'Low (P3)', description: 'Low priority', icon: Bell },
];

export default function NotificationBroadcastPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    scope: 'GLOBAL',
    toRole: '',
    toUserId: '',
    type: 'SYSTEM_ANNOUNCEMENT',
    priority: 'P2_NORMAL',
    title: '',
    message: '',
    actionUrl: '',
    expiresIn: '7',
    dedupeKey: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const expiresAt = formData.expiresIn 
        ? new Date(Date.now() + parseInt(formData.expiresIn) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const res = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: formData.scope,
          toRole: formData.scope === 'ROLE' ? formData.toRole : undefined,
          toUserId: formData.scope === 'USER' ? formData.toUserId : undefined,
          type: formData.type,
          priority: formData.priority,
          title: formData.title,
          message: formData.message,
          actionUrl: formData.actionUrl || undefined,
          expiresAt,
          dedupeKey: formData.dedupeKey || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send notification');
      }

      setSuccess(`Notification sent successfully!${formData.scope === 'GLOBAL' ? ' (All users)' : formData.scope === 'ROLE' ? ` (All ${formData.toRole}s)` : ' (1 user)'}`);
      setFormData({
        scope: 'GLOBAL',
        toRole: '',
        toUserId: '',
        type: 'SYSTEM_ANNOUNCEMENT',
        priority: 'P2_NORMAL',
        title: '',
        message: '',
        actionUrl: '',
        expiresIn: '7',
        dedupeKey: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcast Notification</h1>
          <p className="text-gray-500 mt-1">Send notifications to users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Create Notification</CardTitle>
              <CardDescription>
                Send a notification to users based on scope
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {success && (
                  <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                    {success}
                  </div>
                )}
                
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="scope-global"
                      name="scope"
                      value="GLOBAL"
                      checked={formData.scope === 'GLOBAL'}
                      onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="scope-global" className="flex items-center gap-2 cursor-pointer">
                      <Shield className="h-4 w-4" />
                      All Users
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="scope-role"
                      name="scope"
                      value="ROLE"
                      checked={formData.scope === 'ROLE'}
                      onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="scope-role" className="flex items-center gap-2 cursor-pointer">
                      <Users className="h-4 w-4" />
                      By Role
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="scope-user"
                      name="scope"
                      value="USER"
                      checked={formData.scope === 'USER'}
                      onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="scope-user" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Single User
                    </Label>
                  </div>
                </div>

                {formData.scope === 'ROLE' && (
                  <div>
                    <Label htmlFor="toRole">Target Role</Label>
                    <Select
                      value={formData.toRole}
                      onValueChange={(value) => setFormData({ ...formData, toRole: value })}
                    >
                      <SelectTrigger id="toRole">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADVERTISER">Advertisers</SelectItem>
                        <SelectItem value="CREATOR">Creators</SelectItem>
                        <SelectItem value="ADMIN">Admins</SelectItem>
                        <SelectItem value="SUPERADMIN">Super Admins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.scope === 'USER' && (
                  <div>
                    <Label htmlFor="toUserId">User ID</Label>
                    <Input
                      id="toUserId"
                      placeholder="Enter user ID"
                      value={formData.toUserId}
                      onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="type">Notification Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {priorityOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.priority === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setFormData({ ...formData, priority: option.value })}
                      >
                        <div className="flex items-center gap-2">
                          <option.icon className={`h-4 w-4 ${
                            option.value === 'P0_CRITICAL' ? 'text-red-500' :
                            option.value === 'P1_HIGH' ? 'text-orange-500' :
                            'text-blue-500'
                          }`} />
                          <span className="font-medium text-sm">{option.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Notification title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Notification message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="actionUrl">Action URL (optional)</Label>
                  <Input
                    id="actionUrl"
                    placeholder="/campaigns/123"
                    value={formData.actionUrl}
                    onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiresIn">Expires after (days)</Label>
                    <Input
                      id="expiresIn"
                      type="number"
                      min="1"
                      value={formData.expiresIn}
                      onChange={(e) => setFormData({ ...formData, expiresIn: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dedupeKey">Deduplication Key</Label>
                    <Input
                      id="dedupeKey"
                      placeholder="Unique key to prevent duplicates"
                      value={formData.dedupeKey}
                      onChange={(e) => setFormData({ ...formData, dedupeKey: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  <Send className="h-4 w-4 mr-2" />
                  {isLoading ? 'Sending...' : 'Send Notification'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg border ${
                formData.priority === 'P0_CRITICAL' ? 'bg-red-50 border-red-200' :
                formData.priority === 'P1_HIGH' ? 'bg-orange-50 border-orange-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {formData.priority === 'P0_CRITICAL' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {formData.priority === 'P1_HIGH' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                  {formData.priority !== 'P0_CRITICAL' && formData.priority !== 'P1_HIGH' && <Info className="h-4 w-4 text-blue-500" />}
                  <span className="text-xs font-medium text-gray-500">
                    {formData.priority === 'P0_CRITICAL' && 'Critical'}
                    {formData.priority === 'P1_HIGH' && 'High Priority'}
                    {formData.priority === 'P2_NORMAL' && 'Normal'}
                    {formData.priority === 'P3_LOW' && 'Low'}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900">
                  {formData.title || 'Notification Title'}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {formData.message || 'Notification message will appear here...'}
                </p>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-400">
                    {formData.scope === 'GLOBAL' && 'Sent to all users'}
                    {formData.scope === 'ROLE' && `Sent to all ${formData.toRole || 'role'} users`}
                    {formData.scope === 'USER' && 'Sent to 1 user'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>• Use <strong>P0 Critical</strong> for urgent issues requiring immediate attention</p>
              <p>• Use <strong>P1 High</strong> for important notifications that need attention</p>
              <p>• Set a deduplication key to prevent sending duplicate notifications</p>
              <p>• Add an action URL to direct users to the relevant page</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
