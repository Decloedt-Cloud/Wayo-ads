/**
 * Admin API: Preview email template
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderTemplate, type EmailTemplateName } from '@/server/email';

// Sample variables for each template
const sampleVariables: Record<string, Record<string, unknown>> = {
  'account.created': {
    userName: 'John Doe',
    verifyEmailUrl: 'https://example.com/verify?token=abc123',
    supportEmail: 'support@wayo-ads.com',
  },
  'account.verify': {
    userName: 'John Doe',
    verifyEmailUrl: 'https://example.com/verify?token=abc123',
    expirationMinutes: 60,
  },
  'account.verified': {
    userName: 'John Doe',
    dashboardUrl: 'https://example.com/dashboard',
  },
  'account.pending_review': {
    userId: 'usr_123456',
    userEmail: 'john@example.com',
    rolesRequested: 'ADVERTISER, CREATOR',
    reviewUrl: 'https://example.com/admin/review/usr_123456',
  },
  'account.approved': {
    userName: 'John Doe',
    loginUrl: 'https://example.com/auth/signin',
    roleGranted: 'ADVERTISER',
    nextStepsUrl: 'https://example.com/getting-started',
  },
  'account.rejected': {
    userName: 'John Doe',
    reasonSummary: 'Unable to verify business information provided.',
    reapplyUrl: 'https://example.com/apply',
    supportEmail: 'support@wayo-ads.com',
  },
  'account.updated': {
    userName: 'John Doe',
    changedFields: ['Email', 'Password'],
    timestamp: new Date().toISOString(),
    ipApprox: '192.168.1.xxx',
    securityUrl: 'https://example.com/settings/security',
  },
  'account.deactivated': {
    userName: 'John Doe',
    reactivateUrl: 'https://example.com/reactivate',
    supportEmail: 'support@wayo-ads.com',
    reasonSummary: 'Account deactivated by user request',
  },
  'account.deleted': {
    userName: 'John Doe',
    deletionDate: new Date().toISOString(),
    exportDataUrl: 'https://example.com/download/data.zip',
    supportEmail: 'support@wayo-ads.com',
  },
  'role.requested': {
    userId: 'usr_123456',
    requestedRole: 'CREATOR',
    requestMessage: 'I want to monetize my YouTube channel.',
    reviewUrl: 'https://example.com/admin/roles/usr_123456',
  },
  'role.approved': {
    userName: 'John Doe',
    roleGranted: 'CREATOR',
    dashboardUrl: 'https://example.com/dashboard/creator',
  },
  'role.rejected': {
    userName: 'John Doe',
    requestedRole: 'CREATOR',
    reasonSummary: 'Insufficient follower count at this time.',
    supportEmail: 'support@wayo-ads.com',
  },
  'security.password_reset': {
    userName: 'John Doe',
    resetUrl: 'https://example.com/reset-password?token=xyz789',
    expirationMinutes: 60,
  },
  'security.password_changed': {
    userName: 'John Doe',
    timestamp: new Date().toISOString(),
    securityUrl: 'https://example.com/settings/security',
  },
  'security.suspicious_login': {
    userEmail: 'john@example.com',
    ipApprox: '203.0.113.xxx',
    timestamp: new Date().toISOString(),
    actionUrl: 'https://example.com/security/review',
  },
  'marketplace.creator_applied': {
    advertiserName: 'Acme Corp',
    creatorName: 'Jane Creator',
    campaignTitle: 'Summer Product Launch',
    campaignId: 'camp_123',
    message: 'I love your products and would love to collaborate!',
    applicationUrl: 'https://example.com/campaigns/camp_123/applications',
  },
  'marketplace.creator_approved': {
    creatorName: 'Jane Creator',
    campaignTitle: 'Summer Product Launch',
    campaignId: 'camp_123',
    trackingLinkUrl: 'https://wayo.link/abc123',
    dashboardUrl: 'https://example.com/dashboard/creator/campaigns/camp_123',
  },
  'marketplace.creator_rejected': {
    creatorName: 'Jane Creator',
    campaignTitle: 'Summer Product Launch',
    reason: 'Campaign has reached maximum number of creators.',
    browseCampaignsUrl: 'https://example.com/campaigns',
  },
  'marketplace.budget_low': {
    advertiserName: 'Acme Corp',
    campaignTitle: 'Summer Product Launch',
    remainingBudget: '€50.00',
    estimatedDaysRemaining: 3,
    addFundsUrl: 'https://example.com/wallet/add-funds',
  },
  'marketplace.payout_available': {
    creatorName: 'Jane Creator',
    amount: '€125.50',
    campaignTitle: 'Summer Product Launch',
    withdrawalUrl: 'https://example.com/dashboard/creator/wallet',
  },
  'marketplace.withdrawal_requested': {
    creatorName: 'Jane Creator',
    amount: '€125.50',
    withdrawalId: 'wth_123456',
    estimatedProcessingDays: 3,
    dashboardUrl: 'https://example.com/dashboard/creator/wallet',
  },
  'marketplace.withdrawal_paid': {
    creatorName: 'Jane Creator',
    amount: '€125.50',
    withdrawalId: 'wth_123456',
    paidAt: new Date().toISOString(),
    dashboardUrl: 'https://example.com/dashboard/creator/wallet',
  },
  'marketplace.withdrawal_failed': {
    creatorName: 'Jane Creator',
    amount: '€125.50',
    withdrawalId: 'wth_123456',
    errorMessage: 'Bank account verification required',
    retryUrl: 'https://example.com/dashboard/creator/wallet',
    supportEmail: 'support@wayo-ads.com',
  },
  'marketplace.deposit_succeeded': {
    advertiserName: 'Acme Corp',
    amount: '€500.00',
    newBalance: '€750.00',
    depositId: 'dep_123456',
    dashboardUrl: 'https://example.com/dashboard/advertiser/wallet',
  },
  'marketplace.deposit_failed': {
    advertiserName: 'Acme Corp',
    amount: '€500.00',
    errorMessage: 'Card declined - insufficient funds',
    retryUrl: 'https://example.com/dashboard/advertiser/wallet',
    supportEmail: 'support@wayo-ads.com',
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ template: string }> }
) {
  const { template } = await params;
  const templateName = template as EmailTemplateName;

  try {
    const vars = sampleVariables[templateName] || {};
    const rendered = renderTemplate(templateName, vars);

    return NextResponse.json({
      templateName,
      subject: rendered.subject,
      previewText: rendered.previewText,
      html: rendered.html,
      text: rendered.text,
    });
  } catch (error) {
    console.error('Failed to render template:', error);
    return NextResponse.json(
      { error: 'Failed to render template' },
      { status: 400 }
    );
  }
}
