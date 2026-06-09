import axios from 'axios';
import { getApiBaseUrl } from '@/lib/api';
import {
  buildScopeKey,
  countPendingCollections,
  listPendingCollections,
  loadCacheSnapshot,
  queuePendingCollection,
  removePendingCollection,
  saveCacheSnapshot,
  updatePendingCollection,
  type PendingMfCollection,
} from '@/lib/offline/mfOfflineDb';

export type MfOfflineHeaders = Record<string, string>;

export type QueueCollectionInput = {
  scopeKey: string;
  loanRequestId: number;
  loanCode: string;
  customerName: string;
  collectionDate: string;
  collectedAmount: number;
  paymentType: 'cash' | 'check' | 'bank_transfer';
  paymentReference?: string;
  note?: string;
};

export async function cacheMfCollectionData(
  scopeKey: string,
  loans: unknown[],
  collections: unknown[]
): Promise<void> {
  await saveCacheSnapshot({
    scopeKey,
    loans,
    collections,
    cachedAt: new Date().toISOString(),
  });
}

export async function loadMfCollectionCache(scopeKey: string) {
  return loadCacheSnapshot(scopeKey);
}

export async function enqueueMfCollection(input: QueueCollectionInput): Promise<PendingMfCollection> {
  const entry: PendingMfCollection = {
    clientReference: crypto.randomUUID(),
    scopeKey: input.scopeKey,
    loanRequestId: input.loanRequestId,
    loanCode: input.loanCode,
    customerName: input.customerName,
    collectionDate: input.collectionDate,
    collectedAmount: input.collectedAmount,
    paymentType: input.paymentType,
    paymentReference: input.paymentReference,
    note: input.note,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };

  await queuePendingCollection(entry);
  return entry;
}

export async function getPendingMfCollectionCount(): Promise<number> {
  return countPendingCollections();
}

export async function syncPendingMfCollections(
  token: string,
  headers: MfOfflineHeaders
): Promise<{ synced: number; failed: number; errors: string[] }> {
  if (!token || typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0, errors: [] };
  }

  const apiBase = getApiBaseUrl();
  const pending = await listPendingCollections();
  const actionable = pending.filter((row) => row.status === 'pending' || row.status === 'failed');

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of actionable) {
    const syncingRow: PendingMfCollection = { ...row, status: 'syncing', syncError: undefined };
    await updatePendingCollection(syncingRow);

    try {
      await axios.post(
        `${apiBase}/microfinance/collections`,
        {
          loan_request_id: row.loanRequestId,
          collection_date: row.collectionDate,
          collected_amount: row.collectedAmount,
          payment_type: row.paymentType,
          payment_reference: row.paymentReference || undefined,
          note: row.note || undefined,
          client_reference: row.clientReference,
        },
        {
          headers: {
            ...headers,
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );

      await removePendingCollection(row.clientReference);
      synced += 1;
    } catch (error: unknown) {
      const message =
        axios.isAxiosError(error) && error.response?.data && typeof error.response.data === 'object'
          ? String((error.response.data as { message?: string }).message || 'Sync failed.')
          : 'Sync failed.';

      failed += 1;
      errors.push(`${row.loanCode}: ${message}`);

      await updatePendingCollection({
        ...row,
        status: 'failed',
        syncError: message,
        retryCount: row.retryCount + 1,
      });
    }
  }

  return { synced, failed, errors };
}

export { buildScopeKey };
