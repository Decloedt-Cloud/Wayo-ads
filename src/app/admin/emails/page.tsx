'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Mail,
  Send,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

interface EmailTemplate {
  name: string;
  subject: string;
  previewText: string;
  category: string;
  description: string;
}

interface EmailLog {
  id: string;
  toEmail: string;
  subject: string;
  templateName: string | null;
  status: string;
  sentAt: string;
  errorMessage: string | null;
}

const categoryColors: Record<string, string> = {
  account: 'bg-blue-100 text-blue-800',
  role: 'bg-purple-100 text-purple-800',
  security: 'bg-red-100 text-red-800',
  marketplace: 'bg-green-100 text-green-800',
};

const statusIcons: Record<string, React.ReactNode> = {
  SENT: <CheckCircle className="h-4 w-4 text-green-500" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
  PENDING: <Clock className="h-4 w-4 text-yellow-500" />,
  SENDING: <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />,
};

export default function AdminEmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewText, setPreviewText] = useState<string>('');
  const [testEmail, setTestEmail] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
    fetchEmailLogs();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/emails/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchEmailLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/emails/logs');
      if (res.ok) {
        const data = await res.json();
        setEmailLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async (templateName: string) => {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/admin/emails/preview/${templateName}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.html);
        setPreviewText(data.text);
      }
    } catch (error) {
      console.error('Failed to fetch preview:', error);
      toast.error('Failed to load preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleTemplateSelect = (templateName: string) => {
    const template = templates.find(t => t.name === templateName);
    if (template) {
      setSelectedTemplate(template);
      fetchPreview(templateName);
    }
  };

  const handleSendTestEmail = async () => {
    if (!selectedTemplate || !testEmail) {
      toast.error('Please select a template and enter an email address');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/emails/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          templateName: selectedTemplate.name,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Test email sent to ${testEmail}`);
        fetchEmailLogs();
      } else {
        toast.error(data.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setSending(false);
    }
  };

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <Link href="/dashboard/admin" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Mail className="h-8 w-8 text-orange-500" />
          Email Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Preview email templates and send test emails
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">
            Email Logs
            {emailLogs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {emailLogs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Templates</CardTitle>
                <CardDescription>
                  {templates.length} email templates available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                    <div key={category} className="mb-4">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-2">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {categoryTemplates.map((template) => (
                          <button
                            key={template.name}
                            onClick={() => handleTemplateSelect(template.name)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              selectedTemplate?.name === template.name
                                ? 'border-orange-500 bg-orange-50'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="font-medium text-sm">{template.subject}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {template.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>
                    {selectedTemplate ? (
                      <>
                        Preview: {selectedTemplate.subject}
                        <Badge className={`ml-2 ${categoryColors[selectedTemplate.category] || 'bg-gray-100'}`}>
                          {selectedTemplate.category}
                        </Badge>
                      </>
                    ) : (
                      'Select a template to preview'
                    )}
                  </span>
                  {loadingPreview && (
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <Tabs defaultValue="html">
                      <TabsList className="mb-4">
                        <TabsTrigger value="html">HTML</TabsTrigger>
                        <TabsTrigger value="text">Plain Text</TabsTrigger>
                      </TabsList>

                      <TabsContent value="html">
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">HTML Preview</span>
                          </div>
                          <iframe
                            srcDoc={previewHtml}
                            className="w-full h-[400px] bg-white"
                            title="Email Preview"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="text">
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-100 px-4 py-2 border-b flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Plain Text Version</span>
                          </div>
                          <pre className="p-4 text-sm whitespace-pre-wrap bg-white h-[400px] overflow-auto">
                            {previewText}
                          </pre>
                        </div>
                      </TabsContent>
                    </Tabs>

                    {/* Send Test Email */}
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Send Test Email
                      </h4>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Input
                            type="email"
                            placeholder="Enter email address"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleSendTestEmail}
                          disabled={sending || !testEmail}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          {sending ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Send Test
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        This will send a test email using sample data
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    <div className="text-center">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a template from the list to preview</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Email Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Email Logs</CardTitle>
                  <CardDescription>Recent email activity</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchEmailLogs}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No email logs yet</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-medium">Status</th>
                        <th className="text-left p-3 text-sm font-medium">Recipient</th>
                        <th className="text-left p-3 text-sm font-medium">Subject</th>
                        <th className="text-left p-3 text-sm font-medium">Template</th>
                        <th className="text-left p-3 text-sm font-medium">Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailLogs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {statusIcons[log.status] || statusIcons.PENDING}
                              <span className="text-sm">{log.status}</span>
                            </div>
                          </td>
                          <td className="p-3 text-sm">{log.toEmail}</td>
                          <td className="p-3 text-sm max-w-[200px] truncate">
                            {log.subject}
                          </td>
                          <td className="p-3 text-sm">
                            {log.templateName && (
                              <Badge variant="outline" className="text-xs">
                                {log.templateName}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {new Date(log.sentAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
