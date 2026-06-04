import { get, ref } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { WorkerProfile } from '@/src/types';

export const RENTAL_TRADE_NAMES = [
  'Auto', 'Tempo', 'Van', 'Car', 'JCB',
  'House Rent', 'Shop Rent', 'Marriage Hall', 'Catering',
];

export const SERVICE_TRADE_NAMES = [
  'Painter', 'Plumber', 'Electrician', 'Carpenter', 'Mason', 'Cleaner',
  'TV Repair', 'Tiles Worker', 'Welder', 'Coconut Plucker', 'Mechanic', 'Cable',
];

const RENTAL_TRADE_LOOKUP = new Map(
  RENTAL_TRADE_NAMES.map((name) => [name.toLowerCase().trim(), name])
);

const SERVICE_TRADE_LOOKUP = new Map(
  SERVICE_TRADE_NAMES.map((name) => [name.toLowerCase().trim(), name])
);

/** Common Firebase trade spellings → canonical names */
const SERVICE_TRADE_ALIASES: [string, string][] = [
  ['tiles worker', 'Tiles Worker'],
  ['tile worker', 'Tiles Worker'],
  ['tv repair', 'TV Repair'],
  ['tv', 'TV Repair'],
  ['coconut plucker', 'Coconut Plucker'],
  ['coconut', 'Coconut Plucker'],
  ['electrical', 'Electrician'],
  ['electric', 'Electrician'],
  ['plumbing', 'Plumber'],
  ['painting', 'Painter'],
  ['carpentry', 'Carpenter'],
  ['cleaning', 'Cleaner'],
  ['masonry', 'Mason'],
  ['welding', 'Welder'],
];
for (const [alias, canonical] of SERVICE_TRADE_ALIASES) {
  if (!SERVICE_TRADE_LOOKUP.has(alias)) SERVICE_TRADE_LOOKUP.set(alias, canonical);
}

/** Map RTDB trade strings to canonical rental category names (case-insensitive). */
export function normalizeRentalTrade(trade: string | undefined | null): string | null {
  if (!trade) return null;
  const key = trade.toString().trim().toLowerCase();
  if (!key) return null;
  return RENTAL_TRADE_LOOKUP.get(key) ?? null;
}

export function isRentalTrade(trade: string | undefined | null): boolean {
  return normalizeRentalTrade(trade) !== null;
}

/** Map RTDB trade strings to canonical service category names (case-insensitive). */
export function normalizeServiceTrade(trade: string | undefined | null): string | null {
  if (!trade) return null;
  const key = trade.toString().trim().toLowerCase();
  if (!key) return null;
  return SERVICE_TRADE_LOOKUP.get(key) ?? null;
}

/** Workers matching a category (Auto, Tempo, etc.) — tolerant of DB casing. */
export function workersForRentalTrade(workers: WorkerProfile[], trade: string): WorkerProfile[] {
  const canonical = normalizeRentalTrade(trade) || trade.trim();
  return workers.filter((w) => {
    const wTrade = normalizeRentalTrade(w.trade) || (w.trade || '').trim();
    return wTrade.toLowerCase() === canonical.toLowerCase();
  });
}

export function workersForServiceTrade(workers: WorkerProfile[], trade: string): WorkerProfile[] {
  const canonical = normalizeServiceTrade(trade) || trade.trim();
  return workers.filter((w) => {
    if (isRentalTrade(w.trade)) return false;
    const wTrade = normalizeServiceTrade(w.trade) || (w.trade || '').trim();
    return wTrade.toLowerCase() === canonical.toLowerCase();
  });
}

export function tradeMatchesCategory(workerTrade: string | undefined, category: string): boolean {
  const cat = category.trim().toLowerCase();
  const raw = (workerTrade || '').trim().toLowerCase();
  if (!raw || !cat) return false;
  if (raw === cat) return true;
  const wNorm =
    normalizeServiceTrade(workerTrade) ||
    normalizeRentalTrade(workerTrade) ||
    (workerTrade || '').trim();
  const cNorm = normalizeServiceTrade(category) || normalizeRentalTrade(category) || category.trim();
  return wNorm.toLowerCase() === cNorm.toLowerCase();
}

type RawWorkers = Record<string, unknown>;

const RENTAL_SET = new Set(RENTAL_TRADE_NAMES);
const CHUNK_SIZE = 40;

function workerDisplayName(val: Record<string, unknown>): string {
  return String(val.name || val.displayName || val.fullName || 'Worker');
}

/** Expand RTDB workers into one row per trade (names from worker node — no /users download). */
export function expandWorkerEntries(
  workersData: RawWorkers,
  options?: { rentalsOnly?: boolean; servicesOnly?: boolean }
): WorkerProfile[] {
  const rentalsOnly = options?.rentalsOnly;
  const servicesOnly = options?.servicesOnly;

  const includeTrade = (tradeName: string) => {
    const trade = tradeName.trim();
    if (!trade) return false;
    if (rentalsOnly) return isRentalTrade(trade) !== null;
    if (servicesOnly) return isRentalTrade(trade) === null;
    return true;
  };

  const result: WorkerProfile[] = [];

  for (const [key, value] of Object.entries(workersData)) {
    const val = value as Record<string, unknown>;
    const baseName = workerDisplayName(val);

    if (val.trades && typeof val.trades === 'object') {
      const tradeEntries = Object.entries(val.trades as Record<string, unknown>);
      if (tradeEntries.length > 0) {
        for (const [tradeName, tradeData] of tradeEntries) {
          const trimmedName = tradeName.trim();
          if (!trimmedName || !includeTrade(trimmedName)) continue;
          const tData = (tradeData || {}) as Record<string, unknown>;
          const rates = (tData.rates || val.rates) as Record<string, number> | undefined;
          result.push({
            ...(val as unknown as WorkerProfile),
            ...(tData as unknown as WorkerProfile),
            uid: key,
            trade:
              normalizeRentalTrade(trimmedName) ||
              normalizeServiceTrade(trimmedName) ||
              trimmedName,
            name: String(tData.name || baseName),
            phone: String(val.phone || tData.phone || ''),
            photoURL: String(tData.photoURL || val.photoURL || ''),
            city: String(tData.city || val.city || ''),
            address: String(tData.address || val.address || ''),
            landmark: String(tData.landmark || val.landmark || ''),
            latitude: parseFloat(String(tData.latitude || val.latitude || '')) || null,
            longitude: parseFloat(String(tData.longitude || val.longitude || '')) || null,
            rates,
            experience: String(tData.experience ?? val.experience ?? ''),
            verificationStatus: (tData.verificationStatus ||
              val.verificationStatus) as 'pending' | 'approved' | 'rejected' | undefined,
            deleted: Boolean(val.deleted),
          } as WorkerProfile);
        }
        continue;
      }
    }

    const singleTrade = typeof val.trade === 'string' ? val.trade.trim() : '';
    if (singleTrade && !includeTrade(singleTrade)) continue;

    const canonicalTrade =
      normalizeRentalTrade(singleTrade) ||
      normalizeServiceTrade(singleTrade) ||
      singleTrade ||
      'Service';

    result.push({
      ...(val as unknown as WorkerProfile),
      uid: key,
      trade: canonicalTrade,
      name: baseName,
      phone: String(val.phone || ''),
      photoURL: String(val.photoURL || ''),
      city: String(val.city || ''),
      address: String(val.address || ''),
      landmark: String(val.landmark || ''),
      rates: val.rates as Record<string, number> | undefined,
      experience: String(val.experience ?? ''),
      verificationStatus: val.verificationStatus as 'pending' | 'approved' | 'rejected' | undefined,
      deleted: Boolean(val.deleted),
    } as WorkerProfile);
  }

  return result.filter((w) => !w.deleted);
}

/** Process workers in chunks so the UI thread can handle taps between batches. */
export async function expandWorkerEntriesAsync(
  workersData: RawWorkers,
  options?: { rentalsOnly?: boolean; servicesOnly?: boolean }
): Promise<WorkerProfile[]> {
  const keys = Object.keys(workersData);
  if (keys.length <= CHUNK_SIZE) {
    await yieldToMain();
    return expandWorkerEntries(workersData, options);
  }

  const merged: WorkerProfile[] = [];
  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    const slice: RawWorkers = {};
    for (let j = i; j < Math.min(i + CHUNK_SIZE, keys.length); j++) {
      slice[keys[j]] = workersData[keys[j]];
    }
    merged.push(...expandWorkerEntries(slice, options));
    await yieldToMain();
  }
  return merged;
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export function dedupeWorkersByTrade(workers: WorkerProfile[]): WorkerProfile[] {
  return Array.from(
    new Map(workers.map((item) => [`${item.uid}-${item.trade}`, item])).values()
  ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * Fetches /workers once, expands to list rows, optionally streams batches to the UI.
 * (Previously gated on router path — broke when Services/Rentals use tab state.)
 */
export async function fetchWorkerDirectory(
  onProgress?: (workers: WorkerProfile[]) => void
): Promise<{ workers: WorkerProfile[] }> {
  const workersSnap = await get(ref(db, 'workers'));
  const workersData = (workersSnap.val() || {}) as RawWorkers;
  const keys = Object.keys(workersData);

  if (keys.length === 0) {
    onProgress?.([]);
    return { workers: [] };
  }

  if (keys.length <= CHUNK_SIZE) {
    const expanded = expandWorkerEntries(workersData);
    const workers = dedupeWorkersByTrade(expanded);
    onProgress?.(workers);
    return { workers };
  }

  let merged: WorkerProfile[] = [];
  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    const slice: RawWorkers = {};
    for (let j = i; j < Math.min(i + CHUNK_SIZE, keys.length); j++) {
      slice[keys[j]] = workersData[keys[j]];
    }
    merged = dedupeWorkersByTrade([...merged, ...expandWorkerEntries(slice)]);
    onProgress?.(merged);
    if (i + CHUNK_SIZE < keys.length) {
      await yieldToMain();
    }
  }

  return { workers: merged };
}

export function filterServiceWorkers(workers: WorkerProfile[]): WorkerProfile[] {
  return workers
    .map((w) => {
      if (isRentalTrade(w.trade)) return null;
      const raw = (w.trade || '').trim();
      if (!raw) return null;
      const canonical = normalizeServiceTrade(w.trade);
      return { ...w, trade: canonical || raw } as WorkerProfile;
    })
    .filter((w): w is WorkerProfile => w !== null);
}

export function filterRentalWorkers(workers: WorkerProfile[]): WorkerProfile[] {
  return workers
    .filter((w) => !(w as { deleted?: boolean }).deleted && (w.trade || '').trim())
    .filter((w) => isRentalTrade(w.trade))
    .map((w) => {
      const canonical = normalizeRentalTrade(w.trade) || (w.trade || '').trim();
      return { ...w, trade: canonical } as WorkerProfile;
    });
}
