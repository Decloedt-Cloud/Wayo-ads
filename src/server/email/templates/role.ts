/**
 * Role Management Email Templates
 * 
 * Templates for role requests, approvals, and rejections.
 */

import type { EmailTemplateContext } from '../types';
import {
  renderHtmlLayout,
  renderTextLayout,
  renderButton,
  renderTextButton,
  renderParagraph,
  renderInfoBox,
  renderWarningBox,
} from './layout';
import {
  RoleRequestedVarsSchema,
  RoleApprovedVarsSchema,
  RoleRejectedVarsSchema,
} from '../types';

// ============================================
// TEMPLATE: role.requested
// ============================================

export function roleRequestedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = RoleRequestedVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`A user has requested a role upgrade.`)}
    ${renderInfoBox(`
      <strong>User ID:</strong> ${v.userId}<br>
      <strong>Requested Role:</strong> ${v.requestedRole}
      ${v.requestMessage ? `<br><strong>Message:</strong> ${v.requestMessage}` : ''}
    `)}
    ${renderButton('Review Request', v.reviewUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `New role request: ${v.requestedRole}`,
    title: 'Role Request',
  }, body);
}

export function roleRequestedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = RoleRequestedVarsSchema.parse(vars);
  
  const body = `
New role request submitted.

User ID: ${v.userId}
Requested Role: ${v.requestedRole}
${v.requestMessage ? `Message: ${v.requestMessage}` : ''}

Review: ${v.reviewUrl}
`;

  return renderTextLayout(context, {
    previewText: `New role request`,
  }, body);
}

// ============================================
// TEMPLATE: role.approved
// ============================================

export function roleApprovedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = RoleApprovedVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`Hi ${v.userName},`)}
    ${renderParagraph(`Great news! Your role upgrade has been approved.`)}
    ${renderInfoBox(`
      <strong>New Role:</strong> ${v.roleGranted}
    `)}
    ${renderParagraph(`You now have access to additional features on ${context.appName}.`)}
    ${renderButton('Go to Dashboard', v.dashboardUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Your role upgrade has been approved!`,
    title: 'Role Approved',
  }, body);
}

export function roleApprovedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = RoleApprovedVarsSchema.parse(vars);
  
  const body = `
Hi ${v.userName},

Great news! Your role upgrade has been approved.
New Role: ${v.roleGranted}

Dashboard: ${v.dashboardUrl}
`;

  return renderTextLayout(context, {
    previewText: `Role upgrade approved`,
  }, body);
}

// ============================================
// TEMPLATE: role.rejected
// ============================================

export function roleRejectedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = RoleRejectedVarsSchema.parse(vars);
  
  const body = `
    ${renderParagraph(`Hi ${v.userName},`)}
    ${renderParagraph(`Your request for the ${v.requestedRole} role was not approved at this time.`)}
    ${renderWarningBox(`
      <strong>Reason:</strong> ${v.reasonSummary}
    `)}
    ${renderParagraph(`If you have questions about this decision, please contact us at ${v.supportEmail}.`)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Update on your role request`,
    title: 'Role Request Update',
  }, body);
}

export function roleRejectedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = RoleRejectedVarsSchema.parse(vars);
  
  const body = `
Hi ${v.userName},

Your request for the ${v.requestedRole} role was not approved at this time.

Reason: ${v.reasonSummary}

Questions? Contact us at ${v.supportEmail}
`;

  return renderTextLayout(context, {
    previewText: `Update on your role request`,
  }, body);
}
