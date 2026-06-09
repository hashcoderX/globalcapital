const DB_NAME = 'dof_mf_offline';
const DB_VERSION = 1;

export type OfflineCacheSnapshot = {
  scopeKey: string;
  loans: unknown[];
  collections: unknown[];
  cachedAt: string;
};

export type PendingMfCollection = {
  clientReference: string;
  scopeKey: string;
  loanRequestId: number;
  loanCode: string;
  customerName: string;
  collectionDate: string;
  collectedAmount: number;
  paymentType: 'cash' | 'check' | 'bank_transfer';
  paymentReference?: string;
  note?: string;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  syncError?: string;
  retryCount: number;
};

type StoreName = 'cache' | 'pending';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'scopeKey' });
      }
      if (!db.objectStoreNames.contains('pending')) {
        const store = db.createObjectStore('pending', { keyPath: 'clientReference' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open offline database.'));
  });
}

function idbRequestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function runTransaction<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);

        const result = runner(store);
        const work = result instanceof IDBRequest ? idbRequestToPromise(result) : Promise.resolve(result);

        work.then(resolve).catch(reject);

        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('IndexedDB transaction failed.'));
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
        };
      })
  );
}

export async function saveCacheSnapshot(snapshot: OfflineCacheSnapshot): Promise<void> {
  await runTransaction('cache', 'readwrite', (store) => store.put(snapshot));
}

export async function loadCacheSnapshot(scopeKey: string): Promise<OfflineCacheSnapshot | null> {
  return runTransaction<OfflineCacheSnapshot | null>('cache', 'readonly', (store) => {
    const request = store.get(scopeKey);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as OfflineCacheSnapshot | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function queuePendingCollection(entry: PendingMfCollection): Promise<void> {
  await runTransaction('pending', 'readwrite', (store) => store.put(entry));
}

export async function updatePendingCollection(entry: PendingMfCollection): Promise<void> {
  await runTransaction('pending', 'readwrite', (store) => store.put(entry));
}

export async function removePendingCollection(clientReference: string): Promise<void> {
  await runTransaction('pending', 'readwrite', (store) => store.delete(clientReference));
}

export async function listPendingCollections(): Promise<PendingMfCollection[]> {
  return runTransaction<PendingMfCollection[]>('pending', 'readonly', (store) => {
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const rows = (request.result as PendingMfCollection[]) ?? [];
        resolve(rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      };
      request.onerror = () => reject(request.error);
    });
  });
}

export async function countPendingCollections(): Promise<number> {
  const rows = await listPendingCollections();
  return rows.filter((row) => row.status === 'pending' || row.status === 'failed').length;
}

export function buildScopeKey(branchId?: number | null, fieldOfficer?: string | null): string {
  const branch = branchId ? String(branchId) : 'all';
  const officer = fieldOfficer ? fieldOfficer.trim().toLowerCase() : 'all';
  return `${branch}::${officer}`;
}
