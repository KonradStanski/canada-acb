import { describe, expect, it } from 'vitest';
import { parseFormat2, parseFormat2All } from './pdfParserFormat2';

describe('parseFormat2All', () => {
  it('parses multiple E*TRADE Stock Plan sale line items from one confirmation', () => {
    const text = [
      'TRADE CONFIRMATION',
      '06/12/26 06/16/26 6 1 ANET SELL 10 $200.00 Stock Plan',
      'PRINCIPAL $2,000.00 COMMISSION $4.95 FEE $0.05',
      'NET AMOUNT $1,995.00',
      '06/12/26 06/16/26 6 1 ANET SELL 15 $200.00 Stock Plan',
      'PRINCIPAL $3,000.00 COMMISSION $9.90 FEE $0.10',
      'NET AMOUNT $2,990.00',
    ].join('\n');

    expect(parseFormat2All(text, 'stock-plan.pdf')).toEqual([
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
        source: 'stock-plan.pdf',
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
        transactionType: 'Sold',
        source: 'stock-plan.pdf',
      },
    ]);
  });

  it('keeps the legacy single-result helper as the first parsed line item', () => {
    const text = [
      'TRADE CONFIRMATION',
      '06/12/26 06/16/26 6 1 ANET SELL 10 $200.00 Stock Plan',
      'PRINCIPAL $2,000.00 COMMISSION $4.95 FEE $0.05',
      'NET AMOUNT $1,995.00',
    ].join('\n');

    expect(parseFormat2(text, 'single-stock-plan.pdf')).toMatchObject({
      tradeDate: '2026-06-12',
      quantity: 10,
      source: 'single-stock-plan.pdf',
    });
  });
});
