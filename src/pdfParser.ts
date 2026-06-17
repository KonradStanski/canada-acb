import type {
  ParsedPdfDuplicate,
  ParsedPdfResult,
  RawEsppPurchase,
  RawSellTransaction,
  RawVestEvent,
} from './types';
import { parseBenefitHistoryPdf } from './benefitPdfParser';
import { extractPdfText, type ExtractedPdfText } from './pdfText';
import { parseFormat1All } from './pdfParserFormat1';
import { parseFormat2All } from './pdfParserFormat2';

export type ParsedPdfDocument =
  | { kind: 'sell'; value: RawSellTransaction; itemIndex?: number }
  | { kind: 'vest'; value: RawVestEvent; itemIndex?: number }
  | { kind: 'espp_purchase'; value: RawEsppPurchase; itemIndex?: number };

function detectAndParseDocuments(
  extracted: ExtractedPdfText,
  filename: string,
): ParsedPdfDocument[] {
  const benefitDocument = parseBenefitHistoryPdf(extracted, filename);
  if (benefitDocument) {
    return [{ ...benefitDocument, itemIndex: 0 }];
  }

  const { text } = extracted;

  // Format 2: E*TRADE Stock Plan (2-digit year dates, "SELL" keyword)
  if (text.includes('Stock Plan') || text.includes('TRADE CONFIRMATION')) {
    const results = parseFormat2All(text, filename);
    if (results.length > 0) {
      return results.map((value, itemIndex) => ({ kind: 'sell', value, itemIndex }));
    }
  }

  // Format 1: Morgan Stanley (4-digit year dates)
  if (text.includes('ARISTA NETWORKS') || text.includes('ANET')) {
    const results = parseFormat1All(text, filename);
    if (results.length > 0) {
      return results.map((value, itemIndex) => ({ kind: 'sell', value, itemIndex }));
    }
  }

  return [];
}

export async function parsePdfDocuments(file: File): Promise<ParsedPdfDocument[]> {
  const buffer = await file.arrayBuffer();
  const extracted = await extractPdfText(buffer);
  return detectAndParseDocuments(extracted, file.name);
}

export async function parsePdf(file: File): Promise<ParsedPdfDocument | null> {
  const documents = await parsePdfDocuments(file);
  return documents[0] ?? null;
}

function assignVestPeriods(vests: RawVestEvent[]): RawVestEvent[] {
  const counts = new Map<string, number>();

  return [...vests]
    .sort((a, b) => {
      const grantCompare = a.grantNumber.localeCompare(b.grantNumber);
      if (grantCompare !== 0) return grantCompare;
      const dateCompare = a.vestDate.localeCompare(b.vestDate);
      if (dateCompare !== 0) return dateCompare;
      return a.source.localeCompare(b.source);
    })
    .map((vest) => {
      const nextPeriod = (counts.get(vest.grantNumber) ?? 0) + 1;
      counts.set(vest.grantNumber, nextPeriod);
      return {
        ...vest,
        vestPeriod: nextPeriod,
      };
    });
}

function getParsedPdfDocumentKey(document: ParsedPdfDocument): string {
  if (document.kind === 'sell') {
    const { value } = document;
    return JSON.stringify([
      document.kind,
      value.tradeDate,
      value.settlementDate,
      value.quantity,
      value.price,
      value.principal,
      value.commission,
      value.fee,
      value.netAmount,
      value.transactionType,
    ]);
  }

  if (document.kind === 'vest') {
    const { value } = document;
    return JSON.stringify([
      document.kind,
      value.vestDate,
      value.vestedQty,
      value.taxableGain,
      value.fmvPerShare,
      value.grantNumber,
      value.totalTaxesPaid,
      value.taxDescription,
    ]);
  }

  const { value } = document;
  return JSON.stringify([
    document.kind,
    value.purchaseDate,
    value.purchasePrice,
    value.purchasedQty,
    value.taxCollectionShares,
    value.netShares,
    value.discountPercent,
    value.grantDateFmv,
    value.purchaseDateFmv,
  ]);
}

export function mergeParsedPdfDocuments(
  documents: ParsedPdfDocument[],
): Omit<ParsedPdfResult, 'errors'> {
  const sells: RawSellTransaction[] = [];
  const vests: RawVestEvent[] = [];
  const esppPurchases: RawEsppPurchase[] = [];
  const duplicates: ParsedPdfDuplicate[] = [];
  const seen = new Map<string, ParsedPdfDocument[]>();

  for (const document of documents) {
    const key = getParsedPdfDocumentKey(document);
    const matchingDocuments = seen.get(key) ?? [];
    const itemIndex = document.itemIndex ?? 0;
    const existing =
      matchingDocuments.find(
        (candidate) =>
          candidate.value.source !== document.value.source &&
          (candidate.itemIndex ?? 0) === itemIndex,
      ) ??
      matchingDocuments.find((candidate) => candidate.value.source !== document.value.source) ??
      matchingDocuments.find((candidate) => (candidate.itemIndex ?? 0) === itemIndex);

    if (existing) {
      duplicates.push({
        kind: document.kind,
        source: document.value.source,
        duplicateOf: existing.value.source,
      });
      continue;
    }

    matchingDocuments.push(document);
    seen.set(key, matchingDocuments);

    if (document.kind === 'sell') {
      sells.push(document.value);
    } else if (document.kind === 'vest') {
      vests.push(document.value);
    } else {
      esppPurchases.push(document.value);
    }
  }

  return {
    sells,
    vests: assignVestPeriods(vests),
    esppPurchases,
    duplicates,
  };
}

export async function parsePdfs(
  files: File[],
  onProgress?: (parsed: number, total: number) => void,
): Promise<ParsedPdfResult> {
  const errors: string[] = [];
  let completed = 0;

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const result = await parsePdfDocuments(file);
        if (result.length === 0) {
          errors.push(`Could not parse ${file.name}: unrecognized format`);
        }
        onProgress?.(++completed, files.length);
        return result;
      } catch (err) {
        errors.push(
          `Error parsing ${file.name}: ${err instanceof Error ? err.message : String(err)}`,
        );
        onProgress?.(++completed, files.length);
        return [];
      }
    }),
  );

  const merged = mergeParsedPdfDocuments(results.flat());

  return {
    ...merged,
    errors,
  };
}
