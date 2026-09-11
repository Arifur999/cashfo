// Shared money-formatting utility -- every remaining prompt displays money
// values, so this is the one place that decides symbol + thousands
// separators + decimal places. Manual symbol map rather than
// Intl.NumberFormat's `style: "currency"` -- that API's actual rendered
// symbol for BDT varies by environment/ICU data (sometimes "BDT", sometimes
// "৳"), and this product's spec calls for a specific, consistent symbol.
const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳",
  USD: "$",
};

export function formatCurrency(amount: number | string, currencyCode: string): string {
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? `${currencyCode} `;
  const n = Number(amount);
  return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
