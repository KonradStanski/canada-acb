import { describe, expect, it } from 'vitest';
import { parseFormat1, parseFormat1All } from './pdfParserFormat1';

describe('parseFormat1All', () => {
  it('parses multiple Morgan Stanley sale line items from one confirmation', () => {
    const text = [
      'Trade Date Settlement Date Quantity Price Settlement Amount',
      'Transaction Type: Sold',
      'Transaction Type: Sold Short',
      'Description: ARISTA NETWORKS INC Net Amount $1,995.00',
      'Description: ARISTA NETWORKS INC Net Amount $2,990.00',
      '06/12/2026 06/16/2026 10 200.00',
      'Symbol / CUSIP / ISIN: ANET / 040413205 / US0404132054',
      'Principal $2,000.00',
      'Commission $4.95',
      'Supplemental',
      'Transaction Fee $0.05',
      '06/12/2026 06/16/2026 15 200.00',
      'Symbol / CUSIP / ISIN: ANET / 040413205 / US0404132054',
      'Principal $3,000.00',
      'Commission $9.90',
      'Supplemental',
      'Transaction Fee $0.10',
    ].join('\n');

    expect(parseFormat1All(text, 'multi-line.pdf')).toEqual([
      {
        tradeDate: '2026-06-12',
        settlementDate: '2026-06-16',
        quantity: 10,
        price: 200,
        principal: 2000,
        commission: 4.95,
        fee: 0.05,
        netAmount: 1995,
        transactionType: 'Sold',
        source: 'multi-line.pdf',
      },
      {
        tradeDate: '2026-06-12',
        settlementDate: '2026-06-16',
        quantity: 15,
        price: 200,
        principal: 3000,
        commission: 9.9,
        fee: 0.1,
        netAmount: 2990,
        transactionType: 'Sold Short',
        source: 'multi-line.pdf',
      },
    ]);
  });

  it('keeps the legacy single-result helper as the first parsed line item', () => {
    const text = [
      'Transaction Type: Sold',
      'Net Amount $1,995.00',
      '06/12/2026 06/16/2026 10 200.00',
      'Principal $2,000.00',
      'Commission $4.95',
      'Transaction Fee $0.05',
    ].join('\n');

    expect(parseFormat1(text, 'single.pdf')).toMatchObject({
      tradeDate: '2026-06-12',
      quantity: 10,
      source: 'single.pdf',
    });
  });
});
