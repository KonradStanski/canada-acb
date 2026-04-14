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

## API

Root exports include:

- PDF parsing helpers: `parsePdf`, `parsePdfs`, `extractPdfText`
- Core data pipeline: `buildNormalizedTransactions`, `collectTransactionDates`, `generateAcbData`
- Analysis: `calculateAcb`, `summarizeByTaxYear`
- Exchange rates: `fetchExchangeRates`
- Output helpers: `exportAcbToCsv`, `exportTaxYearsToCsv`, `generateAuditReport`, `exportForAcbTool`, `generateTamperMonkeyScript`
- Supporting types and split-normalization utilities
