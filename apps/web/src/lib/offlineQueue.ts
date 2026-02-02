import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { queueApi } from './api';

interface OfflineDB extends DBSchema {
  pendingCheckins: {
    key: number;
    value: {
      localId?: number;
      branchId: string;
      serviceCategoryId: string;
      customerPhone?: string;
      notificationChannel?: string;
      priority?: string;
      checkinMethod: string;
      timestamp: number;
      synced: boolean;
    };
  };
}

let db: IDBPDatabase<OfflineDB> | null = null;

async function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (!db) {
    db = await openDB<OfflineDB>('blesaf-offline', 1, {
      upgrade(db) {
        const store = db.createObjectStore('pendingCheckins', {
          keyPath: 'localId',
          autoIncrement: true,
        });
        store.createIndex('synced', 'synced');
        store.createIndex('timestamp', 'timestamp');
      },
    });
  }
  return db;
}

export interface CheckinData {
  branchId: string;
  serviceCategoryId: string;
  customerPhone?: string;
  notificationChannel?: string;
  priority?: string;
  checkinMethod?: string;
}

/**
 * Queue a check-in for offline storage
 * Used when the device is offline (kiosk scenario)
 */
export async function queueOfflineCheckin(data: CheckinData): Promise<number> {
  const database = await getDB();

  const id = await database.add('pendingCheckins', {
    ...data,
    checkinMethod: data.checkinMethod || 'kiosk',
    timestamp: Date.now(),
    synced: false,
  });

  return id;
}

/**
 * Get all pending (unsynced) check-ins
 */
export async function getPendingCheckins() {
  const database = await getDB();
  return database.getAllFromIndex('pendingCheckins', 'synced', false);
}

/**
 * Mark a check-in as synced
 */
export async function markCheckinSynced(localId: number): Promise<void> {
  const database = await getDB();
  const checkin = await database.get('pendingCheckins', localId);
  if (checkin) {
    checkin.synced = true;
    await database.put('pendingCheckins', checkin);
  }
}

/**
 * Delete a synced check-in
 */
export async function deleteCheckin(localId: number): Promise<void> {
  const database = await getDB();
  await database.delete('pendingCheckins', localId);
}

/**
 * Sync all pending check-ins to the server
 * Returns the number of successfully synced check-ins
 */
export async function syncPendingCheckins(): Promise<number> {
  const pending = await getPendingCheckins();
  let syncedCount = 0;

  for (const checkin of pending) {
    try {
      await queueApi.checkin({
        branchId: checkin.branchId,
        serviceCategoryId: checkin.serviceCategoryId,
        customerPhone: checkin.customerPhone,
        notificationChannel: checkin.notificationChannel,
        priority: checkin.priority,
        checkinMethod: checkin.checkinMethod,
      });

      // Delete after successful sync
      if (checkin.localId) {
        await deleteCheckin(checkin.localId);
      }
      syncedCount++;
    } catch (error) {
      console.error('Failed to sync check-in:', error);
      // Will retry on next sync
    }
  }

  return syncedCount;
}

/**
 * Clear all offline data (for logout/cleanup)
 */
export async function clearOfflineData(): Promise<void> {
  const database = await getDB();
  await database.clear('pendingCheckins');
}

/**
 * Check if there are pending check-ins
 */
export async function hasPendingCheckins(): Promise<boolean> {
  const pending = await getPendingCheckins();
  return pending.length > 0;
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('Device online - syncing pending check-ins');
    const synced = await syncPendingCheckins();
    if (synced > 0) {
      console.log(`Synced ${synced} offline check-ins`);
    }
  });
}
