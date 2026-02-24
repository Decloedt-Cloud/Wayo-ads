/**
 * Marketplace Email Templates (Phase 2)
 * 
 * Templates for campaign, payout, and deposit notifications.
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
  renderErrorBox,
} from './layout';

// ============================================
// TEMPLATE: marketplace.creator_applied
// ============================================

interface CreatorAppliedVars {
  advertiserName: string;
  creatorName: string;
  campaignTitle: string;
  campaignId: string;
  message?: string;
  applicationUrl: string;
}

export function creatorAppliedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as CreatorAppliedVars;
  
  const body = `
    ${renderParagraph(`Hi ${v.advertiserName},`)}
    ${renderParagraph(`A creator has applied to your campaign!`)}
    ${renderInfoBox(`
      <strong>Campaign:</strong> ${v.campaignTitle}<br>
      <strong>Creator:</strong> ${v.creatorName}
      ${v.message ? `<br><strong>Message:</strong> "${v.message}"` : ''}
    `)}
    ${renderButton('Review Application', v.applicationUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `New application for ${v.campaignTitle}`,
    title: 'New Creator Application',
  }, body);
}

export function creatorAppliedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as CreatorAppliedVars;
  
  const body = `
Hi ${v.advertiserName},

A creator has applied to your campaign!

Campaign: ${v.campaignTitle}
Creator: ${v.creatorName}
${v.message ? `Message: "${v.message}"` : ''}

Review: ${v.applicationUrl}
`;

  return renderTextLayout(context, {
    previewText: `New application for your campaign`,
  }, body);
}

// ============================================
// TEMPLATE: marketplace.creator_approved
// ============================================

interface CreatorApprovedVars {
  creatorName: string;
  campaignTitle: string;
  campaignId: string;
  trackingLinkUrl: string;
  dashboardUrl: string;
}

export function creatorApprovedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as CreatorApprovedVars;
  
  const body = `
    ${renderParagraph(`Hi ${v.creatorName},`)}
    ${renderParagraph(`Great news! You've been approved for the campaign "${v.campaignTitle}".`)}
    ${renderInfoBox(`
      <strong>Your unique tracking link:</strong><br>
      <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${v.trackingLinkUrl}</code>
    `)}
    ${renderParagraph(`Share this link with your audience to start earning!`)}
    ${renderButton('View Campaign Details', v.dashboardUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `You've been approved for ${v.campaignTitle}!`,
    title: 'Application Approved',
  }, body);
}

export function creatorApprovedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as CreatorApprovedVars;
  
  const body = `
Hi ${v.creatorName},

Great news! You've been approved for the campaign "${v.campaignTitle}".

Your tracking link: ${v.trackingLinkUrl}

Share this link with your audience to start earning!

Campaign details: ${v.dashboardUrl}
`;

  return renderTextLayout(context, {
    previewText: `Application approved!`,
  }, body);
}

// ============================================
// TEMPLATE: marketplace.creator_rejected
// ============================================

interface CreatorRejectedVars {
  creatorName: string;
  campaignTitle: string;
  reason?: string;
  browseCampaignsUrl: string;
}

export function creatorRejectedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as CreatorRejectedVars;
  
  const body = `
    ${renderParagraph(`Hi ${v.creatorName},`)}
    ${renderParagraph(`Thank you for your interest in the campaign "${v.campaignTitle}". Unfortunately, your application was not selected at this time.`)}
    ${v.reason ? renderInfoBox(`<strong>Feedback:</strong> ${v.reason}`) : ''}
    ${renderParagraph(`Don't be discouraged! There are more opportunities available.`)}
    ${renderButton('Browse More Campaigns', v.browseCampaignsUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Update on your campaign application`,
    title: 'Application Update',
  }, body);
}

export function creatorRejectedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as CreatorRejectedVars;
  
  const body = `
Hi ${v.creatorName},

Thank you for your interest in the campaign "${v.campaignTitle}".
Unfortunately, your application was not selected at this time.

${v.reason ? `Feedback: ${v.reason}` : ''}

Don't be discouraged! Browse more campaigns: ${v.browseCampaignsUrl}
`;

  return renderTextLayout(context, {
    previewText: `Update on your application`,
  }, body);
}

// ============================================
// TEMPLATE: marketplace.budget_low
// ============================================

interface BudgetLowVars {
  advertiserName: string;
  campaignTitle: string;
  remainingBudget: string;
  estimatedDaysRemaining: number;
  addFundsUrl: string;
}

export function budgetLowHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as BudgetLowVars;
  
  const body = `
    ${renderParagraph(`Hi ${v.advertiserName},`)}
    ${renderWarningBox(`
      <strong>⚠️ Low Budget Alert</strong><br>
      Your campaign "${v.campaignTitle}" is running low on budget.
    `)}
    ${renderInfoBox(`
      <strong>Remaining Budget:</strong> ${v.remainingBudget}<br>
      <strong>Estimated Days Remaining:</strong> ${v.estimatedDaysRemaining}
    `)}
    ${renderParagraph(`Add funds to keep your campaign running and avoid interruption.`)}
    ${renderButton('Add Funds', v.addFundsUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Low budget alert: ${v.campaignTitle}`,
    title: 'Budget Alert',
  }, body);
}

export function budgetLowText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as BudgetLowVars;
  
  const body = `
Hi ${v.advertiserName},

⚠️ LOW BUDGET ALERT

Your campaign "${v.campaignTitle}" is running low on budget.

Remaining Budget: ${v.remainingBudget}
Estimated Days Remaining: ${v.estimatedDaysRemaining}

Add funds: ${v.addFundsUrl}
`;

  return renderTextLayout(context, {
    previewText: `Low budget alert`,
  }, body);
}

// ============================================
// TEMPLATE: marketplace.payout_available
// ============================================

interface PayoutAvailableVars {
  creatorName: string;
  amount: string;
  campaignTitle: string;
  withdrawalUrl: string;
}

export function payoutAvailableHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as PayoutAvailableVars;
  
  const body = `
    ${renderParagraph(`Hi ${v.creatorName},`)}
    ${renderParagraph(`Great news! You have earnings ready for withdrawal.`)}
    ${renderInfoBox(`
      <strong>Amount Available:</strong> ${v.amount}<br>
      <strong>From Campaign:</strong> ${v.campaignTitle}
    `)}
    ${renderButton('Withdraw Now', v.withdrawalUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `You have ${v.amount} available for withdrawal`,
    title: 'Payout Available',
  }, body);
}

export function payoutAvailableText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as PayoutAvailableVars;
  
  const body = `
Hi ${v.creatorName},

Great news! You have earnings ready for withdrawal.

Amount Available: ${v.amount}
From Campaign: ${v.campaignTitle}

Withdraw: ${v.withdrawalUrl}
`;

  return renderTextLayout(context, {
    previewText: `Payout available`,
  }, body);
}

// ============================================
// TEMPLATE: marketplace.withdrawal_requested
// ============================================

interface WithdrawalRequestedVars {
  creatorName: string;
  amount: string;
  withdrawalId: string;
  estimatedProcessingDays: number;
  dashboardUrl: string;
}

export function withdrawalRequestedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as WithdrawalRequestedVars;
  
  const body = `
    ${renderParagraph(`Hi ${v.creatorName},`)}
    ${renderParagraph(`Your withdrawal request has been submitted.`)}
    ${renderInfoBox(`
      <strong>Amount:</strong> ${v.amount}<br>
      <strong>Withdrawal ID:</strong> ${v.withdrawalId}<br>
      <strong>Estimated Processing:</strong> ${v.estimatedProcessingDays} business days
    `)}
    ${renderButton('Track Status', v.dashboardUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Withdrawal request submitted: ${v.amount}`,
    title: 'Withdrawal Requested',
  }, body);
}

export function withdrawalRequestedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as WithdrawalRequestedVars;
  
  const body = `
Hi ${v.creatorName},

Your withdrawal request has been submitted.

Amount: ${v.amount}
Withdrawal ID: ${v.withdrawalId}
Estimated Processing: ${v.estimatedProcessingDays} business days

Track status: ${v.dashboardUrl}
`;

  return renderTextLayout(context, {
    previewText: `Withdrawal requested`,
  }, body);
}

// ============================================
// TEMPLATE: marketplace.withdrawal_paid
// ============================================

interface WithdrawalPaidVars {
  creatorName: string;
  amount: string;
  withdrawalId: string;
  paidAt: string;
  dashboardUrl: string;
}

export function withdrawalPaidHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as WithdrawalPaidVars;
  
  const body = `
    ${renderParagraph(`Hi ${v.creatorName},`)}
    ${renderParagraph(`Your withdrawal has been processed successfully!`)}
    ${renderInfoBox(`
      <strong>Amount:</strong> ${v.amount}<br>
      <strong>Withdrawal ID:</strong> ${v.withdrawalId}<br>
      <strong>Paid On:</strong> ${v.paidAt}
    `)}
    ${renderParagraph(`The funds should appear in your account within 1-3 business days.`)}
    ${renderButton('View History', v.dashboardUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Withdrawal complete: ${v.amount}`,
    title: 'Withdrawal Complete',
  }, body);
}

export function withdrawalPaidText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as WithdrawalPaidVars;
  
  const body = `
Hi ${v.creatorName},

Your withdrawal has been processed successfully!

Amount: ${v.amount}
Withdrawal ID: ${v.withdrawalId}
Paid On: ${v.paidAt}

The funds should appear in your account within 1-3 business days.

View history: ${v.dashboardUrl}
`;

  return renderTextLayout(context, {
    previewText: `Withdrawal complete`,
  }, body);
}

// ============================================
// TEMPLATE: marketplace.withdrawal_failed
// ============================================

interface WithdrawalFailedVars {
  creatorName: string;
  amount: string;
  withdrawalId: string;
  errorMessage: string;
  retryUrl: string;
  supportEmail: string;
}

export function withdrawalFailedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as WithdrawalFailedVars;
  
  const body = `
    ${renderParagraph(`Hi ${v.creatorName},`)}
    ${renderErrorBox(`
      <strong>Withdrawal Failed</strong><br>
      Your withdrawal of ${v.amount} could not be processed.
    `)}
    ${renderInfoBox(`
      <strong>Withdrawal ID:</strong> ${v.withdrawalId}<br>
      <strong>Reason:</strong> ${v.errorMessage}
    `)}
    ${renderParagraph(`The funds have been returned to your available balance. Please try again or contact support if the issue persists.`)}
    ${renderButton('Try Again', v.retryUrl)}
    ${renderParagraph(`Need help? Contact ${v.supportEmail}`)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Withdrawal failed: ${v.amount}`,
    title: 'Withdrawal Failed',
  }, body);
}

export function withdrawalFailedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as WithdrawalFailedVars;
  
  const body = `
Hi ${v.creatorName},

WITHDRAWAL FAILED

Your withdrawal of ${v.amount} could not be processed.

Withdrawal ID: ${v.withdrawalId}
Reason: ${v.errorMessage}

The funds have been returned to your available balance.

Try again: ${v.retryUrl}
Support: ${v.supportEmail}
`;

  return renderTextLayout(context, {
    previewText: `Withdrawal failed`,
  }, body);
}

// ============================================
// TEMPLATE: marketplace.deposit_succeeded
// ============================================

interface DepositSucceededVars {
  advertiserName: string;
  amount: string;
  newBalance: string;
  depositId: string;
  dashboardUrl: string;
}

export function depositSucceededHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as DepositSucceededVars;
  
  const body = `
    ${renderParagraph(`Hi ${v.advertiserName},`)}
    ${renderParagraph(`Your deposit was successful!`)}
    ${renderInfoBox(`
      <strong>Amount Deposited:</strong> ${v.amount}<br>
      <strong>New Balance:</strong> ${v.newBalance}<br>
      <strong>Transaction ID:</strong> ${v.depositId}
    `)}
    ${renderParagraph(`Your funds are now available for campaign budgets.`)}
    ${renderButton('View Wallet', v.dashboardUrl)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Deposit successful: ${v.amount}`,
    title: 'Deposit Complete',
  }, body);
}

export function depositSucceededText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as DepositSucceededVars;
  
  const body = `
Hi ${v.advertiserName},

Your deposit was successful!

Amount Deposited: ${v.amount}
New Balance: ${v.newBalance}
Transaction ID: ${v.depositId}

Your funds are now available for campaign budgets.

View Wallet: ${v.dashboardUrl}
`;

  return renderTextLayout(context, {
    previewText: `Deposit successful`,
  }, body);
}

// ============================================
// TEMPLATE: marketplace.deposit_failed
// ============================================

interface DepositFailedVars {
  advertiserName: string;
  amount: string;
  errorMessage: string;
  retryUrl: string;
  supportEmail: string;
}

export function depositFailedHtml(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as DepositFailedVars;
  
  const body = `
    ${renderParagraph(`Hi ${v.advertiserName},`)}
    ${renderErrorBox(`
      <strong>Deposit Failed</strong><br>
      Your deposit of ${v.amount} could not be processed.
    `)}
    ${renderInfoBox(`
      <strong>Reason:</strong> ${v.errorMessage}
    `)}
    ${renderParagraph(`Please verify your payment method and try again. If the problem persists, contact your bank or our support team.`)}
    ${renderButton('Try Again', v.retryUrl)}
    ${renderParagraph(`Need help? Contact ${v.supportEmail}`)}
  `;

  return renderHtmlLayout(context, {
    previewText: `Deposit failed: ${v.amount}`,
    title: 'Deposit Failed',
  }, body);
}

export function depositFailedText(
  context: EmailTemplateContext,
  vars: Record<string, unknown>
): string {
  const v = vars as unknown as DepositFailedVars;
  
  const body = `
Hi ${v.advertiserName},

DEPOSIT FAILED

Your deposit of ${v.amount} could not be processed.

Reason: ${v.errorMessage}

Please verify your payment method and try again.

Try Again: ${v.retryUrl}
Support: ${v.supportEmail}
`;

  return renderTextLayout(context, {
    previewText: `Deposit failed`,
  }, body);
}
