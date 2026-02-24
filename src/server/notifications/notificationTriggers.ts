import { createUserNotification, createRoleBroadcast } from './notificationService';
import { sendNotificationEmailIfEnabled } from './notificationEmailService';

export interface NotificationTriggerContext {
  userId?: string;
  campaignId?: string;
  campaignName?: string;
  applicationId?: string;
  amount?: number;
  currency?: string;
  linkId?: string;
  creatorId?: string;
  creatorName?: string;
  withdrawalId?: string;
  reason?: string;
}

const defaultOptions = {
  scope: 'USER' as const,
  deliveryType: 'IN_APP' as const,
  expiresAt: undefined as unknown as Date | undefined,
};

const roleBroadcastOptions = {
  scope: 'ROLE' as const,
  deliveryType: 'IN_APP' as const,
  expiresAt: undefined as unknown as Date | undefined,
};

export async function notifyPaymentFailed(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'PAYMENT_FAILED',
    priority: 'P0_CRITICAL',
    title: 'Payment Failed',
    message: `Your payment could not be processed. ${ctx.reason ? `Reason: ${ctx.reason}` : 'Please update your payment method.'}`,
    actionUrl: '/wallet',
    dedupeKey: `payment_failed_${ctx.userId}`,
    metadata: { campaignId: ctx.campaignId, amount: ctx.amount },
  });
}

export async function notifyDepositFailed(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'DEPOSIT_FAILED',
    priority: 'P0_CRITICAL',
    title: 'Deposit Failed',
    message: `Your deposit of ${ctx.amount} ${ctx.currency || 'EUR'} could not be processed. ${ctx.reason ? `Reason: ${ctx.reason}` : 'Please try again or use a different payment method.'}`,
    actionUrl: '/wallet',
    dedupeKey: `deposit_failed_${ctx.userId}`,
    metadata: { amount: ctx.amount },
  });
}

export async function notifyBudgetExhausted(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'BUDGET_EXHAUSTED',
    priority: 'P1_HIGH',
    title: 'Campaign Budget Exhausted',
    message: `Your campaign "${ctx.campaignName}" has exhausted its budget and is now paused.`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}` : '/dashboard/advertiser',
    dedupeKey: `budget_exhausted_${ctx.campaignId}`,
    metadata: { campaignId: ctx.campaignId },
  });
}

export async function notifyBudgetLow(ctx: NotificationTriggerContext & { userId: string; percentRemaining?: number }) {
  const percent = ctx.percentRemaining || 10;
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'BUDGET_LOW',
    priority: 'P1_HIGH',
    title: 'Campaign Budget Low',
    message: `Your campaign "${ctx.campaignName}" has only ${percent}% budget remaining. ${ctx.amount ? `(${ctx.amount} ${ctx.currency || 'EUR'} left)` : ''}`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}` : '/dashboard/advertiser',
    dedupeKey: `budget_low_${ctx.campaignId}`,
    metadata: { campaignId: ctx.campaignId, percentRemaining: percent },
  });
}

export async function notifyCampaignPaused(ctx: NotificationTriggerContext & { userId: string; reason?: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'CAMPAIGN_PAUSED',
    priority: 'P1_HIGH',
    title: 'Campaign Paused',
    message: `Your campaign "${ctx.campaignName}" has been paused. ${ctx.reason ? `Reason: ${ctx.reason}` : ''}`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}` : '/dashboard/advertiser',
    metadata: { campaignId: ctx.campaignId, reason: ctx.reason },
  });
}

export async function notifyCampaignApproved(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'CAMPAIGN_APPROVED',
    priority: 'P2_NORMAL',
    title: 'Campaign Approved',
    message: `Your campaign "${ctx.campaignName}" has been approved and is now active.`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}` : '/dashboard/advertiser',
    metadata: { campaignId: ctx.campaignId },
  });
}

export async function notifyCampaignRejected(ctx: NotificationTriggerContext & { userId: string; reason?: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'CAMPAIGN_REJECTED',
    priority: 'P2_NORMAL',
    title: 'Campaign Rejected',
    message: `Your campaign "${ctx.campaignName}" has been rejected. ${ctx.reason ? `Reason: ${ctx.reason}` : ''}`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}` : '/dashboard/advertiser',
    metadata: { campaignId: ctx.campaignId, reason: ctx.reason },
  });
}

export async function notifyCreatorApplicationPending(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'CREATOR_APPLICATION_PENDING',
    priority: 'P2_NORMAL',
    title: 'Application Under Review',
    message: `Your application for campaign "${ctx.campaignName}" is now under review.`,
    actionUrl: ctx.applicationId ? `/dashboard/creator/applications/${ctx.applicationId}` : '/dashboard/creator',
    metadata: { campaignId: ctx.campaignId, applicationId: ctx.applicationId },
  });
}

export async function notifyCreatorApplicationApproved(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'CREATOR_APPLICATION_APPROVED',
    priority: 'P1_HIGH',
    title: 'Application Approved!',
    message: `Congratulations! Your application for "${ctx.campaignName}" has been approved.`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}/links` : '/dashboard/creator',
    dedupeKey: `creator_approved_${ctx.applicationId || ctx.campaignId}`,
    metadata: { campaignId: ctx.campaignId, applicationId: ctx.applicationId },
  });
}

export async function notifyCreatorApplicationRejected(ctx: NotificationTriggerContext & { userId: string; reason?: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'CREATOR_APPLICATION_REJECTED',
    priority: 'P2_NORMAL',
    title: 'Application Not Selected',
    message: `Your application for "${ctx.campaignName}" was not selected. ${ctx.reason ? `Reason: ${ctx.reason}` : 'Better luck next time!'}`,
    actionUrl: '/dashboard/creator',
    metadata: { campaignId: ctx.campaignId, applicationId: ctx.applicationId },
  });
}

export async function notifyWithdrawalFailed(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'WITHDRAWAL_FAILED',
    priority: 'P0_CRITICAL',
    title: 'Withdrawal Failed',
    message: `Your withdrawal of ${ctx.amount} ${ctx.currency || 'EUR'} could not be processed. ${ctx.reason ? `Reason: ${ctx.reason}` : 'Please contact support.'}`,
    actionUrl: '/dashboard/creator/withdrawals',
    dedupeKey: `withdrawal_failed_${ctx.withdrawalId || ctx.userId}`,
    metadata: { withdrawalId: ctx.withdrawalId, amount: ctx.amount },
  });
}

export async function notifyEarningsAvailable(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'EARNINGS_AVAILABLE',
    priority: 'P2_NORMAL',
    title: 'New Earnings Available',
    message: `You have ${ctx.amount} ${ctx.currency || 'EUR'} in earnings available for withdrawal.`,
    actionUrl: '/dashboard/creator/earnings',
    dedupeKey: `earnings_available_${ctx.userId}_${new Date().toDateString()}`,
    metadata: { amount: ctx.amount },
  });
}

export async function notifyTrackingDisabled(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'TRACKING_DISABLED',
    priority: 'P1_HIGH',
    title: 'Tracking Link Disabled',
    message: `Your tracking link for "${ctx.campaignName}" has been disabled by the advertiser.`,
    actionUrl: '/dashboard/creator/links',
    metadata: { campaignId: ctx.campaignId, linkId: ctx.linkId },
  });
}

export async function notifyFraudDetected(ctx: NotificationTriggerContext & { userId?: string }) {
  const targetUserId = ctx.userId;
  if (targetUserId) {
    return createUserNotification({
      ...defaultOptions,
      toUserId: targetUserId,
      type: 'FRAUD_DETECTED',
      priority: 'P1_HIGH',
      title: 'Unusual Traffic Detected',
      message: `Unusual traffic patterns have been detected on your campaign "${ctx.campaignName}". Please review your traffic sources.`,
      actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}` : '/dashboard/advertiser',
      dedupeKey: `fraud_detected_${ctx.campaignId}`,
      metadata: { campaignId: ctx.campaignId },
    });
  }
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'FRAUD_DETECTED',
    priority: 'P1_HIGH',
    title: 'Fraud Detected',
    message: `Fraud activity detected on campaign "${ctx.campaignName}" (ID: ${ctx.campaignId}). Immediate review required.`,
    actionUrl: '/dashboard/admin',
    dedupeKey: `fraud_admin_${ctx.campaignId}`,
    metadata: { campaignId: ctx.campaignId },
  });
}

export async function notifySuspiciousActivity(ctx: NotificationTriggerContext & { userId?: string }) {
  if (ctx.userId) {
    return createUserNotification({
      ...defaultOptions,
      toUserId: ctx.userId,
      type: 'SUSPICIOUS_ACTIVITY',
      priority: 'P0_CRITICAL',
      title: 'Security Alert: Suspicious Activity',
      message: `We detected unusual login activity on your account. If this wasn't you, please secure your account immediately.`,
      actionUrl: '/settings/security',
      dedupeKey: `suspicious_activity_${ctx.userId}`,
    });
  }
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'SUSPICIOUS_ACTIVITY',
    priority: 'P0_CRITICAL',
    title: 'Security Alert: Multiple Failed Logins',
    message: `Multiple failed login attempts detected. User ID: ${ctx.userId}. Please review for potential security threats.`,
    actionUrl: '/dashboard/admin',
    dedupeKey: `suspicious_admin_${ctx.userId}`,
  });
}

export async function notifyAccountPendingApproval(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'ACCOUNT_PENDING_APPROVAL',
    priority: 'P1_HIGH',
    title: 'Account Pending Approval',
    message: 'Your account is pending approval. You will be notified once your account has been reviewed.',
    actionUrl: '/settings',
    metadata: {},
  });
}

export async function notifyRoleRequestPending(ctx: NotificationTriggerContext & { userId: string }) {
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'ROLE_REQUEST_PENDING',
    priority: 'P1_HIGH',
    title: 'Role Request Pending',
    message: `User has requested a new role. Review required.`,
    actionUrl: '/dashboard/admin/users',
    metadata: { userId: ctx.userId },
  });
}

export async function notifyCredentialsInvalid(ctx: NotificationTriggerContext & { userId?: string }) {
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'CREDENTIALS_INVALID',
    priority: 'P0_CRITICAL',
    title: 'Platform Credentials Invalid',
    message: `Platform payment credentials are invalid or missing. Immediate attention required.`,
    actionUrl: '/dashboard/admin/settings',
    dedupeKey: 'credentials_invalid_admin',
    metadata: { reason: ctx.reason },
  });
}

export async function notifyWebhookFailure(ctx: NotificationTriggerContext) {
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'WEBHOOK_FAILURE',
    priority: 'P0_CRITICAL',
    title: 'Webhook Failure',
    message: `Webhook delivery failed. ${ctx.reason || 'Please check webhook configuration.'}`,
    actionUrl: '/dashboard/admin/settings',
    dedupeKey: `webhook_failure_${ctx.campaignId}`,
    metadata: { campaignId: ctx.campaignId },
  });
}

export async function notifyCreatorWithdrawalStuck(ctx: NotificationTriggerContext) {
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'WITHDRAWAL_FAILED',
    priority: 'P1_HIGH',
    title: 'Creator Withdrawal Stuck',
    message: `Creator withdrawal (ID: ${ctx.withdrawalId}) is stuck or failed. Amount: ${ctx.amount} ${ctx.currency || 'EUR'}. Creator: ${ctx.creatorName} (ID: ${ctx.creatorId})`,
    actionUrl: '/dashboard/admin/withdrawals',
    dedupeKey: `withdrawal_stuck_${ctx.withdrawalId}`,
    metadata: { withdrawalId: ctx.withdrawalId, amount: ctx.amount, creatorId: ctx.creatorId },
  });
}

export async function notifyCreatorApplied(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'CREATOR_APPLIED',
    priority: 'P2_NORMAL',
    title: 'New Creator Application',
    message: `A creator has applied to your campaign "${ctx.campaignName}".`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}/applications` : '/dashboard/advertiser',
    dedupeKey: `creator_applied_${ctx.campaignId}_${ctx.creatorId}`,
    metadata: { campaignId: ctx.campaignId, creatorId: ctx.creatorId },
  });
}

export async function notifyVideoSubmitted(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'VIDEO_SUBMITTED',
    priority: 'P2_NORMAL',
    title: 'New Video Submitted',
    message: `A creator has submitted a video for "${ctx.campaignName}". Please review.`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}/posts` : '/dashboard/advertiser',
    dedupeKey: `video_submitted_${ctx.campaignId}_${Date.now()}`,
    metadata: { campaignId: ctx.campaignId, creatorId: ctx.creatorId },
  });
}

export async function notifyVideoUpdated(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'VIDEO_UPDATED',
    priority: 'P2_NORMAL',
    title: 'Video Updated',
    message: `The creator has updated their video for "${ctx.campaignName}".`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}/posts` : '/dashboard/advertiser',
    metadata: { campaignId: ctx.campaignId, creatorId: ctx.creatorId },
  });
}

export async function notifyCampaignUnderReview(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'CAMPAIGN_UNDER_REVIEW',
    priority: 'P2_NORMAL',
    title: 'Campaign Under Review',
    message: `Your campaign "${ctx.campaignName}" is now under review. You'll be notified once it's approved.`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}` : '/dashboard/advertiser',
    metadata: { campaignId: ctx.campaignId },
  });
}

export async function notifyDynamicCpmChanged(ctx: NotificationTriggerContext & { userId: string; oldCpm?: number; newCpm?: number }) {
  const cpmChange = ctx.oldCpm && ctx.newCpm 
    ? ` (changed from €${ctx.oldCpm/100} to €${ctx.newCpm/100})`
    : '';
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'DYNAMIC_CPM_CHANGED',
    priority: 'P2_NORMAL',
    title: 'Campaign CPM Updated',
    message: `The CPM for your campaign "${ctx.campaignName}" has been adjusted${cpmChange}.`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}` : '/dashboard/advertiser',
    dedupeKey: `cpm_changed_${ctx.campaignId}`,
    metadata: { campaignId: ctx.campaignId, oldCpm: ctx.oldCpm, newCpm: ctx.newCpm },
  });
}

export async function notifyYouTubeDisconnected(ctx: NotificationTriggerContext & { userId: string; platform?: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'YOUTUBE_DISCONNECTED',
    priority: 'P1_HIGH',
    title: `${ctx.platform || 'YouTube'} Channel Disconnected`,
    message: `Your channel has been disconnected. Please reconnect to continue receiving campaign assignments.`,
    actionUrl: '/dashboard/creator/channels',
    dedupeKey: `channel_disconnected_${ctx.userId}`,
    metadata: { platform: ctx.platform },
  });
}

export async function notifyTrustScoreDowngraded(ctx: NotificationTriggerContext & { userId: string; oldScore?: number; newScore?: number }) {
  const result = await createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'TRUST_SCORE_DOWNGRADED',
    priority: 'P1_HIGH',
    title: 'Trust Score Downgraded',
    message: `Your trust score has been lowered to ${ctx.newScore || 'review required'}. This may affect your campaign eligibility.`,
    actionUrl: '/dashboard/creator/settings',
    dedupeKey: `trust_score_downgraded_${ctx.userId}_${new Date().toDateString()}`,
    metadata: { oldScore: ctx.oldScore, newScore: ctx.newScore },
  });

  sendNotificationEmailIfEnabled(ctx.userId, 'TRUST_SCORE_DOWNGRADED', {
    oldScore: ctx.oldScore,
    newScore: ctx.newScore,
  }).catch(err => console.error('Failed to send trust score downgrade email:', err));

  return result;
}

export async function notifyCreatorTierChanged(ctx: NotificationTriggerContext & { userId: string; oldTier?: string; newTier?: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'CREATOR_TIER_CHANGED',
    priority: 'P2_NORMAL',
    title: `Creator Tier Updated to ${ctx.newTier || 'New Tier'}`,
    message: `Your creator tier has been updated from ${ctx.oldTier || 'previous'} to ${ctx.newTier || 'new tier'}.`,
    actionUrl: '/dashboard/creator',
    dedupeKey: `tier_changed_${ctx.userId}_${new Date().toDateString()}`,
    metadata: { oldTier: ctx.oldTier, newTier: ctx.newTier },
  });
}

export async function notifyWithdrawalRequested(ctx: NotificationTriggerContext & { userId: string }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'WITHDRAWAL_REQUESTED',
    priority: 'P2_NORMAL',
    title: 'Withdrawal Requested',
    message: `Your withdrawal of ${ctx.amount} ${ctx.currency || 'EUR'} has been submitted and is pending approval.`,
    actionUrl: '/dashboard/creator/withdrawals',
    dedupeKey: `withdrawal_requested_${ctx.withdrawalId || ctx.userId}`,
    metadata: { withdrawalId: ctx.withdrawalId, amount: ctx.amount },
  });
}

export async function notifyWithdrawalApproved(ctx: NotificationTriggerContext & { userId: string }) {
  const result = await createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'WITHDRAWAL_APPROVED',
    priority: 'P1_HIGH',
    title: 'Withdrawal Approved',
    message: `Your withdrawal of ${ctx.amount} ${ctx.currency || 'EUR'} has been approved and will be processed soon.`,
    actionUrl: '/dashboard/creator/withdrawals',
    dedupeKey: `withdrawal_approved_${ctx.withdrawalId || ctx.userId}`,
    metadata: { withdrawalId: ctx.withdrawalId, amount: ctx.amount },
  });

  sendNotificationEmailIfEnabled(ctx.userId, 'WITHDRAWAL_APPROVED', {
    amount: ctx.amount,
    currency: ctx.currency || 'EUR',
    withdrawalId: ctx.withdrawalId,
  }).catch(err => console.error('Failed to send withdrawal approved email:', err));

  return result;
}

export async function notifyReserveLocked(ctx: NotificationTriggerContext & { userId: string; amount?: number }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'RESERVE_LOCKED',
    priority: 'P1_HIGH',
    title: 'Funds Reserved',
    message: `An amount of ${ctx.amount || 'funds'} ${ctx.currency || 'EUR'} has been reserved for campaign settlements.`,
    actionUrl: '/dashboard/advertiser/wallet',
    dedupeKey: `reserve_locked_${ctx.userId}_${ctx.campaignId}`,
    metadata: { campaignId: ctx.campaignId, amount: ctx.amount },
  });
}

export async function notifyReserveReleased(ctx: NotificationTriggerContext & { userId: string; amount?: number }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'RESERVE_RELEASED',
    priority: 'P2_NORMAL',
    title: 'Funds Released',
    message: `Reserved funds of ${ctx.amount || 'amount'} ${ctx.currency || 'EUR'} have been released to your wallet.`,
    actionUrl: '/dashboard/advertiser/wallet',
    dedupeKey: `reserve_released_${ctx.userId}_${ctx.campaignId}`,
    metadata: { campaignId: ctx.campaignId, amount: ctx.amount },
  });
}

export async function notifyCampaignConfidenceLow(ctx: NotificationTriggerContext & { userId: string; confidence?: number }) {
  return createUserNotification({
    ...defaultOptions,
    toUserId: ctx.userId,
    type: 'CAMPAIGN_CONFIDENCE_LOW',
    priority: 'P1_HIGH',
    title: 'Campaign Performance Alert',
    message: `Your campaign "${ctx.campaignName}" confidence score has dropped below 60%. Consider reviewing your targeting and content.`,
    actionUrl: ctx.campaignId ? `/campaigns/${ctx.campaignId}/financial-health` : '/dashboard/advertiser',
    dedupeKey: `confidence_low_${ctx.campaignId}`,
    metadata: { campaignId: ctx.campaignId, confidence: ctx.confidence },
  });
}

export async function notifyCreatorFlagged(ctx: NotificationTriggerContext & { reason?: string }) {
  const result = await createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'CREATOR_FLAGGED',
    priority: 'P0_CRITICAL',
    title: 'Creator Flagged for Review',
    message: `Creator ${ctx.creatorName || ctx.creatorId} has been flagged. ${ctx.reason || 'Manual review required.'}`,
    actionUrl: '/dashboard/admin/creators',
    dedupeKey: `creator_flagged_${ctx.creatorId}`,
    metadata: { creatorId: ctx.creatorId, reason: ctx.reason },
  });

  const { db } = await import('@/lib/db');
  const admins = await db.user.findMany({
    where: { roles: { contains: 'SUPERADMIN' } },
    select: { id: true, email: true, name: true },
  });

  for (const admin of admins) {
    if (admin.email) {
      sendNotificationEmailIfEnabled(admin.id, 'CREATOR_FLAGGED', {
        creatorId: ctx.creatorId,
        reason: ctx.reason,
      }).catch(err => console.error('Failed to send creator flagged email:', err));
    }
  }

  return result;
}

export async function notifyVelocitySpikeDetected(ctx: NotificationTriggerContext & { velocity?: number }) {
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'VELOCITY_SPIKE_DETECTED',
    priority: 'P0_CRITICAL',
    title: 'Creator Velocity Spike Detected',
    message: `Unusual viewing velocity detected for creator ${ctx.creatorName || ctx.creatorId}. Velocity: ${ctx.velocity || 'unknown'}x normal.`,
    actionUrl: '/dashboard/admin/creator-velocity',
    dedupeKey: `velocity_spike_${ctx.creatorId}_${new Date().toDateString()}`,
    metadata: { creatorId: ctx.creatorId, velocity: ctx.velocity },
  });
}

export async function notifyFraudScoreExceeded(ctx: NotificationTriggerContext & { userId?: string; score?: number }) {
  if (ctx.userId) {
    return createUserNotification({
      ...defaultOptions,
      toUserId: ctx.userId,
      type: 'FRAUD_SCORE_EXCEEDED',
      priority: 'P0_CRITICAL',
      title: 'Account Under Review',
      message: `Your account is under review due to unusual activity. Please contact support if you believe this is an error.`,
      actionUrl: '/support',
      dedupeKey: `fraud_score_user_${ctx.userId}`,
    });
  }
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'FRAUD_SCORE_EXCEEDED',
    priority: 'P0_CRITICAL',
    title: 'Fraud Score Threshold Exceeded',
    message: `Creator ${ctx.creatorName || ctx.creatorId} has exceeded fraud score threshold. Score: ${ctx.score || 'unknown'}.`,
    actionUrl: '/dashboard/admin/creators',
    dedupeKey: `fraud_score_admin_${ctx.creatorId}`,
    metadata: { creatorId: ctx.creatorId, score: ctx.score },
  });
}

export async function notifyCampaignAutoPaused(ctx: NotificationTriggerContext) {
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'CAMPAIGN_AUTO_PAUSED',
    priority: 'P1_HIGH',
    title: 'Campaign Auto-Paused',
    message: `Campaign "${ctx.campaignName}" (ID: ${ctx.campaignId}) has been automatically paused due to budget or performance issues.`,
    actionUrl: '/dashboard/admin/campaigns',
    dedupeKey: `auto_paused_${ctx.campaignId}`,
    metadata: { campaignId: ctx.campaignId, campaignName: ctx.campaignName },
  });
}

export async function notifyExcessiveFraudPattern(ctx: NotificationTriggerContext & { pattern?: string; count?: number }) {
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'EXCESSIVE_FRAUD_PATTERN',
    priority: 'P0_CRITICAL',
    title: 'Excessive Fraud Pattern Detected',
    message: `Multiple fraud incidents detected: ${ctx.pattern || 'Unknown pattern'}. Count: ${ctx.count || 0}. Immediate investigation required.`,
    actionUrl: '/dashboard/admin/fraud',
    dedupeKey: `fraud_pattern_${ctx.creatorId}_${new Date().toDateString()}`,
    metadata: { creatorId: ctx.creatorId, pattern: ctx.pattern, count: ctx.count },
  });
}

export async function notifyUnusualPayoutCluster(ctx: NotificationTriggerContext & { count?: number; totalAmount?: number }) {
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'UNUSUAL_PAYOUT_CLUSTER',
    priority: 'P0_CRITICAL',
    title: 'Unusual Payout Cluster Detected',
    message: `Unusual payout pattern detected: ${ctx.count || 0} payouts totaling ${ctx.totalAmount || 0} EUR in short timeframe.`,
    actionUrl: '/dashboard/admin/payouts',
    dedupeKey: `payout_cluster_${new Date().toDateString()}`,
    metadata: { count: ctx.count, totalAmount: ctx.totalAmount },
  });
}

export async function notifyStripePayoutFailure(ctx: NotificationTriggerContext) {
  return createRoleBroadcast({
    ...roleBroadcastOptions,
    toRole: 'ADMIN',
    type: 'STRIPE_PAYOUT_FAILURE',
    priority: 'P0_CRITICAL',
    title: 'Stripe Payout Failed',
    message: `Stripe payout failed. ${ctx.reason || 'Please check Stripe dashboard for details.'}`,
    actionUrl: '/dashboard/admin/payouts',
    dedupeKey: `stripe_payout_failed_${ctx.withdrawalId || Date.now()}`,
    metadata: { withdrawalId: ctx.withdrawalId, reason: ctx.reason },
  });
}
