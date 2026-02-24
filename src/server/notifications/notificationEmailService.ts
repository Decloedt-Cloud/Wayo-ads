import { userRepository } from '@/server/admin/repositories';
import { getEmailCredentials } from '@/server/admin/emailSettingsService';

interface SendNotificationEmailParams {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendNotificationEmail({
  toEmail,
  toName,
  subject,
  htmlContent,
  textContent,
}: SendNotificationEmailParams): Promise<{ success: boolean; error?: string }> {
  const credentials = await getEmailCredentials();

  if (!credentials) {
    console.warn('[EMAIL] Email not configured, skipping notification email');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const nodemailer = await import('nodemailer');

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

    await transporter.sendMail({
      from: `"${credentials.fromName || 'Wayo Ads'}" <${credentials.fromEmail}>`,
      to: toName ? `"${toName}" <${toEmail}>` : toEmail,
      subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
    });

    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Failed to send notification email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

export interface NotificationEmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export function getNotificationEmailTemplate(
  type: string,
  data: Record<string, any>
): NotificationEmailTemplate {
  const templates: Record<string, (data: Record<string, any>) => NotificationEmailTemplate> = {
    WITHDRAWAL_APPROVED: (d) => ({
      subject: `Withdrawal of ${d.currency} ${d.amount} Approved`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #F47A1F 0%, #FF9F45 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">💰 Withdrawal Approved</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Your withdrawal request has been approved!</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Amount:</strong> ${d.currency} ${d.amount}</p>
              <p style="margin: 10px 0;"><strong>Status:</strong> Approved</p>
            </div>
            <p>The funds will be transferred to your account within 1-3 business days.</p>
          </div>
        </div>
      `,
    }),

    WITHDRAWAL_REQUESTED: (d) => ({
      subject: `Withdrawal of ${d.currency} ${d.amount} Requested`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">📤 Withdrawal Requested</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Your withdrawal request has been submitted and is pending approval.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Amount:</strong> ${d.currency} ${d.amount}</p>
              <p style="margin: 10px 0;"><strong>Status:</strong> Pending Approval</p>
            </div>
          </div>
        </div>
      `,
    }),

    PAYMENT_FAILED: (d) => ({
      subject: 'Payment Failed - Action Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f44336 0%, #e91e63 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">⚠️ Payment Failed</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>A payment could not be processed. Please check your payment method.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Reason:</strong> ${d.reason || 'Unknown error'}</p>
            </div>
            <p>Please update your payment information to continue.</p>
          </div>
        </div>
      `,
    }),

    TRUST_SCORE_DOWNGRADED: (d) => ({
      subject: `Your Trust Score Has Changed`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #FF9800 0%, #FFC107 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">📉 Trust Score Update</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Your trust score has been updated:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 10px 0; font-size: 24px;">
                <strong>${d.oldScore}</strong> → <strong style="color: ${d.newScore < d.oldScore ? '#f44336' : '#4CAF50'}">${d.newScore}</strong>
              </p>
            </div>
            <p>This may affect your earnings multiplier. Please review your metrics.</p>
          </div>
        </div>
      `,
    }),

    CREATOR_FLAGGED: (d) => ({
      subject: 'Account Flagged for Review',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f44336 0%, #e91e63 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">🚨 Account Flagged</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Your account has been flagged for review due to unusual activity.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Reason:</strong> ${d.reason}</p>
            </div>
            <p>Please contact support if you believe this is an error.</p>
          </div>
        </div>
      `,
    }),

    CAMPAIGN_APPROVED: (d) => ({
      subject: `Campaign "${d.campaignName}" Approved`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">✅ Campaign Approved</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Your campaign has been approved and is now active!</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Campaign:</strong> ${d.campaignName}</p>
            </div>
          </div>
        </div>
      `,
    }),

    CAMPAIGN_REJECTED: (d) => ({
      subject: `Campaign "${d.campaignName}" Rejected`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f44336 0%, #e91e63 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">❌ Campaign Rejected</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Your campaign has been rejected.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Campaign:</strong> ${d.campaignName}</p>
              <p style="margin: 10px 0;"><strong>Reason:</strong> ${d.reason || 'Does not meet our guidelines'}</p>
            </div>
          </div>
        </div>
      `,
    }),

    VIDEO_APPROVED: (d) => ({
      subject: 'Video Submission Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">✅ Video Approved</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Your video submission has been approved!</p>
            <p>Campaign: ${d.campaignName}</p>
          </div>
        </div>
      `,
    }),

    VIDEO_REJECTED: (d) => ({
      subject: 'Video Submission Needs Revision',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #FF9800 0%, #FFC107 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">📝 Video Needs Revision</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Your video submission needs some changes.</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Campaign:</strong> ${d.campaignName}</p>
              <p style="margin: 10px 0;"><strong>Feedback:</strong> ${d.feedback || 'Please review and resubmit'}</p>
            </div>
          </div>
        </div>
      `,
    }),

    SYSTEM_ANNOUNCEMENT: (d) => ({
      subject: d.title || 'Important Announcement',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2196F3 0%, #03A9F4 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">📢 ${d.title || 'Important Announcement'}</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>${d.message}</p>
          </div>
        </div>
      `,
    }),
  };

  const templateFn = templates[type];
  if (templateFn) {
    return templateFn(data);
  }

  return {
    subject: 'Wayo Ads Notification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1>Wayo Ads Notification</h1>
        <p>${data.message || JSON.stringify(data)}</p>
      </div>
    `,
  };
}

const CRITICAL_NOTIFICATION_TYPES = [
  'PAYMENT_FAILED',
  'WITHDRAWAL_APPROVED',
  'WITHDRAWAL_FAILED',
  'FRAUD_DETECTED',
  'SUSPICIOUS_ACTIVITY',
  'CREATOR_FLAGGED',
  'ACCOUNT_PENDING_APPROVAL',
];

export async function sendNotificationEmailIfEnabled(
  userId: string,
  notificationType: string,
  data: Record<string, any>
): Promise<void> {
  if (!CRITICAL_NOTIFICATION_TYPES.includes(notificationType)) {
    return;
  }

  const user = await userRepository.findByIdWithSelect(userId, {
    email: true,
    name: true,
  }) as { email: string | null; name: string | null } | null;

  if (!user?.email) {
    return;
  }

  const template = getNotificationEmailTemplate(notificationType, data);

  await sendNotificationEmail({
    toEmail: user.email,
    toName: user.name || undefined,
    subject: template.subject,
    htmlContent: template.html,
  });
}
