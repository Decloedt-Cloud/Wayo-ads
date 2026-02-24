/**
 * Currency Configuration
 * 
 * Central configuration for all supported currencies in the platform.
 * Used for display, formatting, and validation.
 */

/**
 * Currency information structure
 */
export interface CurrencyInfo {
  code: string;           // ISO 4217 currency code
  symbol: string;         // Currency symbol (e.g., €, $, £)
  name: string;           // Full name (e.g., Euro, US Dollar)
  symbolPosition: 'before' | 'after';  // Symbol position relative to amount
  decimalSeparator: '.' | ',';         // Decimal separator
  thousandsSeparator: ',' | '.' | ' '; // Thousands separator
}

/**
 * All supported currencies
 * 
 * MAD (Moroccan Dirham) is included as a local currency for Morocco operations.
 */
export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    symbolPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  {
    code: 'MAD',
    symbol: 'DH',
    name: 'Moroccan Dirham',
    symbolPosition: 'after',
    decimalSeparator: '.',
    thousandsSeparator: ' ',
  },
];

/**
 * Get currency info by code
 */
export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code);
}

/**
 * Get all currency codes
 */
export function getCurrencyCodes(): string[] {
  return SUPPORTED_CURRENCIES.map((c) => c.code);
}

/**
 * Format currency for display
 * 
 * @param cents - Amount in cents
 * @param currencyCode - ISO 4217 currency code
 * @param options - Formatting options
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1500, 'EUR') // '€15.00'
 * formatCurrency(1500, 'MAD') // '15.00 DH'
 * formatCurrency(1500, 'USD', { showCode: true }) // '$15.00 USD'
 */
export function formatCurrency(
  cents: number,
  currencyCode: string = 'EUR',
  options: {
    showCode?: boolean;
    locale?: string;
  } = {}
): string {
  const { showCode = false } = options;
  const info = getCurrencyInfo(currencyCode);
  
  // Fallback to Intl formatting if currency not in our list
  if (!info) {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  }

  const amount = cents / 100;
  const formatted = amount.toFixed(2);
  
  // Build the display string based on symbol position
  let result: string;
  if (info.symbolPosition === 'before') {
    result = `${info.symbol}${formatted}`;
  } else {
    result = `${formatted} ${info.symbol}`;
  }

  // Append currency code if requested
  if (showCode) {
    result = `${result} ${info.code}`;
  }

  return result;
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  const info = getCurrencyInfo(currencyCode);
  return info?.symbol ?? currencyCode;
}

/**
 * Validate if a currency code is supported
 */
export function isValidCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.some((c) => c.code === code);
}

/**
 * Currency options for select dropdowns
 */
export const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} (${c.symbol})`,
  symbol: c.symbol,
  name: c.name,
}));
