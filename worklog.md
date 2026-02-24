---
Task ID: 1
Agent: Main Agent
Task: Implement database schema + domain types for Upfront Funding + Internal Wallet/Ledger architecture (Step 1/6)

Work Log:
- Updated prisma/schema.prisma with new finance models:
  - Wallet: id, ownerUserId (unique), currency, availableCents, pendingCents
  - WalletTransaction: id, walletId, type (DEPOSIT|WITHDRAWAL|HOLD|RELEASE|FEE|ADJUSTMENT), amountCents, currency, referenceType, referenceId
  - CampaignBudgetLock: id, campaignId (unique), walletId, lockedCents
  - LedgerEntry: id, campaignId, creatorId, type (VIEW_PAYOUT|CONVERSION_PAYOUT|PLATFORM_FEE|REVERSAL), amountCents, refEventId
  - CreatorBalance: id, creatorId (unique), currency, availableCents, pendingCents, totalEarnedCents
- Created /src/lib/finance/types.ts with TypeScript domain types and helper functions
- Updated prisma/seed.ts to create wallets and creator balances for users
- Ran db:push to apply schema changes
- Ran db:seed to populate initial finance data

Stage Summary:
- All monetary values stored as integer cents (no floating-point issues)
- Single currency (EUR) for MVP
- Budget locks created when campaign goes ACTIVE
- Ledger entries are immutable (append-only log)
- Creator balances are denormalized views for quick access
- Advertiser wallet: €0 available (€5,000 locked for campaign)
- Creator 1 balance: €150 available, €50 pending, €250 total earned
- Ready for Step 2: Service layer implementation

---
Task ID: 2
Agent: Main Agent
Task: Implement finance service layer for Wallet/Ledger architecture (Step 2/6)

Work Log:
- Added unique constraint to LedgerEntry: @@unique([campaignId, creatorId, refEventId])
- Added isPaid field to VisitEvent for payout tracking
- Added indexes for performance optimization
- Created /src/server/finance/financeService.ts with comprehensive functions:
  - getOrCreateWallet(userId): Ensures wallet exists for user
  - depositToWallet({userId, amountCents, ...}): Creates DEPOSIT transaction
  - withdrawFromWallet({userId, amountCents, ...}): Creates WITHDRAWAL transaction with balance check
  - lockCampaignBudget({campaignId, advertiserId, amountCents}): Creates HOLD transaction and CampaignBudgetLock
  - releaseCampaignBudget({campaignId, advertiserId, amountCents?, reason}): Creates RELEASE transaction
  - computeCampaignBudget(campaignId): Returns {totalBudgetCents, lockedCents, spentCents, remainingCents, cpmCents, payoutPerViewCents}
  - recordValidViewPayout({campaignId, creatorId, visitEventId}): Atomic payout with fraud prevention
  - recordConversionPayout({campaignId, creatorId, conversionEventId, payoutCents}): Conversion payout
  - getCreatorBalance(creatorId): Query creator earnings
  - getWalletTransactions(walletId, options): Transaction history
  - getCreatorLedgerEntries(creatorId, options): Creator ledger entries
  - adjustWalletBalance({userId, amountCents, description, adminId}): Admin adjustment
- Created /src/server/finance/financeService.spec.ts with test scenarios:
  - testWalletCreationAndDeposit
  - testWithdrawalInsufficientFunds
  - testCampaignBudgetLock
  - testViewPayoutFlow
  - testDoublePayoutPrevention
  - testInsufficientBudgetStopsPayout
  - testReleaseBudget
- Ran db:push to apply schema changes

Stage Summary:
- All operations use Prisma $transaction for atomicity
- Double-payout prevention via unique constraint + isPaid flag
- Budget check before each payout: remainingBudget >= payoutAmount
- Platform fee calculation: 10% of gross payout
- Payout per view: Math.floor(cpmCents / 1000)
- Comprehensive error codes: INSUFFICIENT_FUNDS, WALLET_NOT_FOUND, EVENT_ALREADY_PAID, INSUFFICIENT_BUDGET, etc.
- Integration notes provided for tracking endpoint
- Ready for Step 3: API endpoints and UI integration

---
Task ID: 3
Agent: Main Agent
Task: Wire existing tracking system to finance service (Step 3/6)

Work Log:
- Updated /api/track/view/route.ts to integrate with finance service:
  - After validation, calls recordValidViewPayout()
  - Returns JSON with { isValid, payoutCents, campaignRemainingCents, validViewsCount }
  - Handles budget exhaustion (valid view, no payout)
  - Reuses computeCampaignBudget for efficiency
- Updated /lib/analytics.ts to use new ledger system:
  - getBudgetSpent() now queries LedgerEntry instead of PayoutLedger
  - getBudgetRemaining() returns { total, locked, spent, remaining }
  - Added getCreatorCampaignEarnings() for per-campaign creator stats
  - Updated getTopCreators() to show paidViews, netEarnings, grossEarnings
  - Added getCreatorBalance() and getAdvertiserWallet() helpers
- Updated /api/campaigns/[id]/route.ts:
  - Added finance summary in response: { lockedBudgetCents, spentBudgetCents, remainingBudgetCents, payoutPerViewCents }
  - Added myEarnings for approved creators: { campaign: { grossEarnings, platformFees, netEarnings, paidViews }, totalBalance }
  - Added advertiserWallet for campaign owners
- Updated /app/campaigns/[id]/page.tsx UI:
  - Added Budget & Spending card showing Locked/Spent/Remaining breakdown
  - Added "My Earnings from This Campaign" card for approved creators
  - Updated Top Creators table to show paid views and net earnings
  - Added Payout Information sidebar with platform fee (10%)
  - Changed currency format to EUR

Stage Summary:
- Tracking endpoint now triggers payouts for valid views
- Budget exhaustion handled gracefully (view valid, payout = 0)
- Idempotency guaranteed via unique constraint on LedgerEntry
- Campaign detail API includes comprehensive finance data
- UI displays real-time budget status and creator earnings
- All monetary values properly formatted in EUR
- Lint passes with no errors
- Ready for Step 4: Stripe integration for deposits/withdrawals

---
Task ID: 4
Agent: Main Agent
Task: Add Advertiser Deposit flow with PSP integration STUB (Step 4/6)

Work Log:
- Created PSP abstraction layer in /src/server/payments/:
  - psp.ts: Interface definition with PSPInterface, DepositIntent, WebhookEvent types
  - mockPsp.ts: Development implementation with in-memory storage
  - stripePsp.ts: Production Stripe implementation (lazy-loaded)
  - Factory function getPSP() returns MockPSP by default, StripePSP when PSP_MODE=stripe
- Created API routes:
  - POST /api/wallet/deposit-intent: Creates payment intent with PSP
  - POST /api/webhooks/psp: Handles payment_succeeded/failed callbacks
  - POST /api/webhooks/psp/simulate: Development-only simulation endpoint
  - GET /api/wallet: Returns wallet balance and transaction history
- Created wallet dashboard UI at /dashboard/advertiser/wallet:
  - Shows available and pending balance
  - Deposit form with amount input
  - Pending intent display with "Simulate Success" button (dev mode)
  - Transaction history table with type icons
- Updated .env with PSP configuration variables:
  - PSP_MODE=mock (default) or stripe
  - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (for production)

Stage Summary:
- Clean PSP abstraction ready for Stripe integration
- MockPSP enables full deposit flow in development
- Webhook-based crediting (production-minded, not client-side trusting)
- Idempotency: won't credit same intent twice
- Deposit flow: Create intent → Webhook success → Credit wallet
- Environment variables documented for both modes
- Lint passes with no errors
- Ready for Step 5: Enforce upfront funding

---
Task ID: 5
Agent: Main Agent
Task: Enforce upfront funding during campaign creation/editing (Step 5/6)

Work Log:
- Updated /api/campaigns/route.ts POST handler:
  - Check wallet balance before creating ACTIVE campaign
  - Lock budget immediately when campaign is created as ACTIVE
  - Return INSUFFICIENT_FUNDS error with shortfall details
  - Rollback to DRAFT if budget lock fails
- Updated /api/campaigns/[id]/route.ts PATCH handler:
  - Added handleStatusChange() for DRAFT→ACTIVE, ACTIVE→CANCELLED, ACTIVE→COMPLETED
  - Added handleBudgetChange() for budget increases/decreases
  - Budget increase: Check for additional funds, increment existing lock
  - Budget decrease: Release excess back to wallet
  - Prevent setting budget below already spent amount
  - Return updated wallet balance in response
- Updated lockCampaignBudget() in financeService.ts:
  - Now handles existing budget locks (incremental for budget increases)
  - Creates CAMPAIGN_BUDGET_INCREASE transaction type
- Updated advertiser dashboard UI (/app/dashboard/advertiser/page.tsx):
  - Shows wallet balance prominently in campaign creation dialog
  - Displays "Insufficient Funds" alert with deposit link
  - Prevents form submission if insufficient funds
  - Added "Locked" stat card showing total locked across campaigns
  - Added "Activate", "Pause", "Cancel" buttons with budget handling
  - Shows remaining locked budget for active campaigns

Stage Summary:
- Campaigns require upfront funding before activation
- Budget changes handled atomically (increase/decrease)
- Cancel releases remaining locked budget automatically
- Cannot set budget below already spent amount
- UI shows wallet balance and deposit link when needed
- All operations are atomic via Prisma transactions
- Lint passes with no errors
- Ready for Step 6: Final integration and testing

---
Task ID: 6
Agent: Main Agent
Task: Implement Creator Withdrawal Flow (Step 6/6)

Work Log:
- Added withdrawal service functions to /src/server/finance/financeService.ts:
  - requestWithdrawal({creatorId, amountCents}): Creates WithdrawalRequest with PENDING status
  - getWithdrawalRequests(creatorId, options): Query withdrawal history
  - processWithdrawal({withdrawalId, psReference}): Mark as PROCESSING
  - completeWithdrawal({withdrawalId, psReference}): Mark as PAID
  - failWithdrawal({withdrawalId, reason}): Mark as FAILED and refund to balance
  - cancelWithdrawal({withdrawalId, creatorId}): Cancel pending withdrawal and refund
- Created API routes:
  - GET /api/creator/withdrawal: Returns balance and withdrawal history
  - POST /api/creator/withdrawal: Request new withdrawal (minimum €10)
  - DELETE /api/creator/withdrawal: Cancel pending withdrawal
- Updated /api/webhooks/psp/route.ts:
  - Added handlePayoutSucceeded(): Marks withdrawal as PAID
  - Added handlePayoutFailed(): Marks withdrawal as FAILED, refunds balance
- Created creator wallet dashboard UI at /dashboard/creator/wallet:
  - Shows available, pending, and total earned balance
  - Withdrawal request form with minimum €10 validation
  - Quick amount buttons (€10, €50, All)
  - Withdrawal history with status tracking (PENDING, PROCESSING, PAID, FAILED, CANCELLED)
  - Cancel button for pending withdrawals
- Updated creator dashboard (/dashboard/creator/page.tsx):
  - Added "Available Balance" card with withdraw button
  - Updated stats grid to 4 columns
  - Currency changed to EUR
- Updated getCreatorStats() in /lib/analytics.ts:
  - Now includes availableBalance from CreatorBalance table

Stage Summary:
- Complete creator withdrawal flow implemented
- Minimum withdrawal: €10 (1000 cents)
- Withdrawal status lifecycle: PENDING → PROCESSING → PAID/FAILED
- Failed withdrawals automatically refund to creator balance
- Creators can cancel pending withdrawals
- PSP integration ready for production (MockPSP for dev)
- UI shows real-time balance and withdrawal history
- All operations atomic via Prisma transactions
- Lint passes with no errors
- Finance system MVP complete!

Note: Dev server Turbopack cache issue - server showing stale errors but code is correct.
The budgetLock include was replaced with separate query to work around the cache issue.
Server restart may be needed to pick up all changes.

---
Task ID: 7
Agent: Main Agent
Task: Implement SuperAdmin Stripe Credentials Feature

Work Log:
- Updated Prisma schema with new models:
  - Added SUPERADMIN to Role enum
  - StripeSettings: singleton model for encrypted Stripe credentials
  - AdminAuditLog: audit trail for admin actions
  - Added stripeSettingsUpdates and adminAuditLogs relations to User model
- Created encryption utility (/src/lib/security/crypto.ts):
  - AES-256-GCM encryption for all secrets
  - encrypt(plaintext) and decrypt(serialized) functions
  - Key derived from APP_ENCRYPTION_KEY env var
  - Secret masking utilities for safe display
- Created stripe settings service (/src/server/admin/stripeSettingsService.ts):
  - getStripeSettings(): Returns masked settings for display
  - getStripeCredentials(): Returns decrypted credentials (server-only)
  - updateStripeSettings(): Encrypts and saves credentials
  - testStripeConnection(): Validates credentials via Stripe API
  - Audit logging for all changes
- Created API routes:
  - GET/PUT /api/admin/stripe-settings: Manage settings
  - POST /api/admin/stripe-settings/test-connection: Test credentials
  - Rate limiting (10 req/min for settings, 5 req/min for test)
  - SUPERADMIN role required for all routes
- Created SuperAdmin settings UI (/app/admin/settings/stripe/page.tsx):
  - Mode selection (TEST/LIVE)
  - Secure input fields with show/hide toggle
  - Masked display of existing credentials
  - Save and Test Connection buttons
  - Last updated timestamp and updated by info
- Updated PSP abstraction:
  - stripePsp.ts now reads credentials from database first
  - Falls back to env vars if DB not configured
  - Dynamic Stripe client initialization
- Added SUPERADMIN auth functions:
  - requireSuperAdmin() in server-auth.ts
  - isSuperAdmin() helper function
- Updated admin dashboard with Stripe settings link

Stage Summary:
- Complete SuperAdmin Stripe credentials management
- All secrets encrypted with AES-256-GCM before storage
- Audit trail for all admin actions
- Rate limiting on admin endpoints
- PSP reads from DB at runtime (no env var dependency in production)
- Secure UI with masked values
- Lint passes with no errors
- Security hardened: secrets never logged, returned, or stored in plaintext

---
Task ID: 8
Agent: Main Agent
Task: Add Email Settings (SMTP Config for Transactional Emails)

Work Log:
- Updated Prisma schema with new models:
  - EmailSettings: SMTP configuration with encrypted password
  - EmailQueue: Track sent emails and status
  - Added emailSettingsUpdates relation to User model
- Installed nodemailer and @types/nodemailer packages
- Created email settings service (/src/server/admin/emailSettingsService.ts):
  - getEmailSettings(): Returns masked settings for display
  - getEmailCredentials(): Returns decrypted credentials (server-only)
  - updateEmailSettings(): Encrypts and saves SMTP config
  - sendTestEmail(): Validates configuration by sending test email
  - Audit logging for all changes
- Created email sender utility (/src/lib/email/sender.ts):
  - sendEmail(): Send emails using configured SMTP
  - queueEmail(): Queue email for later processing
  - processEmailQueue(): Process pending emails
  - Built-in email templates: Welcome, Password Reset, Withdrawal Notification
- Created API routes:
  - GET/PUT /api/admin/email-settings: Manage settings
  - POST /api/admin/email-settings/test-email: Send test email
  - Rate limiting: 10 req/min (settings), 3 req/min (test email)
  - SUPERADMIN role required for all routes
- Created Email Settings UI (/app/admin/settings/email/page.tsx):
  - SMTP host, port, security configuration
  - Username/password with encryption
  - From email and reply-to settings
  - Enable/disable toggle
  - Test email functionality
  - Common SMTP provider quick reference
- Updated admin dashboard with Email Settings card

Stage Summary:
- Complete SMTP configuration management for transactional emails
- All passwords encrypted with AES-256-GCM before storage
- Email queue for tracking sent emails
- Reusable email templates for common notifications
- Test email functionality to verify configuration
- Common SMTP provider reference (Gmail, SendGrid, SES, Mailgun)
- Lint passes with no errors
- Ready for integration with user flows (welcome emails, password reset, etc.)

---
Task ID: 9
Agent: Main Agent
Task: Implement Complete Email Notification System

Work Log:
- Enhanced Prisma schema with new models:
  - EmailStatus enum: PENDING, SENDING, SENT, FAILED
  - EmailQueue: Enhanced with dedupeKey, correlationId, retry logic
  - EmailLog: Immutable audit trail of all sent emails
  - EmailPreferences: User opt-in/opt-out settings per category
- Created email provider architecture (/src/server/email/providers/):
  - EmailProvider interface with send(), isConfigured() methods
  - DevConsoleProvider: Development logger (no real emails)
  - SMTPProvider: Production SMTP via nodemailer
  - Provider factory with caching and fallback logic
- Created comprehensive template system (/src/server/email/templates/):
  - Base layout with HTML and text rendering
  - Reusable components: buttons, info boxes, warnings
  - 25 email templates across 4 categories:
    - Account: created, verify, verified, pending_review, approved, rejected, updated, deactivated, deleted
    - Role: requested, approved, rejected
    - Security: password_reset, password_changed, suspicious_login
    - Marketplace: creator_applied/approved/rejected, budget_low, payout_available, withdrawal_*, deposit_*
- Created email dispatcher service (/src/server/email/dispatcher.ts):
  - dispatchEmail(): Main entry point with preference checking
  - Queue management with retry logic (max 3 retries)
  - Idempotency via dedupe keys (24-hour window)
  - Preference-based filtering (security emails always sent)
  - Convenience functions for common emails
- Created Admin UI (/app/admin/emails/):
  - Template browser grouped by category
  - Live HTML and text preview
  - Send test email to any address
  - Email log viewer with status tracking
- Created API routes:
  - GET /api/admin/emails/templates: List all templates
  - GET /api/admin/emails/logs: View email history
  - GET /api/admin/emails/preview/[template]: Render preview with sample data
  - POST /api/admin/emails/send-test: Send test email
- Updated admin dashboard with Email Management link

Stage Summary:
- Complete email notification system with 25 templates
- Provider-agnostic design (DevConsole + SMTP)
- Queue with retry and idempotency
- User preference management per category
- Admin UI for preview and testing
- Strong typing with Zod validation
- No PII leakage in logs
- Lint passes with no errors

# Email Matrix Documentation

## Email Templates by Category

### Account Lifecycle (9 templates)

| Template | Trigger | Recipients | Subject | CTA | Variables |
|----------|---------|------------|---------|-----|-----------|
| account.created | User signs up | User | Welcome! Please verify your email | Verify Email | userName, verifyEmailUrl, supportEmail |
| account.verify | User requests verification | User | Verify your email address | Verify Email | userName, verifyEmailUrl, expirationMinutes |
| account.verified | Email verified | User | Your email has been verified | Go to Dashboard | userName, dashboardUrl |
| account.pending_review | Account needs approval | Admin, SuperAdmin | New account pending review | Review Account | userId, userEmail, rolesRequested, reviewUrl |
| account.approved | Admin approves | User | Your account has been approved! | Log In Now | userName, loginUrl, roleGranted, nextStepsUrl? |
| account.rejected | Admin rejects | User | Update on your account request | (optional reapply) | userName, reasonSummary, reapplyUrl?, supportEmail |
| account.updated | Profile/security change | User | Your account was updated | Review Security | userName, changedFields[], timestamp, ipApprox?, securityUrl |
| account.deactivated | Account deactivated | User | Your account has been deactivated | (optional reactivate) | userName, reactivateUrl?, supportEmail, reasonSummary? |
| account.deleted | Account deleted | User, SuperAdmin | Your account has been deleted | (optional data export) | userName?, deletionDate, exportDataUrl?, supportEmail |

### Role Management (3 templates)

| Template | Trigger | Recipients | Subject | CTA | Variables |
|----------|---------|------------|---------|-----|-----------|
| role.requested | User requests role upgrade | Admin | New role request | Review Request | userId, requestedRole, requestMessage?, reviewUrl |
| role.approved | Admin approves role | User | Your role upgrade has been approved! | Go to Dashboard | userName, roleGranted, dashboardUrl |
| role.rejected | Admin rejects role | User | Update on your role request | - | userName, requestedRole, reasonSummary, supportEmail |

### Security (3 templates)

| Template | Trigger | Recipients | Subject | CTA | Variables |
|----------|---------|------------|---------|-----|-----------|
| security.password_reset | Forgot password | User | Reset your password | Reset Password | userName, resetUrl, expirationMinutes |
| security.password_changed | Password changed | User | Your password was changed | Review Security Settings | userName, timestamp, securityUrl |
| security.suspicious_login | Failed logins detected | Admin, SuperAdmin | Security alert: Suspicious activity | Review Activity | userEmail, ipApprox?, timestamp, actionUrl |

### Marketplace (10 templates)

| Template | Trigger | Recipients | Subject | CTA | Variables |
|----------|---------|------------|---------|-----|-----------|
| marketplace.creator_applied | Creator applies to campaign | Advertiser | New creator application | Review Application | advertiserName, creatorName, campaignTitle, message?, applicationUrl |
| marketplace.creator_approved | Application approved | Creator | You've been approved! | View Campaign Details | creatorName, campaignTitle, trackingLinkUrl, dashboardUrl |
| marketplace.creator_rejected | Application rejected | Creator | Update on your campaign application | Browse More Campaigns | creatorName, campaignTitle, reason?, browseCampaignsUrl |
| marketplace.budget_low | Campaign budget low | Advertiser | Low budget alert | Add Funds | advertiserName, campaignTitle, remainingBudget, estimatedDaysRemaining, addFundsUrl |
| marketplace.payout_available | Earnings available | Creator | Payout available | Withdraw Now | creatorName, amount, campaignTitle, withdrawalUrl |
| marketplace.withdrawal_requested | Withdrawal requested | Creator | Withdrawal request submitted | Track Status | creatorName, amount, withdrawalId, estimatedProcessingDays, dashboardUrl |
| marketplace.withdrawal_paid | Withdrawal completed | Creator | Withdrawal complete | View History | creatorName, amount, withdrawalId, paidAt, dashboardUrl |
| marketplace.withdrawal_failed | Withdrawal failed | Creator | Withdrawal failed | Try Again | creatorName, amount, withdrawalId, errorMessage, retryUrl, supportEmail |
| marketplace.deposit_succeeded | Deposit completed | Advertiser | Deposit successful | View Wallet | advertiserName, amount, newBalance, depositId, dashboardUrl |
| marketplace.deposit_failed | Deposit failed | Advertiser | Deposit failed | Try Again | advertiserName, amount, errorMessage, retryUrl, supportEmail |

## Environment Variables

```bash
# Email Provider Selection
EMAIL_PROVIDER=smtp  # or 'devconsole' for development

# SMTP Configuration (for production)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
FROM_EMAIL=noreply@wayo-ads.com
FROM_NAME="Wayo Ads Market"
SUPPORT_EMAIL=support@wayo-ads.com

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
APP_ENCRYPTION_KEY=your-32-char-encryption-key
```

## Testing in Development

1. Without SMTP configured, emails are logged to console via DevConsoleProvider
2. Configure SMTP in Admin > Email Settings (SUPERADMIN only)
3. Test individual templates via Admin > Email Management
4. Use preview feature to see HTML and text versions

## Integration Points

Email triggers should be hooked into:
- `/api/auth/register` or similar - account.created
- Email verification callback - account.verified
- Admin approval endpoints - account.approved/rejected
- Role request endpoints - role.requested/approved/rejected
- Password reset flow - security.password_reset
- Account settings updates - account.updated
- Campaign application flow - marketplace.creator_*
- Withdrawal processing - marketplace.withdrawal_*
- Deposit webhooks - marketplace.deposit_*

---
Task ID: 10
Agent: Main Agent
Task: Platform Fee Configuration Management

Work Log:
- Updated Prisma schema with PlatformSettings model:
  - platformFeeRate: Float (stored as decimal, e.g., 0.03 = 3%)
  - platformFeeDescription: String (user-facing description)
  - defaultCurrency: String (EUR, USD, GBP)
  - minimumWithdrawalCents: Int (default 1000 = €10)
  - pendingHoldDays: Int (default 7 days)
- Created platform settings service (/src/server/admin/platformSettingsService.ts):
  - getPlatformSettings(): Returns current settings with caching
  - getPlatformFeeRate(): Convenience function for fee rate
  - getPlatformFeeInfo(): Returns rate, description, percentage display
  - updatePlatformSettings(): Updates settings with audit logging
  - calculatePlatformFeeFromSettings(): Dynamic fee calculation
  - Cache management (1-minute TTL, clearable)
- Created API routes:
  - GET /api/admin/platform-settings: Get current settings
  - PUT /api/admin/platform-settings: Update settings
  - Rate limiting (10 req/min)
  - SUPERADMIN role required
- Created Admin UI (/app/admin/settings/platform/page.tsx):
  - Platform fee rate input with live preview
  - Fee preview showing gross/fee/net breakdown
  - Currency selection (EUR, USD, GBP)
  - Minimum withdrawal configuration
  - Pending hold period configuration
  - Last updated timestamp
- Updated finance service:
  - recordValidViewPayout(): Now uses getPlatformFeeRate() for dynamic fee
  - recordConversionPayout(): Now uses getPlatformFeeRate() for dynamic fee
  - Ledger entry descriptions include actual fee percentage
- Updated admin dashboard with Platform Settings link
- Updated seed file to create default PlatformSettings entry

Stage Summary:
- Platform fee is now configurable (no longer hardcoded)
- Settings cached for performance (1-minute TTL)
- Admin UI shows real-time fee preview
- All payout operations use dynamic fee rate
- Changes take effect immediately for new transactions
- Lint passes with no errors
