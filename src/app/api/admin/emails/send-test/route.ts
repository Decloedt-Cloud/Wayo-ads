/**
 * Admin API: Send test email
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dispatchEmail, type EmailTemplateName } from '@/server/email';

const sendTestEmailSchema = z.object({
  to: z.string().email(),
  templateName: z.string(),
});

// Sample variables for test emails
const sampleVariables: Record<string, Record<string, unknown>> = {
  'account.created': {
    userName: 'Test User',
    verifyEmailUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify?token=test123`,
    supportEmail: 'support@wayo-ads.com',
  },
  'account.verify': {
    userName: 'Test User',
    verifyEmailUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify?token=test123`,
    expirationMinutes: 60,
  },
  'account.verified': {
    userName: 'Test User',
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
  },
  'account.pending_review': {
    userId: 'usr_test',
    userEmail: 'test@example.com',
    rolesRequested: 'ADVERTISER',
    reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/review/usr_test`,
  },
  'account.approved': {
    userName: 'Test User',
    loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signin`,
    roleGranted: 'ADVERTISER',
  },
  'account.rejected': {
    userName: 'Test User',
    reasonSummary: 'This is a test rejection reason.',
    supportEmail: 'support@wayo-ads.com',
  },
  'account.updated': {
    userName: 'Test User',
    changedFields: ['Email'],
    timestamp: new Date().toISOString(),
    securityUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/security`,
  },
  'account.deactivated': {
    userName: 'Test User',
    supportEmail: 'support@wayo-ads.com',
    reasonSummary: 'Test deactivation',
  },
  'account.deleted': {
    userName: 'Test User',
    deletionDate: new Date().toISOString(),
    supportEmail: 'support@wayo-ads.com',
  },
  'role.requested': {
    userId: 'usr_test',
    requestedRole: 'CREATOR',
    reviewUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/roles`,
  },
  'role.approved': {
    userName: 'Test User',
    roleGranted: 'CREATOR',
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
  },
  'role.rejected': {
    userName: 'Test User',
    requestedRole: 'CREATOR',
    reasonSummary: 'Test rejection reason',
    supportEmail: 'support@wayo-ads.com',
  },
  'security.password_reset': {
    userName: 'Test User',
    resetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=test`,
    expirationMinutes: 60,
  },
  'security.password_changed': {
    userName: 'Test User',
    timestamp: new Date().toISOString(),
    securityUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/security`,
  },
  'security.suspicious_login': {
    userEmail: 'test@example.com',
    ipApprox: '192.168.1.xxx',
    timestamp: new Date().toISOString(),
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/security`,
  },
  'marketplace.creator_applied': {
    advertiserName: 'Test Advertiser',
    creatorName: 'Test Creator',
    campaignTitle: 'Test Campaign',
    applicationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/campaigns/test`,
  },
  'marketplace.creator_approved': {
    creatorName: 'Test Creator',
    campaignTitle: 'Test Campaign',
    trackingLinkUrl: 'https://wayo.link/test123',
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
  },
  'marketplace.creator_rejected': {
    creatorName: 'Test Creator',
    campaignTitle: 'Test Campaign',
    browseCampaignsUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/campaigns`,
  },
  'marketplace.budget_low': {
    advertiserName: 'Test Advertiser',
    campaignTitle: 'Test Campaign',
    remainingBudget: '€50.00',
    estimatedDaysRemaining: 3,
    addFundsUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/wallet`,
  },
  'marketplace.payout_available': {
    creatorName: 'Test Creator',
    amount: '€100.00',
    campaignTitle: 'Test Campaign',
    withdrawalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/wallet`,
  },
  'marketplace.withdrawal_requested': {
    creatorName: 'Test Creator',
    amount: '€100.00',
    withdrawalId: 'wth_test',
    estimatedProcessingDays: 3,
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/wallet`,
  },
  'marketplace.withdrawal_paid': {
    creatorName: 'Test Creator',
    amount: '€100.00',
    withdrawalId: 'wth_test',
    paidAt: new Date().toISOString(),
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/wallet`,
  },
  'marketplace.withdrawal_failed': {
    creatorName: 'Test Creator',
    amount: '€100.00',
    withdrawalId: 'wth_test',
    errorMessage: 'Test error',
    retryUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/wallet`,
    supportEmail: 'support@wayo-ads.com',
  },
  'marketplace.deposit_succeeded': {
    advertiserName: 'Test Advertiser',
    amount: '€500.00',
    newBalance: '€600.00',
    depositId: 'dep_test',
    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/wallet`,
  },
  'marketplace.deposit_failed': {
    advertiserName: 'Test Advertiser',
    amount: '€500.00',
    errorMessage: 'Test error',
    retryUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/wallet`,
    supportEmail: 'support@wayo-ads.com',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, templateName } = sendTestEmailSchema.parse(body);

    const vars = sampleVariables[templateName] || {};

    const result = await dispatchEmail({
      to,
      templateName: templateName as EmailTemplateName,
      variables: vars,
      skipPreferenceCheck: true, // Always send test emails
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email queued for ${to}`,
        emailId: result.emailId,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to queue email' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to send test email:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
