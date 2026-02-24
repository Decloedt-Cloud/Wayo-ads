/**
 * Email Layout Component
 * 
 * Reusable email layout with header, body, footer.
 * Supports both HTML and plain-text rendering.
 */

import type { EmailTemplateContext } from '../types';

export interface LayoutOptions {
  previewText: string;
  title?: string;
}

const BRAND_COLOR = '#F47A1F';
const BRAND_COLOR_LIGHT = '#FF9A56';
const TEXT_COLOR = '#374151';
const TEXT_MUTED = '#6b7280';
const BG_COLOR = '#f4f4f5';

/**
 * Generate email HTML layout
 */
export function renderHtmlLayout(
  context: EmailTemplateContext,
  options: LayoutOptions,
  bodyContent: string
): string {
  const { appName, appUrl, supportEmail, currentYear } = context;
  const { previewText, title } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>${title || appName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings xmlns:o="urn:schemas-microsoft-com:office:office">
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: ${BRAND_COLOR};
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    }
    .button:hover {
      background: ${BRAND_COLOR_LIGHT};
    }
    .button-secondary {
      background: #1f2937;
    }
    .button-secondary:hover {
      background: #374151;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .fluid {
        max-width: 100% !important;
        height: auto !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; word-spacing: normal; background-color: ${BG_COLOR};">
  <!-- Preview text -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${previewText}
    &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
  </div>
  
  <!-- Email wrapper -->
  <div role="article" aria-roledescription="email" aria-label="${title || appName}" lang="en" style="font-size: 16px; background-color: ${BG_COLOR}; background-image: none; background-repeat: repeat; background-position: top left; background-attachment: scroll;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${BG_COLOR};">
      <tr>
        <td align="center" style="padding: 20px 0;">
          <!--[if mso]>
          <table role="presentation" align="center" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td>
          <![endif]-->
          
          <!-- Email container -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="email-container" style="margin: 0 auto; max-width: 600px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <tr>
              <td style="background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_COLOR_LIGHT} 100%); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: white; font-family: Arial, sans-serif; font-size: 24px; font-weight: bold;">
                  ${title || appName}
                </h1>
              </td>
            </tr>
            
            <!-- Body -->
            <tr>
              <td style="padding: 30px;">
                ${bodyContent}
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="text-align: center;">
                      <p style="margin: 0 0 10px 0; font-size: 14px; color: ${TEXT_MUTED};">
                        <a href="${appUrl}" style="color: ${BRAND_COLOR}; text-decoration: none;">${appName}</a>
                        ${supportEmail ? ` • <a href="mailto:${supportEmail}" style="color: ${TEXT_MUTED}; text-decoration: none;">Support</a>` : ''}
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                        © ${currentYear} ${appName}. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
          </table>
          <!-- /Email container -->
          
          <!--[if mso]>
          </td>
          </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Generate plain-text layout
 */
export function renderTextLayout(
  context: EmailTemplateContext,
  options: LayoutOptions,
  bodyContent: string
): string {
  const { appName, appUrl, supportEmail, currentYear } = context;
  const { title } = options;

  const divider = '─'.repeat(50);
  const footer = `
${divider}
${appName}${supportEmail ? ` • Support: ${supportEmail}` : ''}
${appUrl}
© ${currentYear} ${appName}. All rights reserved.
`;

  return `
${divider}
${title || appName}
${divider}

${bodyContent}
${footer}
`.trim();
}

/**
 * Render a CTA button
 */
export function renderButton(text: string, url: string, variant: 'primary' | 'secondary' = 'primary'): string {
  const style = variant === 'primary' 
    ? `background: ${BRAND_COLOR};` 
    : 'background: #1f2937;';
  
  return `
  <div style="text-align: center; margin: 30px 0;">
    <a href="${url}" style="${style} color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
      ${text}
    </a>
  </div>
  `;
}

/**
 * Render a text button (for plain text emails)
 */
export function renderTextButton(text: string, url: string): string {
  return `${text}: ${url}`;
}

/**
 * Render a highlighted info box
 */
export function renderInfoBox(content: string): string {
  return `
  <div style="background: #f0f9ff; border-left: 4px solid ${BRAND_COLOR}; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
    ${content}
  </div>
  `;
}

/**
 * Render a warning box
 */
export function renderWarningBox(content: string): string {
  return `
  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
    ${content}
  </div>
  `;
}

/**
 * Render an error/danger box
 */
export function renderErrorBox(content: string): string {
  return `
  <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
    ${content}
  </div>
  `;
}

/**
 * Render a paragraph
 */
export function renderParagraph(text: string): string {
  return `<p style="font-size: 16px; color: ${TEXT_COLOR}; line-height: 1.6; margin: 0 0 16px 0;">${text}</p>`;
}

/**
 * Render a code block
 */
export function renderCodeBlock(code: string): string {
  return `<code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 14px;">${code}</code>`;
}
