import { Hanzi } from '../components/Hanzi';
import { Speaker } from '../components/Speaker';
import { decks } from '../lib/data';
import type { Scope } from '../lib/session';
import { update, useStore } from '../lib/store';
import type { Item } from '../lib/types';

const roots = decks.find((d) => d.id === 'roots');

function Question({ item }: { item: Item }) {
  const { settings, journal } = useStore();
  const entry = journal[item.id];
  const save = (patch: { text?: string; asked?: boolean }) =>
    update((s) => {
      const prev = s.journal[item.id] ?? { text: '', asked: false, at: 0 };
      return { ...s, journal: { ...s.journal, [item.id]: { ...prev, ...patch, at: Date.now() } } };
    });

  return (
    <li className={`card question ${entry?.asked ? 'asked' : ''}`}>
      <p className="question-en">{item.en}</p>
      <div className="iv-line">
        <Hanzi text={item.c[settings.script]} top={item.c.jp} topLang="c" size="md" />
        <span className="iv-audio">
          <Speaker item={item} lang="c" />
        </span>
      </div>
      <details>
        <summary className="muted small">In Mandarin</summary>
        <div className="iv-line">
          <Hanzi text={item.m[settings.script]} top={item.m.py} topLang="m" size="sm" />
          <span className="iv-audio">
            <Speaker item={item} lang="m" />
          </span>
        </div>
      </details>
      <label className="check small">
        <input type="checkbox" checked={entry?.asked ?? false} onChange={(e) => save({ asked: e.target.checked })} />
        I asked this
      </label>
      <textarea
        rows={entry?.text ? 4 : 2}
        placeholder="What did they say? Write it down while you remember."
        value={entry?.text ?? ''}
        onChange={(e) => save({ text: e.target.value })}
      />
      {entry?.text && <span className="muted small">Saved on this device · {new Date(entry.at).toLocaleDateString()}</span>}
    </li>
  );
}

export function Roots({ onStart }: { onStart: (scope: Scope) => void }) {
  const { journal } = useStore();
  if (!roots) return null;
  const starters = roots.units.filter((u) => u.journal);
  const asked = Object.values(journal).filter((j) => j.asked).length;
  const total = starters.reduce((n, u) => n + u.items.length, 0);

  return (
    <div className="page">
      <h1>
        Roots{' '}
        <span className="c-ink" lang="zh">
          尋根
        </span>
      </h1>
      <p className="muted">
        Questions to ask the people who raised you, in the language they are most at home in. Practise one, ask it on
        your next call, and keep what they tell you. Your notes stay on this device.
      </p>
      <div className="row">
        <button className="btn primary" onClick={() => onStart({ deckId: 'roots' })}>
          Study the Roots track
        </button>
        <span className="muted small">
          {asked} of {total} asked
        </span>
      </div>

      {starters.map((unit) => (
        <section key={unit.id}>
          <h2 className="section-h">{unit.title}</h2>
          <ul className="questions">
            {unit.items.map((item) => (
              <Question key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
