import decksJson from '../data/generated/decks.json';
import patternsJson from '../data/generated/patterns.json';
import pairsJson from '../data/generated/pairs.json';
import strokesJson from '../data/generated/strokes.json';
import type { Deck, Item, Patterns, TonePair, Unit } from './types';

export const decks = decksJson as unknown as Deck[];
export const patterns = patternsJson as unknown as Patterns;
export const tonePairs = pairsJson as unknown as TonePair[];
export const strokeChars = new Set(strokesJson as string[]);

export const itemIndex = new Map<string, { item: Item; unit: Unit; deck: Deck }>();
for (const deck of decks)
  for (const unit of deck.units) for (const item of unit.items) itemIndex.set(item.id, { item, unit, deck });

export const isHan = (ch: string) => /\p{Script=Han}/u.test(ch);
