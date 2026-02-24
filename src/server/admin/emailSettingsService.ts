/**
 * Email Settings Service
 * 
 * Manages SMTP configuration for transactional emails.
 * All secrets (password) are encrypted before storage.
 * 
 * Features:
 * - SMTP configuration management
 * - Test email sending
 * - Audit logging
 */

import { z } from 'zod';
import { adminSettingsRepository } from './repositories';
import { encrypt, decrypt, maskSecret } from '@/lib/security/crypto';

// ============================================
// TYPES
// ============================================

export interface EmailSettingsInput {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
  replyToEmail?: string;
  isEnabled: boolean;
}

export interface EmailSettingsOutput {
  id: string;
  host: string | null;
  port: number;
  secure: boolean;
  usernameMasked: string | null;
  fromEmail: string | null;
  fromName: string | null;
  replyToEmail: string | null;
  isEnabled: boolean;
  updatedAt: Date;
  updatedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface EmailCredentials {
  host: string;
  port: number;
  secure: boolean;
  username: string | null;
  password: string | null;
  fromEmail: string;
  fromName?: string;
  replyToEmail?: string;
}

export interface TestEmailResult {
  success: boolean;
  message: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const emailSettingsInputSchema = z.object({
  host: z.string().min(1).max(256),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().max(256).optional(),
  password: z.string().max(256).optional(),
  fromEmail: z.string().email().max(256),
  fromName: z.string().max(128).optional(),
  replyToEmail: z.string().email().max(256).optional(),
  isEnabled: z.boolean(),
});

// ============================================
// ERROR CODES
// ============================================

export class EmailSettingsError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'EmailSettingsError';
  }
}

export const EmailSettingsErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  SETTINGS_NOT_FOUND: 'SETTINGS_NOT_FOUND',
  TEST_EMAIL_FAILED: 'TEST_EMAIL_FAILED',
  EMAIL_NOT_CONFIGURED: 'EMAIL_NOT_CONFIGURED',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

// ============================================
// AUDIT LOGGING
// ============================================

interface AuditLogParams {
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await adminSettingsRepository.createAuditLog({
      userId: params.userId,
      action: params.action,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (error) {
    console.error('[EmailSettings] Failed to create audit log:', error);
  }
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get email settings (masked for display)
 */
export async function getEmailSettings(): Promise<EmailSettingsOutput | null> {
  try {
    const settings = await adminSettingsRepository.findEmailSettings();

    if (!settings) {
      return null;
    }

    return {
      id: settings.id,
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      usernameMasked: settings.usernameEncrypted
        ? maskSecret(decrypt(settings.usernameEncrypted))
        : null,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      replyToEmail: settings.replyToEmail,
      isEnabled: settings.isEnabled,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    };
  } catch (error) {
    console.error('[EmailSettings] Failed to get settings:', error);
    throw new EmailSettingsError(
      'Failed to retrieve email settings',
      EmailSettingsErrorCodes.DATABASE_ERROR
    );
  }
}

/**
 * Get decrypted email credentials (for internal use only!)
 */
export async function getEmailCredentials(): Promise<EmailCredentials | null> {
  try {
    const settings = await adminSettingsRepository.findEmailSettings();

    if (!settings || !settings.isEnabled) {
      return null;
    }

    return {
      host: settings.host || '',
      port: settings.port,
      secure: settings.secure,
      username: settings.usernameEncrypted
        ? decrypt(settings.usernameEncrypted)
        : null,
      password: settings.passwordEncrypted
        ? decrypt(settings.passwordEncrypted)
        : null,
      fromEmail: settings.fromEmail || '',
      fromName: settings.fromName || undefined,
      replyToEmail: settings.replyToEmail || undefined,
    };
  } catch (error) {
    console.error('[EmailSettings] Failed to get credentials:', error);
    return null;
  }
}

/**
 * Update email settings
 */
export async function updateEmailSettings(
  input: EmailSettingsInput,
  userId: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<EmailSettingsOutput> {
  // Validate input
  const validated = emailSettingsInputSchema.parse(input);

  // Encrypt secrets
  let usernameEncrypted: string | undefined;
  let passwordEncrypted: string | undefined;

  try {
    if (validated.username) {
      usernameEncrypted = encrypt(validated.username);
    }
    if (validated.password) {
      passwordEncrypted = encrypt(validated.password);
    }
  } catch (error) {
    throw new EmailSettingsError(
      'Failed to encrypt credentials',
      EmailSettingsErrorCodes.ENCRYPTION_FAILED
    );
  }

  try {
    const result = await adminSettingsRepository.transaction(async (tx) => {
      await tx.emailSettings.deleteMany({});

      const newSettings = await tx.emailSettings.create({
        data: {
          host: validated.host,
          port: validated.port,
          secure: validated.secure,
          usernameEncrypted,
          passwordEncrypted,
          fromEmail: validated.fromEmail,
          fromName: validated.fromName,
          replyToEmail: validated.replyToEmail,
          isEnabled: validated.isEnabled,
          updatedByUserId: userId,
        },
        include: {
          updatedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return newSettings;
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: 'EMAIL_SETTINGS_UPDATED',
      metadata: {
        host: validated.host,
        port: validated.port,
        secure: validated.secure,
        hasUsername: !!validated.username,
        hasPassword: !!validated.password,
        fromEmail: validated.fromEmail,
        isEnabled: validated.isEnabled,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    return {
      id: result.id,
      host: result.host,
      port: result.port,
      secure: result.secure,
      usernameMasked: validated.username
        ? maskSecret(validated.username)
        : null,
      fromEmail: result.fromEmail,
      fromName: result.fromName,
      replyToEmail: result.replyToEmail,
      isEnabled: result.isEnabled,
      updatedAt: result.updatedAt,
      updatedBy: result.updatedBy,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new EmailSettingsError(
        'Invalid input',
        EmailSettingsErrorCodes.INVALID_INPUT
      );
    }
    console.error('[EmailSettings] Failed to update settings:', error);
    throw new EmailSettingsError(
      'Failed to update email settings',
      EmailSettingsErrorCodes.DATABASE_ERROR
    );
  }
}

/**
 * Send test email
 */
export async function sendTestEmail(
  testEmail: string,
  userId: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<TestEmailResult> {
  const credentials = await getEmailCredentials();

  if (!credentials) {
    return {
      success: false,
      message: 'Email is not configured or disabled',
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

    // Send test email
    await transporter.sendMail({
      from: `"${credentials.fromName || 'Wayo Ads'}" <${credentials.fromEmail}>`,
      to: testEmail,
      subject: 'Wayo Ads - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #F47A1F;">Test Email Successful!</h1>
          <p>This is a test email from Wayo Ads Market.</p>
          <p>If you received this email, your SMTP settings are configured correctly.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Sent from Wayo Ads Market<br>
            ${new Date().toISOString()}
          </p>
        </div>
      `,
      text: `Test Email Successful!\n\nThis is a test email from Wayo Ads Market.\nIf you received this email, your SMTP settings are configured correctly.\n\nSent: ${new Date().toISOString()}`,
    });

    // Create audit log
    await createAuditLog({
      userId,
      action: 'EMAIL_TEST_SENT',
      metadata: {
        testEmail,
        success: true,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    return {
      success: true,
      message: `Test email sent successfully to ${testEmail}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Create audit log for failure
    await createAuditLog({
      userId,
      action: 'EMAIL_TEST_FAILED',
      metadata: {
        testEmail,
        success: false,
        error: errorMessage,
      },
      ipAddress: requestInfo?.ipAddress,
      userAgent: requestInfo?.userAgent,
    });

    return {
      success: false,
      message: `Failed to send test email: ${errorMessage}`,
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if email is configured
 */
export async function isEmailConfigured(): Promise<boolean> {
  const credentials = await getEmailCredentials();
  return !!(credentials && credentials.host);
}
