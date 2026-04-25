import { describe, expect, it } from 'vitest';
import { generateWsTamperScript } from './exportUtils';
import type { WsTaxEntry } from './types';

const makeEntry = (overrides: Partial<WsTaxEntry> = {}): WsTaxEntry => ({
  description: 'ANET 2023-05-15',
  settlementDate: '2023-05-15',
  proceeds: 1000,
  costBase: 800,
  expenses: 5,
  ...overrides,
});

// Extract the embedded TRANSACTIONS JSON literal from the generated script.
function extractTransactions(script: string): Array<Record<string, unknown>> {
  const match = script.match(/const TRANSACTIONS = (\[[\s\S]*?\]);/);
  if (!match) {
    throw new Error('TRANSACTIONS literal not found in script');
  }
  return JSON.parse(match[1]);
}

describe('generateWsTamperScript', () => {
  it('filters entries to the requested tax year', () => {
    const entries = [
      makeEntry({ settlementDate: '2022-12-31', description: 'prev year' }),
      makeEntry({ settlementDate: '2023-03-10', description: 'in year A' }),
      makeEntry({ settlementDate: '2023-11-20', description: 'in year B' }),
      makeEntry({ settlementDate: '2024-01-05', description: 'next year' }),
    ];

    const script = generateWsTamperScript(entries, 2023);
    const txns = extractTransactions(script);

    expect(txns).toHaveLength(2);
    expect(txns.map((t) => t.description)).toEqual(['in year A', 'in year B']);
  });

  it('splits 2024 entries across Jun 24/25 period boundary', () => {
    const entries = [
      makeEntry({ settlementDate: '2024-01-15', description: 'jan' }),
      makeEntry({ settlementDate: '2024-06-24', description: 'boundary p1' }),
      makeEntry({ settlementDate: '2024-06-25', description: 'boundary p2' }),
      makeEntry({ settlementDate: '2024-12-01', description: 'dec' }),
    ];

    const script = generateWsTamperScript(entries, 2024);
    const txns = extractTransactions(script);

    expect(script).toContain('var HAS_PERIODS = true;');
    expect(txns.map((t) => [t.description, t.period])).toEqual([
      ['jan', 1],
      ['boundary p1', 1],
      ['boundary p2', 2],
      ['dec', 2],
    ]);
  });

  it('uses period 0 and HAS_PERIODS=false for non-2024 years', () => {
    const script = generateWsTamperScript(
      [makeEntry({ settlementDate: '2023-07-01' })],
      2023,
    );
    const txns = extractTransactions(script);

    expect(script).toContain('var HAS_PERIODS = false;');
    expect(txns[0].period).toBe(0);
  });

  it('serializes amounts using the requested decimal places', () => {
    const entry = makeEntry({
      settlementDate: '2023-05-15',
      proceeds: 1234.5678,
      costBase: 999.1,
      expenses: 2,
    });

    const defaultTxns = extractTransactions(
      generateWsTamperScript([entry], 2023),
    );
    expect(defaultTxns[0]).toMatchObject({
      proceeds: '1234.57',
      costBase: '999.10',
      expenses: '2.00',
    });

    const fourDpTxns = extractTransactions(
      generateWsTamperScript([entry], 2023, { decimalPlaces: 4 }),
    );
    expect(fourDpTxns[0]).toMatchObject({
      proceeds: '1234.5678',
      costBase: '999.1000',
      expenses: '2.0000',
    });
  });

  it('substitutes label, namespace, and symbolName into the header', () => {
    const entries = [makeEntry({ settlementDate: '2023-05-15' })];

    const defaults = generateWsTamperScript(entries, 2023);
    expect(defaults).toContain('@name         WealthSimple Tax Capital Gains Auto-Fill (ACB 2023)');
    expect(defaults).toContain('@namespace    canada-acb');
    expect(defaults).toContain('Auto-fill capital gains from dispositions for tax year 2023');

    const custom = generateWsTamperScript(entries, 2023, {
      namespace: 'anet-acb',
      label: 'ANET',
      symbolName: 'ANET',
    });
    expect(custom).toContain('@name         WealthSimple Tax Capital Gains Auto-Fill (ANET 2023)');
    expect(custom).toContain('@namespace    anet-acb');
    expect(custom).toContain('Auto-fill capital gains from ANET dispositions for tax year 2023');
  });

  it('produces a syntactically valid JavaScript script', () => {
    const entries = [
      makeEntry({ settlementDate: '2024-03-15', description: "has 'quote'" }),
      makeEntry({ settlementDate: '2024-07-01', description: 'has, comma' }),
      makeEntry({ settlementDate: '2024-11-20', description: 'plain' }),
    ];

    // Parse-only: Function compiles the source and throws on SyntaxError
    // without running any of it, so references to browser globals
    // (document, window, unsafeWindow) don't need to exist.
    const script2024 = generateWsTamperScript(entries, 2024);
    expect(() => Function(script2024)).not.toThrow();

    const script2023 = generateWsTamperScript(
      [makeEntry({ settlementDate: '2023-05-15' })],
      2023,
    );
    expect(() => Function(script2023)).not.toThrow();

    const emptyScript = generateWsTamperScript([], 2023);
    expect(() => Function(emptyScript)).not.toThrow();
  });

  it("defaults typeKey to 'p' when the entry does not provide one", () => {
    const script = generateWsTamperScript(
      [
        makeEntry({ settlementDate: '2023-05-15' }),
        makeEntry({ settlementDate: '2023-06-15', typeKey: 'x' }),
      ],
      2023,
    );
    const txns = extractTransactions(script);

    expect(txns.map((t) => t.typeKey)).toEqual(['p', 'x']);
  });
});
