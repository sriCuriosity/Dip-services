import { WorkerProfile } from '@/src/types';

const CACHE_KEY = 'dip_worker_directory_v3';
/** 24h — avoids re-downloading the full /workers tree on every app open */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type WorkerDirectoryCachePayload = {
  workers: WorkerProfile[];
  savedAt: number;
};

function readStorage(storage: Storage): WorkerDirectoryCachePayload | null {
  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkerDirectoryCachePayload;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    if (!Array.isArray(parsed.workers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readWorkerDirectoryCache(): WorkerDirectoryCachePayload | null {
  return readStorage(localStorage) ?? readStorage(sessionStorage);
}

/** Strip heavy fields so cache fits mobile storage quotas. */
function slimWorkersForCache(workers: WorkerProfile[]): WorkerProfile[] {
  return workers.map((w) => {
    const row = w as WorkerProfile & {
      experience?: string | number;
      verificationStatus?: string;
      rates?: Record<string, number>;
      location?: string;
      deleted?: boolean;
    };
    return {
      uid: row.uid,
      trade: row.trade,
      name: row.name,
      phone: row.phone,
      photoURL: row.photoURL,
      city: row.city,
      address: row.address,
      landmark: row.landmark,
      location: row.location,
      experience: row.experience,
      rating: row.rating,
      verificationStatus: row.verificationStatus,
      rates: row.rates,
      latitude: row.latitude,
      longitude: row.longitude,
      deleted: row.deleted,
    } as unknown as WorkerProfile;
  });
}

export function writeWorkerDirectoryCache(workers: WorkerProfile[]): void {
  const payload: WorkerDirectoryCachePayload = {
    workers: slimWorkersForCache(workers),
    savedAt: Date.now(),
  };
  const json = JSON.stringify(payload);
  try {
    localStorage.setItem(CACHE_KEY, json);
  } catch {
    try {
      sessionStorage.setItem(CACHE_KEY, json);
    } catch {
      /* quota — in-memory list still works this session */
    }
  }
}
