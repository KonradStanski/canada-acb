import { describe, expect, it } from 'vitest';
import { parseBenefitHistoryPdf } from './benefitPdfParser';
import type { ExtractedPdfText } from './pdfText';

function extracted(lines: string[]): ExtractedPdfText {
  return {
    lines,
    text: lines.join('\n'),
  };
}

describe('parseBenefitHistoryPdf', () => {
  it('split-adjusts pre-split ESPP purchase confirmations when values are unadjusted', () => {
    const result = parseBenefitHistoryPdf(
      extracted([
        'EMPLOYEE STOCK PLAN PURCHASE CONFIRMATION',
        'Purchase Date 02-15-2024',
        'Shares Purchased 10',
        'Shares Sold to Cover Taxes 2',
        'Grant Date Market Value 400.00',
        'Purchase Value per Share 300.00',
        '(85% of $300.00) $255.00',
      ]),
      'pre-split-unadjusted.pdf',
    );

    expect(result?.kind).toBe('espp_purchase');
    expect(result?.value).toMatchObject({
      purchaseDate: '2024-02-15',
      purchasedQty: 40,
      taxCollectionShares: 8,
      netShares: 32,
      purchasePrice: 63.75,
      grantDateFmv: 100,
      purchaseDateFmv: 75,
    });
  });

  it('does not double-adjust pre-split ESPP purchase confirmations that are already split-adjusted', () => {
    const result = parseBenefitHistoryPdf(
      extracted([
        'EMPLOYEE STOCK PLAN PURCHASE CONFIRMATION',
        'Purchase Date 02-15-2024',
        'Shares Purchased 40',
        'Shares Sold to Cover Taxes 8',
        'Grant Date Market Value 100.00',
        'Purchase Value per Share 75.00',
        '(85% of $75.00) $63.75',
      ]),
      'pre-split-adjusted.pdf',
    );

    expect(result?.kind).toBe('espp_purchase');
    expect(result?.value).toMatchObject({
      purchaseDate: '2024-02-15',
      purchasedQty: 40,
      taxCollectionShares: 8,
      netShares: 32,
      purchasePrice: 63.75,
      grantDateFmv: 100,
      purchaseDateFmv: 75,
    });
  });
});
