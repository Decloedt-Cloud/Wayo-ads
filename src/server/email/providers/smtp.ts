/**
 * SMTP Email Provider
 * 
 * Production SMTP provider using nodemailer.
 * Reads credentials from database at runtime.
 */

import type { EmailProvider, EmailSendOptions, EmailSendResult } from '../types';
import { getEmailCredentials } from '@/server/admin/emailSettingsService';

export class SMTPProvider implements EmailProvider {
  readonly name = 'smtp';

  async isConfigured(): Promise<boolean> {
    const credentials = await getEmailCredentials();
    return !!(credentials && credentials.host);
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    const credentials = await getEmailCredentials();

    if (!credentials) {
      return {
        success: false,
        error: 'SMTP is not configured',
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
        // Connection timeout settings
        connectionTimeout: 10000,
        socketTimeout: 10000,
      });

      // Prepare email options
      const mailOptions = {
        from: `"${credentials.fromName || 'Wayo Ads'}" <${credentials.fromEmail}>`,
        to: options.toName 
          ? `${options.toName} <${options.to}>`
          : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || credentials.replyToEmail,
        headers: options.tags 
          ? Object.fromEntries(
              Object.entries(options.tags).map(([k, v]) => [`X-${k}`, v])
            )
          : undefined,
      };

      // Send email
      const result = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown SMTP error';
      console.error('[SMTPProvider] Send failed:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}

// Singleton instance
export const smtpProvider = new SMTPProvider();
