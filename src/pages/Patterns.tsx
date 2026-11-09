import { useCallback, useEffect, useState } from 'react';
import { patterns, tonePairs } from '../lib/data';
import { speak } from '../lib/speech';
import { update, useStore } from '../lib/store';
import type { PatternRow, TonePair } from '../lib/types';

const CANTO_TONE: Record<string, string> = {
  '1': 'Tone 1 · high',
  '2': 'Tone 2 · rising',
  '3': 'Tone 3 · mid',
  '4': 'Tone 4 · low falling',
  '5': 'Tone 5 · low rising',
  '6': 'Tone 6 · low',
  '1s': 'Tone 1, short (-p -t -k)',
  '3s': 'Tone 3, short (-p -t -k)',
  '6s': 'Tone 6, short (-p -t -k)',
};
const MANDO_TONE: Record<string, string> = {
  '1': '1 flat ā',
  '2': '2 rising á',
  '3': '3 dipping ǎ',
  '4': '4 falling à',
};
const pct = (p: number) => `${Math.round(p * 100)}%`;

function Table({
  rows,
  left,
  right,
}: {
  rows: PatternRow[];
  left: (key: string) => string;
  right: (key: string) => string;
}) {
  return (
    <div className="pt">
      {rows.map((row) => (
        <div className="pt-row" key={row.c}>
          <div className="pt-from rd-c">{left(row.c)}</div>
          <div className="pt-outs">
            {row.out
              .filter((o) => o.p >= 0.05)
              .map((o, i) => (
                <div className={`pt-out ${i === 0 ? 'top' : ''}`} key={o.m}>
                  <div className="pt-meter">
                    <div className="pt-fill" style={{ width: pct(o.p) }} />
                  </div>
                  <span className="pt-to rd-m">{right(o.m)}</span>
                  <span className="pt-p">{pct(o.p)}</span>
                  <span className="pt-ex" lang="zh">
                    {o.ex.slice(0, 4).join(' ')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const randomPair = (not?: TonePair): TonePair => {
  let next = tonePairs[Math.floor(Math.random() * tonePairs.length)];
  while (tonePairs.length > 1 && next === not) next = tonePairs[Math.floor(Math.random() * tonePairs.length)];
  return next;
};

function ToneGame() {
  const { settings, toneBest } = useStore();
  const [pair, setPair] = useState<TonePair>(() => randomPair());
  const [picked, setPicked] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const rule = patterns.tones.find((r) => r.c === pair.ck);
  const usual = rule?.out[0];

  const pick = useCallback(
    (tone: string) => {
      if (picked) return;
      setPicked(tone);
      speak(pair.s, 'm');
      if (tone === pair.mt) {
        const next = run + 1;
        setRun(next);
        if (next > toneBest) update((s) => ({ ...s, toneBest: next }));
      } else setRun(0);
    },
    [picked, pair, run, toneBest],
  );
  const advance = useCallback(() => {
    setPicked(null);
    setPair((p) => randomPair(p));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!picked && ['1', '2', '3', '4'].includes(e.key)) pick(e.key);
      else if (picked && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picked, pick, advance]);

  return (
    <section className="card game">
      <div className="unit-head">
        <h3>Guess the Mandarin tone</h3>
        <span className="muted small">
          Run {run} · Best {toneBest}
        </span>
      </div>
      <div className="game-body">
        <button className="game-char" lang="zh" onClick={() => speak(pair.t, 'c')} title="Play Cantonese">
          {settings.script === 's' ? pair.s : pair.t}
        </button>
        <div>
          <div className="rd-c game-jp">{pair.jp}</div>
          <div className="muted small">
            from <span lang="zh">{pair.w}</span> · {pair.en}
          </div>
          <div className="muted small">{CANTO_TONE[pair.ck]} in Cantonese. Which tone in Mandarin?</div>
        </div>
      </div>
      <div className="grades">
        {['1', '2', '3', '4'].map((t) => {
          const state = !picked ? '' : t === pair.mt ? 'right' : t === picked ? 'wrong' : 'dim';
          return (
            <button key={t} className={`btn grade ${state}`} onClick={() => pick(t)} disabled={!!picked}>
              <span>{MANDO_TONE[t]}</span>
              <kbd>{t}</kbd>
            </button>
          );
        })}
      </div>
      {picked && usual && (
        <div className="game-result">
          <p>
            <strong className="rd-m">{pair.py}</strong> {picked === pair.mt ? 'Correct.' : 'Not this time.'}{' '}
            {CANTO_TONE[pair.ck].split(' ·')[0]} becomes Mandarin tone {usual.m} in {pct(usual.p)} of common
            characters{usual.m === pair.mt ? '.' : ', and this one is an exception.'}
          </p>
          <button className="btn primary" onClick={advance}>
            Next <kbd>enter</kbd>
          </button>
        </div>
      )}
    </section>
  );
}

export function Patterns() {
  const [showFinals, setShowFinals] = useState(false);
  return (
    <div className="page">
      <h1>Sound shifts</h1>
      <p className="muted">
        Measured over {patterns.n.toLocaleString()} common characters. If you know how a character sounds in Cantonese,
        the best-guess rule below gives the right Mandarin tone {pct(patterns.toneAccuracy)} of the time.
      </p>

      <ToneGame />

      <section className="card">
        <h3>Tones</h3>
        <p className="muted small">
          Four rules cover most characters: 1 stays 1, 4 becomes 2, 2 and 5 become 3, and 3 and 6 become 4. Short
          syllables ending in -p, -t or -k are the ones you have to learn one by one.
        </p>
        <Table rows={patterns.tones} left={(k) => CANTO_TONE[k] ?? k} right={(k) => `tone ${MANDO_TONE[k] ?? k}`} />
      </section>

      <section className="card">
        <h3>First sounds</h3>
        <p className="muted small">
          Cantonese initial on the left, the Mandarin initials it turns into on the right. ∅ means the syllable starts
          with a vowel.
        </p>
        <Table rows={patterns.initials} left={(k) => `${k}-`} right={(k) => `${k}-`} />
      </section>

      <section className="card">
        <div className="unit-head">
          <h3>Endings</h3>
          <button className="btn" onClick={() => setShowFinals((v) => !v)}>
            {showFinals ? 'Hide' : `Show ${patterns.finals.length} endings`}
          </button>
        </div>
        <p className="muted small">
          Mandarin has no -m, -p, -t or -k endings: -m becomes -n, and the short stops drop off entirely.
        </p>
        {showFinals && <Table rows={patterns.finals} left={(k) => `-${k}`} right={(k) => `-${k}`} />}
      </section>
    </div>
  );
}
