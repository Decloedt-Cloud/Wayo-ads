/**
 * Email System
 * 
 * Central export for all email functionality.
 */

// Types
export type {
  EmailProvider,
  EmailSendOptions,
  EmailSendResult,
  EmailTemplateName,
  EmailTemplateContext,
  EmailVars,
  EmailStatus,
  QueuedEmail,
  EmailCategory,
  UserEmailPreferences,
  DispatchOptions,
  DispatchResult,
} from './types';

// Providers
export {
  getEmailProvider,
  clearProviderCache,
  getAvailableProviders,
  devConsoleProvider,
  smtpProvider,
} from './providers';

// Templates
export {
  templateRegistry,
  renderTemplate,
  getAllTemplates,
  getTemplatesByCategory,
  getDefaultContext,
} from './templates';

// Dispatcher
export {
  dispatchEmail,
  processEmailQueue,
  getUserEmailPreferences,
  sendAccountCreatedEmail,
  sendPasswordResetEmail,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail,
  sendSuspiciousLoginAlert,
  sendRoleRequestNotification,
  sendWithdrawalNotification,
} from './dispatcher';
