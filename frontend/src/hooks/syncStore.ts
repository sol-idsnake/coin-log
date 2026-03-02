/** Sync utilities: module-level runSync function and auto-sync init hook. */
import { useEffect } from "react";
import { syncTransactions } from "../api";
import queryClient from "../queryClient";

const STALE_MS = 4 * 60 * 60 * 1000;
export const LAST_SYNCED_STORAGE_KEY = "coinLogLastSyncedAt";
let syncInFlight = false;

export async function runSync(): Promise<void> {
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    await syncTransactions();
    localStorage.setItem(LAST_SYNCED_STORAGE_KEY, String(Date.now()));
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    void queryClient.invalidateQueries({ queryKey: ["budget"] });
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });
  } catch {
    // silent — stale timer not advanced, next auto-sync will retry
  } finally {
    syncInFlight = false;
  }
}

/** Call once in App to auto-sync on mount if data is stale. */
export function useSyncInit(): void {
  useEffect(() => {
    const lastSynced = localStorage.getItem(LAST_SYNCED_STORAGE_KEY);
    if (!lastSynced || Date.now() - Number(lastSynced) > STALE_MS)
      void runSync();
  }, []);
}
