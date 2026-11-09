import HanziWriter, { type CharDataLoaderFn } from 'hanzi-writer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Speaker } from '../components/Speaker';
import { decks, isHan, strokeChars } from '../lib/data';
import { setCurrent } from '../lib/speech';
import { update, useStore } from '../lib/store';
import type { Item } from '../lib/types';

const SIZE = 280;

// Stroke data is copied into public/hanzi by the data build, so this works offline.
const loadStrokes: CharDataLoaderFn = (char, onLoad, onError) => {
  fetch(`${import.meta.env.BASE_URL}hanzi/${encodeURIComponent(char)}.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`No stroke data for ${char}`))))
    .then(onLoad)
    .catch(onError);
};

const cssColor = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function Writer({ char, onComplete }: { char: string; onComplete: (mistakes: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const done = useRef(onComplete);
  done.current = onComplete;
  const [outline, setOutline] = useState(true);
  const [result, setResult] = useState<number | null>(null);

  const startQuiz = () => {
    setResult(null);
    writer.current?.quiz({
      onComplete: ({ totalMistakes }) => {
        setResult(totalMistakes);
        done.current(totalMistakes);
      },
    });
  };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = '';
    setResult(null);
    setOutline(true);
    writer.current = HanziWriter.create(el, char, {
      width: SIZE,
      height: SIZE,
      padding: 14,
      showOutline: true,
      showCharacter: false,
      strokeColor: cssColor('--ink'),
      outlineColor: cssColor('--line'),
      drawingColor: cssColor('--m'),
      highlightColor: cssColor('--c'),
      drawingWidth: 18,
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 120,
      showHintAfterMisses: 2,
      charDataLoader: loadStrokes,
    });
    startQuiz();
    return () => {
      el.innerHTML = '';
      writer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char]);

  return (
    <div className="writer">
      <div className="writer-grid" style={{ width: SIZE, height: SIZE }}>
        <div ref={host} />
      </div>
      <div className="row">
        <button
          className="btn"
          onClick={() => {
            const w = writer.current;
            if (!w) return;
            w.cancelQuiz();
            w.hideCharacter();
            w.animateCharacter({ onComplete: () => setTimeout(startQuiz, 600) });
          }}
        >
          Show me
        </button>
        <button className="btn" onClick={startQuiz}>
          Start over
        </button>
        <button
          className="btn"
          onClick={() => {
            if (outline) writer.current?.hideOutline();
            else writer.current?.showOutline();
            setOutline(!outline);
          }}
        >
          {outline ? 'Hide guide' : 'Show guide'}
        </button>
      </div>
      <p className="muted small">
        {result === null
          ? 'Draw each stroke in order with your mouse, trackpad or finger.'
          : result === 0
            ? 'Perfect, no mistakes. Try it again without the guide.'
            : `Done, with ${result} missed stroke${result === 1 ? '' : 's'}. Try again?`}
      </p>
    </div>
  );
}

export function Write() {
  const { settings, written } = useStore();
  const [deckId, setDeckId] = useState('core');
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  const [unitId, setUnitId] = useState(deck.units[0].id);
  const unit = deck.units.find((u) => u.id === unitId) ?? deck.units[0];

  // Every character in this unit that has stroke data, with the first word it appears in.
  const entries = useMemo(() => {
    const seen = new Map<string, Item>();
    for (const item of unit.items) {
      const text = (deck.target === 'm' ? item.m : item.c)[settings.script];
      for (const ch of Array.from(text)) if (isHan(ch) && strokeChars.has(ch) && !seen.has(ch)) seen.set(ch, item);
    }
    return [...seen.entries()];
  }, [unit, deck, settings.script]);

  const [char, setChar] = useState<string | null>(null);
  const current = entries.find(([ch]) => ch === char) ?? entries[0];
  const currentItem = current?.[1];
  useEffect(() => setCurrent(currentItem ?? null), [currentItem]);

  return (
    <div className="page">
      <h1>Writing</h1>
      <p className="muted">
        Writing a character by hand is the fastest way to make it stick. Pick a unit, then trace each character stroke
        by stroke.
      </p>
      <div className="row">
        <select
          value={deck.id}
          onChange={(e) => {
            const next = decks.find((d) => d.id === e.target.value) ?? decks[0];
            setDeckId(next.id);
            setUnitId(next.units[0].id);
            setChar(null);
          }}
        >
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
        <select
          value={unit.id}
          onChange={(e) => {
            setUnitId(e.target.value);
            setChar(null);
          }}
        >
          {deck.units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.title}
            </option>
          ))}
        </select>
      </div>

      <div className="char-grid">
        {entries.map(([ch]) => (
          <button
            key={ch}
            lang="zh"
            className={`char-btn ${current?.[0] === ch ? 'on' : ''} ${written[ch] ? 'written' : ''}`}
            onClick={() => setChar(ch)}
            title={written[ch] ? `Written ${written[ch]} time${written[ch] === 1 ? '' : 's'}` : 'Not written yet'}
          >
            {ch}
          </button>
        ))}
      </div>

      {current && (
        <section className="card write-panel">
          <Writer
            key={current[0]}
            char={current[0]}
            onComplete={() => update((s) => ({ ...s, written: { ...s.written, [current[0]]: (s.written[current[0]] ?? 0) + 1 } }))}
          />
          <div className="write-info">
            <div className="muted small">Appears in</div>
            <div className="write-word" lang="zh">
              {(deck.target === 'm' ? current[1].m : current[1].c)[settings.script]}
            </div>
            <div>
              <span className="rd-m">{current[1].m.py.filter(Boolean).join(' ')}</span>
            </div>
            <div>
              <span className="rd-c">{current[1].c.jp.filter(Boolean).join(' ')}</span>
            </div>
            <p>{current[1].en}</p>
            <div className="row">
              <Speaker item={current[1]} lang="m" />
              <Speaker item={current[1]} lang="c" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
