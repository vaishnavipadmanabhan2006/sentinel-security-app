import { AlertRecord, OfflineSyncQueueItem } from "../types";

type Listener = () => void;

class OfflineSyncManager {
  private isSimulatedOffline: boolean = false;
  private pendingQueue: OfflineSyncQueueItem[] = [];
  private listeners: Set<Listener> = new Set();
  private isSyncing: boolean = false;

  constructor() {
    this.loadFromStorage();

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
    }
  }

  private loadFromStorage() {
    try {
      const storedQueue = localStorage.getItem("sentinel_offline_queue");
      if (storedQueue) {
        this.pendingQueue = JSON.parse(storedQueue);
      }
      const storedOffline = localStorage.getItem("sentinel_sim_offline");
      if (storedOffline !== null) {
        this.isSimulatedOffline = JSON.parse(storedOffline);
      }
    } catch (e) {
      console.warn("Error loading offline sync state:", e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem("sentinel_offline_queue", JSON.stringify(this.pendingQueue));
      localStorage.setItem("sentinel_sim_offline", JSON.stringify(this.isSimulatedOffline));
    } catch (e) {
      console.warn("Error saving offline sync state:", e);
    }
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((l) => l());
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    if (typeof navigator !== "undefined" && !navigator.onLine) return false;
    return true;
  }

  public getSimulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  public toggleSimulatedOffline(): boolean {
    this.isSimulatedOffline = !this.isSimulatedOffline;
    this.notify();
    if (!this.isSimulatedOffline && this.pendingQueue.length > 0) {
      this.syncNow();
    }
    return this.isSimulatedOffline;
  }

  public setSimulatedOffline(offline: boolean) {
    this.isSimulatedOffline = offline;
    this.notify();
    if (!this.isSimulatedOffline && this.pendingQueue.length > 0) {
      this.syncNow();
    }
  }

  private handleNetworkChange(online: boolean) {
    this.notify();
    if (online && !this.isSimulatedOffline && this.pendingQueue.length > 0) {
      this.syncNow();
    }
  }

  public getPendingQueue(): OfflineSyncQueueItem[] {
    return [...this.pendingQueue];
  }

  public getPendingCount(): number {
    return this.pendingQueue.length;
  }

  public isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  // Cache alerts locally
  public saveCachedAlerts(alerts: AlertRecord[]) {
    try {
      localStorage.setItem("sentinel_cached_alerts", JSON.stringify(alerts.slice(0, 50)));
    } catch (e) {
      // Ignore quota error
    }
  }

  public getCachedAlerts(): AlertRecord[] {
    try {
      const data = localStorage.getItem("sentinel_cached_alerts");
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  // Enqueue an action when offline or for asynchronous blockchain sealing
  public enqueue(type: OfflineSyncQueueItem["type"], payload: any): OfflineSyncQueueItem {
    const item: OfflineSyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      type,
      payload,
      status: "PENDING",
      attempts: 0,
    };
    this.pendingQueue.push(item);
    this.notify();

    // If online, auto-flush immediately
    if (this.isOnline()) {
      setTimeout(() => this.syncNow(), 200);
    }
    return item;
  }

  // Process and flush the sync queue to the server
  public async syncNow(): Promise<{ syncedCount: number; errors: number }> {
    if (this.isSyncing || this.pendingQueue.length === 0 || !this.isOnline()) {
      return { syncedCount: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.notify();

    let syncedCount = 0;
    let errors = 0;
    const remaining: OfflineSyncQueueItem[] = [];

    for (const item of this.pendingQueue) {
      try {
        if (item.type === "ALERT_SEAL") {
          // Post to server blockchain and alerts
          await fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ alert: item.payload }),
          });

          await fetch("/api/blockchain/append", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventData: item.payload }),
          });
          syncedCount++;
        } else if (item.type === "TRIAGE_FEEDBACK") {
          // Post ML-ops retraining feedback
          await fetch("/api/alerts/triage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          });
          syncedCount++;
        } else if (item.type === "HANDOVER_NOTE") {
          await fetch("/api/handover-sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          });
          syncedCount++;
        } else {
          syncedCount++;
        }
      } catch (err) {
        errors++;
        item.attempts = (item.attempts || 0) + 1;
        remaining.push(item);
      }
    }

    this.pendingQueue = remaining;
    this.isSyncing = false;
    this.notify();

    return { syncedCount, errors };
  }
}

export const offlineSync = new OfflineSyncManager();
