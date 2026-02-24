/**
 * Security Email Templates
 * 
 * Templates for password reset, password change, and suspicious login alerts.
 */

import type { EmailTemplateContext } from '../types';
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
  PasswordResetVarsSchema,
  PasswordChangedVarsSchema,
  SuspiciousLoginVarsSchema,
} from '../types';

// ============================================
// TEMPLATE: security.password_reset
// ============================================

export function passwordResetHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = PasswordResetVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`Hi ${v.userName},`)}
    ${renderParagraph(`We received a request to reset your password. Click the button below to create a new password:`)}
    ${renderButton('Reset Password', v.resetUrl, 'secondary')}
    ${renderWarningBox(`⏰ This link will expire in ${v.expirationMinutes} minutes.`)}
    ${renderParagraph(`If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.`)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Reset your password`,
    title: 'Password Reset',
  }, body);
}

export function passwordResetText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = PasswordResetVarsSchema.parse(vars);
  
  const body = `
Hi ${v.userName},

We received a request to reset your password.

Reset your password: ${v.resetUrl}

⏰ This link will expire in ${v.expirationMinutes} minutes.

If you didn't request this password reset, you can safely ignore this email.
`;

  return renderTextLayout(context, {
    previewText: `Reset your password`,
  }, body);
}

// ============================================
// TEMPLATE: security.password_changed
// ============================================

export function passwordChangedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = PasswordChangedVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`Hi ${v.userName},`)}
    ${renderParagraph(`Your password was successfully changed.`)}
    ${renderInfoBox(`
      <strong>Time:</strong> ${v.timestamp}
    `)}
    ${renderParagraph(`If you didn't make this change, please secure your account immediately.`)}
    ${renderButton('Review Security Settings', v.securityUrl, 'secondary')}
  `;

  return renderHtmlLayout(context, {
    previewText: `Your password was changed`,
    title: 'Password Changed',
  }, body);
}

export function passwordChangedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = PasswordChangedVarsSchema.parse(vars);
  
  const body = `
Hi ${v.userName},

Your password was successfully changed.
Time: ${v.timestamp}

If you didn't make this change, please secure your account immediately:
${v.securityUrl}
`;

  return renderTextLayout(context, {
    previewText: `Your password was changed`,
  }, body);
}

// ============================================
// TEMPLATE: security.suspicious_login
// ============================================

export function suspiciousLoginHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = SuspiciousLoginVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`Security Alert: Suspicious login activity detected.`)}
    ${renderWarningBox(`
      <strong>Account:</strong> ${v.userEmail}<br>
      ${v.ipApprox ? `<strong>IP Address:</strong> ${v.ipApprox}<br>` : ''}
      <strong>Time:</strong> ${v.timestamp}
    `)}
    ${renderParagraph(`Multiple failed login attempts or unusual activity was detected on this account.`)}
    ${renderButton('Review Activity', v.actionUrl, 'secondary')}
    ${renderParagraph(`If you don't recognize this activity, we recommend changing your password immediately.`)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Security alert: Suspicious activity detected`,
    title: 'Security Alert',
  }, body);
}

export function suspiciousLoginText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = SuspiciousLoginVarsSchema.parse(vars);
  
  const body = `
SECURITY ALERT: Suspicious login activity detected.

Account: ${v.userEmail}
${v.ipApprox ? `IP Address: ${v.ipApprox}` : ''}
Time: ${v.timestamp}

Multiple failed login attempts or unusual activity was detected on this account.

Review activity: ${v.actionUrl}

If you don't recognize this activity, we recommend changing your password immediately.
`;

  return renderTextLayout(context, {
    previewText: `Security alert`,
  }, body);
}
