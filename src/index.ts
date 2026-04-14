export type {
  AcbEntry,
  ExchangeRateCache,
  GeneratedAcbData,
  NormalizedTransaction,
  ParsedPdfResult,
  PricePoint,
  RawEsppPurchase,
  RawSellTransaction,
  RawTransactionSet,
  RawVestEvent,
  TaxYearSummary,
  TransactionType,
} from './types';

export {
  buildNormalizedTransactions,
  collectTransactionDates,
  generateAcbData,
} from './generatedData';
export {
  calculateAcb,
  summarizeByTaxYear,
} from './acbEngine';
export {
  exportAcbToCsv,
  exportForAcbTool,
  exportTaxYearsToCsv,
  generateAuditReport,
  generateTamperMonkeyScript,
} from './exportUtils';
export { fetchExchangeRates } from './exchangeRates';
export { parseBenefitHistoryPdf } from './benefitPdfParser';
export {
  parsePdf,
  parsePdfs,
} from './pdfParser';
export { parseFormat1 } from './pdfParserFormat1';
export { parseFormat2 } from './pdfParserFormat2';
export {
  extractPdfText,
  type ExtractedPdfText,
} from './pdfText';
export {
  SPLIT_DATE,
  SPLIT_RATIO,
  deriveFmvPerShare,
  isEsppAlreadySplitAdjusted,
  isPreSplit,
  normalizePrice,
  normalizeQuantity,
} from './stockSplit';
