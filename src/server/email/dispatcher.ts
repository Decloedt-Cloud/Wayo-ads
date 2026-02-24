/**
 * Email Dispatcher Service
 * 
 * Central service for sending emails with:
 * - Queue management
 * - Retry logic
 * - Idempotency (deduplication)
 * - Preference checking
 * - Audit logging
 */

import { db } from '@/lib/db';
import type { EmailTemplateName, DispatchOptions, DispatchResult, EmailStatus } from './types';
import { getEmailProvider } from './providers';
import { renderTemplate } from './templates';
import { nanoid } from 'nanoid';

// ============================================
// CONFIGURATION
// ============================================

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60000; // 1 minute
const DEDUPE_WINDOW_MS = 86400000; // 24 hours

// ============================================
// PREFERENCE CHECKING
// ============================================

/**
 * Get user email preferences
 */
export async function getUserEmailPreferences(userId: string): Promise<{
  optOutAll: boolean;
  accountEmails: boolean;
  securityEmails: boolean;
  marketingEmails: boolean;
  campaignEmails: boolean;
  payoutEmails: boolean;
} | null> {
  try {
    const prefs = await db.emailPreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // Return defaults if no preferences set
      return {
        optOutAll: false,
        accountEmails: true,
        securityEmails: true,
        marketingEmails: true,
        campaignEmails: true,
        payoutEmails: true,
      };
    }

    return {
      optOutAll: prefs.optOutAll,
      accountEmails: prefs.accountEmails,
      securityEmails: prefs.securityEmails,
      marketingEmails: prefs.marketingEmails,
      campaignEmails: prefs.campaignEmails,
      payoutEmails: prefs.payoutEmails,
    };
  } catch (error) {
    console.error('[EmailDispatcher] Failed to get preferences:', error);
    return null;
  }
}

/**
 * Check if user can receive email based on preferences and template category
 */
function canSendToUser(
  templateName: EmailTemplateName,
  preferences: { optOutAll: boolean; accountEmails: boolean; securityEmails: boolean; marketingEmails: boolean; campaignEmails: boolean; payoutEmails: boolean } | null
): boolean {
  if (!preferences) return true; // Default allow if no preferences
  if (preferences.optOutAll) return false;

  // Security emails are always sent (important for account security)
  if (templateName.startsWith('security.')) {
    return true; // Always send security emails
  }

  // Account lifecycle emails
  if (templateName.startsWith('account.') || templateName.startsWith('role.')) {
    return preferences.accountEmails;
  }

  // Campaign notifications
  if (templateName.startsWith('marketplace.creator') || templateName.startsWith('marketplace.budget')) {
    return preferences.campaignEmails;
  }

  // Payout notifications
  if (templateName.startsWith('marketplace.withdrawal') || templateName.startsWith('marketplace.payout') || templateName.startsWith('marketplace.deposit')) {
    return preferences.payoutEmails;
  }

  // Marketing emails
  return preferences.marketingEmails;
}

// ============================================
// DEDUPLICATION
// ============================================

/**
 * Generate a deduplication key
 */
function generateDedupeKey(
  templateName: EmailTemplateName,
  recipientEmail: string,
  correlationId?: string
): string {
  const parts = [templateName, recipientEmail.toLowerCase()];
  if (correlationId) {
    parts.push(correlationId);
  }
  return parts.join(':');
}

/**
 * Check if we've already sent this email recently
 */
async function checkDedupe(dedupeKey: string): Promise<boolean> {
  const recentSent = await db.emailQueue.findFirst({
    where: {
      dedupeKey,
      status: { in: ['PENDING', 'SENDING', 'SENT'] },
      createdAt: {
        gte: new Date(Date.now() - DEDUPE_WINDOW_MS),
      },
    },
  });

  return !!recentSent;
}

// ============================================
// QUEUE MANAGEMENT
// ============================================

/**
 * Add email to queue
 */
async function queueEmail(
  to: string,
  toName: string | undefined,
  subject: string,
  html: string,
  text: string,
  templateName: EmailTemplateName,
  variables: Record<string, unknown>,
  dedupeKey: string | null,
  correlationId: string | undefined
): Promise<string> {
  const email = await db.emailQueue.create({
    data: {
      toEmail: to,
      toName: toName || null,
      subject,
      htmlBody: html,
      textBody: text,
      templateName,
      templateData: JSON.stringify(variables),
      dedupeKey,
      correlationId,
      status: 'PENDING',
      retryCount: 0,
      maxRetries: MAX_RETRIES,
    },
  });

  return email.id;
}

// ============================================
// DISPATCH FUNCTION
// ============================================

/**
 * Dispatch an email
 * Main entry point for sending emails
 */
export async function dispatchEmail(options: DispatchOptions): Promise<DispatchResult> {
  const {
    to,
    toName,
    templateName,
    variables,
    correlationId,
    dedupeKey: providedDedupeKey,
    skipPreferenceCheck = false,
  } = options;

  try {
    // 1. Check if recipient has a user account and get preferences
    if (!skipPreferenceCheck) {
      const user = await db.user.findUnique({
        where: { email: to.toLowerCase() },
        include: { emailPreferences: true },
      });

      if (user) {
        const preferences = user.emailPreferences || {
          optOutAll: false,
          accountEmails: true,
          securityEmails: true,
          marketingEmails: true,
          campaignEmails: true,
          payoutEmails: true,
        };

        if (!canSendToUser(templateName, preferences)) {
          return {
            success: false,
            error: 'Recipient has opted out of this email category',
          };
        }
      }
    }

    // 2. Check deduplication
    const dedupeKey = providedDedupeKey || generateDedupeKey(templateName, to, correlationId);
    const isDuplicate = await checkDedupe(dedupeKey);

    if (isDuplicate) {
      return {
        success: true,
        status: 'SENT',
        error: 'Duplicate email suppressed',
      };
    }

    // 3. Render the template
    const rendered = renderTemplate(templateName, variables);

    // 4. Queue the email
    const emailId = await queueEmail(
      to,
      toName,
      rendered.subject,
      rendered.html,
      rendered.text,
      templateName,
      variables,
      dedupeKey,
      correlationId
    );

    // 5. Try to send immediately (fire-and-forget pattern)
    // In production, this would be handled by a background worker
    sendQueuedEmail(emailId).catch(err => {
      console.error(`[EmailDispatcher] Background send failed for ${emailId}:`, err);
    });

    return {
      success: true,
      emailId,
      status: 'PENDING',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[EmailDispatcher] Failed to dispatch ${templateName}:`, errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================
// SENDING WORKER
// ============================================

/**
 * Send a queued email
 */
async function sendQueuedEmail(emailId: string): Promise<void> {
  // Get the email
  const email = await db.emailQueue.findUnique({
    where: { id: emailId },
  });

  if (!email) {
    console.error(`[EmailDispatcher] Email ${emailId} not found`);
    return;
  }

  // Check status
  if (email.status !== 'PENDING') {
    return;
  }

  // Mark as sending
  await db.emailQueue.update({
    where: { id: emailId },
    data: { status: 'SENDING' as EmailStatus },
  });

  try {
    // Get provider
    const provider = await getEmailProvider();

    // Send
    const result = await provider.send({
      to: email.toEmail,
      toName: email.toName || undefined,
      subject: email.subject,
      html: email.htmlBody,
      text: email.textBody || undefined,
      tags: email.templateName ? { template: email.templateName } : undefined,
    });

    if (result.success) {
      // Update queue status
      await db.emailQueue.update({
        where: { id: emailId },
        data: {
          status: 'SENT' as EmailStatus,
          sentAt: new Date(),
        },
      });

      // Log to email log
      await db.emailLog.create({
        data: {
          toEmail: email.toEmail,
          toName: email.toName,
          subject: email.subject,
          templateName: email.templateName,
          eventType: email.templateName || 'unknown',
          correlationId: email.correlationId,
          status: 'SENT',
          provider: provider.name,
          providerMessageId: result.messageId,
        },
      });
    } else {
      throw new Error(result.error || 'Send failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check retry count
    const newRetryCount = email.retryCount + 1;
    const shouldRetry = newRetryCount < email.maxRetries;

    // Update queue status
    await db.emailQueue.update({
      where: { id: emailId },
      data: {
        status: shouldRetry ? 'PENDING' : ('FAILED' as EmailStatus),
        retryCount: newRetryCount,
        errorMessage,
        nextRetryAt: shouldRetry ? new Date(Date.now() + RETRY_DELAY_MS) : null,
      },
    });

    // Log failure
    await db.emailLog.create({
      data: {
        toEmail: email.toEmail,
        toName: email.toName,
        subject: email.subject,
        templateName: email.templateName,
        eventType: email.templateName || 'unknown',
        correlationId: email.correlationId,
        status: 'FAILED',
        provider: 'unknown',
        errorMessage,
      },
    });

    console.error(`[EmailDispatcher] Failed to send ${email.templateName}: ${errorMessage}`);
  }
}

/**
 * Process pending emails in queue
 * Called by background worker or cron job
 */
export async function processEmailQueue(batchSize: number = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const pendingEmails = await db.emailQueue.findMany({
    where: {
      status: 'PENDING',
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: new Date() } },
      ],
    },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });

  let succeeded = 0;
  let failed = 0;

  for (const email of pendingEmails) {
    try {
      await sendQueuedEmail(email.id);
      
      // Check final status
      const updated = await db.emailQueue.findUnique({
        where: { id: email.id },
        select: { status: true },
      });

      if (updated?.status === 'SENT') {
        succeeded++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return {
    processed: pendingEmails.length,
    succeeded,
    failed,
  };
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Send account created email
 */
export async function sendAccountCreatedEmail(
  to: string,
  vars: { userName: string; verifyEmailUrl: string; supportEmail: string }
): Promise<DispatchResult> {
  return dispatchEmail({
    to,
    toName: vars.userName,
    templateName: 'account.created',
    variables: vars,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  vars: { userName: string; resetUrl: string; expirationMinutes: number }
): Promise<DispatchResult> {
  return dispatchEmail({
    to,
    toName: vars.userName,
    templateName: 'security.password_reset',
    variables: vars,
  });
}

/**
 * Send account approved email
 */
export async function sendAccountApprovedEmail(
  to: string,
  vars: { userName: string; loginUrl: string; roleGranted: string; nextStepsUrl?: string }
): Promise<DispatchResult> {
  return dispatchEmail({
    to,
    toName: vars.userName,
    templateName: 'account.approved',
    variables: vars,
  });
}

/**
 * Send account rejected email
 */
export async function sendAccountRejectedEmail(
  to: string,
  vars: { userName: string; reasonSummary: string; reapplyUrl?: string; supportEmail: string }
): Promise<DispatchResult> {
  return dispatchEmail({
    to,
    toName: vars.userName,
    templateName: 'account.rejected',
    variables: vars,
  });
}

/**
 * Send suspicious login alert to admins
 */
export async function sendSuspiciousLoginAlert(
  to: string,
  vars: { userEmail: string; ipApprox?: string; timestamp: string; actionUrl: string }
): Promise<DispatchResult> {
  return dispatchEmail({
    to,
    templateName: 'security.suspicious_login',
    variables: vars,
    skipPreferenceCheck: true, // Always send security alerts to admins
  });
}

/**
 * Send role request notification to admins
 */
export async function sendRoleRequestNotification(
  to: string,
  vars: { userId: string; requestedRole: string; requestMessage?: string; reviewUrl: string }
): Promise<DispatchResult> {
  return dispatchEmail({
    to,
    templateName: 'role.requested',
    variables: vars,
    skipPreferenceCheck: true,
  });
}

/**
 * Send withdrawal notification to creator
 */
export async function sendWithdrawalNotification(
  to: string,
  vars: {
    creatorName: string;
    amount: string;
    status: 'requested' | 'paid' | 'failed';
    withdrawalId: string;
    errorMessage?: string;
    dashboardUrl?: string;
    retryUrl?: string;
    supportEmail: string;
    estimatedProcessingDays?: number;
    paidAt?: string;
  }
): Promise<DispatchResult> {
  const templateName = vars.status === 'requested' 
    ? 'marketplace.withdrawal_requested'
    : vars.status === 'paid'
    ? 'marketplace.withdrawal_paid'
    : 'marketplace.withdrawal_failed';

  return dispatchEmail({
    to,
    toName: vars.creatorName,
    templateName,
    variables: vars,
    correlationId: vars.withdrawalId,
  });
}
