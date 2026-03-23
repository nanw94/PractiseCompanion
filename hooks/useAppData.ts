"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppData } from "@/lib/model";
import { loadAppData, saveAppData } from "@/lib/storage";

export function useAppData() {
  const [data, setData] = useState<AppData>(() => loadAppData());

  useEffect(() => {
    setData(loadAppData());
  }, []);

  const update = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      saveAppData(next);
      return next;
    });
  }, []);

  return useMemo(() => ({ data, update }), [data, update]);
}

