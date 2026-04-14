import type { ExchangeRateCache } from './types';

const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
];

function formatDateUTC(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;
}

function parseDateUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

async function fetchWithCorsProxy(url: string): Promise<Response> {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return response;
    }
  } catch {
    // Fall through to proxy attempts.
  }

  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url));
      if (response.ok) {
        return response;
      }
    } catch {
      // Keep trying available proxies.
    }
  }

  throw new Error(`Failed to fetch: ${url}`);
}

async function fetchBankOfCanadaRatesForYear(year: number): Promise<Record<string, number>> {
  const isPre2017 = year < 2017;
  const observationCode = isPre2017 ? 'IEXE0101' : 'FXCADUSD';
  const url = `https://www.bankofcanada.ca/valet/observations/${observationCode}/json?start_date=${year}-01-01&end_date=${year}-12-31`;
  const response = await fetchWithCorsProxy(url);
  const json = await response.json();
  const observations: Array<{ d: string; [key: string]: { v: string } | string }> =
    json?.observations ?? [];

  const rates: Record<string, number> = {};

  for (const observation of observations) {
    const dateStr = observation.d;
    const value = observation[observationCode];

    if (!value || typeof value !== 'object' || !('v' in value)) {
      continue;
    }

    const rawValue = Number.parseFloat(value.v);
    if (Number.isNaN(rawValue) || rawValue <= 0) {
      continue;
    }

    rates[dateStr] = isPre2017 ? rawValue : 1 / rawValue;
  }

  return rates;
}

function findPrecedingRate(
  targetDate: string,
  ratesByDate: Record<string, number>,
): number | null {
  if (ratesByDate[targetDate]) {
    return ratesByDate[targetDate];
  }

  const target = parseDateUTC(targetDate);

  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = new Date(target);
    candidate.setUTCDate(candidate.getUTCDate() - offset);
    const candidateDate = formatDateUTC(candidate);

    if (ratesByDate[candidateDate]) {
      return ratesByDate[candidateDate];
    }
  }

  return null;
}

export async function fetchExchangeRates(dates: string[]): Promise<ExchangeRateCache> {
  if (dates.length === 0) {
    return {};
  }

  const requestedYears = new Set<number>();
  for (const date of dates) {
    requestedYears.add(Number.parseInt(date.slice(0, 4), 10));
  }

  const yearsToFetch = new Set<number>(requestedYears);
  for (const year of requestedYears) {
    yearsToFetch.add(year - 1);
  }

  const allRates: Record<string, number> = {};

  await Promise.all(
    Array.from(yearsToFetch, async (year) => {
      try {
        const rates = await fetchBankOfCanadaRatesForYear(year);
        Object.assign(allRates, rates);
      } catch {
        // Individual year failures are non-fatal.
      }
    }),
  );

  const resolved: ExchangeRateCache = {};
  for (const date of dates) {
    const rate = findPrecedingRate(date, allRates);
    if (rate !== null) {
      resolved[date] = rate;
    }
  }

  return resolved;
}
