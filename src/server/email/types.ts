/**
 * Email System Types
 * 
 * Core types for the email notification system.
 * Provider-agnostic design with strong typing.
 */

import { z } from 'zod';

// ============================================
// EMAIL PROVIDER INTERFACE
// ============================================

export interface EmailSendOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  name: string;
  send(options: EmailSendOptions): Promise<EmailSendResult>;
  isConfigured(): Promise<boolean>;
}

// ============================================
// EMAIL TEMPLATE TYPES
// ============================================

export type EmailTemplateName =
  // Account lifecycle
  | 'account.created'
  | 'account.verify'
  | 'account.verified'
  | 'account.pending_review'
  | 'account.approved'
  | 'account.rejected'
  | 'account.updated'
  | 'account.deactivated'
  | 'account.deleted'
  // Role management
  | 'role.requested'
  | 'role.approved'
  | 'role.rejected'
  // Security
  | 'security.password_reset'
  | 'security.password_changed'
  | 'security.suspicious_login'
  // Marketplace (Phase 2)
  | 'marketplace.creator_applied'
  | 'marketplace.creator_approved'
  | 'marketplace.creator_rejected'
  | 'marketplace.budget_low'
  | 'marketplace.payout_available'
  | 'marketplace.withdrawal_requested'
  | 'marketplace.withdrawal_paid'
  | 'marketplace.withdrawal_failed'
  | 'marketplace.deposit_succeeded'
  | 'marketplace.deposit_failed';

export interface EmailTemplateContext {
  appName: string;
  appUrl: string;
  supportEmail: string;
  currentYear: number;
}

export interface BaseEmailVars {
  userName?: string;
  userEmail?: string;
}

// Template variable schemas for validation
export const AccountCreatedVarsSchema = z.object({
  userName: z.string(),
  verifyEmailUrl: z.string().url(),
  supportEmail: z.string().email(),
});

export const AccountVerifyVarsSchema = z.object({
  userName: z.string().optional(),
  verifyEmailUrl: z.string().url(),
  expirationMinutes: z.number().int().positive(),
});

export const AccountVerifiedVarsSchema = z.object({
  userName: z.string(),
  dashboardUrl: z.string().url(),
});

export const AccountPendingReviewVarsSchema = z.object({
  userId: z.string(),
  userEmail: z.string().email(),
  rolesRequested: z.string(),
  reviewUrl: z.string().url(),
});

export const AccountApprovedVarsSchema = z.object({
  userName: z.string(),
  loginUrl: z.string().url(),
  roleGranted: z.string(),
  nextStepsUrl: z.string().url().optional(),
});

export const AccountRejectedVarsSchema = z.object({
  userName: z.string(),
  reasonSummary: z.string(),
  reapplyUrl: z.string().url().optional(),
  supportEmail: z.string().email(),
});

export const RoleRequestedVarsSchema = z.object({
  userId: z.string(),
  requestedRole: z.string(),
  requestMessage: z.string().optional(),
  reviewUrl: z.string().url(),
});

export const RoleApprovedVarsSchema = z.object({
  userName: z.string(),
  roleGranted: z.string(),
  dashboardUrl: z.string().url(),
});

export const RoleRejectedVarsSchema = z.object({
  userName: z.string(),
  requestedRole: z.string(),
  reasonSummary: z.string(),
  supportEmail: z.string().email(),
});

export const AccountUpdatedVarsSchema = z.object({
  userName: z.string(),
  changedFields: z.array(z.string()),
  timestamp: z.string(),
  ipApprox: z.string().optional(),
  securityUrl: z.string().url(),
});

export const AccountDeactivatedVarsSchema = z.object({
  userName: z.string(),
  reactivateUrl: z.string().url().optional(),
  supportEmail: z.string().email(),
  reasonSummary: z.string().optional(),
});

export const AccountDeletedVarsSchema = z.object({
  userName: z.string().optional(),
  deletionDate: z.string(),
  exportDataUrl: z.string().url().optional(),
  supportEmail: z.string().email(),
});

export const PasswordResetVarsSchema = z.object({
  userName: z.string(),
  resetUrl: z.string().url(),
  expirationMinutes: z.number().int().positive(),
});

export const PasswordChangedVarsSchema = z.object({
  userName: z.string(),
  timestamp: z.string(),
  securityUrl: z.string().url(),
});

export const SuspiciousLoginVarsSchema = z.object({
  userEmail: z.string().email(),
  ipApprox: z.string().optional(),
  timestamp: z.string(),
  actionUrl: z.string().url(),
});

// Union type for all template variables
export type EmailVars =
  | z.infer<typeof AccountCreatedVarsSchema>
  | z.infer<typeof AccountVerifyVarsSchema>
  | z.infer<typeof AccountVerifiedVarsSchema>
  | z.infer<typeof AccountPendingReviewVarsSchema>
  | z.infer<typeof AccountApprovedVarsSchema>
  | z.infer<typeof AccountRejectedVarsSchema>
  | z.infer<typeof RoleRequestedVarsSchema>
  | z.infer<typeof RoleApprovedVarsSchema>
  | z.infer<typeof RoleRejectedVarsSchema>
  | z.infer<typeof AccountUpdatedVarsSchema>
  | z.infer<typeof AccountDeactivatedVarsSchema>
  | z.infer<typeof AccountDeletedVarsSchema>
  | z.infer<typeof PasswordResetVarsSchema>
  | z.infer<typeof PasswordChangedVarsSchema>
  | z.infer<typeof SuspiciousLoginVarsSchema>;

// ============================================
// EMAIL QUEUE TYPES
// ============================================

export type EmailStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';

export interface QueuedEmail {
  id: string;
  toEmail: string;
  toName: string | null;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  templateName: string | null;
  templateData: string | null;
  dedupeKey: string | null;
  correlationId: string | null;
  status: EmailStatus;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  nextRetryAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
}

// ============================================
// EMAIL PREFERENCES TYPES
// ============================================

export type EmailCategory =
  | 'accountEmails'
  | 'securityEmails'
  | 'marketingEmails'
  | 'campaignEmails'
  | 'payoutEmails';

export interface UserEmailPreferences {
  optOutAll: boolean;
  accountEmails: boolean;
  securityEmails: boolean;
  marketingEmails: boolean;
  campaignEmails: boolean;
  payoutEmails: boolean;
}

// ============================================
// DISPATCHER TYPES
// ============================================

export interface DispatchOptions {
  to: string;
  toName?: string;
  templateName: EmailTemplateName;
  variables: Record<string, unknown>;
  correlationId?: string;
  dedupeKey?: string;
  skipPreferenceCheck?: boolean;
}

export interface DispatchResult {
  success: boolean;
  emailId?: string;
  status?: EmailStatus;
  error?: string;
}
