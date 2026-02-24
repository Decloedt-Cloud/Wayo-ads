import crypto from 'crypto';

// Environment configuration
const VIEW_DEDUPE_MINUTES = parseInt(process.env.VIEW_DEDUPE_MINUTES || '30', 10);
const IP_RATE_LIMIT_PER_HOUR = parseInt(process.env.IP_RATE_LIMIT_PER_HOUR || '20', 10);
const ATTRIBUTION_WINDOW_DAYS = parseInt(process.env.ATTRIBUTION_WINDOW_DAYS || '30', 10);
const CONVERSION_COMMISSION_RATE = parseFloat(process.env.CONVERSION_COMMISSION_RATE || '0.20');
const FRAUD_SCORE_THRESHOLD = parseInt(process.env.FRAUD_SCORE_THRESHOLD || '50', 10);

export const config = {
  viewDedupeMinutes: VIEW_DEDUPE_MINUTES,
  ipRateLimitPerHour: IP_RATE_LIMIT_PER_HOUR,
  attributionWindowDays: ATTRIBUTION_WINDOW_DAYS,
  conversionCommissionRate: CONVERSION_COMMISSION_RATE,
  fraudScoreThreshold: FRAUD_SCORE_THRESHOLD,
};

/**
 * Hash IP address for privacy
 */
export function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip + process.env.NEXTAUTH_SECRET).digest('hex');
}

/**
 * Hash User Agent for privacy
 */
export function hashUserAgent(ua: string): string {
  return crypto.createHash('sha256').update(ua + process.env.NEXTAUTH_SECRET).digest('hex');
}

/**
 * Check if user agent looks like a bot
 */
export function isLikelyBot(userAgent: string | null): boolean {
  if (!userAgent) return false;

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /node-fetch/i,
    /axios/i,
    /headless/i,
    /phantom/i,
    /selenium/i,
    /puppeteer/i,
    /playwright/i,
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
  ];

  return botPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Generate a unique slug for tracking links
 */
export function generateTrackingSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

/**
 * Calculate payout per valid view based on CPM
 */
export function calculatePayoutPerView(cpmCents: number): number {
  // CPM is cost per 1000 views, so payout per view is CPM / 1000
  return Math.floor(cpmCents / 1000);
}

/**
 * Calculate conversion payout
 */
export function calculateConversionPayout(revenueCents: number): number {
  return Math.floor(revenueCents * config.conversionCommissionRate);
}

/**
 * Get dedupe window start time
 */
export function getDedupeWindowStart(): Date {
  return new Date(Date.now() - config.viewDedupeMinutes * 60 * 1000);
}

/**
 * Get rate limit window start time (1 hour)
 */
export function getRateLimitWindowStart(): Date {
  return new Date(Date.now() - 60 * 60 * 1000);
}

/**
 * Get attribution window start time
 */
export function getAttributionWindowStart(): Date {
  return new Date(Date.now() - config.attributionWindowDays * 24 * 60 * 60 * 1000);
}

/**
 * Generate visitor ID (UUID)
 */
export function generateVisitorId(): string {
  return crypto.randomUUID();
}

/**
 * Generate device fingerprint hash from components
 */
export function generateDeviceFingerprint(
  screenResolution: string,
  timezone: string,
  language: string,
  platform: string
): string {
  const fingerprint = `${screenResolution}|${timezone}|${language}|${platform}`;
  return crypto.createHash('sha256').update(fingerprint + process.env.NEXTAUTH_SECRET).digest('hex');
}

/**
 * Fraud detection scoring weights
 */
const FRAUD_WEIGHTS = {
  BOT_DETECTED: 100,
  HIGH_IP_VELOCITY: 40,
  SUSPICIOUS_USER_AGENT: 30,
  DATA_CENTER_IP: 25,
  NO_REFERRER: 10,
  VPN_DETECTED: 35,
  NEW_VISITOR: 5,
  REPEAT_VISITOR: -10,
  VALID_GEOLOCATION: -15,
};

/**
 * Input parameters for fraud scoring
 */
export interface FraudScoreParams {
  isBot: boolean;
  ipVelocity: number; // visits from this IP in last hour
  ipVisitCount: number; // total visits from this IP
  userAgent: string;
  referrer: string | null;
  isNewVisitor: boolean;
  countryCode: string | null;
  isKnownVpn: boolean;
  isDataCenter: boolean;
  isSameDevice: boolean; // if same device fingerprint seen before
}

/**
 * Calculate fraud score (0-100)
 * Higher score = more likely fraudulent
 */
export function calculateFraudScore(params: FraudScoreParams): number {
  let score = 0;
  const reasons: string[] = [];

  if (params.isBot) {
    score += FRAUD_WEIGHTS.BOT_DETECTED;
    reasons.push('bot_detected');
  }

  if (params.ipVelocity > 10) {
    score += FRAUD_WEIGHTS.HIGH_IP_VELOCITY;
    reasons.push('high_ip_velocity');
  }

  if (params.ipVisitCount > 50) {
    score += 20;
    reasons.push('very_high_ip_count');
  }

  if (isSuspiciousUserAgent(params.userAgent)) {
    score += FRAUD_WEIGHTS.SUSPICIOUS_USER_AGENT;
    reasons.push('suspicious_user_agent');
  }

  if (!params.referrer && params.ipVisitCount > 5) {
    score += FRAUD_WEIGHTS.NO_REFERRER;
    reasons.push('no_referrer');
  }

  if (params.isKnownVpn) {
    score += FRAUD_WEIGHTS.VPN_DETECTED;
    reasons.push('vpn_detected');
  }

  if (params.isDataCenter) {
    score += FRAUD_WEIGHTS.DATA_CENTER_IP;
    reasons.push('data_center_ip');
  }

  if (params.isSameDevice && params.ipVisitCount > 3) {
    score += 15;
    reasons.push('repeat_device');
  }

  if (!params.isNewVisitor) {
    score += FRAUD_WEIGHTS.REPEAT_VISITOR;
  }

  if (params.countryCode) {
    score += FRAUD_WEIGHTS.VALID_GEOLOCATION;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Check if user agent is suspicious (automated tools, unusual patterns)
 */
function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /headless/i,
    /phantom/i,
    /selenium/i,
    /puppeteer/i,
    /playwright/i,
    /automation/i,
    /electron/i,
    /python/i,
    /curl/i,
    /wget/i,
    /httpclient/i,
  ];
  return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
}

/**
 * Determine if view should be flagged as suspicious based on score
 */
export function isViewSuspicious(fraudScore: number, threshold: number = 50): boolean {
  return fraudScore >= threshold;
}

/**
 * Supported countries for valid traffic (optional geo-blocking)
 */
const VALID_COUNTRIES = new Set([
  'US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT',
  'CH', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'PL', 'CZ', 'HU',
  'RO', 'BG', 'GR', 'SK', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT',
  'AU', 'NZ', 'JP', 'KR', 'SG', 'HK', 'TW', 'IN', 'BR', 'MX',
  'AR', 'CL', 'CO', 'PE', 'VE', 'ZA', 'EG', 'NG', 'KE', 'MA',
]);

/**
 * Check if country is valid for advertising
 */
export function isValidCountry(countryCode: string | null): boolean {
  if (!countryCode) return true;
  return VALID_COUNTRIES.has(countryCode.toUpperCase());
}
