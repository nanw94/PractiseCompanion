export const STORAGE_VERSION = 1 as const;

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

export type AppData = {
  version: typeof STORAGE_VERSION;
  sessions: Session[];
  presets: Preset[];
  activeSessionDraft?: ActiveSessionDraft;
};

export type ActiveSessionDraft = {
  startedAt: IsoDateTime;
  isRunning: boolean;
  elapsedSec: number;
  instrument?: Instrument;
  tags: SessionTag[];
  notes: string;
};

