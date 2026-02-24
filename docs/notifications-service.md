# Notification Service Documentation

## Overview

The notification system provides a comprehensive solution for delivering in-app and email notifications to users. It supports multiple notification types, priorities, delivery methods, and scope levels (user, role, or global broadcast).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Notification System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │  Trigger        │───▶│  Notification Service            │   │
│  │  Functions      │    │  (notificationService.ts)       │   │
│  │                  │    │                                   │   │
│  │  - notifyXXX()   │    │  - createUserNotification()      │   │
│  │  - createRole-   │    │  - createRoleBroadcast()         │   │
│  │    Broadcast()   │    │  - createGlobalBroadcast()      │   │
│  │                  │    │  - listUserNotifications()       │   │
│  └──────────────────┘    │  - markAsRead()                  │   │
│                          │  - markAllAsRead()               │   │
│                          └──────────────┬───────────────────┘   │
│                                         │                        │
│                                         ▼                        │
│                          ┌──────────────────────────────────┐   │
│                          │  Email Service                   │   │
│                          │  (notificationEmailService.ts)  │   │
│                          │                                   │   │
│                          │  - sendNotificationEmail()      │   │
│                          │  - getNotificationEmailTemplate │   │
│                          │  - sendNotificationEmailIfEnabled│  │
│                          └──────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Routes                                               │  │
│  │  /api/notifications          - GET (list notifications) │  │
│  │  /api/notifications/stream   - SSE (real-time stream)    │  │
│  │  /api/notifications/unread-count - GET (unread count)    │  │
│  │  /api/notifications/mark-all-read - POST                  │  │
│  │  /api/notifications/[action]  - POST (mark read/archived)│ │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Types

### Notification Types (43 types)

| Category | Types |
|----------|-------|
| **Payments** | `PAYMENT_FAILED`, `DEPOSIT_FAILED`, `WALLET_CREDITED`, `WITHDRAWAL_FAILED`, `WITHDRAWAL_APPROVED`, `WITHDRAWAL_REQUESTED`, `PAYOUT_COMPLETED`, `STRIPE_PAYOUT_FAILURE` |
| **Campaigns** | `BUDGET_EXHAUSTED`, `BUDGET_LOW`, `CAMPAIGN_PAUSED`, `CAMPAIGN_APPROVED`, `CAMPAIGN_REJECTED`, `CAMPAIGN_UNDER_REVIEW`, `CAMPAIGN_AUTO_PAUSED`, `CAMPAIGN_CONFIDENCE_LOW` |
| **Creator** | `CREATOR_APPLICATION_PENDING`, `CREATOR_APPLICATION_APPROVED`, `CREATOR_APPLICATION_REJECTED`, `CREATOR_APPLIED`, `CREATOR_TIER_CHANGED`, `CREATOR_FLAGGED` |
| **Videos** | `VIDEO_SUBMITTED`, `VIDEO_UPDATED`, `VIDEO_APPROVED`, `VIDEO_REJECTED` |
| **Earnings** | `EARNINGS_AVAILABLE` |
| **Security/Fraud** | `TRACKING_DISABLED`, `FRAUD_DETECTED`, `SUSPICIOUS_ACTIVITY`, `VELOCITY_SPIKE_DETECTED`, `FRAUD_SCORE_EXCEEDED`, `EXCESSIVE_FRAUD_PATTERN`, `UNUSUAL_PAYOUT_CLUSTER` |
| **Account** | `ACCOUNT_PENDING_APPROVAL`, `ROLE_REQUEST_PENDING`, `TRUST_SCORE_DOWNGRADED` |
| **Technical** | `CREDENTIALS_INVALID`, `WEBHOOK_FAILURE`, `YOUTUBE_DISCONNECTED` |
| **System** | `RESERVE_LOCKED`, `RESERVE_RELEASED`, `DYNAMIC_CPM_CHANGED`, `SYSTEM_ANNOUNCEMENT` |

### Priority Levels

| Priority | Description | Use Cases |
|----------|-------------|-----------|
| `P0_CRITICAL` | Critical - immediate attention | Payment failures, fraud detection |
| `P1_HIGH` | High priority | Budget issues, application approvals |
| `P2_NORMAL` | Normal priority | Campaign updates, general notifications |
| `P3_LOW` | Low priority | System announcements, tips |

### Scope Types

| Scope | Description |
|-------|-------------|
| `USER` | Single user notification |
| `ROLE` | All users with a specific role |
| `GLOBAL` | All users in the system |

### Delivery Types

| Type | Description |
|------|-------------|
| `IN_APP` | In-app notification only |
| `EMAIL` | Email notification only |
| `BOTH` | Both in-app and email |

### Status Types

| Status | Description |
|--------|-------------|
| `UNREAD` | New notification |
| `READ` | User has seen it |
| `ARCHIVED` | Archived by user |
| `DISMISSED` | Dismissed by user |

## API Reference

### Notification Service Functions

#### `createUserNotification(input)`

Creates a notification for a single user.

```typescript
import { createUserNotification } from '@/server/notifications/notificationService';

await createUserNotification({
  toUserId: 'user-123',
  type: 'CAMPAIGN_APPROVED',
  priority: 'P2_NORMAL',
  title: 'Campaign Approved',
  message: 'Your campaign "Summer Sale" has been approved!',
  actionUrl: '/campaigns/campaign-456',
  metadata: { campaignId: 'campaign-456', budget: 5000 },
  deliveryType: 'BOTH',
  dedupeKey: 'campaign_approved_campaign-456',
  expiresAt: '2026-03-01T00:00:00Z',
});
```

#### `createRoleBroadcast(input)`

Creates a notification broadcast to all users with a specific role.

```typescript
import { createRoleBroadcast } from '@/server/notifications/notificationService';

await createRoleBroadcast({
  toRole: 'ADVERTISER',
  type: 'SYSTEM_ANNOUNCEMENT',
  priority: 'P2_NORMAL',
  title: 'New Feature Available',
  message: 'Check out our new campaign analytics dashboard!',
  actionUrl: '/analytics',
  scope: 'ROLE',
});
```

#### `createGlobalBroadcast(input)`

Creates a notification for all users in the system.

```typescript
import { createGlobalBroadcast } from '@/server/notifications/notificationService';

await createGlobalBroadcast({
  createdByUserId: 'admin-001',
  type: 'SYSTEM_ANNOUNCEMENT',
  priority: 'P3_LOW',
  title: 'Scheduled Maintenance',
  message: 'System maintenance scheduled for Sunday 2AM - 4AM UTC',
  scope: 'GLOBAL',
});
```

#### `listUserNotifications(input)`

Lists notifications for a user with filtering and pagination.

```typescript
import { listUserNotifications } from '@/server/notifications/notificationService';

const result = await listUserNotifications({
  userId: 'user-123',
  status: 'UNREAD',
  importantOnly: false,
  limit: 20,
  cursor: 'cursor-id',
  type: 'CAMPAIGN_APPROVED',
  priority: 'P1_HIGH',
  search: 'campaign',
});

// Returns: { notifications: [...], nextCursor: string | undefined }
```

#### `getUnreadCount(userId)`

Gets the count of unread notifications for a user.

```typescript
import { getUnreadCount } from '@/server/notifications/notificationService';

const { total, important } = await getUnreadCount('user-123');
// total: number of all unread notifications
// important: number of P0_CRITICAL and P1_HIGH unread notifications
```

#### `markAsRead(input)`

Marks a notification as read.

```typescript
import { markAsRead } from '@/server/notifications/notificationService';

await markAsRead({
  userId: 'user-123',
  notificationId: 'notification-456',
});
```

#### `markAllAsRead(userId)`

Marks all notifications as read for a user.

```typescript
import { markAllAsRead } from '@/server/notifications/notificationService';

await markAllAsRead('user-123');
```

#### `getNotificationPreferences(userId)`

Gets user notification preferences.

```typescript
import { getNotificationPreferences } from '@/server/notifications/notificationService';

const prefs = await getNotificationPreferences('user-123');
// Returns: { allowInApp, allowEmail, mutedTypes[], toastMaxPerSession, lowBudgetPercent }
```

#### `updateNotificationPreferences(userId, data)`

Updates user notification preferences.

```typescript
import { updateNotificationPreferences } from '@/server/notifications/notificationService';

await updateNotificationPreferences('user-123', {
  allowEmail: true,
  allowInApp: true,
  mutedTypes: ['SYSTEM_ANNOUNCEMENT'],
  toastMaxPerSession: 5,
  lowBudgetPercent: 20,
});
```

## Notification Triggers

The notification triggers module (`notificationTriggers.ts`) provides convenient functions to create specific types of notifications with pre-defined templates.

### Available Trigger Functions

| Function | Priority | Description |
|----------|----------|-------------|
| `notifyPaymentFailed()` | P0_CRITICAL | Payment processing failed |
| `notifyDepositFailed()` | P0_CRITICAL | Deposit failed |
| `notifyBudgetExhausted()` | P1_HIGH | Campaign budget depleted |
| `notifyBudgetLow()` | P1_HIGH | Campaign budget below threshold |
| `notifyCampaignPaused()` | P1_HIGH | Campaign paused |
| `notifyCampaignApproved()` | P2_NORMAL | Campaign approved |
| `notifyCampaignRejected()` | P2_NORMAL | Campaign rejected |
| `notifyCreatorApplicationPending()` | P2_NORMAL | Application under review |
| `notifyCreatorApplicationApproved()` | P1_HIGH | Application approved |
| `notifyCreatorApplicationRejected()` | P2_NORMAL | Application rejected |
| `notifyVideoApproved()` | P2_NORMAL | Video submitted for review |
| `notifyVideoRejected()` | P2_NORMAL | Video rejected |
| `notifyEarningsAvailable()` | P1_HIGH | New earnings available |
| `notifyWithdrawalApproved()` | P1_HIGH | Withdrawal approved |
| `notifyWithdrawalRequested()` | P2_NORMAL | Withdrawal requested |
| `notifyWithdrawalFailed()` | P0_CRITICAL | Withdrawal failed |
| `notifyFraudDetected()` | P0_CRITICAL | Fraud detected |
| `notifySuspiciousActivity()` | P0_CRITICAL | Suspicious activity detected |

### Using Triggers

```typescript
import { 
  notifyCampaignApproved, 
  notifyBudgetLow,
  notifyCreatorApplicationApproved 
} from '@/server/notifications/notificationTriggers';

// Notify advertiser their campaign is approved
await notifyCampaignApproved({
  userId: 'advertiser-123',
  campaignId: 'campaign-456',
  campaignName: 'Summer Sale 2025',
});

// Notify advertiser about low budget
await notifyBudgetLow({
  userId: 'advertiser-123',
  campaignId: 'campaign-456',
  campaignName: 'Summer Sale 2025',
  percentRemaining: 15,
  amount: 750,
  currency: 'EUR',
});

// Notify creator their application was approved
await notifyCreatorApplicationApproved({
  userId: 'creator-789',
  campaignId: 'campaign-456',
  campaignName: 'Summer Sale 2025',
  applicationId: 'app-001',
});
```

## Email Notifications

The email service handles sending notifications via SMTP.

### Sending Emails

```typescript
import { sendNotificationEmail } from '@/server/notifications/notificationEmailService';

await sendNotificationEmail({
  toEmail: 'user@example.com',
  toName: 'John Doe',
  subject: 'Your Campaign is Live!',
  htmlContent: '<h1>Campaign Approved</h1><p>Your campaign...</p>',
  textContent: 'Campaign Approved\n\nYour campaign...',
});
```

### Email Templates

The system includes pre-built email templates for common notification types:

- `WITHDRAWAL_APPROVED`
- `WITHDRAWAL_REQUESTED`
- `WITHDRAWAL_FAILED`
- `EARNINGS_AVAILABLE`
- `CAMPAIGN_APPROVED`
- `CAMPAIGN_REJECTED`
- `CREATOR_APPLICATION_APPROVED`
- `CREATOR_APPLICATION_REJECTED`

### Sending Conditional Emails

```typescript
import { sendNotificationEmailIfEnabled } from '@/server/notifications/notificationEmailService';

await sendNotificationEmailIfEnabled({
  userId: 'user-123',
  type: 'CAMPAIGN_APPROVED',
  templateData: {
    campaignName: 'Summer Sale',
    campaignId: 'campaign-456',
  },
});
```

## API Endpoints

### GET /api/notifications

List user notifications.

**Query Parameters:**
- `status` - Filter by status (UNREAD, READ, ARCHIVED, DISMISSED)
- `important` - Show only important (1) or all (0)
- `limit` - Number of results (default: 20, max: 100)
- `cursor` - Pagination cursor
- `type` - Filter by notification type
- `priority` - Filter by priority
- `search` - Search in title/message

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif-123",
      "type": "CAMPAIGN_APPROVED",
      "priority": "P2_NORMAL",
      "title": "Campaign Approved",
      "message": "Your campaign...",
      "actionUrl": "/campaigns/123",
      "metadata": {},
      "isImportant": false,
      "createdAt": "2026-02-19T12:00:00Z",
      "expiresAt": null,
      "delivery": {
        "id": "delivery-123",
        "status": "UNREAD",
        "readAt": null,
        "archivedAt": null,
        "dismissedAt": null
      }
    }
  ],
  "nextCursor": "cursor-456"
}
```

### GET /api/notifications/unread-count

Get unread notification counts.

**Response:**
```json
{
  "total": 5,
  "important": 2
}
```

### POST /api/notifications/mark-all-read

Mark all notifications as read.

**Response:**
```json
{
  "success": true,
  "updated": 5
}
```

### POST /api/notifications/[action]

Perform an action on a notification.

**Actions:**
- `read` - Mark as read
- `archive` - Archive notification
- `dismiss` - Dismiss notification

**Request Body:**
```json
{
  "notificationId": "notif-123"
}
```

## Database Schema

### Notification Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `scope` | ENUM | USER, ROLE, GLOBAL |
| `toUserId` | UUID | Target user (for USER scope) |
| `toRole` | STRING | Target role (for ROLE scope) |
| `senderId` | UUID | Notification sender |
| `type` | ENUM | Notification type |
| `priority` | ENUM | P0_CRITICAL, P1_HIGH, P2_NORMAL, P3_LOW |
| `title` | STRING | Notification title (max 200) |
| `message` | STRING | Notification message (max 2000) |
| `actionUrl` | STRING | Action URL |
| `metadata` | JSONB | Additional metadata |
| `deliveryType` | ENUM | IN_APP, EMAIL, BOTH |
| `dedupeKey` | STRING | Deduplication key |
| `expiresAt` | TIMESTAMP | Expiration time |
| `createdAt` | TIMESTAMP | Creation time |
| `updatedAt` | TIMESTAMP | Last update time |

### NotificationDelivery Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `notificationId` | UUID | Foreign key to Notification |
| `userId` | UUID | Target user |
| `status` | ENUM | UNREAD, READ, ARCHIVED, DISMISSED |
| `readAt` | TIMESTAMP | When marked as read |
| `archivedAt` | TIMESTAMP | When archived |
| `dismissedAt` | TIMESTAMP | When dismissed |
| `createdAt` | TIMESTAMP | Creation time |

### NotificationPreference Table

| Column | Type | Description |
|--------|------|-------------|
| `userId` | UUID | Primary key |
| `allowInApp` | BOOLEAN | Allow in-app notifications |
| `allowEmail` | BOOLEAN | Allow email notifications |
| `mutedTypes` | STRING | Comma-separated muted types |
| `toastMaxPerSession` | INTEGER | Max toasts per session |
| `lowBudgetPercent` | INTEGER | Budget threshold percentage |
| `createdAt` | TIMESTAMP | Creation time |
| `updatedAt` | TIMESTAMP | Last update time |

## Best Practices

1. **Use Deduplication Keys**: Prevent duplicate notifications by using the `dedupeKey` parameter for recurring notifications (e.g., budget alerts).

2. **Set Appropriate Priorities**: Use `P0_CRITICAL` only for urgent matters requiring immediate attention.

3. **Include Metadata**: Store relevant IDs and data in metadata for later retrieval and analytics.

4. **Set Expiration**: Use `expiresAt` for time-sensitive notifications to avoid cluttering users' notification lists.

5. **Use Triggers**: Prefer trigger functions over direct `createUserNotification` calls for consistent templates.

6. **Email Preferences**: Always check user email preferences before sending email notifications.

7. **Action URLs**: Provide meaningful `actionUrl` values to direct users to relevant pages.

## Testing

Run notification service tests:

```bash
bun test src/server/notifications/
```

Key test files:
- `notificationService.test.ts` - Core service tests
- `notificationTriggers.test.ts` - Trigger function tests
- `notificationEmailService.test.ts` - Email service tests
