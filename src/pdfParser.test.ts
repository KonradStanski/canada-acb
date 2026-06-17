import { describe, expect, it } from 'vitest';
import { mergeParsedPdfDocuments, type ParsedPdfDocument } from './pdfParser';

describe('mergeParsedPdfDocuments', () => {
  it('deduplicates source-neutral parsed transactions before assigning vest periods', () => {
    const documents: ParsedPdfDocument[] = [
      {
        kind: 'vest',
        value: {
          vestDate: '2026-02-20',
          vestedQty: 92,
          taxableGain: 12625.16,
          fmvPerShare: 137.23,
          grantNumber: 'R13888',
          vestPeriod: 0,
          totalTaxesPaid: 6754.46,
          taxDescription: 'Canada-BC',
          source: 'etrade_02_20_2026.pdf',
        },
      },
      {
        kind: 'vest',
        value: {
          vestDate: '2026-02-20',
          vestedQty: 92,
          taxableGain: 12625.16,
          fmvPerShare: 137.23,
          grantNumber: 'R13888',
          vestPeriod: 0,
          totalTaxesPaid: 6754.46,
          taxDescription: 'Canada-BC',
          source: 'etrade_05_20_2026_duplicate.pdf',
        },
      },
      {
        kind: 'vest',
        value: {
          vestDate: '2026-05-20',
          vestedQty: 93,
          taxableGain: 13756.56,
          fmvPerShare: 147.92,
          grantNumber: 'R13888',
          vestPeriod: 0,
          totalTaxesPaid: 7359.75,
          taxDescription: 'Canada-BC',
          source: 'etrade_05_20_2026.pdf',
        },
      },
    ];

    const result = mergeParsedPdfDocuments(documents);

    expect(result.vests).toHaveLength(2);
    expect(result.vests.map((vest) => vest.vestPeriod)).toEqual([1, 2]);
    expect(result.duplicates).toEqual([
      {
        kind: 'vest',
        source: 'etrade_05_20_2026_duplicate.pdf',
        duplicateOf: 'etrade_02_20_2026.pdf',
      },
    ]);
  });

  it('deduplicates sell and ESPP purchase documents by parsed transaction content', () => {
    const sell = {
      tradeDate: '2025-03-10',
      settlementDate: '2025-03-12',
      quantity: 10,
      price: 120,
      principal: 1200,
      commission: 4.95,
      fee: 0.05,
      netAmount: 1195,
      transactionType: 'Sold' as const,
      source: 'sale.pdf',
    };
    const purchase = {
      purchaseDate: '2025-02-15',
      purchasePrice: 38.1756,
      purchasedQty: 115,
      taxCollectionShares: 41,
      netShares: 74,
      discountPercent: 15,
      grantDateFmv: 44.9125,
      purchaseDateFmv: 106.87,
      source: 'purchase.pdf',
    };

    const result = mergeParsedPdfDocuments([
      { kind: 'sell', value: sell },
      { kind: 'sell', value: { ...sell, source: 'sale-copy.pdf' } },
      { kind: 'espp_purchase', value: purchase },
      { kind: 'espp_purchase', value: { ...purchase, source: 'purchase-copy.pdf' } },
    ]);

    expect(result.sells).toHaveLength(1);
    expect(result.esppPurchases).toHaveLength(1);
    expect(result.duplicates).toEqual([
      { kind: 'sell', source: 'sale-copy.pdf', duplicateOf: 'sale.pdf' },
      {
        kind: 'espp_purchase',
        source: 'purchase-copy.pdf',
        duplicateOf: 'purchase.pdf',
      },
    ]);
  });

  it('keeps same-file sale line items even when parsed values match', () => {
    const sell = {
      tradeDate: '2026-06-12',
      settlementDate: '2026-06-16',
      quantity: 10,
      price: 200,
      principal: 2000,
      commission: 4.95,
      fee: 0.05,
      netAmount: 1995,
      transactionType: 'Sold' as const,
      source: 'multi-line.pdf',
    };

    const result = mergeParsedPdfDocuments([
      { kind: 'sell', value: sell, itemIndex: 0 },
      { kind: 'sell', value: sell, itemIndex: 1 },
      { kind: 'sell', value: { ...sell, source: 'multi-line-copy.pdf' }, itemIndex: 0 },
    ]);

    expect(result.sells).toHaveLength(2);
    expect(result.duplicates).toEqual([
      { kind: 'sell', source: 'multi-line-copy.pdf', duplicateOf: 'multi-line.pdf' },
    ]);
  });
});
