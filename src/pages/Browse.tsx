import { useState } from 'react';
import { Hanzi } from '../components/Hanzi';
import { Speaker } from '../components/Speaker';
import { decks } from '../lib/data';
import { setCurrent } from '../lib/speech';
import type { Scope } from '../lib/session';
import { useStore, type State } from '../lib/store';
import type { Deck, Item } from '../lib/types';

function status(item: Item, state: State): 'new' | 'learning' | 'solid' {
  const say = state.cards[`${item.id}:say`];
  const read = state.cards[`${item.id}:read`];
  if (!say && !read) return 'new';
  if (say?.st === 'review' && say.ivl >= 7 && read?.st === 'review' && read.ivl >= 7) return 'solid';
  return 'learning';
}

const STATUS_LABEL = { new: 'Not started', learning: 'Learning', solid: 'Solid' };

function Row({ item, deck, state }: { item: Item; deck: Deck; state: State }) {
  const script = state.settings.script;
  const st = status(item, state);
  const mandarin = (
    <div className="br-form" key="m">
      <Hanzi text={item.m[script]} top={item.m.py} topLang="m" bottom={item.same ? item.c.jp : undefined} size="sm" />
      <Speaker item={item} lang="m" />
      {item.same && <Speaker item={item} lang="c" />}
    </div>
  );
  const cantonese = item.same ? null : (
    <div className="br-form" key="c">
      <Hanzi text={item.c[script]} top={item.c.jp} topLang="c" size="sm" />
      <Speaker item={item} lang="c" />
    </div>
  );
  return (
    <li className="br-row" onMouseEnter={() => setCurrent(item)} onFocus={() => setCurrent(item)}>
      <span className={`dot dot-${st}`} title={STATUS_LABEL[st]} />
      <div className="br-forms">{deck.target === 'm' ? [mandarin, cantonese] : [cantonese, mandarin]}</div>
      <div className="br-en">
        {item.en}
        {item.note && <div className="muted small">{item.note}</div>}
      </div>
    </li>
  );
}

export function Browse({ onStart }: { onStart: (scope: Scope) => void }) {
  const state = useStore();
  const [deckId, setDeckId] = useState(decks[0].id);
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];

  return (
    <div className="page">
      <h1>Library</h1>
      <div className="chips">
        {decks.map((d) => (
          <button key={d.id} className={`chip ${d.id === deck.id ? 'on' : ''}`} onClick={() => setDeckId(d.id)}>
            {d.title}
          </button>
        ))}
      </div>
      <p className="muted">{deck.blurb}</p>
      <p className="muted small">
        <span className="rd-m">Red</span> is Mandarin pinyin. <span className="rd-c">Green</span> is Cantonese jyutping. Point
        at a row and press <kbd>M</kbd> or <kbd>C</kbd> to hear it.
      </p>

      {deck.units.map((unit) => (
        <section className="card unit" key={unit.id}>
          <div className="unit-head">
            <div>
              <h3>{unit.title}</h3>
              <span className="muted small">{unit.items.length} items</span>
            </div>
            <button className="btn" onClick={() => onStart({ deckId: deck.id, unitId: unit.id })}>
              Study this unit
            </button>
          </div>
          {unit.explain && <p className="note">{unit.explain}</p>}
          <ul className="br-list">
            {unit.items.map((item) => (
              <Row key={item.id} item={item} deck={deck} state={state} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
