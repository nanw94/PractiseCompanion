"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ActiveRun, CompletedRun, RoutineTemplate, Session } from "@/lib/model";
import { useAppData } from "@/hooks/useAppData";

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => ctx.close();
  } catch {
    // ignore
  }
}

export function useActiveRun() {
  const { data, update } = useAppData();
  const tickRef = useRef<number | null>(null);

  const routines = data.routines ?? [];
  const activeRun = data.activeRun ?? null;
  const routine: RoutineTemplate | null =
    activeRun ? routines.find((r) => r.id === activeRun.routineId) ?? null : null;

  const start = useCallback(
    (routineId: string) => {
      update((prev) => ({
        ...prev,
        activeRun: {
          routineId,
          startedAt: nowIso(),
          isRunning: true,
          elapsedSec: 0,
          currentStepIndex: 0,
          stepElapsedSec: 0,
        },
      }));
    },
    [update],
  );

  const pause = useCallback(() => {
    update((prev) => {
      if (!prev.activeRun) return prev;
      return { ...prev, activeRun: { ...prev.activeRun, isRunning: false } };
    });
  }, [update]);

  const resume = useCallback(() => {
    update((prev) => {
      if (!prev.activeRun) return prev;
      return { ...prev, activeRun: { ...prev.activeRun, isRunning: true } };
    });
  }, [update]);

  const goToStep = useCallback(
    (index: number) => {
      update((prev) => {
        if (!prev.activeRun) return prev;
        return {
          ...prev,
          activeRun: {
            ...prev.activeRun,
            currentStepIndex: Math.max(0, index),
            stepElapsedSec: 0,
          },
        };
      });
    },
    [update],
  );

  const next = useCallback(() => {
    if (!routine || !activeRun) return;
    goToStep(activeRun.currentStepIndex + 1);
  }, [routine, activeRun, goToStep]);

  const prev = useCallback(() => {
    if (!routine || !activeRun) return;
    goToStep(Math.max(0, activeRun.currentStepIndex - 1));
  }, [routine, activeRun, goToStep]);

  const finish = useCallback(() => {
    update((prev) => {
      const run = prev.activeRun;
      if (!run) return prev;
      const r = (prev.routines ?? []).find((x) => x.id === run.routineId);
      if (!r) return { ...prev, activeRun: undefined };

      const endedAt = nowIso();
      const totalDurationSec = r.steps.reduce((acc, s) => acc + s.durationSec, 0);

      const completed: CompletedRun = {
        routineId: r.id,
        routineName: r.name,
        startedAt: run.startedAt,
        endedAt,
        totalDurationSec,
        steps: r.steps,
      };

      const session: Session = {
        id: newId(),
        startedAt: run.startedAt,
        endedAt,
        durationSec: Math.max(0, Math.round(run.elapsedSec)),
        tags: [],
        notes: "",
      };

      return {
        ...prev,
        sessions: [session, ...(prev.sessions ?? [])],
        lastCompletedRun: completed,
        activeRun: undefined,
      };
    });
  }, [update]);

  useEffect(() => {
    if (!activeRun?.isRunning || !routine) return;

    let lastTickTimeMs = Date.now();
    let accumulatedMs = 0;

    tickRef.current = window.setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastTickTimeMs;
      lastTickTimeMs = now;
      accumulatedMs += deltaMs;

      if (accumulatedMs < 1000) return;

      const addSec = Math.floor(accumulatedMs / 1000);
      accumulatedMs -= addSec * 1000;

      update((prev) => {
        const run = prev.activeRun;
        if (!run?.isRunning) return prev;
        const r = (prev.routines ?? []).find((x) => x.id === run.routineId);
        if (!r) return prev;

        const step = r.steps[run.currentStepIndex];
        if (!step) return prev;

        let currentElapsed = run.elapsedSec + addSec;
        let currentStepElapsed = run.stepElapsedSec + addSec;
        let currentIndex = run.currentStepIndex;
        let didBeep = false;

        while (currentIndex < r.steps.length && currentStepElapsed >= r.steps[currentIndex].durationSec) {
          currentStepElapsed -= r.steps[currentIndex].durationSec;
          currentIndex++;
          didBeep = true;
        }

        if (didBeep) {
          beep();
        }

        if (currentIndex >= r.steps.length) {
          return {
            ...prev,
            activeRun: {
              ...run,
              elapsedSec: r.steps.reduce((a, s) => a + s.durationSec, 0),
              stepElapsedSec: 0,
              currentStepIndex: currentIndex,
              isRunning: false,
            },
          };
        }

        return {
          ...prev,
          activeRun: {
            ...run,
            elapsedSec: currentElapsed,
            stepElapsedSec: currentStepElapsed,
            currentStepIndex: currentIndex,
          },
        };
      });
    }, 1000);

    return () => {
      if (tickRef.current != null) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [activeRun?.isRunning, routine, update]);

  const totalDurationSec = routine?.steps.reduce((acc, s) => acc + s.durationSec, 0) ?? 0;

  return useMemo(
    () => ({
      activeRun,
      routine,
      totalDurationSec,
      start,
      pause,
      resume,
      next,
      prev,
      finish,
    }),
    [activeRun, routine, totalDurationSec, start, pause, resume, next, prev, finish],
  );
}

