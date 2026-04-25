import { describe, expect, it } from 'vitest';
import { buildNormalizedTransactions, generateAcbData } from './generatedData';
import type { RawTransactionSet } from './types';

const esppOnlyFixture: RawTransactionSet = {
  sells: [],
  vests: [],
  esppPurchases: [
    {
      purchaseDate: '2025-02-15',
      purchasePrice: 38.1756,
      purchasedQty: 115,
      taxCollectionShares: 41,
      netShares: 74,
      discountPercent: 15,
      grantDateFmv: 44.9125,
      purchaseDateFmv: 106.87,
      source: 'espp-purchase.pdf',
    },
  ],
};

describe('buildNormalizedTransactions', () => {
  it('uses ESPP purchase-date FMV, not employee purchase price, as ACB basis', () => {
    const txs = buildNormalizedTransactions(esppOnlyFixture, {
      '2025-02-15': 1.4181,
    });

    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({
      type: 'espp_purchase',
      pricePerShareUsd: 106.87,
      totalUsd: 106.87 * 115,
      totalCad: 106.87 * 115 * 1.4181,
    });
  });
});

describe('generateAcbData', () => {
  it('uses sale price for proceeds and ESPP purchase-date FMV for capital gain cost base', () => {
    const data = generateAcbData(
      {
        ...esppOnlyFixture,
        sells: [
          {
            tradeDate: '2025-03-10',
            settlementDate: '2025-03-12',
            quantity: 10,
            price: 120,
            principal: 1200,
            commission: 4.95,
            fee: 0.05,
            netAmount: 1195,
            transactionType: 'Sold',
            source: 'sale.pdf',
          },
        ],
      },
      {
        '2025-02-15': 1.4,
        '2025-03-10': 1.5,
      },
    );

    const sale = data.acbEntries.find((entry) => entry.type === 'sell');
    expect(sale).toBeDefined();
    expect(sale).toMatchObject({
      proceedsUsd: 1200,
      proceedsCad: 1800,
      sellingExpensesCad: 7.5,
      acbOfSharesSoldCad: 106.87 * 1.4 * 10,
      capitalGainCad: 1800 - (106.87 * 1.4 * 10) - 7.5,
    });
  });
});
