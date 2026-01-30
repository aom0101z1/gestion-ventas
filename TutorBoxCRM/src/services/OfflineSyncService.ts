// OfflineSyncService - Manages offline queue and sync
// Stores attendance records when offline, syncs when back online

import AsyncStorage from '@react-native-async-storage/async-storage';
import {NetworkService} from './NetworkService';
import {OfflineQueueItem, GPSData} from '../types';

const OFFLINE_QUEUE_KEY = '@tutorbox_crm_offline_queue';
const MAX_RETRY_COUNT = 3;

type SyncCallback = (item: OfflineQueueItem) => Promise<boolean>;

class OfflineSyncServiceClass {
  private queue: OfflineQueueItem[] = [];
  private isSyncing: boolean = false;
  private syncCallbacks: Map<string, SyncCallback> = new Map();
  private networkUnsubscribe: (() => void) | null = null;

  async initialize(): Promise<void> {
    // Load existing queue from storage
    await this.loadQueue();

    // Listen for network changes
    this.networkUnsubscribe = NetworkService.addListener(isConnected => {
      if (isConnected && this.queue.length > 0) {
        console.log('📡 Network restored, syncing queue...');
        this.processQueue();
      }
    });

    console.log(
      '💾 OfflineSyncService initialized, queue size:',
      this.queue.length,
    );
  }

  // Register a sync callback for a specific type
  registerSyncCallback(type: string, callback: SyncCallback): void {
    this.syncCallbacks.set(type, callback);
  }

  // Add item to offline queue
  async addToQueue(
    type: string,
    data: any,
    gpsData?: GPSData,
  ): Promise<string> {
    const id = `QUEUE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const item: OfflineQueueItem = {
      id,
      type: type as any,
      timestamp: new Date().toISOString(),
      data,
      retryCount: 0,
      status: 'pending',
      gpsData,
    };

    this.queue.push(item);
    await this.saveQueue();

    console.log('📥 Added to offline queue:', type, id);

    // Try to sync immediately if online
    if (NetworkService.getIsConnected()) {
      this.processQueue();
    }

    return id;
  }

  // Process the queue
  async processQueue(): Promise<void> {
    if (this.isSyncing || this.queue.length === 0) {
      return;
    }

    if (!NetworkService.getIsConnected()) {
      console.log('📡 Offline, skipping sync');
      return;
    }

    this.isSyncing = true;
    console.log('🔄 Processing offline queue, items:', this.queue.length);

    const itemsToProcess = [...this.queue].filter(
      item => item.status === 'pending',
    );

    for (const item of itemsToProcess) {
      try {
        item.status = 'syncing';

        const callback = this.syncCallbacks.get(item.type);
        if (!callback) {
          console.warn('No sync callback for type:', item.type);
          item.status = 'failed';
          continue;
        }

        const success = await callback(item);

        if (success) {
          // Remove from queue
          this.queue = this.queue.filter(q => q.id !== item.id);
          console.log('✅ Synced:', item.id);
        } else {
          item.retryCount++;
          if (item.retryCount >= MAX_RETRY_COUNT) {
            item.status = 'failed';
            console.log('❌ Max retries reached:', item.id);
          } else {
            item.status = 'pending';
            console.log('⚠️ Retry scheduled:', item.id, item.retryCount);
          }
        }
      } catch (error) {
        console.error('Sync error for item:', item.id, error);
        item.retryCount++;
        item.status =
          item.retryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending';
      }
    }

    await this.saveQueue();
    this.isSyncing = false;
  }

  // Get queue status
  getQueueStatus(): {
    total: number;
    pending: number;
    failed: number;
    syncing: number;
  } {
    return {
      total: this.queue.length,
      pending: this.queue.filter(q => q.status === 'pending').length,
      failed: this.queue.filter(q => q.status === 'failed').length,
      syncing: this.queue.filter(q => q.status === 'syncing').length,
    };
  }

  // Get all queue items
  getQueue(): OfflineQueueItem[] {
    return [...this.queue];
  }

  // Get pending items count
  getPendingCount(): number {
    return this.queue.filter(q => q.status !== 'failed').length;
  }

  // Remove failed item
  async removeItem(id: string): Promise<void> {
    this.queue = this.queue.filter(q => q.id !== id);
    await this.saveQueue();
  }

  // Retry failed items
  async retryFailed(): Promise<void> {
    this.queue.forEach(item => {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.retryCount = 0;
      }
    });
    await this.saveQueue();
    this.processQueue();
  }

  // Clear all queue
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }

  // Save queue to AsyncStorage
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  // Load queue from AsyncStorage
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        // Reset any syncing items to pending
        this.queue.forEach(item => {
          if (item.status === 'syncing') {
            item.status = 'pending';
          }
        });
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.queue = [];
    }
  }

  // Cleanup
  destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    this.syncCallbacks.clear();
  }
}

// Export singleton instance
export const OfflineSyncService = new OfflineSyncServiceClass();
