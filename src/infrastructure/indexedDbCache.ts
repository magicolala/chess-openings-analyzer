export interface PersistentCache<V> {
  get(key: string): Promise<V | undefined>;
  set(key: string, value: V, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface CacheOptions {
  dbName: string;
  storeName: string;
  version?: number;
}

interface CacheEntry<V> {
  key: string;
  value: V;
  expiresAt?: number;
}

function hasIndexedDbSupport(): boolean {
  return typeof indexedDB !== 'undefined';
}

async function openDatabase(options: CacheOptions): Promise<IDBDatabase> {
  const { dbName, version = 1, storeName } = options;
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'key' });
      }
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB open error'));
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

class BrowserCache<V> implements PersistentCache<V> {
  private readonly storeName: string;

  private readonly dbPromise: Promise<IDBDatabase>;

  constructor(options: CacheOptions) {
    this.storeName = options.storeName;
    this.dbPromise = openDatabase(options);
  }

  async get(key: string): Promise<V | undefined> {
    const db = await this.dbPromise;
    return new Promise<V | undefined>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB get error'));
      request.onsuccess = () => {
        const entry = request.result as CacheEntry<V> | undefined;
        if (!entry) {
          resolve(undefined);
          return;
        }
        if (entry.expiresAt && entry.expiresAt <= Date.now()) {
          void this.delete(key);
          resolve(undefined);
          return;
        }
        resolve(entry.value);
      };
    });
  }

  async set(key: string, value: V, ttlMs?: number): Promise<void> {
    const db = await this.dbPromise;
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const entry: CacheEntry<V> = { key, value, expiresAt: ttlMs ? Date.now() + ttlMs : undefined };
      const request = store.put(entry);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB put error'));
      request.onsuccess = () => resolve();
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB delete error'));
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    const db = await this.dbPromise;
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      request.onerror = () => reject(request.error ?? new Error('IndexedDB clear error'));
      request.onsuccess = () => resolve();
    });
  }
}

class MemoryCache<V> implements PersistentCache<V> {
  private readonly store = new Map<string, CacheEntry<V>>();

  async get(key: string): Promise<V | undefined> {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: V, ttlMs?: number): Promise<void> {
    this.store.set(key, { key, value, expiresAt: ttlMs ? Date.now() + ttlMs : undefined });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export function createPersistentCache<V>(options: CacheOptions): PersistentCache<V> {
  if (hasIndexedDbSupport()) {
    return new BrowserCache<V>(options);
  }
  return new MemoryCache<V>();
}
