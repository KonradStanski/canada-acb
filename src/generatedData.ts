import { calculateAcb, summarizeByTaxYear } from './acbEngine';
import { isPreSplit, normalizePrice, normalizeQuantity } from './stockSplit';
import type {
  ExchangeRateCache,
  GeneratedAcbData,
  NormalizedTransaction,
  RawTransactionSet,
} from './types';

const TRANSACTION_TYPE_ORDER = {
  vest: 0,
  espp_purchase: 1,
  sell: 2,
} as const;

export function buildNormalizedTransactions(
  transactions: RawTransactionSet,
  exchangeRates: ExchangeRateCache = {},
): NormalizedTransaction[] {
  const all: NormalizedTransaction[] = [];

  for (const vest of transactions.vests) {
    const rate = exchangeRates[vest.vestDate] ?? null;
    const totalUsd = vest.fmvPerShare * vest.vestedQty;

    all.push({
      id: `vest-${vest.grantNumber}-${vest.vestPeriod}`,
      date: vest.vestDate,
      settlementDate: vest.vestDate,
      type: 'vest',
      quantity: vest.vestedQty,
      pricePerShareUsd: vest.fmvPerShare,
      totalUsd,
      commissionUsd: 0,
      feeUsd: 0,
      exchangeRate: rate,
      exchangeRateManual: false,
      totalCad: rate !== null ? totalUsd * rate : null,
      commissionCad: 0,
      feeCad: 0,
      source: vest.source,
      preSplit: isPreSplit(vest.vestDate),
    });
  }

  for (const espp of transactions.esppPurchases) {
    const rate = exchangeRates[espp.purchaseDate] ?? null;
    const totalUsd = espp.purchasePrice * espp.purchasedQty;

    all.push({
      id: `espp-${espp.purchaseDate}-${espp.purchasedQty}`,
      date: espp.purchaseDate,
      settlementDate: espp.purchaseDate,
      type: 'espp_purchase',
      quantity: espp.purchasedQty,
      pricePerShareUsd: espp.purchasePrice,
      totalUsd,
      commissionUsd: 0,
      feeUsd: 0,
      exchangeRate: rate,
      exchangeRateManual: false,
      totalCad: rate !== null ? totalUsd * rate : null,
      commissionCad: 0,
      feeCad: 0,
      source: espp.source,
      preSplit: isPreSplit(espp.purchaseDate),
    });
  }

  for (const sell of transactions.sells) {
    const rate = exchangeRates[sell.tradeDate] ?? null;
    const preSplit = isPreSplit(sell.tradeDate);
    const quantity = preSplit
      ? normalizeQuantity(sell.quantity, sell.tradeDate)
      : sell.quantity;
    const pricePerShareUsd = preSplit
      ? normalizePrice(sell.price, sell.tradeDate)
      : sell.price;

    all.push({
      id: `sell-${sell.tradeDate}-${sell.quantity}-${sell.price}-${sell.source}`,
      date: sell.tradeDate,
      settlementDate: sell.settlementDate,
      type: 'sell',
      quantity,
      pricePerShareUsd,
      totalUsd: pricePerShareUsd * quantity,
      commissionUsd: sell.commission,
      feeUsd: sell.fee,
      exchangeRate: rate,
      exchangeRateManual: false,
      totalCad: rate !== null ? pricePerShareUsd * quantity * rate : null,
      commissionCad: rate !== null ? sell.commission * rate : null,
      feeCad: rate !== null ? sell.fee * rate : null,
      source: sell.source,
      preSplit,
    });
  }

  all.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return TRANSACTION_TYPE_ORDER[a.type] - TRANSACTION_TYPE_ORDER[b.type];
  });

  return all;
}

export function collectTransactionDates(transactions: RawTransactionSet): string[] {
  const dates = new Set<string>();

  for (const sell of transactions.sells) {
    dates.add(sell.tradeDate);
  }

  for (const vest of transactions.vests) {
    dates.add(vest.vestDate);
  }

  for (const purchase of transactions.esppPurchases) {
    dates.add(purchase.purchaseDate);
  }

  return Array.from(dates).sort();
}

export function generateAcbData(
  transactions: RawTransactionSet,
  exchangeRates: ExchangeRateCache = {},
): GeneratedAcbData {
  const normalizedTransactions = buildNormalizedTransactions(transactions, exchangeRates);
  const acbEntries = calculateAcb(
    normalizedTransactions.filter((transaction) => transaction.exchangeRate !== null),
  );
  const taxYearSummaries = summarizeByTaxYear(acbEntries);
  const years = taxYearSummaries.map((summary) => summary.year);

  return {
    normalizedTransactions,
    acbEntries,
    taxYearSummaries,
    years,
    allDates: collectTransactionDates(transactions),
  };
}
