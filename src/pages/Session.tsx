import { useCallback, useEffect, useRef, useState } from 'react';
import { Hanzi } from '../components/Hanzi';
import { ItemView } from '../components/ItemView';
import { Speaker } from '../components/Speaker';
import { buildSession, counts, type Card, type Scope } from '../lib/session';
import { setCurrent, speakItem } from '../lib/speech';
import { dayKey, previewLabel, schedule, type Grade } from '../lib/srs';
import { getState, update, useStore } from '../lib/store';

const GRADES: { grade: Grade; label: string; cls: string }[] = [
  { grade: 1, label: 'Again', cls: 'g-again' },
  { grade: 2, label: 'Hard', cls: 'g-hard' },
  { grade: 3, label: 'Good', cls: 'g-good' },
  { grade: 4, label: 'Easy', cls: 'g-easy' },
];

function taskLabel(card: Card): string {
  const lang = card.deck.target === 'm' ? 'Mandarin' : 'Cantonese';
  return card.mode === 'say' ? `Say it in ${lang}` : `Read it aloud in ${lang}`;
}

function Prompt({ card }: { card: Card }) {
  const { settings } = useStore();
  const { item, deck, mode } = card;

  if (mode === 'read') {
    const form = deck.target === 'm' ? item.m : item.c;
    return (
      <div className="prompt">
        <Hanzi text={form[settings.script]} size={item.sentence ? 'lg' : 'xl'} />
        <p className="hint">What does it say, and what does it mean?</p>
      </div>
    );
  }

  if (deck.target === 'm') {
    // You know this in Cantonese. Predict how it sounds in Mandarin.
    return (
      <div className="prompt">
        <p className="prompt-en">{item.en}</p>
        <div className="iv-label lbl-c">You say it in Cantonese</div>
        <div className="iv-line">
          <Hanzi text={item.c[settings.script]} top={item.c.jp} topLang="c" size={item.sentence ? 'md' : 'lg'} />
          <span className="iv-audio">
            <Speaker item={item} lang="c" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="prompt">
      <p className="prompt-en">{item.en}</p>
      <p className="hint">How would you say this to your family?</p>
    </div>
  );
}

export function Session({ scope, onExit }: { scope: Scope; onExit: () => void }) {
  const { settings, cards } = useStore();
  const [queue, setQueue] = useState<Card[]>(() => buildSession(getState(), scope, Date.now()));
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(0);
  const [started, setStarted] = useState(0);
  const startedAt = useRef(Date.now());
  const card = queue[0];

  // Play the Cantonese cue on the prompt, and the answer when it is revealed.
  useEffect(() => {
    setCurrent(card?.item ?? null);
    if (!card || !settings.autoplay) return;
    if (revealed) speakItem(card.item, card.deck.target);
    else if (card.mode === 'say' && card.deck.target === 'm') speakItem(card.item, 'c');
  }, [card, revealed, settings.autoplay]);

  const grade = useCallback(
    (g: Grade) => {
      if (!card) return;
      const now = Date.now();
      const prev = getState().cards[card.key];
      const next = schedule(prev, g, now);
      update((s) => {
        const key = dayKey(now);
        const day = s.log[key] ?? { r: 0, n: 0 };
        return {
          ...s,
          cards: { ...s.cards, [card.key]: next },
          log: { ...s.log, [key]: { r: day.r + 1, n: day.n + (prev ? 0 : 1) } },
        };
      });
      let rest = queue.slice(1);
      if (next.st === 'learn') {
        // Still being learned: bring it back later in this session.
        const at = Math.min(g === 1 ? 2 : 5, rest.length);
        rest = [...rest.slice(0, at), card, ...rest.slice(at)];
      }
      setQueue(rest);
      setRevealed(false);
      setAnswered((n) => n + 1);
      if (!prev) setStarted((n) => n + 1);
    },
    [card, queue],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') return onExit();
      if (!card) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        return setRevealed(true);
      }
      if (revealed && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key) as Grade);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, revealed, grade, onExit]);

  if (!card) {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60_000));
    const more = counts(getState(), scope, Date.now());
    const hasMore = more.due + more.fresh > 0;
    return (
      <div className="session">
        <div className="card done">
          {answered === 0 ? (
            <>
              <h2>Nothing to study here right now</h2>
              <p className="muted">Everything in this set is scheduled for later. Come back on your next break.</p>
            </>
          ) : (
            <>
              <h2>Session done</h2>
              <p className="muted">
                {answered} answers in about {minutes} min{started > 0 ? `, ${started} new cards started` : ''}.
              </p>
            </>
          )}
          <div className="row center">
            {hasMore && (
              <button
                className="btn primary"
                onClick={() => {
                  startedAt.current = Date.now();
                  setAnswered(0);
                  setStarted(0);
                  setQueue(buildSession(getState(), scope, Date.now()));
                }}
              >
                Another round ({more.due + more.fresh})
              </button>
            )}
            <button className="btn" onClick={onExit}>
              Back to today
            </button>
          </div>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const prev = cards[card.key];
  const total = answered + queue.length;
  const note = card.item.note ?? (card.deck.id === 'grammar' ? card.unit.explain : undefined);

  return (
    <div className="session">
      <div className="session-top">
        <button className="btn ghost" onClick={onExit} title="End session (Esc)">
          End
        </button>
        <div className="bar" aria-label={`${answered} of ${total} done`}>
          <div className="bar-fill" style={{ width: `${(answered / total) * 100}%` }} />
        </div>
        <span className="muted small">{queue.length} left</span>
      </div>

      <div className="card study">
        <div className="study-meta">
          <span className="pill">{taskLabel(card)}</span>
          {!prev && <span className="pill new">New</span>}
          <span className="muted small">
            {card.deck.title} · {card.unit.title}
          </span>
        </div>

        {!revealed ? (
          <>
            <Prompt card={card} />
            <button className="btn primary wide" onClick={() => setRevealed(true)}>
              Show answer <kbd>space</kbd>
            </button>
          </>
        ) : (
          <>
            <div className="answer">
              <ItemView item={card.item} script={settings.script} primary={card.deck.target} size={card.item.sentence ? 'md' : 'lg'} />
              <p className="answer-en">{card.item.en}</p>
              {note && <p className="note">{note}</p>}
            </div>
            <div className="grades">
              {GRADES.map(({ grade: g, label, cls }) => (
                <button key={g} className={`btn grade ${cls}`} onClick={() => grade(g)}>
                  <span>{label}</span>
                  <span className="small">{previewLabel(prev, g, now)}</span>
                  <kbd>{g}</kbd>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="muted small center-text">
        Say your answer out loud before you flip. <kbd>M</kbd> Mandarin audio · <kbd>C</kbd> Cantonese audio
      </p>
    </div>
  );
}
