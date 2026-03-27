export const STORAGE_VERSION = 3 as const;

export type Id = string;

export type IsoDateTime = string;

export type SessionTag = string;

export type SessionRating = 1 | 2 | 3 | 4 | 5;

export type Instrument = string;

export type Session = {
  id: Id;
  startedAt: IsoDateTime;
  endedAt: IsoDateTime;
  durationSec: number;
  instrument?: Instrument;
  tags: SessionTag[];
  notes: string;
  rating?: SessionRating;
  focus?: SessionRating;
};

export type Preset = {
  id: Id;
  name: string;
  defaultInstrument?: Instrument;
  defaultTags: SessionTag[];
};

export type RoutineStep = {
  id: Id;
  name: string;
  durationSec: number;
  focusIds: Id[];
  note?: string;
  imageDataUrl?: string;
};

export type StepTemplate = {
  id: Id;
  name: string;
  durationSec: number;
  focusIds: Id[];
  note?: string;
  imageDataUrl?: string;
};

export type FocusItem = {
  id: Id;
  label: string;
};

export type RoutineTemplate = {
  id: Id;
  name: string;
  totalDurationSec: number;
  steps: RoutineStep[];
};

export type AppData = {
  version: typeof STORAGE_VERSION;
  sessions: Session[];
  presets: Preset[];
  routines: RoutineTemplate[];
  stepLibrary: StepTemplate[];
  focusLibrary: FocusItem[];
  activeRun?: ActiveRun;
  lastCompletedRun?: CompletedRun;
};

export type ActiveRun = {
  routineId: Id;
  startedAt: IsoDateTime;
  isRunning: boolean;
  elapsedSec: number;
  currentStepIndex: number;
  stepElapsedSec: number;
};

export type CompletedRun = {
  routineId: Id;
  routineName: string;
  startedAt: IsoDateTime;
  endedAt: IsoDateTime;
  totalDurationSec: number;
  steps: RoutineStep[];
};

