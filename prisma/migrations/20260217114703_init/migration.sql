-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADVERTISER', 'CREATOR', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "CreatorTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "DynamicCpmMode" AS ENUM ('CONSERVATIVE', 'AGGRESSIVE');

-- CreateEnum
CREATE TYPE "PacingMode" AS ENUM ('EVEN', 'ACCELERATED', 'CONSERVATIVE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'UNDER_REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'BRAND_GUIDELINES', 'OTHER');

-- CreateEnum
CREATE TYPE "PayoutMode" AS ENUM ('CPM_STRICT', 'HYBRID', 'CPA_ONLY');

-- CreateEnum
CREATE TYPE "AttributionModel" AS ENUM ('FIRST_CLICK', 'LAST_CLICK', 'WEIGHTED');

-- CreateEnum
CREATE TYPE "ConversionType" AS ENUM ('SIGNUP', 'PURCHASE', 'SUBSCRIPTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PayoutReason" AS ENUM ('VIEW', 'CONVERSION');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('PERSONAL', 'SOLE_PROPRIETOR', 'REGISTERED_COMPANY');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'TWITCH');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'HOLD', 'RELEASE', 'FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('VIEW_PAYOUT', 'CONVERSION_PAYOUT', 'PLATFORM_FEE', 'REVERSAL');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutQueueStatus" AS ENUM ('PENDING', 'RELEASED', 'CANCELLED', 'FROZEN');

-- CreateEnum
CREATE TYPE "StripeMode" AS ENUM ('TEST', 'LIVE');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('P0_CRITICAL', 'P1_HIGH', 'P2_NORMAL', 'P3_LOW');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationScope" AS ENUM ('USER', 'ROLE', 'GLOBAL');

-- CreateEnum
CREATE TYPE "NotificationDeliveryType" AS ENUM ('IN_APP', 'EMAIL', 'BOTH');

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "availableCents" INTEGER NOT NULL DEFAULT 0,
    "pendingCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "invoiceType" TEXT NOT NULL,
    "referenceId" TEXT,
    "totalAmountCents" INTEGER NOT NULL,
    "taxAmountCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignBudgetLock" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "lockedCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignBudgetLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "refEventId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorBalance" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "availableCents" INTEGER NOT NULL DEFAULT 0,
    "pendingCents" INTEGER NOT NULL DEFAULT 0,
    "totalEarnedCents" INTEGER NOT NULL DEFAULT 0,
    "availableBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "pendingBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "lockedReserveCents" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "payoutDelayDays" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutQueue" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "status" "PayoutQueueStatus" NOT NULL DEFAULT 'PENDING',
    "eligibleAt" TIMESTAMP(3) NOT NULL,
    "riskSnapshotScore" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "reservePercent" INTEGER NOT NULL DEFAULT 0,
    "reserveAmountCents" INTEGER NOT NULL DEFAULT 0,
    "appliedMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "creatorTrustScoreSnapshot" INTEGER NOT NULL DEFAULT 50,
    "creatorTierSnapshot" "CreatorTier" NOT NULL DEFAULT 'BRONZE',
    "releasedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "psReference" TEXT,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT,
    "roles" TEXT NOT NULL DEFAULT 'USER',
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trustScore" INTEGER NOT NULL DEFAULT 50,
    "tier" "CreatorTier" NOT NULL DEFAULT 'BRONZE',
    "qualityMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorBusinessProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "companyName" TEXT,
    "vatNumber" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "state" TEXT,
    "countryCode" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorBusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "landingUrl" TEXT NOT NULL,
    "platforms" TEXT NOT NULL DEFAULT 'YOUTUBE,INSTAGRAM,TIKTOK,FACEBOOK',
    "totalBudgetCents" INTEGER NOT NULL,
    "cpmCents" INTEGER NOT NULL,
    "spentBudgetCents" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "attributionModel" "AttributionModel" NOT NULL DEFAULT 'LAST_CLICK',
    "payoutMode" "PayoutMode" NOT NULL DEFAULT 'CPM_STRICT',
    "fraudScoreThreshold" INTEGER NOT NULL DEFAULT 50,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalValidatedViews" INTEGER NOT NULL DEFAULT 0,
    "totalBillableViews" INTEGER NOT NULL DEFAULT 0,
    "totalPaidOutCents" INTEGER NOT NULL DEFAULT 0,
    "totalPendingPayoutCents" INTEGER NOT NULL DEFAULT 0,
    "totalReservedCents" INTEGER NOT NULL DEFAULT 0,
    "totalUnderReviewCents" INTEGER NOT NULL DEFAULT 0,
    "advertiserConfidenceScore" INTEGER NOT NULL DEFAULT 100,
    "dynamicCpmEnabled" BOOLEAN NOT NULL DEFAULT false,
    "baseCpmCents" INTEGER NOT NULL DEFAULT 0,
    "minCpmCents" INTEGER NOT NULL DEFAULT 0,
    "maxCpmCents" INTEGER NOT NULL DEFAULT 0,
    "dynamicCpmMode" "DynamicCpmMode" NOT NULL DEFAULT 'AGGRESSIVE',
    "pacingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyBudgetCents" INTEGER NOT NULL DEFAULT 0,
    "pacingMode" "PacingMode" NOT NULL DEFAULT 'EVEN',
    "deliveryProgressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetSpendPerHourCents" INTEGER NOT NULL DEFAULT 0,
    "campaignStartDate" TIMESTAMP(3),
    "campaignEndDate" TIMESTAMP(3),
    "isOverDelivering" BOOLEAN NOT NULL DEFAULT false,
    "isUnderDelivering" BOOLEAN NOT NULL DEFAULT false,
    "lastPacingCheckAt" TIMESTAMP(3),
    "isGeoTargeted" BOOLEAN NOT NULL DEFAULT false,
    "targetCity" TEXT,
    "targetCountryCode" TEXT,
    "targetLatitude" DOUBLE PRECISION,
    "targetLongitude" DOUBLE PRECISION,
    "targetRadiusKm" INTEGER,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAsset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignApplication" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorTrackingLink" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorTrackingLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "referrer" TEXT,
    "isRecorded" BOOLEAN NOT NULL DEFAULT true,
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "isBillable" BOOLEAN NOT NULL DEFAULT false,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "validationMethod" TEXT,
    "validatedAt" TIMESTAMP(3),
    "fraudScore" INTEGER NOT NULL DEFAULT 0,
    "geoCountry" TEXT,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "deviceFingerprintHash" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT,
    "visitorId" TEXT NOT NULL,
    "type" "ConversionType" NOT NULL,
    "revenueCents" INTEGER NOT NULL DEFAULT 0,
    "attributedTo" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutLedger" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" "PayoutReason" NOT NULL,
    "refEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeSettings" (
    "id" TEXT NOT NULL,
    "mode" "StripeMode" NOT NULL DEFAULT 'TEST',
    "stripePublishableKeyEncrypted" TEXT,
    "stripeSecretKeyEncrypted" TEXT,
    "stripeWebhookSecretEncrypted" TEXT,
    "stripeConnectAccountIdEncrypted" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "StripeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL,
    "host" TEXT,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "usernameEncrypted" TEXT,
    "passwordEncrypted" TEXT,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "replyToEmail" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailQueue" (
    "id" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "templateName" TEXT,
    "templateData" TEXT,
    "dedupeKey" TEXT,
    "correlationId" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "subject" TEXT NOT NULL,
    "templateName" TEXT,
    "eventType" TEXT NOT NULL,
    "correlationId" TEXT,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optOutAll" BOOLEAN NOT NULL DEFAULT false,
    "accountEmails" BOOLEAN NOT NULL DEFAULT true,
    "securityEmails" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT true,
    "campaignEmails" BOOLEAN NOT NULL DEFAULT true,
    "payoutEmails" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL,
    "platformFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.03,
    "platformFeeDescription" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "minimumWithdrawalCents" INTEGER NOT NULL DEFAULT 1000,
    "pendingHoldDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyBusinessInfo" (
    "id" TEXT NOT NULL,
    "companyName" TEXT,
    "registrationNumber" TEXT,
    "vatNumber" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "legalEntityType" TEXT,
    "incorporationDate" TIMESTAMP(3),
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankSwift" TEXT,
    "bankIban" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "CompanyBusinessInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "scope" "NotificationScope" NOT NULL DEFAULT 'USER',
    "toUserId" TEXT,
    "toRole" TEXT,
    "type" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'P2_NORMAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "metadata" TEXT,
    "deliveryType" "NotificationDeliveryType" NOT NULL DEFAULT 'IN_APP',
    "dedupeKey" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "allowInApp" BOOLEAN NOT NULL DEFAULT true,
    "allowEmail" BOOLEAN NOT NULL DEFAULT true,
    "mutedTypes" TEXT,
    "toastMaxPerSession" INTEGER NOT NULL DEFAULT 3,
    "lowBudgetPercent" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorChannel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "channelHandle" TEXT,
    "channelAvatarUrl" TEXT,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "lifetimeViews" INTEGER NOT NULL DEFAULT 0,
    "averageViewsPerVideo" INTEGER NOT NULL DEFAULT 0,
    "topVideos" JSONB,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorTrafficMetrics" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "campaignId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRecorded" INTEGER NOT NULL DEFAULT 0,
    "totalValidated" INTEGER NOT NULL DEFAULT 0,
    "totalBillable" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "avgFraudScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uniqueIPs" INTEGER NOT NULL DEFAULT 0,
    "uniqueFingerprints" INTEGER NOT NULL DEFAULT 0,
    "geoDiversityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "anomalyScore" INTEGER NOT NULL DEFAULT 0,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReasons" TEXT,
    "previousAvgViews" INTEGER NOT NULL DEFAULT 0,
    "spikePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorTrafficMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_ownerUserId_key" ON "Wallet"("ownerUserId");

-- CreateIndex
CREATE INDEX "Wallet_ownerUserId_idx" ON "Wallet"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignBudgetLock_campaignId_key" ON "CampaignBudgetLock"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignBudgetLock_campaignId_idx" ON "CampaignBudgetLock"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignBudgetLock_walletId_idx" ON "CampaignBudgetLock"("walletId");

-- CreateIndex
CREATE INDEX "LedgerEntry_campaignId_idx" ON "LedgerEntry"("campaignId");

-- CreateIndex
CREATE INDEX "LedgerEntry_creatorId_idx" ON "LedgerEntry"("creatorId");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_idx" ON "LedgerEntry"("type");

-- CreateIndex
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_campaignId_creatorId_refEventId_key" ON "LedgerEntry"("campaignId", "creatorId", "refEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorBalance_creatorId_key" ON "CreatorBalance"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorBalance_creatorId_idx" ON "CreatorBalance"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorBalance_riskLevel_idx" ON "CreatorBalance"("riskLevel");

-- CreateIndex
CREATE INDEX "PayoutQueue_creatorId_status_idx" ON "PayoutQueue"("creatorId", "status");

-- CreateIndex
CREATE INDEX "PayoutQueue_status_eligibleAt_idx" ON "PayoutQueue"("status", "eligibleAt");

-- CreateIndex
CREATE INDEX "PayoutQueue_campaignId_idx" ON "PayoutQueue"("campaignId");

-- CreateIndex
CREATE INDEX "PayoutQueue_eligibleAt_idx" ON "PayoutQueue"("eligibleAt");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_creatorId_idx" ON "WithdrawalRequest"("creatorId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_createdAt_idx" ON "WithdrawalRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorBusinessProfile_userId_key" ON "CreatorBusinessProfile"("userId");

-- CreateIndex
CREATE INDEX "CreatorBusinessProfile_userId_idx" ON "CreatorBusinessProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignApplication_campaignId_creatorId_key" ON "CampaignApplication"("campaignId", "creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorTrackingLink_slug_key" ON "CreatorTrackingLink"("slug");

-- CreateIndex
CREATE INDEX "VisitEvent_campaignId_idx" ON "VisitEvent"("campaignId");

-- CreateIndex
CREATE INDEX "VisitEvent_creatorId_idx" ON "VisitEvent"("creatorId");

-- CreateIndex
CREATE INDEX "VisitEvent_isRecorded_idx" ON "VisitEvent"("isRecorded");

-- CreateIndex
CREATE INDEX "VisitEvent_isValidated_idx" ON "VisitEvent"("isValidated");

-- CreateIndex
CREATE INDEX "VisitEvent_isBillable_idx" ON "VisitEvent"("isBillable");

-- CreateIndex
CREATE INDEX "VisitEvent_isPaid_idx" ON "VisitEvent"("isPaid");

-- CreateIndex
CREATE INDEX "VisitEvent_fraudScore_idx" ON "VisitEvent"("fraudScore");

-- CreateIndex
CREATE INDEX "VisitEvent_occurredAt_idx" ON "VisitEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "VisitEvent_visitorId_idx" ON "VisitEvent"("visitorId");

-- CreateIndex
CREATE INDEX "StripeSettings_mode_idx" ON "StripeSettings"("mode");

-- CreateIndex
CREATE INDEX "StripeSettings_isActive_idx" ON "StripeSettings"("isActive");

-- CreateIndex
CREATE INDEX "AdminAuditLog_userId_idx" ON "AdminAuditLog"("userId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "EmailSettings_isEnabled_idx" ON "EmailSettings"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "EmailQueue_dedupeKey_key" ON "EmailQueue"("dedupeKey");

-- CreateIndex
CREATE INDEX "EmailQueue_status_idx" ON "EmailQueue"("status");

-- CreateIndex
CREATE INDEX "EmailQueue_toEmail_idx" ON "EmailQueue"("toEmail");

-- CreateIndex
CREATE INDEX "EmailQueue_createdAt_idx" ON "EmailQueue"("createdAt");

-- CreateIndex
CREATE INDEX "EmailQueue_templateName_idx" ON "EmailQueue"("templateName");

-- CreateIndex
CREATE INDEX "EmailLog_toEmail_idx" ON "EmailLog"("toEmail");

-- CreateIndex
CREATE INDEX "EmailLog_eventType_idx" ON "EmailLog"("eventType");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailPreferences_userId_key" ON "EmailPreferences"("userId");

-- CreateIndex
CREATE INDEX "EmailPreferences_userId_idx" ON "EmailPreferences"("userId");

-- CreateIndex
CREATE INDEX "Notification_toUserId_idx" ON "Notification"("toUserId");

-- CreateIndex
CREATE INDEX "Notification_toRole_idx" ON "Notification"("toRole");

-- CreateIndex
CREATE INDEX "Notification_dedupeKey_idx" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_priority_idx" ON "Notification"("priority");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_userId_idx" ON "NotificationDelivery"("userId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_notificationId_userId_key" ON "NotificationDelivery"("notificationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "CreatorChannel_userId_idx" ON "CreatorChannel"("userId");

-- CreateIndex
CREATE INDEX "CreatorChannel_platform_idx" ON "CreatorChannel"("platform");

-- CreateIndex
CREATE INDEX "CreatorChannel_isPublic_idx" ON "CreatorChannel"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorChannel_userId_platform_key" ON "CreatorChannel"("userId", "platform");

-- CreateIndex
CREATE INDEX "CreatorTrafficMetrics_creatorId_campaignId_date_idx" ON "CreatorTrafficMetrics"("creatorId", "campaignId", "date");

-- CreateIndex
CREATE INDEX "CreatorTrafficMetrics_creatorId_idx" ON "CreatorTrafficMetrics"("creatorId");

-- CreateIndex
CREATE INDEX "CreatorTrafficMetrics_campaignId_idx" ON "CreatorTrafficMetrics"("campaignId");

-- CreateIndex
CREATE INDEX "CreatorTrafficMetrics_flagged_idx" ON "CreatorTrafficMetrics"("flagged");

-- CreateIndex
CREATE INDEX "CreatorTrafficMetrics_date_idx" ON "CreatorTrafficMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorTrafficMetrics_creatorId_campaignId_date_key" ON "CreatorTrafficMetrics"("creatorId", "campaignId", "date");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignBudgetLock" ADD CONSTRAINT "CampaignBudgetLock_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignBudgetLock" ADD CONSTRAINT "CampaignBudgetLock_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorBalance" ADD CONSTRAINT "CreatorBalance_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutQueue" ADD CONSTRAINT "PayoutQueue_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorBalance"("creatorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutQueue" ADD CONSTRAINT "PayoutQueue_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "CreatorBalance"("creatorId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorBusinessProfile" ADD CONSTRAINT "CreatorBusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAsset" ADD CONSTRAINT "CampaignAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignApplication" ADD CONSTRAINT "CampaignApplication_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorTrackingLink" ADD CONSTRAINT "CreatorTrackingLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorTrackingLink" ADD CONSTRAINT "CreatorTrackingLink_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitEvent" ADD CONSTRAINT "VisitEvent_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "CreatorTrackingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLedger" ADD CONSTRAINT "PayoutLedger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutLedger" ADD CONSTRAINT "PayoutLedger_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeSettings" ADD CONSTRAINT "StripeSettings_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSettings" ADD CONSTRAINT "EmailSettings_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailPreferences" ADD CONSTRAINT "EmailPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorChannel" ADD CONSTRAINT "CreatorChannel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorTrafficMetrics" ADD CONSTRAINT "CreatorTrafficMetrics_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorTrafficMetrics" ADD CONSTRAINT "CreatorTrafficMetrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
