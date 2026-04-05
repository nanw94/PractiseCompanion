"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppData } from "@/lib/model";
import { parseAppDataFromJson } from "@/lib/parse-app-data";
import { clearAppData, createEmptyAppData } from "@/lib/storage";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

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
  /** Edits library/settings/routine builder; marks unsaved (no server write). */
  update: (updater: (prev: AppData) => AppData) => void;
  /** Active run timer / controls only; does not mark unsaved. */
  updateRun: (updater: (prev: AppData) => AppData) => void;
  /** True when draft differs from last successful server snapshot. */
  dirty: boolean;
  /** Persist draft to server. Returns whether PUT succeeded. */
  commit: () => Promise<boolean>;
  /** Drop local edits and reload from last committed snapshot. */
  revertDraft: () => void;
  hydrated: boolean;
  cloudSyncEnabled: boolean;
  syncStatus: SyncStatus;
  clearLocalData: () => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

function cloneAppData(d: AppData): AppData {
  return JSON.parse(JSON.stringify(d)) as AppData;
}

function useAppDataState(): AppDataContextValue {
  const [data, setData] = useState<AppData>(() => createEmptyAppData());
  const persistedRef = useRef<AppData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const dataRef = useRef(data);
  dataRef.current = data;
  const cloudSyncEnabledRef = useRef(cloudSyncEnabled);
  cloudSyncEnabledRef.current = cloudSyncEnabled;
  const loadGenRef = useRef(0);

  const clearLocalData = useCallback(() => {
    clearAppData();
    persistedRef.current = null;
    const empty = createEmptyAppData();
    dataRef.current = empty;
    setData(empty);
    setDirty(false);
  }, []);

  const revertDraft = useCallback(() => {
    if (persistedRef.current) {
      const copy = cloneAppData(persistedRef.current);
      dataRef.current = copy;
      setData(copy);
      setDirty(false);
    }
  }, []);

  const commit = useCallback(async (): Promise<boolean> => {
    if (!cloudSyncEnabledRef.current) {
      setSyncStatus("error");
      return false;
    }
    setSyncStatus("saving");
    const payload = dataRef.current;
    const ok = await pushCloudData(payload);
    if (ok) {
      persistedRef.current = cloneAppData(payload);
      setDirty(false);
      setSyncStatus("saved");
      window.setTimeout(() => setSyncStatus("idle"), 2000);
    } else {
      setSyncStatus("error");
    }
    return ok;
  }, []);

  const update = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      dataRef.current = next;
      return next;
    });
    setDirty(true);
  }, []);

  const updateRun = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      dataRef.current = next;
      return next;
    });
  }, []);

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
      // Token refresh / profile updates must not replace in-memory app data (would drop pending edits
      // and race with in-flight commits, e.g. duplicate section + PUT).
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        return;
      }

      const gen = ++loadGenRef.current;

      if (event === "SIGNED_OUT") {
        clearAppData();
        persistedRef.current = null;
        const emptyOut = createEmptyAppData();
        dataRef.current = emptyOut;
        setData(emptyOut);
        setDirty(false);
        setCloudSyncEnabled(false);
        setHydrated(true);
        setSyncStatus("idle");
        return;
      }

      if (!hasUser) {
        persistedRef.current = null;
        const emptyUser = createEmptyAppData();
        dataRef.current = emptyUser;
        setData(emptyUser);
        setDirty(false);
        setCloudSyncEnabled(false);
        setHydrated(true);
        return;
      }

      const remote = await fetchCloudData();
      if (gen !== loadGenRef.current) return;

      if (remote) {
        const copy = cloneAppData(remote);
        persistedRef.current = copy;
        dataRef.current = copy;
        setData(copy);
        setDirty(false);
      } else {
        const empty = createEmptyAppData();
        const persistedEmpty = cloneAppData(empty);
        persistedRef.current = persistedEmpty;
        dataRef.current = empty;
        setData(empty);
        setDirty(false);
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

    return () => subscription.unsubscribe();
  }, []);

  return useMemo(
    () => ({
      data,
      update,
      updateRun,
      dirty,
      commit,
      revertDraft,
      hydrated,
      cloudSyncEnabled,
      syncStatus,
      clearLocalData,
    }),
    [data, update, updateRun, dirty, commit, revertDraft, hydrated, cloudSyncEnabled, syncStatus, clearLocalData],
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
