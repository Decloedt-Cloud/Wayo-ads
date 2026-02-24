/**
 * Email Provider Factory
 * 
 * Selects the appropriate email provider based on environment and configuration.
 * Provider priority:
 * 1. If SMTP is configured and enabled -> SMTPProvider
 * 2. Otherwise -> DevConsoleProvider
 */

import type { EmailProvider } from '../types';
import { devConsoleProvider } from './devConsole';
import { smtpProvider } from './smtp';
import { isEmailConfigured } from '@/server/admin/emailSettingsService';

// Cache the last known state to avoid repeated DB queries
let cachedProvider: EmailProvider | null = null;
let lastCheckTime = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get the appropriate email provider
 * Checks if SMTP is configured, otherwise falls back to DevConsole
 */
export async function getEmailProvider(): Promise<EmailProvider> {
  const now = Date.now();
  
  // Use cached provider if still valid
  if (cachedProvider && (now - lastCheckTime) < CACHE_TTL) {
    return cachedProvider;
  }

  // Check if SMTP is configured
  const hasSmtp = await isEmailConfigured();
  
  if (hasSmtp) {
    cachedProvider = smtpProvider;
  } else {
    cachedProvider = devConsoleProvider;
  }
  
  lastCheckTime = now;
  return cachedProvider;
}

/**
 * Force refresh the provider cache
 */
export function clearProviderCache(): void {
  cachedProvider = null;
  lastCheckTime = 0;
}

/**
 * Get all available providers for admin UI
 */
export function getAvailableProviders(): { name: string; description: string }[] {
  return [
    {
      name: 'devconsole',
      description: 'Development console logger (no real emails sent)',
    },
    {
      name: 'smtp',
      description: 'Production SMTP via nodemailer',
    },
  ];
}

// Re-export individual providers
export { devConsoleProvider, smtpProvider };
