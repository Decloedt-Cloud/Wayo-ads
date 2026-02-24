/**
 * Email Template Registry
 * 
 * Central registry for all email templates.
 * Provides a single entry point to render any template.
 */

import type { EmailTemplateName, EmailTemplateContext } from '../types';

// Account templates
import {
  accountCreatedHtml,
  accountCreatedText,
  accountVerifyHtml,
  accountVerifyText,
  accountVerifiedHtml,
  accountVerifiedText,
  accountPendingReviewHtml,
  accountPendingReviewText,
  accountApprovedHtml,
  accountApprovedText,
  accountRejectedHtml,
  accountRejectedText,
  accountUpdatedHtml,
  accountUpdatedText,
  accountDeactivatedHtml,
  accountDeactivatedText,
  accountDeletedHtml,
  accountDeletedText,
} from './account';

// Role templates
import {
  roleRequestedHtml,
  roleRequestedText,
  roleApprovedHtml,
  roleApprovedText,
  roleRejectedHtml,
  roleRejectedText,
} from './role';

// Security templates
import {
  passwordResetHtml,
  passwordResetText,
  passwordChangedHtml,
  passwordChangedText,
  suspiciousLoginHtml,
  suspiciousLoginText,
} from './security';

// Marketplace templates
import {
  creatorAppliedHtml,
  creatorAppliedText,
  creatorApprovedHtml,
  creatorApprovedText,
  creatorRejectedHtml,
  creatorRejectedText,
  budgetLowHtml,
  budgetLowText,
  payoutAvailableHtml,
  payoutAvailableText,
  withdrawalRequestedHtml,
  withdrawalRequestedText,
  withdrawalPaidHtml,
  withdrawalPaidText,
  withdrawalFailedHtml,
  withdrawalFailedText,
  depositSucceededHtml,
  depositSucceededText,
  depositFailedHtml,
  depositFailedText,
} from './marketplace';

// ============================================
// TEMPLATE REGISTRY
// ============================================

type TemplateRenderer = (
  context: EmailTemplateContext,
  vars: Record<string, unknown>
) => string;

interface TemplateDefinition {
  html: TemplateRenderer;
  text: TemplateRenderer;
  subject: string;
  previewText: string;
  category: 'account' | 'role' | 'security' | 'marketplace';
  description: string;
}

export const templateRegistry: Record<EmailTemplateName, TemplateDefinition> = {
  // Account lifecycle
  'account.created': {
    html: accountCreatedHtml,
    text: accountCreatedText,
    subject: 'Welcome! Please verify your email',
    previewText: 'Welcome! Please verify your email address to get started.',
    category: 'account',
    description: 'Sent when a new user signs up',
  },
  'account.verify': {
    html: accountVerifyHtml,
    text: accountVerifyText,
    subject: 'Verify your email address',
    previewText: 'Please verify your email address.',
    category: 'account',
    description: 'Sent when user requests verification link',
  },
  'account.verified': {
    html: accountVerifiedHtml,
    text: accountVerifiedText,
    subject: 'Your email has been verified',
    previewText: 'Your email address has been verified successfully.',
    category: 'account',
    description: 'Confirmation after email verification',
  },
  'account.pending_review': {
    html: accountPendingReviewHtml,
    text: accountPendingReviewText,
    subject: 'New account pending review',
    previewText: 'A new account requires admin review.',
    category: 'account',
    description: 'Sent to admins when account needs review',
  },
  'account.approved': {
    html: accountApprovedHtml,
    text: accountApprovedText,
    subject: 'Your account has been approved!',
    previewText: 'Congratulations! Your account has been approved.',
    category: 'account',
    description: 'Sent when admin approves account',
  },
  'account.rejected': {
    html: accountRejectedHtml,
    text: accountRejectedText,
    subject: 'Update on your account request',
    previewText: 'We were unable to approve your account request.',
    category: 'account',
    description: 'Sent when admin rejects account',
  },
  'account.updated': {
    html: accountUpdatedHtml,
    text: accountUpdatedText,
    subject: 'Your account was updated',
    previewText: 'Your account information was recently updated.',
    category: 'account',
    description: 'Security notification for account changes',
  },
  'account.deactivated': {
    html: accountDeactivatedHtml,
    text: accountDeactivatedText,
    subject: 'Your account has been deactivated',
    previewText: 'Your account has been deactivated.',
    category: 'account',
    description: 'Sent when account is deactivated',
  },
  'account.deleted': {
    html: accountDeletedHtml,
    text: accountDeletedText,
    subject: 'Your account has been deleted',
    previewText: 'Your account has been permanently deleted.',
    category: 'account',
    description: 'Confirmation of account deletion',
  },
  
  // Role management
  'role.requested': {
    html: roleRequestedHtml,
    text: roleRequestedText,
    subject: 'New role request',
    previewText: 'A user has requested a role upgrade.',
    category: 'role',
    description: 'Sent to admins for role upgrade requests',
  },
  'role.approved': {
    html: roleApprovedHtml,
    text: roleApprovedText,
    subject: 'Your role upgrade has been approved!',
    previewText: 'Your role upgrade has been approved.',
    category: 'role',
    description: 'Sent when role request is approved',
  },
  'role.rejected': {
    html: roleRejectedHtml,
    text: roleRejectedText,
    subject: 'Update on your role request',
    previewText: 'Your role request was not approved.',
    category: 'role',
    description: 'Sent when role request is rejected',
  },
  
  // Security
  'security.password_reset': {
    html: passwordResetHtml,
    text: passwordResetText,
    subject: 'Reset your password',
    previewText: 'Click to reset your password.',
    category: 'security',
    description: 'Password reset link',
  },
  'security.password_changed': {
    html: passwordChangedHtml,
    text: passwordChangedText,
    subject: 'Your password was changed',
    previewText: 'Your password was successfully changed.',
    category: 'security',
    description: 'Confirmation of password change',
  },
  'security.suspicious_login': {
    html: suspiciousLoginHtml,
    text: suspiciousLoginText,
    subject: 'Security alert: Suspicious activity detected',
    previewText: 'We detected suspicious login activity.',
    category: 'security',
    description: 'Alert for suspicious login attempts',
  },
  
  // Marketplace
  'marketplace.creator_applied': {
    html: creatorAppliedHtml,
    text: creatorAppliedText,
    subject: 'New creator application',
    previewText: 'A creator has applied to your campaign.',
    category: 'marketplace',
    description: 'Sent to advertiser when creator applies',
  },
  'marketplace.creator_approved': {
    html: creatorApprovedHtml,
    text: creatorApprovedText,
    subject: 'You\'ve been approved!',
    previewText: 'Your campaign application was approved.',
    category: 'marketplace',
    description: 'Sent to creator when approved',
  },
  'marketplace.creator_rejected': {
    html: creatorRejectedHtml,
    text: creatorRejectedText,
    subject: 'Update on your campaign application',
    previewText: 'Your campaign application was not selected.',
    category: 'marketplace',
    description: 'Sent to creator when rejected',
  },
  'marketplace.budget_low': {
    html: budgetLowHtml,
    text: budgetLowText,
    subject: 'Low budget alert',
    previewText: 'Your campaign is running low on budget.',
    category: 'marketplace',
    description: 'Alert for low campaign budget',
  },
  'marketplace.payout_available': {
    html: payoutAvailableHtml,
    text: payoutAvailableText,
    subject: 'Payout available',
    previewText: 'You have earnings ready for withdrawal.',
    category: 'marketplace',
    description: 'Creator payout notification',
  },
  'marketplace.withdrawal_requested': {
    html: withdrawalRequestedHtml,
    text: withdrawalRequestedText,
    subject: 'Withdrawal request submitted',
    previewText: 'Your withdrawal request has been submitted.',
    category: 'marketplace',
    description: 'Withdrawal request confirmation',
  },
  'marketplace.withdrawal_paid': {
    html: withdrawalPaidHtml,
    text: withdrawalPaidText,
    subject: 'Withdrawal complete',
    previewText: 'Your withdrawal has been processed.',
    category: 'marketplace',
    description: 'Withdrawal success notification',
  },
  'marketplace.withdrawal_failed': {
    html: withdrawalFailedHtml,
    text: withdrawalFailedText,
    subject: 'Withdrawal failed',
    previewText: 'Your withdrawal could not be processed.',
    category: 'marketplace',
    description: 'Withdrawal failure notification',
  },
  'marketplace.deposit_succeeded': {
    html: depositSucceededHtml,
    text: depositSucceededText,
    subject: 'Deposit successful',
    previewText: 'Your deposit was successful.',
    category: 'marketplace',
    description: 'Deposit success notification',
  },
  'marketplace.deposit_failed': {
    html: depositFailedHtml,
    text: depositFailedText,
    subject: 'Deposit failed',
    previewText: 'Your deposit could not be processed.',
    category: 'marketplace',
    description: 'Deposit failure notification',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the default template context
 */
export function getDefaultContext(): EmailTemplateContext {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return {
    appName: 'Wayo Ads Market',
    appUrl,
    supportEmail: process.env.SUPPORT_EMAIL || 'support@wayo-ads.com',
    currentYear: new Date().getFullYear(),
  };
}

/**
 * Render an email template
 */
export function renderTemplate(
  templateName: EmailTemplateName,
  vars: Record<string, unknown>,
  context?: Partial<EmailTemplateContext>
): { subject: string; html: string; text: string; previewText: string } {
  const template = templateRegistry[templateName];
  
  if (!template) {
    throw new Error(`Unknown email template: ${templateName}`);
  }
  
  const fullContext: EmailTemplateContext = {
    ...getDefaultContext(),
    ...context,
  };
  
  return {
    subject: template.subject,
    html: template.html(fullContext, vars),
    text: template.text(fullContext, vars),
    previewText: template.previewText,
  };
}

/**
 * Get all available templates for admin UI
 */
export function getAllTemplates(): Array<{
  name: EmailTemplateName;
  subject: string;
  previewText: string;
  category: string;
  description: string;
}> {
  return Object.entries(templateRegistry).map(([name, def]) => ({
    name: name as EmailTemplateName,
    subject: def.subject,
    previewText: def.previewText,
    category: def.category,
    description: def.description,
  }));
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): Array<{
  name: EmailTemplateName;
  subject: string;
  description: string;
}> {
  return Object.entries(templateRegistry)
    .filter(([, def]) => def.category === category)
    .map(([name, def]) => ({
      name: name as EmailTemplateName,
      subject: def.subject,
      description: def.description,
    }));
}
