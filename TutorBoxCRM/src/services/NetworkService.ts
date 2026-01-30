// NetworkService - Monitors network connectivity
// Used for offline sync and status indication

import NetInfo, {NetInfoState} from '@react-native-community/netinfo';

type NetworkListener = (isConnected: boolean) => void;

class NetworkServiceClass {
  private isConnected: boolean = true;
  private listeners: Set<NetworkListener> = new Set();
  private unsubscribe: (() => void) | null = null;

  async initialize(): Promise<void> {
    // Get initial state
    const state = await NetInfo.fetch();
    this.isConnected = state.isConnected ?? false;

    // Subscribe to changes
    this.unsubscribe = NetInfo.addEventListener(this.handleNetworkChange);

    console.log('📡 NetworkService initialized, connected:', this.isConnected);
  }

  private handleNetworkChange = (state: NetInfoState): void => {
    const wasConnected = this.isConnected;
    this.isConnected = state.isConnected ?? false;

    // Notify listeners if status changed
    if (wasConnected !== this.isConnected) {
      console.log(
        '📡 Network status changed:',
        this.isConnected ? 'ONLINE' : 'OFFLINE',
      );
      this.notifyListeners();
    }
  };

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.isConnected);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  // Check if currently connected
  getIsConnected(): boolean {
    return this.isConnected;
  }

  // Subscribe to network changes
  addListener(listener: NetworkListener): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Force refresh network state
  async refresh(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isConnected = state.isConnected ?? false;
    return this.isConnected;
  }

  // Cleanup
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const NetworkService = new NetworkServiceClass();
