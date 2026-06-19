# canada-acb

Standalone TypeScript/npm package for the core `anet-acb` data pipeline:

- PDF parsing for ANET sell, RSU release, and ESPP purchase confirmations
- CRA-style USD/CAD exchange-rate lookup from the Bank of Canada
- Transaction normalization, ACB calculation, and tax-year summaries
- CSV and audit exports derived from the generated ledger

The package is browser-friendly and is designed to be consumed by a UI layer that handles uploads, state, and visualization.

## Install

```bash
npm install canada-acb
```

For local development alongside the original site:

```json
{
  "dependencies": {
    "canada-acb": "file:../canada-acb"
  }
}
```

## Usage

```ts
import {
  fetchExchangeRates,
  generateAcbData,
  parsePdfs,
  exportAcbToCsv,
} from "canada-acb";

const parsed = await parsePdfs(files);
const dates = generateAcbData(parsed, {}).allDates;
const exchangeRates = await fetchExchangeRates(dates);
const data = generateAcbData(parsed, exchangeRates);
const csv = exportAcbToCsv(data.acbEntries);
```

`parsePdfs` parses every sale line item in a trade confirmation and ignores
duplicate parsed transactions so regenerated or re-uploaded PDFs do not
double-count. Skipped duplicates are reported in `parsed.duplicates`.

## API

Root exports include:

- PDF parsing helpers: `parsePdf`, `parsePdfDocuments`, `parsePdfs`, `extractPdfText`
- Core data pipeline: `buildNormalizedTransactions`, `collectTransactionDates`, `generateAcbData`
- Analysis: `calculateAcb`, `summarizeByTaxYear`
- Exchange rates: `fetchExchangeRates`
- Output helpers: `exportAcbToCsv`, `exportTaxYearsToCsv`, `generateAuditReport`, `exportForAcbTool`, `generateTamperMonkeyScript`
- WealthSimple Tax auto-fill script generator: `generateWsTamperScript` (generic), `generateTamperMonkeyScript` (ANET-specific convenience wrapper)
- Supporting types and split-normalization utilities

### `generateWsTamperScript`

Generates a Tampermonkey UserScript that auto-fills capital gains dispositions in WealthSimple Tax.

```ts
import { generateWsTamperScript } from 'canada-acb';

const script = generateWsTamperScript(
  [
    {
      description: 'FOO 2024-03-15',
      settlementDate: '2024-03-15',
      proceeds: 1000,
      costBase: 800,
      expenses: 5,
    },
  ],
  2024,
  { label: 'FOO' },
);
```

`generateTamperMonkeyScript(AcbEntry[], year)` is an ANET-specific convenience wrapper around `generateWsTamperScript` that maps `AcbEntry` fields, filters in only `sell` transactions and passes `label: 'ANET'`.

### Demo script

`scripts/demoTamperScript.mjs` invokes `generateWsTamperScript` with a couple of hard-coded dispositions and writes the resulting UserScript to stdout. It imports from `dist/`, so the package must be built first. Defaults to tax year 2025; pass `--2024` to generate the period-split variant.

```bash
npm run build
npm run --silent demo:tamper > demo.user.js            # 2025 (no periods)
npm run --silent demo:tamper -- --2024 > demo.user.js  # 2024 (Jun 24 split)
```

## Development

Install dependencies (includes dev tooling for build, typecheck, and tests):

```bash
npm install
```

### Tests

Unit tests use [Vitest](https://vitest.dev/). Test files live alongside sources as `src/*.test.ts`.

```bash
npm test           # run the suite once
npm run test:watch # re-run on file changes
```

Node 18+ is supported by the pinned `vitest@^2` (newer majors require Node 20+).

### Typecheck and build

```bash
npm run typecheck  # tsc --noEmit
npm run build      # tsup bundle to dist/
```
