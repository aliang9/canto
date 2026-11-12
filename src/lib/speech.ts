import { useEffect, useState } from 'react';
import { getState } from './store';
import type { Item, Lang } from './types';

// Audio uses the speech voices the browser offers: the ones built into the
// operating system, plus Chrome's online Google voices. No keys or cost.
//
// Not every listed voice actually works. On some Macs a voice (Tingting, for
// one) reports that it spoke but produces no sound, so every clip is timed and
// a voice that "finishes" impossibly fast is skipped from then on.

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

// In the desktop app, the shell speaks through the operating system directly
// (see electron/main.cjs), which is more reliable than the browser's engine.
interface NativeVoice {
  name: string;
  taiwan: boolean;
}
interface NativeBridge {
  voices(): Promise<Record<Lang, NativeVoice[]>>;
  speak(request: { text: string; lang: Lang; voice: string; rate: number }): Promise<boolean>;
  stop(): Promise<void>;
}
declare global {
  interface Window {
    cantoNative?: NativeBridge;
  }
}
const native = typeof window !== 'undefined' ? window.cantoNative : undefined;
let nativeVoices: Record<Lang, NativeVoice[]> = { m: [], c: [] };

const isTaiwan = (v: SpeechSynthesisVoice) => /^zh[-_]TW/i.test(v.lang);
const matches: Record<Lang, (v: SpeechSynthesisVoice) => boolean> = {
  // Taiwan Mandarin voices are a last resort: natural, but a different accent.
  m: (v) => /^(zh[-_]CN|cmn)/i.test(v.lang) || isTaiwan(v),
  c: (v) => /^(zh[-_]HK|yue)/i.test(v.lang),
};

// macOS lists a set of robotic novelty voices for every language, and they
// sort first alphabetically. They are a fallback, never the first choice.
const NOVELTY = ['Shelley', 'Flo', 'Sandy', 'Reed', 'Eddy', 'Rocko', 'Grandma', 'Grandpa'];
const noveltyRank = (v: SpeechSynthesisVoice) => NOVELTY.findIndex((n) => v.name.startsWith(n));
const FAVOURITE: Record<Lang, RegExp> = { m: /^Tingting/i, c: /^Sinji/i };

function score(v: SpeechSynthesisVoice, lang: Lang): number {
  const novelty = noveltyRank(v);
  let s = 0;
  if (!isTaiwan(v)) s += 100;
  if (novelty < 0) s += 40;
  else s -= novelty * 0.1;
  if (v.localService) s += 10; // works offline
  if (/premium/i.test(v.name)) s += 4;
  else if (/enhanced/i.test(v.name)) s += 2;
  if (FAVOURITE[lang].test(v.name)) s += 1;
  return s;
}

// ---- voices that turned out to be silent ------------------------------------

const SILENT_KEY = 'canto-mando:silent-voices';
const DAY = 86_400_000;
/** voiceURI -> time after which the voice gets another chance. */
let silent: Record<string, number> = {};
try {
  silent = JSON.parse(localStorage.getItem(SILENT_KEY) ?? '{}');
} catch {
  // No stored flags; every voice starts out trusted.
}
const voiceListeners = new Set<() => void>();

native
  ?.voices()
  .then((found) => {
    nativeVoices = found;
    voiceListeners.forEach((l) => l());
  })
  .catch(() => {
    // No system voices: fall back to the browser's speech engine.
  });

function saveSilent() {
  try {
    localStorage.setItem(SILENT_KEY, JSON.stringify(silent));
  } catch {
    // Flags then last only for this page load.
  }
  voiceListeners.forEach((l) => l());
}

const isSilent = (v: SpeechSynthesisVoice) => (silent[v.voiceURI] ?? 0) > Date.now();

function markSilent(v: SpeechSynthesisVoice) {
  // An online voice may just be offline for now, so it is retried sooner.
  silent[v.voiceURI] = Date.now() + (v.localService ? 7 * DAY : 5 * 60_000);
  saveSilent();
}

/** Gives every voice another chance, e.g. after installing a new one. */
export function recheckVoices() {
  silent = {};
  saveSilent();
}

/** Voices for a language, best first. Includes ones currently marked silent. */
export function voicesFor(lang: Lang): SpeechSynthesisVoice[] {
  if (!supported) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => matches[lang](v) && !(isTaiwan(v) && noveltyRank(v) >= 0))
    .sort((a, b) => score(b, lang) - score(a, lang));
}

/** The voice that will be used: the one chosen in Settings if it works, else the best working one. */
export function activeVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const { settings } = getState();
  const wanted = lang === 'm' ? settings.voiceM : settings.voiceC;
  const working = voicesFor(lang).filter((v) => !isSilent(v));
  return working.find((v) => v.voiceURI === wanted) ?? working[0];
}

// ---- speaking ----------------------------------------------------------------

/** The shortest a real clip can be. Anything faster means the voice made no sound. */
function shortestPlausible(text: string): number {
  const han = Array.from(text).filter((ch) => /\p{Script=Han}/u.test(ch)).length;
  return han === 0 ? 0 : 150 + 120 * Math.min(han, 3);
}

// Chrome can garbage-collect an utterance mid-sentence unless something holds it.
let live: SpeechSynthesisUtterance | null = null;
let watchdog: number | undefined;
let request: { text: string; lang: Lang } | null = null;

export function speak(text: string, lang: Lang) {
  if ((!supported && !native) || !text) return;
  // Several requests in one tick (a key press landing with an autoplay, or
  // React re-running an effect) collapse into the last one, so the engine is
  // never asked to cancel a clip it has not started yet.
  const scheduled = request !== null;
  request = { text, lang };
  if (scheduled) return;
  queueMicrotask(() => {
    const next = request;
    request = null;
    if (!next) return;
    const system = nativeVoices[next.lang];
    if (native && system.length > 0) {
      const { settings } = getState();
      const wanted = next.lang === 'm' ? settings.voiceM : settings.voiceC;
      const voice = system.find((v) => v.name === wanted) ?? system[0];
      void native.speak({ text: next.text, lang: next.lang, voice: voice.name, rate: settings.rate });
    } else speakNow(next.text, next.lang, false);
  });
}

function speakNow(text: string, lang: Lang, retried: boolean) {
  const synth = window.speechSynthesis;
  const voice = activeVoice(lang);
  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? (lang === 'm' ? 'zh-CN' : 'zh-HK');
  utterance.rate = getState().settings.rate;
  live = utterance;

  let startedAt = 0;
  // This voice failed: remember that, and say the clip with the next best one.
  const useNextVoice = () => {
    if (!voice) return;
    markSilent(voice);
    if (live === utterance) speakNow(text, lang, false);
  };
  utterance.onstart = () => (startedAt = performance.now());
  utterance.onend = () => {
    if (startedAt && performance.now() - startedAt < shortestPlausible(text)) useNextVoice();
  };
  utterance.onerror = (e) => {
    // Being cut off by a newer clip, or blocked until the first click, is not the voice's fault.
    if (!['interrupted', 'canceled', 'not-allowed'].includes(e.error)) useNextVoice();
  };

  if (synth.paused) synth.resume(); // Chrome can leave the engine paused after a tab switch.
  // Interrupt whatever is playing. In Chrome the new clip must be queued in
  // the same tick as the cancel: measured here, one queued 80ms later is
  // silently dropped.
  if (synth.speaking || synth.pending) synth.cancel();
  synth.speak(utterance);

  // A clip that never starts was either swallowed by the browser after a
  // cancel (say it once more) or belongs to a voice that is not responding.
  // Online voices need longer to start than on-device ones.
  window.clearTimeout(watchdog);
  watchdog = window.setTimeout(
    () => {
      if (startedAt || live !== utterance) return;
      if (!retried && voice?.localService !== false) speakNow(text, lang, true);
      else useNextVoice();
    },
    voice?.localService === false ? 3000 : 400,
  );
}

/** Anything that can be read aloud in both languages. */
export interface Speakable {
  m: string;
  c: string;
}

/** Mandarin reads the Simplified text, Cantonese the Traditional. */
export const speakable = (item: Item): Speakable => ({ m: item.m.s, c: item.c.t });

// The M and C keys replay "the current item" on every page: the card being
// studied, or otherwise whatever was last played or pointed at.
let current: Speakable | null = null;

export function setCurrent(target: Speakable | Item | null) {
  current = target && 'id' in target ? speakable(target) : target;
}

export function speakItem(item: Item, lang: Lang) {
  setCurrent(item);
  speak(speakable(item)[lang], lang);
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** Mount once: M plays the current item in Mandarin, C in Cantonese. */
export function useAudioKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || !current) return;
      // Match the physical key so Shift, Caps Lock and other layouts all work.
      const lang: Lang | null = e.code === 'KeyM' ? 'm' : e.code === 'KeyC' ? 'c' : null;
      if (!lang) return;
      e.preventDefault();
      speak(current[lang], lang);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** A voice as the Settings page shows it, whichever engine provides it. */
export interface VoiceInfo {
  id: string;
  name: string;
  /** Installed, but produced no sound when tried. */
  silent: boolean;
  taiwan: boolean;
  /** Needs an internet connection. */
  online: boolean;
}

export interface VoiceChoice {
  all: VoiceInfo[];
  active?: VoiceInfo;
}

function voiceChoice(lang: Lang): VoiceChoice {
  const { settings } = getState();
  const wanted = lang === 'm' ? settings.voiceM : settings.voiceC;
  const system = nativeVoices[lang];
  if (native && system.length > 0) {
    const all = system.map((v) => ({
      id: v.name,
      // "Tingting (Chinese (China mainland))" -> "Tingting"
      name: v.name.replace(/\s*\(Chinese.*$/, ''),
      silent: false,
      taiwan: v.taiwan,
      online: false,
    }));
    return { all, active: all.find((v) => v.id === wanted) ?? all[0] };
  }
  const describe = (v: SpeechSynthesisVoice): VoiceInfo => ({
    id: v.voiceURI,
    name: v.name,
    silent: isSilent(v),
    taiwan: isTaiwan(v),
    online: !v.localService,
  });
  const active = activeVoice(lang);
  return { all: voicesFor(lang).map(describe), active: active && describe(active) };
}

/** Voice lists per language. Re-renders when voices load or one is found to be silent. */
export function useVoices(): Record<Lang, VoiceChoice> {
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    voiceListeners.add(onChange);
    if (supported) window.speechSynthesis.addEventListener('voiceschanged', onChange);
    return () => {
      voiceListeners.delete(onChange);
      if (supported) window.speechSynthesis.removeEventListener('voiceschanged', onChange);
    };
  }, []);
  return { m: voiceChoice('m'), c: voiceChoice('c') };
}
