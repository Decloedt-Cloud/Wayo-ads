/**
 * DevConsole Email Provider
 * 
 * Development-only provider that logs emails to console.
 * Safe for development - never sends real emails.
 * Shows email content in a readable format.
 */

import type { EmailProvider, EmailSendOptions, EmailSendResult } from '../types';

export class DevConsoleProvider implements EmailProvider {
  readonly name = 'devconsole';

  async isConfigured(): Promise<boolean> {
    // Always available in development
    return true;
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    // Generate a fake message ID
    const messageId = `dev-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Log email details
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL (DevConsole Provider)');
    console.log('='.repeat(60));
    console.log(`To: ${options.toName ? `${options.toName} <${options.to}>` : options.to}`);
    console.log(`Subject: ${options.subject}`);
    if (options.replyTo) {
      console.log(`Reply-To: ${options.replyTo}`);
    }
    if (options.tags && Object.keys(options.tags).length > 0) {
      console.log(`Tags: ${JSON.stringify(options.tags)}`);
    }
    console.log('-'.repeat(60));
    
    // Log text version if available (cleaner for console)
    if (options.text) {
      console.log('\n📝 TEXT VERSION:');
      console.log(options.text);
    }
    
    // Log HTML version (truncated for readability)
    if (options.html) {
      const htmlPreview = options.html.length > 500 
        ? options.html.substring(0, 500) + '...\n[truncated]' 
        : options.html;
      console.log('\n🎨 HTML VERSION (preview):');
      console.log(htmlPreview);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');

    // Simulate async behavior
    await new Promise(resolve => setTimeout(resolve, 10));

    return {
      success: true,
      messageId,
    };
  }
}

// Singleton instance
export const devConsoleProvider = new DevConsoleProvider();
