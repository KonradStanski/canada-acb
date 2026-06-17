import type { RawSellTransaction } from './types';

/**
 * Parse E*TRADE Stock Plan format trade confirmations.
 *
 * pdfjs-dist extracts text items joined with spaces. Actual extraction:
 * "08/22/23   08/24/23   6 1   ANET   SELL   13   $184.60   Stock Plan
 *  PRINCIPAL   $2,399.80   COMMISSION   $4.95 FEE   $0.02
 *  NET AMOUNT   $ 2,394.83"
 *
 * Note: MKT/CPT field "61" may be extracted as "6 1", and NET AMOUNT
 * may have a space between $ and the number: "$ 2,394.83"
 */
export function parseFormat2(text: string, filename: string): RawSellTransaction | null {
  return parseFormat2All(text, filename)[0] ?? null;
}

export function parseFormat2All(text: string, filename: string): RawSellTransaction[] {
  const dataMatches = Array.from(
    text.matchAll(
      /(\d{2}\/\d{2}\/\d{2})\s+(\d{2}\/\d{2}\/\d{2})\s+[\s\S]*?ANET\s+SELL\s+(\d+)\s+\$\s*([\d,.]+)/g,
    ),
  );
  if (dataMatches.length === 0) return [];

  const principals = parseAmounts(text, /PRINCIPAL\s+\$\s*([\d,]+\.?\d*)/g);
  const commissions = parseAmounts(text, /COMMISSION\s+\$\s*([\d,]+\.?\d*)/g);
  const fees = parseAmounts(text, /(?<!Transaction\s)FEE\s+\$\s*([\d,]+\.?\d*)/g);
  const netAmounts = parseAmounts(text, /NET AMOUNT\s+\$\s*([\d,]+\.?\d*)/g);

  return dataMatches.map((dataMatch, index) => {
    const [, tradeDateRaw, settlementDateRaw, qtyStr, priceStr] = dataMatch;
    const tradeDate = parseMMDDYY(tradeDateRaw);
    const settlementDate = parseMMDDYY(settlementDateRaw);
    const quantity = parseInt(qtyStr, 10);
    const price = parseFloat(priceStr.replace(/,/g, ''));
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
      transactionType: 'Sold',
      source: filename,
    };
  });
}

function parseMMDDYY(date: string): string {
  const [mm, dd, yy] = date.split('/');
  const year = parseInt(yy, 10);
  const fullYear = year >= 50 ? 1900 + year : 2000 + year;
  return `${fullYear}-${mm}-${dd}`;
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/,/g, ''));
}

function parseAmounts(text: string, regex: RegExp): number[] {
  return Array.from(text.matchAll(regex), (match) => parseAmount(match[1]));
}
