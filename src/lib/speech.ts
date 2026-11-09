import { useEffect, useState } from 'react';
import { getState } from './store';
import type { Item, Lang } from './types';

// Audio uses the speech voices built into the operating system (on macOS:
// Tingting for Mandarin, Sinji for Cantonese). No network, keys, or cost.

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const matches: Record<Lang, (v: SpeechSynthesisVoice) => boolean> = {
  m: (v) => /^(zh[-_]CN|cmn)/i.test(v.lang),
  c: (v) => /^(zh[-_]HK|yue)/i.test(v.lang),
};

export function voicesFor(lang: Lang): SpeechSynthesisVoice[] {
  if (!supported) return [];
  return window.speechSynthesis.getVoices().filter(matches[lang]);
}

export function speak(text: string, lang: Lang) {
  if (!supported || !text) return;
  const { settings } = getState();
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'm' ? 'zh-CN' : 'zh-HK';
  const voices = voicesFor(lang);
  const wanted = lang === 'm' ? settings.voiceM : settings.voiceC;
  // Prefer the chosen voice, then an on-device one so audio works offline.
  const voice = voices.find((v) => v.voiceURI === wanted) ?? voices.find((v) => v.localService) ?? voices[0];
  if (voice) utterance.voice = voice;
  utterance.rate = settings.rate;
  synth.speak(utterance);
}

/** Speaks an item in one language. Mandarin reads Simplified, Cantonese Traditional. */
export function speakItem(item: Item, lang: Lang) {
  speak(lang === 'm' ? item.m.s : item.c.t, lang);
}

/** Voices load asynchronously; this re-renders once they arrive. */
export function useVoices(): { m: SpeechSynthesisVoice[]; c: SpeechSynthesisVoice[] } {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!supported) return;
    const onChange = () => setTick((t) => t + 1);
    window.speechSynthesis.addEventListener('voiceschanged', onChange);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', onChange);
  }, []);
  return { m: voicesFor('m'), c: voicesFor('c') };
}
