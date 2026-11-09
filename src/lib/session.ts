import { decks } from './data';
import { dayKey } from './srs';
import type { State } from './store';
import type { Deck, Item, Mode, Unit } from './types';

export interface Card {
  key: string;
  item: Item;
  unit: Unit;
  deck: Deck;
  mode: Mode;
}

/** Limits a session to one deck or one unit. Empty means the daily mix. */
export interface Scope {
  deckId?: string;
  unitId?: string;
}

// Each item has two cards: "say" (produce it aloud) and "read" (recognise the
// characters). Within a unit, items are introduced a few at a time: say them
// first, then read them, so the two cards for one word never sit back to back.
const CHUNK = 4;

const sequences = new Map<string, Card[]>();
function deckSequence(deck: Deck): Card[] {
  let seq = sequences.get(deck.id);
  if (seq) return seq;
  seq = [];
  for (const unit of deck.units)
    for (let i = 0; i < unit.items.length; i += CHUNK) {
      const chunk = unit.items.slice(i, i + CHUNK);
      for (const mode of ['say', 'read'] as Mode[])
        for (const item of chunk) seq.push({ key: `${item.id}:${mode}`, item, unit, deck, mode });
    }
  sequences.set(deck.id, seq);
  return seq;
}

function scopedSequences(state: State, scope: Scope): Card[][] {
  const chosen = scope.deckId
    ? decks.filter((d) => d.id === scope.deckId)
    : decks.filter((d) => state.settings.decksOn[d.id] !== false);
  return chosen.map((d) => {
    const seq = deckSequence(d);
    return scope.unitId ? seq.filter((c) => c.unit.id === scope.unitId) : seq;
  });
}

function newBudget(state: State, scope: Scope, now: number): number {
  const { newPerSession, dailyNew } = state.settings;
  // A session you start on a specific deck or unit is deliberate, so only the
  // per-session limit applies. The daily mix also respects the daily cap.
  if (scope.deckId) return newPerSession;
  const startedToday = state.log[dayKey(now)]?.n ?? 0;
  return Math.max(0, Math.min(newPerSession, dailyNew - startedToday));
}

function pick(state: State, scope: Scope, now: number) {
  const seqs = scopedSequences(state, scope);
  const due: Card[] = [];
  for (const seq of seqs)
    for (const card of seq) {
      const cs = state.cards[card.key];
      if (cs && cs.due <= now) due.push(card);
    }
  due.sort((a, b) => state.cards[a.key].due - state.cards[b.key].due);

  // Take new cards round-robin across decks so every track moves forward.
  const fresh: Card[] = [];
  const budget = newBudget(state, scope, now);
  const cursors = seqs.map(() => 0);
  let progressed = true;
  while (fresh.length < budget && progressed) {
    progressed = false;
    for (let d = 0; d < seqs.length && fresh.length < budget; d++) {
      const seq = seqs[d];
      while (cursors[d] < seq.length && state.cards[seq[cursors[d]].key]) cursors[d]++;
      if (cursors[d] < seq.length) {
        fresh.push(seq[cursors[d]++]);
        progressed = true;
      }
    }
  }
  return { due, fresh };
}

export function buildSession(state: State, scope: Scope, now: number): Card[] {
  const { due, fresh } = pick(state, scope, now);
  const reviews = due.slice(0, state.settings.maxReviews);
  const queue: Card[] = [];
  let n = 0;
  reviews.forEach((card, i) => {
    queue.push(card);
    if ((i + 1) % 3 === 0 && n < fresh.length) queue.push(fresh[n++]);
  });
  while (n < fresh.length) queue.push(fresh[n++]);
  return queue;
}

export function counts(state: State, scope: Scope, now: number) {
  const { due, fresh } = pick(state, scope, now);
  return { due: due.length, fresh: fresh.length };
}

export interface Progress {
  items: number;
  /** Items with at least one card started. */
  met: number;
  /** Items whose cards have all reached a week-plus interval. */
  solid: number;
}

export function progressOf(items: Item[], state: State): Progress {
  let met = 0;
  let solid = 0;
  for (const item of items) {
    const say = state.cards[`${item.id}:say`];
    const read = state.cards[`${item.id}:read`];
    if (say || read) met++;
    if (say?.st === 'review' && say.ivl >= 7 && read?.st === 'review' && read.ivl >= 7) solid++;
  }
  return { items: items.length, met, solid };
}

export const deckItems = (deck: Deck): Item[] => deck.units.flatMap((u) => u.items);
