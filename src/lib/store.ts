import { useSyncExternalStore } from 'react';
import { decks } from './data';
import { dayKey, type CardState } from './srs';
import type { Script } from './types';

// All progress lives in this browser's localStorage. Nothing is sent anywhere,
// and nothing personal (journal entries included) is written into the repo.
const KEY = 'canto-mando:v1';

export interface Settings {
  /** Which script is shown large; the other appears beside it when it differs. */
  script: Script;
  newPerSession: number;
  dailyNew: number;
  maxReviews: number;
  rate: number;
  autoplay: boolean;
  voiceM: string;
  voiceC: string;
  /** Decks included in the daily mix. */
  decksOn: Record<string, boolean>;
}

export interface JournalEntry {
  text: string;
  asked: boolean;
  at: number;
}

export interface State {
  v: 1;
  settings: Settings;
  /** Keyed by `${itemId}:${mode}`. A missing key means the card is new. */
  cards: Record<string, CardState>;
  /** Per study day: r = cards answered, n = new cards started. */
  log: Record<string, { r: number; n: number }>;
  journal: Record<string, JournalEntry>;
  /** How many times each character has been written correctly. */
  written: Record<string, number>;
  toneBest: number;
}

function defaults(): State {
  return {
    v: 1,
    settings: {
      script: 's',
      newPerSession: 6,
      dailyNew: 24,
      maxReviews: 24,
      rate: 0.85,
      autoplay: true,
      voiceM: '',
      voiceC: '',
      decksOn: Object.fromEntries(decks.map((d) => [d.id, true])),
    },
    cards: {},
    log: {},
    journal: {},
    written: {},
    toneBest: 0,
  };
}

function merge(saved: Partial<State>): State {
  const base = defaults();
  return {
    ...base,
    ...saved,
    v: 1,
    settings: {
      ...base.settings,
      ...saved.settings,
      decksOn: { ...base.settings.decksOn, ...saved.settings?.decksOn },
    },
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(JSON.parse(raw));
  } catch {
    // Unreadable or blocked storage: start fresh rather than fail to render.
  }
  return defaults();
}

let state = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable; the session still works in memory.
  }
}

export function getState(): State {
  return state;
}

export function update(fn: (s: State) => State) {
  state = fn(state);
  persist();
  listeners.forEach((l) => l());
}

export function setSettings(patch: Partial<Settings>) {
  update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState);
}

export function exportState(): string {
  return JSON.stringify(state, null, 2);
}

/** Replaces all progress with a previously exported file. Throws if it isn't one. */
export function importState(json: string) {
  const parsed = JSON.parse(json) as Partial<State>;
  if (parsed?.v !== 1 || typeof parsed.cards !== 'object') throw new Error('Not a Canto → Mando export file');
  state = merge(parsed);
  persist();
  listeners.forEach((l) => l());
}

export function resetState() {
  state = defaults();
  persist();
  listeners.forEach((l) => l());
}

/** Consecutive study days up to today (or yesterday, if today hasn't started). */
export function streak(s: State, now: number): number {
  const DAY = 86_400_000;
  let t = now;
  if (!s.log[dayKey(t)]) t -= DAY;
  let count = 0;
  while (s.log[dayKey(t)]) {
    count += 1;
    t -= DAY;
  }
  return count;
}
