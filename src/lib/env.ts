// Environment configuration with defaults
export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'file:./db/custom.db',
  
  // Auth
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dev-secret-key-change-in-production',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Centralized auth server (Authentication_project)
  AUTH_API_URL: process.env.AUTH_API_URL || 'http://localhost:8000',
  AUTH_APP_KEY: process.env.AUTH_APP_KEY || '',
  AUTH_APP_NAME: process.env.AUTH_APP_NAME || 'wayo_ads',

  // OAuth client credentials (Passport Authorization Code Grant)
  AUTH_OAUTH_CLIENT_ID: process.env.AUTH_OAUTH_CLIENT_ID || '',
  AUTH_OAUTH_CLIENT_SECRET: process.env.AUTH_OAUTH_CLIENT_SECRET || '',
  
  // Attribution & Tracking
  ATTRIBUTION_WINDOW_DAYS: parseInt(process.env.ATTRIBUTION_WINDOW_DAYS || '30', 10),
  VIEW_DEDUPE_MINUTES: parseInt(process.env.VIEW_DEDUPE_MINUTES || '30', 10),
  IP_RATE_LIMIT_PER_HOUR: parseInt(process.env.IP_RATE_LIMIT_PER_HOUR || '20', 10),
  
  // Payouts
  CONVERSION_COMMISSION_RATE: parseFloat(process.env.CONVERSION_COMMISSION_RATE || '0.20'),
  
  // Tracking redirect delay in ms
  TRACKING_REDIRECT_DELAY: parseInt(process.env.TRACKING_REDIRECT_DELAY || '800', 10),
  
  // YouTube API
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
} as const;

// Bot-like user agent patterns for basic fraud detection
export const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /node-fetch/i,
  /axios/i,
  /postman/i,
  /insomnia/i,
];
