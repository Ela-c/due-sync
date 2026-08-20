const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheRecord<T> = {
  timestamp: number;
  data: T;
};

function hasChromeStorage() {
  return typeof chrome !== "undefined" && !!chrome.storage?.local;
}

async function readCacheRecord<T>(key: string): Promise<CacheRecord<T> | null> {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get(key);
    return (result[key] as CacheRecord<T> | undefined) ?? null;
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CacheRecord<T>;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export async function writeCache<T>(key: string, data: T) {
  const record: CacheRecord<T> = {
    timestamp: Date.now(),
    data,
  };

  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [key]: record });
    return;
  }

  localStorage.setItem(key, JSON.stringify(record));
}

export async function readFreshCache<T>(key: string, ttlMs = CACHE_TTL_MS): Promise<T | null> {
  const record = await readCacheRecord<T>(key);
  if (!record) {
    return null;
  }

  const isFresh = Date.now() - record.timestamp < ttlMs;
  if (!isFresh) {
    if (hasChromeStorage()) {
      await chrome.storage.local.remove(key);
    } else {
      localStorage.removeItem(key);
    }
    return null;
  }

  return record.data;
}