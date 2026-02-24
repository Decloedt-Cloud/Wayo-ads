# Wayo Ads Market - Marketing Campaigns Marketplace

A production-ready MVP marketplace connecting **Advertisers** and **Content Creators** built with Next.js 16, TypeScript, Prisma, and NextAuth.js.

## 🎯 Features

### For Advertisers
- Create and manage campaigns with custom budgets and CPM rates
- Upload campaign assets (images, videos, documents, brand guidelines)
- Review and approve/reject creator applications
- Track campaign performance with real-time analytics
- View top performing creators

### For Creators
- Browse active campaigns
- Apply to join campaigns
- Generate unique tracking links
- Track views and earnings
- Access approved campaign assets

### Tracking & Fraud Prevention
- **Valid Views Only**: Only legitimate views count towards payouts
- **Bot Detection**: User agent analysis to identify bots
- **View Deduplication**: Same visitor views within cooldown window are filtered
- **IP Rate Limiting**: Maximum events per IP per hour
- **Last Click Attribution**: 30-day attribution window (configurable)
- **Privacy First**: IP and user agent are hashed, not stored raw

### Payout System
- CPM-based payouts per valid view
- Conversion commission (configurable rate)
- Real-time budget tracking
- Payout ledger for transparency

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Bun (recommended) or npm

### Installation

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env

# Push database schema
bun run db:push

# Seed the database with test data
bun run prisma/seed.ts

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📋 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="file:./db/custom.db"

# Authentication
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Attribution & Tracking Configuration
ATTRIBUTION_WINDOW_DAYS=30
VIEW_DEDUPE_MINUTES=30
IP_RATE_LIMIT_PER_HOUR=20

# Payouts
CONVERSION_COMMISSION_RATE=0.20

# Tracking redirect delay (ms)
TRACKING_REDIRECT_DELAY=800
```

### Environment Variables Explained

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:./db/custom.db` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Required in production |
| `NEXTAUTH_URL` | Base URL for auth callbacks | `http://localhost:3000` |
| `ATTRIBUTION_WINDOW_DAYS` | Days to attribute conversions | `30` |
| `VIEW_DEDUPE_MINUTES` | Minutes before counting duplicate view | `30` |
| `IP_RATE_LIMIT_PER_HOUR` | Max views per IP per hour | `20` |
| `CONVERSION_COMMISSION_RATE` | Creator commission on conversions | `0.20` (20%) |
| `TRACKING_REDIRECT_DELAY` | Delay before redirect (ms) | `800` |

## 🗄️ Database Schema

### Core Entities

- **User**: Email, name, roles (comma-separated: USER,ADVERTISER,CREATOR)
- **Campaign**: Title, description, landing URL, budget, CPM, status
- **CampaignAsset**: Type (IMAGE/VIDEO/DOCUMENT/BRAND_GUIDELINES), URL, title
- **CampaignApplication**: Campaign, creator, status (PENDING/APPROVED/REJECTED)
- **CreatorTrackingLink**: Campaign, creator, unique slug
- **VisitEvent**: Campaign, creator, visitor ID, validity flag
- **ConversionEvent**: Campaign, type (SIGNUP/PURCHASE/SUBSCRIPTION), revenue
- **PayoutLedger**: Campaign, creator, amount, reason (VIEW/CONVERSION)
- **RateLimitEntry**: Key, count, window start

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Route Handlers
│   │   ├── auth/[...nextauth]/   # NextAuth.js routes
│   │   ├── campaigns/            # Campaign CRUD
│   │   ├── campaigns/[id]/       # Single campaign operations
│   │   │   ├── apply/           # Apply to campaign
│   │   │   ├── applications/    # Approve/reject applications
│   │   │   └── links/           # Tracking link management
│   │   ├── creator/applications/ # Creator's applications
│   │   ├── user/role/           # Role management
│   │   ├── track/view/          # View tracking with validation
│   │   └── convert/             # Conversion tracking
│   ├── auth/signin/             # Sign-in page
│   ├── campaigns/               # Campaign list & detail
│   ├── dashboard/
│   │   ├── advertiser/          # Advertiser dashboard
│   │   └── creator/             # Creator dashboard
│   └── t/[slug]/                # Tracking redirect page
├── components/                   # React components
│   └── ui/                      # shadcn/ui components
├── hooks/                       # Custom React hooks
└── lib/                         # Utilities
    ├── analytics.ts             # Analytics helper functions
    ├── auth.ts                  # NextAuth configuration
    ├── auth-context.tsx         # Client-side auth context
    ├── db.ts                    # Prisma client
    ├── env.ts                   # Environment configuration
    ├── roles.ts                 # Role utilities
    ├── server-auth.ts           # Server-side auth helpers
    └── tracking.ts              # Tracking utilities (hashing, etc.)

prisma/
├── schema.prisma                # Database schema
└── seed.ts                      # Seed script
```

## 🔌 API Endpoints

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js routes

### Campaigns
- `GET /api/campaigns` - List campaigns (public)
- `POST /api/campaigns` - Create campaign (requires ADVERTISER role)
- `GET /api/campaigns/[id]` - Get campaign details
- `PATCH /api/campaigns/[id]` - Update campaign (owner only)
- `DELETE /api/campaigns/[id]` - Delete campaign (owner only)

### Applications
- `POST /api/campaigns/[id]/apply` - Apply to campaign (requires CREATOR role)
- `POST /api/campaigns/[id]/applications/[applicationId]/approve` - Approve application
- `POST /api/campaigns/[id]/applications/[applicationId]/reject` - Reject application
- `GET /api/creator/applications` - Get creator's applications

### Tracking
- `GET /api/campaigns/[id]/links` - Get tracking links
- `POST /api/campaigns/[id]/links` - Create tracking link
- `GET /t/[slug]` - Tracking redirect page
- `POST /api/track/view` - Track view with validation
- `POST /api/convert` - Track conversion with attribution

### User
- `POST /api/user/role` - Grant role to current user

## 🧪 Test Accounts

After running the seed script, these accounts are available:

| Email | Roles | Notes |
|-------|-------|-------|
| `advertiser@example.com` | USER, ADVERTISER | Has sample campaign |
| `creator1@example.com` | USER, CREATOR | Approved for sample campaign |
| `creator2@example.com` | USER, CREATOR | Pending application |
| `hybrid@example.com` | USER, ADVERTISER, CREATOR | Both roles |

## 🔄 Tracking Flow

1. **Creator generates tracking link**: `/t/wayo-sarah-2024`
2. **Visitor clicks link**: Redirects to intermediate page
3. **Tracking page**:
   - Sets visitor ID cookie
   - Sets last touch attribution cookies
   - Pings `/api/track/view`
4. **View validation**:
   - Bot detection
   - Deduplication check
   - Rate limiting
   - Budget check
   - Payout creation (if valid)
5. **Redirect to landing URL** after delay

## 🎨 Attribution Models

Currently implemented:
- **LAST_CLICK** (default): Attributes to most recent touch

Stubbed for future:
- **FIRST_CLICK**: Attributes to first touch
- **WEIGHTED**: Distributes credit across touches

## 🛡️ Security Features

- Input validation with Zod
- Auth checks on all protected routes
- Role-based access control
- Privacy-first tracking (hashed IP/UA)
- Budget concurrency handling with transactions
- Asset access restricted to approved creators

## 📊 Analytics Functions

Located in `src/lib/analytics.ts`:

- `getValidViewsCount(campaignId)` - Count valid views for campaign
- `getCreatorValidViewsCount(campaignId, creatorId)` - Creator's views
- `getBudgetSpent(campaignId)` - Total spent
- `getBudgetRemaining(campaignId)` - Remaining budget
- `getCampaignStats(campaignId)` - Full campaign statistics
- `getTopCreators(campaignId, limit)` - Top performers
- `getCreatorCampaignStats(campaignId, creatorId)` - Creator's stats
- `getAdvertiserStats(advertiserId)` - Advertiser's all campaigns
- `getCreatorStats(creatorId)` - Creator's all applications

## 🧰 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Prisma ORM (SQLite)
- **Auth**: NextAuth.js v4
- **Validation**: Zod
- **State**: React Context + TanStack Query

## 📝 Scripts

```bash
bun run dev       # Start development server
bun run build     # Build for production
bun run lint      # Run ESLint
bun run db:push   # Push schema changes
bun run db:generate # Generate Prisma client
```

## 🚧 Future Improvements

- Email notifications for application status
- Real-time dashboard updates (WebSocket)
- Advanced analytics charts
- Payment integration
- Multi-currency support
- Weighted attribution model
- A/B testing for campaigns
- API key authentication for server-to-server conversions

## 📄 License

MIT
