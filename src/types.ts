export type TransactionType = 'vest' | 'espp_purchase' | 'sell';

export interface RawSellTransaction {
  tradeDate: string;
  settlementDate: string;
  quantity: number;
  price: number;
  principal: number;
  commission: number;
  fee: number;
  netAmount: number;
  transactionType: 'Sold' | 'Sold Short';
  source: string;
}

export interface RawVestEvent {
  vestDate: string;
  vestedQty: number;
  taxableGain: number;
  fmvPerShare: number;
  grantNumber: string;
  vestPeriod: number;
  totalTaxesPaid: number;
  taxDescription: string;
  source: string;
}

export interface RawEsppPurchase {
  purchaseDate: string;
  purchasePrice: number;
  purchasedQty: number;
  taxCollectionShares: number;
  netShares: number;
  discountPercent: number;
  grantDateFmv: number;
  purchaseDateFmv: number;
  source: string;
}

export interface RawTransactionSet {
  sells: RawSellTransaction[];
  vests: RawVestEvent[];
  esppPurchases: RawEsppPurchase[];
}

export interface ParsedPdfDuplicate {
  kind: TransactionType;
  source: string;
  duplicateOf: string;
}

export interface NormalizedTransaction {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD */
  settlementDate: string;
  type: TransactionType;
  quantity: number;
  pricePerShareUsd: number;
  totalUsd: number;
  commissionUsd: number;
  feeUsd: number;
  exchangeRate: number | null;
  exchangeRateManual: boolean;
  totalCad: number | null;
  commissionCad: number | null;
  feeCad: number | null;
  source: string;
  preSplit: boolean;
}

export interface AcbEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD */
  settlementDate: string;
  type: TransactionType;
  description: string;
  source: string;
  quantity: number;
  exchangeRate: number;
  pricePerShareUsd: number;
  totalUsd: number;
  commissionUsd: number;
  feeUsd: number;
  pricePerShareCad: number;
  totalCad: number;
  sellingExpensesCad: number;
  sharesHeld: number;
  totalAcbCad: number;
  acbPerShareCad: number;
  proceedsUsd: number | null;
  proceedsCad: number | null;
  acbOfSharesSoldCad: number | null;
  capitalGainCad: number | null;
  taxableCapitalGainCad: number | null;
  superficialLossFlag: boolean;
  superficialLossDeniedCad: number | null;
}

export interface TaxYearSummary {
  year: number;
  totalProceedsCad: number;
  totalAcbOfSharesSoldCad: number;
  totalSellingExpensesCad: number;
  totalCapitalGainsCad: number;
  totalTaxableCapitalGainsCad: number;
  totalSuperficialLossDeniedCad: number;
  dispositionCount: number;
  acquisitionCount: number;
}

export interface PricePoint {
  date: string;
  close: number;
}

export interface ExchangeRateCache {
  [date: string]: number;
}

export interface ParsedPdfResult extends RawTransactionSet {
  errors: string[];
  duplicates: ParsedPdfDuplicate[];
}

export interface GeneratedAcbData {
  normalizedTransactions: NormalizedTransaction[];
  acbEntries: AcbEntry[];
  taxYearSummaries: TaxYearSummary[];
  years: number[];
  allDates: string[];
}

export interface WsTaxEntry {
  /** WS form section key. Defaults to 'p' (publicly traded shares). */
  typeKey?: string;
  /** Free-text description rendered into WS Tax. Note: WS truncates this
   *  field at 30 chars in the form — callers may want to pre-truncate to
   *  avoid surprises. */
  description: string;
  /** Settlement date in YYYY-MM-DD format. Used by the helper to derive
   *  the 2024 CRA reporting-period split when applicable. */
  settlementDate: string;
  proceeds: number;
  costBase: number;
  expenses: number;
}

export interface WsTamperScriptOptions {
  /** The @namespace for the script. Defaults to "canada-acb".
   *  A unique identifier, domain or URL */
  namespace?: string;
  /** Brand/label substituted into the panel title, log prefix, and script
   *  @name. Defaults to "ACB". */
  label?: string;
  /** Used in the script description. Provide if all transactions are for the same symbol. */
  symbolName?: string;
  /** Number of decimal places used when serializing proceeds/cost/expenses
   *  into the script body. Defaults to 2. */
  decimalPlaces?: number;
}
