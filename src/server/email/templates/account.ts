/**
 * Account Lifecycle Email Templates
 * 
 * Templates for account creation, verification, approval, etc.
 */

import type { EmailTemplateName, EmailTemplateContext } from '../types';
import {
  renderHtmlLayout,
  renderTextLayout,
  renderButton,
  renderTextButton,
  renderParagraph,
  renderWarningBox,
  renderInfoBox,
} from './layout';
import {
  AccountCreatedVarsSchema,
  AccountVerifyVarsSchema,
  AccountVerifiedVarsSchema,
  AccountApprovedVarsSchema,
  AccountRejectedVarsSchema,
  AccountUpdatedVarsSchema,
  AccountDeactivatedVarsSchema,
  AccountDeletedVarsSchema,
} from '../types';

// ============================================
// TEMPLATE: account.created
// ============================================

export function accountCreatedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountCreatedVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`Hi ${v.userName},`)}
    ${renderParagraph(`Welcome to ${context.appName}! We're excited to have you on board.`)}
    ${renderParagraph(`Please verify your email address to get started.`)}
    ${renderButton('Verify Email', v.verifyEmailUrl)}
    ${renderWarningBox(`This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.`)}
    ${renderParagraph(`If you have any questions, feel free to reach out to us at ${v.supportEmail}.`)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Welcome to ${context.appName}! Please verify your email.`,
    title: 'Welcome!',
  }, body);
}

export function accountCreatedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountCreatedVarsSchema.parse(vars);
  
  const body = `
Hi ${v.userName},

Welcome to ${context.appName}! We're excited to have you on board.

Please verify your email address to get started:
${renderTextButton('Verify Email', v.verifyEmailUrl)}

This verification link will expire in 24 hours.
If you didn't create an account, you can safely ignore this email.

Questions? Contact us at ${v.supportEmail}
`;

  return renderTextLayout(context, {
    previewText: `Welcome to ${context.appName}!`,
  }, body);
}

// ============================================
// TEMPLATE: account.verify
// ============================================

export function accountVerifyHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountVerifyVarsSchema.parse(vars);
  
  const body = `
    ${v.userName ? renderParagraph(`Hi ${v.userName},`) : ''}
    ${renderParagraph(`Here's your email verification link.`)}
    ${renderButton('Verify Email', v.verifyEmailUrl)}
    ${renderWarningBox(`This link will expire in ${v.expirationMinutes} minutes. If you didn't request this, you can safely ignore this email.`)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Verify your email address`,
    title: 'Verify Your Email',
  }, body);
}

export function accountVerifyText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountVerifyVarsSchema.parse(vars);
  
  const body = `
${v.userName ? `Hi ${v.userName},\n\n` : ''}Here's your email verification link:

${renderTextButton('Verify Email', v.verifyEmailUrl)}

This link will expire in ${v.expirationMinutes} minutes.
If you didn't request this, you can safely ignore this email.
`;

  return renderTextLayout(context, {
    previewText: `Verify your email`,
  }, body);
}

// ============================================
// TEMPLATE: account.verified
// ============================================

export function accountVerifiedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountVerifiedVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`Hi ${v.userName},`)}
    ${renderParagraph(`Great news! Your email address has been verified successfully.`)}
    ${renderInfoBox(`✓ Your account is now fully activated`)}
    ${renderParagraph(`You can now access all features of ${context.appName}.`)}
    ${renderButton('Go to Dashboard', v.dashboardUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Your email has been verified`,
    title: 'Email Verified',
  }, body);
}

export function accountVerifiedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountVerifiedVarsSchema.parse(vars);
  
  const body = `
Hi ${v.userName},

Great news! Your email address has been verified successfully.
Your account is now fully activated.

Go to Dashboard: ${renderTextButton('Dashboard', v.dashboardUrl)}
`;

  return renderTextLayout(context, {
    previewText: `Your email has been verified`,
  }, body);
}

// ============================================
// TEMPLATE: account.pending_review
// ============================================

export function accountPendingReviewHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as { userId: string; userEmail: string; rolesRequested: string; reviewUrl: string };
  
  const body = `
    ${renderParagraph(`A new account requires admin review.`)}
    ${renderInfoBox(`
      <strong>User ID:</strong> ${v.userId}<br>
      <strong>Email:</strong> ${v.userEmail}<br>
      <strong>Roles Requested:</strong> ${v.rolesRequested}
    `)}
    ${renderButton('Review Account', v.reviewUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `New account pending review: ${v.userEmail}`,
    title: 'Account Pending Review',
  }, body);
}

export function accountPendingReviewText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as { userId: string; userEmail: string; rolesRequested: string; reviewUrl: string };
  
  const body = `
New account requires admin review:

User ID: ${v.userId}
Email: ${v.userEmail}
Roles Requested: ${v.rolesRequested}

Review: ${v.reviewUrl}
`;

  return renderTextLayout(context, {
    previewText: `Account pending review`,
  }, body);
}

// ============================================
// TEMPLATE: account.approved
// ============================================

export function accountApprovedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountApprovedVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`Hi ${v.userName},`)}
    ${renderParagraph(`Congratulations! Your account has been approved.`)}
    ${renderInfoBox(`
      <strong>Role Granted:</strong> ${v.roleGranted}
    `)}
    ${renderParagraph(`You can now log in and start using ${context.appName}.`)}
    ${renderButton('Log In Now', v.loginUrl)}
    ${v.nextStepsUrl ? renderParagraph(`<a href="${v.nextStepsUrl}" style="color: ${context.appName.includes('Wayo') ? '#F47A1F' : '#3b82f6'};">View next steps</a>`) : ''}
  `;

  return renderHtmlLayout(context, {
    previewText: `Your account has been approved!`,
    title: 'Account Approved',
  }, body);
}

export function accountApprovedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountApprovedVarsSchema.parse(vars);
  
  const body = `
Hi ${v.userName},

Congratulations! Your account has been approved.
Role Granted: ${v.roleGranted}

Log in: ${v.loginUrl}
${v.nextStepsUrl ? `Next steps: ${v.nextStepsUrl}` : ''}
`;

  return renderTextLayout(context, {
    previewText: `Your account has been approved`,
  }, body);
}

// ============================================
// TEMPLATE: account.rejected
// ============================================

export function accountRejectedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountRejectedVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`Hi ${v.userName},`)}
    ${renderParagraph(`We've reviewed your account request, but unfortunately we're unable to approve it at this time.`)}
    ${renderWarningBox(`
      <strong>Reason:</strong> ${v.reasonSummary}
    `)}
    ${v.reapplyUrl ? renderParagraph(`If you believe this was an error, you may <a href="${v.reapplyUrl}" style="color: #F47A1F;">submit a new request</a>.`) : ''}
    ${renderParagraph(`If you have questions, please contact us at ${v.supportEmail}.`)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Update on your account request`,
    title: 'Account Request Update',
  }, body);
}

export function accountRejectedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountRejectedVarsSchema.parse(vars);
  
  const body = `
Hi ${v.userName},

We've reviewed your account request, but unfortunately we're unable to approve it at this time.

Reason: ${v.reasonSummary}

${v.reapplyUrl ? `If you believe this was an error, you may submit a new request: ${v.reapplyUrl}` : ''}

Questions? Contact us at ${v.supportEmail}
`;

  return renderTextLayout(context, {
    previewText: `Update on your account request`,
  }, body);
}

// ============================================
// TEMPLATE: account.updated
// ============================================

export function accountUpdatedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountUpdatedVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`Hi ${v.userName},`)}
    ${renderParagraph(`Your account information was recently updated.`)}
    ${renderInfoBox(`
      <strong>Changes made to:</strong><br>
      ${v.changedFields.map(f => `• ${f}`).join('<br>')}
      <br><br>
      <strong>Time:</strong> ${v.timestamp}
      ${v.ipApprox ? `<br><strong>IP:</strong> ${v.ipApprox}` : ''}
    `)}
    ${renderParagraph(`If you didn't make these changes, please secure your account immediately.`)}
    ${renderButton('Review Security Settings', v.securityUrl, 'secondary')}
  `;

  return renderHtmlLayout(context, {
    previewText: `Your account was updated`,
    title: 'Account Updated',
  }, body);
}

export function accountUpdatedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountUpdatedVarsSchema.parse(vars);
  
  const body = `
Hi ${v.userName},

Your account information was recently updated.

Changes made to:
${v.changedFields.map(f => `• ${f}`).join('\n')}

Time: ${v.timestamp}
${v.ipApprox ? `IP: ${v.ipApprox}` : ''}

If you didn't make these changes, please secure your account immediately:
${v.securityUrl}
`;

  return renderTextLayout(context, {
    previewText: `Your account was updated`,
  }, body);
}

// ============================================
// TEMPLATE: account.deactivated
// ============================================

export function accountDeactivatedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountDeactivatedVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`Hi ${v.userName},`)}
    ${renderParagraph(`Your account has been deactivated.`)}
    ${v.reasonSummary ? renderInfoBox(`<strong>Reason:</strong> ${v.reasonSummary}`) : ''}
    ${renderParagraph(`If you believe this was a mistake or would like to reactivate your account, please contact support.`)}
    ${v.reactivateUrl ? renderButton('Reactivate Account', v.reactivateUrl, 'secondary') : ''}
    ${renderParagraph(`Contact us at ${v.supportEmail} for assistance.`)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Your account has been deactivated`,
    title: 'Account Deactivated',
  }, body);
}

export function accountDeactivatedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountDeactivatedVarsSchema.parse(vars);
  
  const body = `
Hi ${v.userName},

Your account has been deactivated.
${v.reasonSummary ? `Reason: ${v.reasonSummary}` : ''}

${v.reactivateUrl ? `Reactivate: ${v.reactivateUrl}` : ''}

Contact us at ${v.supportEmail} for assistance.
`;

  return renderTextLayout(context, {
    previewText: `Your account has been deactivated`,
  }, body);
}

// ============================================
// TEMPLATE: account.deleted
// ============================================

export function accountDeletedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountDeletedVarsSchema.parse(vars);
  
  const body = `
    ${v.userName ? renderParagraph(`Hi ${v.userName},`) : ''}
    ${renderParagraph(`Your account has been permanently deleted.`)}
    ${renderInfoBox(`
      <strong>Deletion Date:</strong> ${v.deletionDate}
    `)}
    ${v.exportDataUrl ? renderParagraph(`Your data export is available for download: <a href="${v.exportDataUrl}" style="color: #F47A1F;">Download</a>`) : ''}
    ${renderParagraph(`This action cannot be undone. If you have any questions, please contact us at ${v.supportEmail}.`)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Your account has been deleted`,
    title: 'Account Deleted',
  }, body);
}

export function accountDeletedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = AccountDeletedVarsSchema.parse(vars);
  
  const body = `
${v.userName ? `Hi ${v.userName},\n\n` : ''}Your account has been permanently deleted.

Deletion Date: ${v.deletionDate}

${v.exportDataUrl ? `Data export: ${v.exportDataUrl}` : ''}

This action cannot be undone.
Questions? Contact us at ${v.supportEmail}
`;

  return renderTextLayout(context, {
    previewText: `Your account has been deleted`,
  }, body);
}
