import type { RawSellTransaction } from './types';

/**
 * Parse Morgan Stanley format trade confirmations.
 *
 * Text layout (variable field ordering, some fields optional):
 *
 * Trade Date Settlement Date Quantity Price Settlement Amount
 * MM/DD/YYYY MM/DD/YYYY N PRICE
 * Transaction Type: Sold | Sold Short
 * Description: ARISTA NETWORKS INC
 * Symbol / CUSIP / ISIN: ANET / ...
 * Principal $X,XXX.XX
 * Commission $X.XX          (optional)
 * Supplemental
 * Transaction Fee $X.XX     (optional, may span two lines)
 * Net Amount $X,XXX.XX
 *
 * Note: pdfjs-dist may insert spaces between $ and numbers: "$ 1,234.56"
 */
export function parseFormat1(text: string, filename: string): RawSellTransaction | null {
  return parseFormat1All(text, filename)[0] ?? null;
}

export function parseFormat1All(text: string, filename: string): RawSellTransaction[] {
  const dateLineMatches = Array.from(
    text.matchAll(
      /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+([\d.]+)/g,
    ),
  );
  if (dateLineMatches.length === 0) return [];

  const transactionTypes = Array.from(
    text.matchAll(/Transaction Type:\s*(Sold(?:\s+Short)?)/g),
    (match) => match[1].trim() as 'Sold' | 'Sold Short',
  );
  const principals = parseAmounts(text, /Principal\s+\$?\s*([\d,]+\.?\d*)/g);
  const commissions = parseAmounts(text, /Commission\s+\$?\s*([\d,]+\.?\d*)/g);
  const fees = parseAmounts(text, /Transaction Fee\s+\$?\s*([\d,]+\.?\d*)/g);
  const netAmounts = parseAmounts(text, /Net Amount\s+\$?\s*([\d,]+\.?\d*)/g);

  return dateLineMatches.map((dateLineMatch, index) => {
    const [, tradeDateRaw, settlementDateRaw, qtyStr, priceStr] = dateLineMatch;
    const tradeDate = parseMMDDYYYY(tradeDateRaw);
    const settlementDate = parseMMDDYYYY(settlementDateRaw);
    const quantity = parseInt(qtyStr, 10);
    const price = parseFloat(priceStr);
    const principal = principals[index] ?? quantity * price;
    const commission = commissions[index] ?? 0;
    const fee = fees[index] ?? 0;

    return {
      tradeDate,
      settlementDate,
      quantity,
      price,
      principal,
      commission,
      fee,
      netAmount: netAmounts[index] ?? principal - commission - fee,
      transactionType: transactionTypes[index] ?? 'Sold',
      source: filename,
    };
  });
}

function parseMMDDYYYY(date: string): string {
  const [mm, dd, yyyy] = date.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/,/g, ''));
}

function parseAmounts(text: string, regex: RegExp): number[] {
  return Array.from(text.matchAll(regex), (match) => parseAmount(match[1]));
}
