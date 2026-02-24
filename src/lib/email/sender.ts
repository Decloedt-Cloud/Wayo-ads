/**
 * Email Sender Utility
 * 
 * Provides functions to send transactional emails using configured SMTP settings.
 * Reads credentials from database at runtime.
 */

import { getEmailCredentials } from '@/server/admin/emailSettingsService';
import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailTemplateData {
  [key: string]: string | number | boolean;
}

// ============================================
// EMAIL SENDING
// ============================================

/**
 * Send an email using configured SMTP settings
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const credentials = await getEmailCredentials();

  if (!credentials) {
    return {
      success: false,
      error: 'Email is not configured',
    };
  }

  try {
    // Dynamic import of nodemailer
    const nodemailer = await import('nodemailer');

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: credentials.host,
      port: credentials.port,
      secure: credentials.secure,
      auth: credentials.username && credentials.password
        ? {
            user: credentials.username,
            pass: credentials.password,
          }
        : undefined,
    });

    // Send email
    const result = await transporter.sendMail({
      from: `"${credentials.fromName || 'Wayo Ads'}" <${credentials.fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || credentials.replyToEmail,
      attachments: options.attachments,
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EmailSender] Failed to send email:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Queue an email for later sending (useful for bulk emails)
 */
export async function queueEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
  templateName?: string,
  templateData?: EmailTemplateData
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  try {
    const email = await db.emailQueue.create({
      data: {
        toEmail: to,
        subject,
        htmlBody: html,
        textBody: text,
        templateName,
        templateData: templateData ? JSON.stringify(templateData) : null,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      emailId: email.id,
    };
  } catch (error) {
    console.error('[EmailSender] Failed to queue email:', error);
    return {
      success: false,
      error: 'Failed to queue email',
    };
  }
}

/**
 * Process pending emails in the queue
 */
export async function processEmailQueue(limit: number = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const credentials = await getEmailCredentials();

  if (!credentials) {
    console.warn('[EmailQueue] Email not configured, skipping queue processing');
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  // Get pending emails
  const pendingEmails = await db.emailQueue.findMany({
    where: { status: 'PENDING' },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  let succeeded = 0;
  let failed = 0;

  for (const email of pendingEmails) {
    // Mark as sending
    await db.emailQueue.update({
      where: { id: email.id },
      data: { status: 'SENDING' },
    });

    const result = await sendEmail({
      to: email.toEmail,
      subject: email.subject,
      html: email.htmlBody,
      text: email.textBody || undefined,
    });

    if (result.success) {
      await db.emailQueue.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      succeeded++;
    } else {
      await db.emailQueue.update({
        where: { id: email.id },
        data: {
          status: 'FAILED',
          errorMessage: result.error,
        },
      });
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
// EMAIL TEMPLATES
// ============================================

/**
 * Generate welcome email HTML
 */
export function generateWelcomeEmail(
  userName: string,
  loginUrl: string
): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #F47A1F 0%, #FF9A56 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Wayo Ads!</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
          <p style="font-size: 16px; color: #374151;">
            Welcome to Wayo Ads Market! We're excited to have you on board.
          </p>
          <p style="font-size: 16px; color: #374151;">
            Whether you're an advertiser looking to promote your products or a creator wanting to monetize your content, we've got you covered.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background: #F47A1F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Get Started
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            If you have any questions, feel free to reach out to our support team.
          </p>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} Wayo Ads Market. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to Wayo Ads!

Hi ${userName},

Welcome to Wayo Ads Market! We're excited to have you on board.

Whether you're an advertiser looking to promote your products or a creator wanting to monetize your content, we've got you covered.

Get started here: ${loginUrl}

If you have any questions, feel free to reach out to our support team.

© ${new Date().getFullYear()} Wayo Ads Market. All rights reserved.
  `;

  return { html, text };
}

/**
 * Generate password reset email
 */
export function generatePasswordResetEmail(
  userName: string,
  resetUrl: string,
  expiresIn: string = '1 hour'
): { html: string; text: string } {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
        <div style="background: #1f2937; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Reset Your Password</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
          <p style="font-size: 16px; color: #374151;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #1f2937; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #ef4444;">
            ⚠️ This link will expire in ${expiresIn}.
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            If you didn't request this password reset, you can safely ignore this email.
          </p>
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} Wayo Ads Market. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Reset Your Password

Hi ${userName},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

⚠️ This link will expire in ${expiresIn}.

If you didn't request this password reset, you can safely ignore this email.

© ${new Date().getFullYear()} Wayo Ads Market. All rights reserved.
  `;

  return { html, text };
}

/**
 * Generate withdrawal notification email
 */
export function generateWithdrawalNotificationEmail(
  userName: string,
  amount: string,
  status: 'processed' | 'completed' | 'failed',
  withdrawalId: string
): { html: string; text: string } {
  const statusColors = {
    processed: '#3b82f6',
    completed: '#22c55e',
    failed: '#ef4444',
  };

  const statusMessages = {
    processed: 'is being processed',
    completed: 'has been completed',
    failed: 'has failed',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
        <div style="background: #F47A1F; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Withdrawal Update</h1>
        </div>
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
          <p style="font-size: 16px; color: #374151;">
            Your withdrawal of <strong>${amount}</strong> ${statusMessages[status]}.
          </p>
          <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              Withdrawal ID: <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${withdrawalId}</code>
            </p>
          </div>
          ${status === 'failed' ? '<p style="font-size: 14px; color: #ef4444;">The funds have been returned to your available balance. Please try again or contact support if the issue persists.</p>' : ''}
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} Wayo Ads Market. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Withdrawal Update

Hi ${userName},

Your withdrawal of ${amount} ${statusMessages[status]}.

Withdrawal ID: ${withdrawalId}

${status === 'failed' ? 'The funds have been returned to your available balance. Please try again or contact support if the issue persists.' : ''}

© ${new Date().getFullYear()} Wayo Ads Market. All rights reserved.
  `;

  return { html, text };
}
