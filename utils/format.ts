/**
 * Formats a date using Australian locale (en-AU).
 * Uses Australian date format (DD Month YYYY) for consistency with Australian market.
 *
 * @param {Date} date - The date to format
 * @param {boolean} onlyMonth - If true, only returns month and year
 * @returns {string} Formatted date string (e.g., "29 February 2024")
 *
 * @example
 * ```ts
 * formatDate(new Date('2024-02-29')) // "29 February 2024"
 * formatDate(new Date('2024-02-29'), true) // "February 2024"
 * ```
 */
export const formatDate = (date: Date, onlyMonth?: boolean) => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
  };
  if (!onlyMonth) {
    options.day = 'numeric';
  }

  return new Intl.DateTimeFormat('en-AU', options).format(date);
};

/**
 * Formats a number as Australian Dollar (AUD) currency.
 * Uses Australian locale formatting (en-AU) for proper currency display.
 *
 * @param {number | null} amount - The amount to format (in cents or dollars)
 * @returns {string} Formatted currency string (e.g., "$100" or "A$100")
 *
 * @example
 * ```ts
 * formatCurrency(100) // "$100" (Australian format)
 * formatCurrency(1234.56) // "$1,235" (rounded to nearest dollar)
 * formatCurrency(null) // "$0"
 * ```
 */
export const formatCurrency = (amount: number | null) => {
  const value = amount || 0;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function formatQuantity(quantity: number, noun: string): string {
  return quantity === 1 ? `${quantity} ${noun}` : `${quantity} ${noun}s`;
}
