export type Mode = 'say' | 'read';
export type Lang = 'm' | 'c';
export type Script = 's' | 't';

export interface Item {
  id: string;
  en: string;
  note?: string;
  sentence: boolean;
  /** True when Mandarin and Cantonese use the same written word. */
  same: boolean;
  m: { t: string; s: string; py: string[] };
  c: { t: string; s: string; jp: string[] };
}

export interface Unit {
  id: string;
  title: string;
  explain?: string;
  /** Conversation starters that get a journal box on the Roots page. */
  journal?: boolean;
  items: Item[];
}

export interface Deck {
  id: string;
  title: string;
  zh: string;
  blurb: string;
  /** The language this deck teaches: Mandarin for most, Cantonese for Roots. */
  target: Lang;
  units: Unit[];
}

export interface PatternOutcome {
  m: string;
  p: number;
  ex: string[];
}
export interface PatternRow {
  c: string;
  n: number;
  out: PatternOutcome[];
}
export interface Patterns {
  n: number;
  toneAccuracy: number;
  initialAccuracy: number;
  tones: PatternRow[];
  initials: PatternRow[];
  finals: PatternRow[];
}

export interface TonePair {
  s: string;
  t: string;
  py: string;
  jp: string;
  /** Mandarin tone, 1-4. */
  mt: string;
  /** Cantonese tone key, e.g. "4" or "6s" for a syllable ending in -p/-t/-k. */
  ck: string;
  w: string;
  en: string;
}
