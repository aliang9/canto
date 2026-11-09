// A small spaced-repetition scheduler in the SM-2 family.
// New cards pass through two short learning steps, then graduate to
// day-scale intervals that grow by an "ease" factor on each success.

export interface CardState {
  st: 'learn' | 'review';
  step: number;
  /** When the card is next due, in epoch milliseconds. */
  due: number;
  /** Current interval in days (0 while learning for the first time). */
  ivl: number;
  ease: number;
  reps: number;
  lapses: number;
}

/** 1 = Again, 2 = Hard, 3 = Good, 4 = Easy */
export type Grade = 1 | 2 | 3 | 4;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** The study day rolls over at 4am, so late-night sessions count as "today". */
const ROLLOVER = 4 * HOUR;

export function dayKey(ts: number): string {
  const d = new Date(ts - ROLLOVER);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfStudyDay(ts: number): number {
  const d = new Date(ts - ROLLOVER);
  d.setHours(0, 0, 0, 0);
  return d.getTime() + ROLLOVER;
}

/** Day-scale cards come due at the start of the study day, not at an exact time. */
function dueInDays(now: number, days: number): number {
  return startOfStudyDay(now) + days * DAY;
}

export function schedule(prev: CardState | undefined, grade: Grade, now: number): CardState {
  const c: CardState = prev ?? { st: 'learn', step: 0, due: now, ivl: 0, ease: 2.5, reps: 0, lapses: 0 };
  const next: CardState = { ...c, reps: c.reps + 1 };

  if (c.st === 'learn') {
    if (grade === 1) {
      next.step = 0;
      next.due = now + MINUTE;
    } else if (grade === 2) {
      next.due = now + 5 * MINUTE;
    } else if (grade === 3 && c.step < 1) {
      next.step = 1;
      next.due = now + 10 * MINUTE;
    } else {
      // Graduate. A relearned card keeps its (already reduced) interval.
      const base = grade === 4 ? 4 : 1;
      next.st = 'review';
      next.ivl = Math.max(base, Math.round(c.ivl));
      next.due = dueInDays(now, next.ivl);
    }
    return next;
  }

  if (grade === 1) {
    next.st = 'learn';
    next.step = 1;
    next.lapses = c.lapses + 1;
    next.ease = Math.max(1.3, c.ease - 0.2);
    next.ivl = Math.max(1, Math.round(c.ivl * 0.25));
    next.due = now + MINUTE;
    return next;
  }
  if (grade === 2) {
    next.ease = Math.max(1.3, c.ease - 0.15);
    next.ivl = Math.max(c.ivl + 1, Math.round(c.ivl * 1.2));
  } else if (grade === 3) {
    next.ivl = Math.max(c.ivl + 1, Math.round(c.ivl * c.ease));
  } else {
    next.ease = c.ease + 0.15;
    next.ivl = Math.max(c.ivl + 2, Math.round(c.ivl * next.ease * 1.3));
  }
  next.due = dueInDays(now, next.ivl);
  return next;
}

/** Short label for when a card would next appear, e.g. "10m" or "4d". */
export function previewLabel(prev: CardState | undefined, grade: Grade, now: number): string {
  const next = schedule(prev, grade, now);
  if (next.st === 'learn') return `${Math.max(1, Math.round((next.due - now) / MINUTE))}m`;
  if (next.ivl >= 365) return `${(next.ivl / 365).toFixed(1)}y`;
  if (next.ivl >= 60) return `${Math.round(next.ivl / 30)}mo`;
  return `${next.ivl}d`;
}
