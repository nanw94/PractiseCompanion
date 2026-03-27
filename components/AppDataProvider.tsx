"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppData } from "@/lib/model";
import { parseAppDataFromJson } from "@/lib/parse-app-data";
import { clearAppData, createEmptyAppData, loadAppData, saveAppData } from "@/lib/storage";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const SYNC_DEBOUNCE_MS = 800;

async function fetchCloudData(): Promise<AppData | null> {
  const res = await fetch("/api/app-data");
  if (!res.ok) return null;
  const json = (await res.json()) as { data: unknown };
  if (json.data == null) return null;
  return parseAppDataFromJson(json.data);
}

async function pushCloudData(data: AppData): Promise<boolean> {
  const res = await fetch("/api/app-data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
}

export type SyncStatus = "idle" | "saving" | "saved" | "error";

export type AppDataContextValue = {
  data: AppData;
  update: (updater: (prev: AppData) => AppData) => void;
  hydrated: boolean;
  cloudSyncEnabled: boolean;
  syncStatus: SyncStatus;
  flushCloudSync: () => Promise<void>;
  clearLocalData: () => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function useAppDataState(): AppDataContextValue {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [hydrated, setHydrated] = useState(false);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const cloudSyncEnabledRef = useRef(cloudSyncEnabled);
  cloudSyncEnabledRef.current = cloudSyncEnabled;
  const loadGenRef = useRef(0);

  const clearLocalData = useCallback(() => {
    clearAppData();
    setData(createEmptyAppData());
  }, []);

  const scheduleSync = useCallback((next: AppData) => {
    if (!cloudSyncEnabledRef.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSyncStatus("saving");
    syncTimerRef.current = setTimeout(async () => {
      syncTimerRef.current = null;
      const ok = await pushCloudData(next);
      setSyncStatus(ok ? "saved" : "error");
      if (ok) {
        savedTimerRef.current = setTimeout(() => {
          setSyncStatus("idle");
          savedTimerRef.current = null;
        }, 2500);
      }
    }, SYNC_DEBOUNCE_MS);
  }, []);

  const flushCloudSync = useCallback(async () => {
    if (!cloudSyncEnabledRef.current) return;
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    setSyncStatus("saving");
    const ok = await pushCloudData(dataRef.current);
    setSyncStatus(ok ? "saved" : "error");
  }, []);

  const update = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const next = updater(prev);
        saveAppData(next);
        scheduleSync(next);
        return next;
      });
    },
    [scheduleSync],
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setHydrated(true);
      setCloudSyncEnabled(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setHydrated(true);
      return;
    }

    const handleSession = async (event: string, hasUser: boolean) => {
      const gen = ++loadGenRef.current;

      // On sign-out: clear local data so next user starts fresh
      if (event === "SIGNED_OUT") {
        clearAppData();
        setData(createEmptyAppData());
        setCloudSyncEnabled(false);
        setHydrated(true);
        setSyncStatus("idle");
        return;
      }

      if (!hasUser) {
        setCloudSyncEnabled(false);
        setHydrated(true);
        return;
      }

      const remote = await fetchCloudData();
      if (gen !== loadGenRef.current) return;

      if (remote) {
        setData(remote);
        saveAppData(remote);
      } else {
        // New user: seed DB with empty data (not local from a previous user)
        const empty = createEmptyAppData();
        setData(empty);
        saveAppData(empty);
        await pushCloudData(empty);
      }
      if (gen !== loadGenRef.current) return;
      setCloudSyncEnabled(true);
      setHydrated(true);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void handleSession("INITIAL", Boolean(session?.user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      void handleSession(event, Boolean(session?.user));
    });

    return () => {
      subscription.unsubscribe();
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = null;
      }
    };
  }, []);

  return useMemo(
    () => ({
      data,
      update,
      hydrated,
      cloudSyncEnabled,
      syncStatus,
      flushCloudSync,
      clearLocalData,
    }),
    [data, update, hydrated, cloudSyncEnabled, syncStatus, flushCloudSync, clearLocalData],
  );
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const value = useAppDataState();
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}
