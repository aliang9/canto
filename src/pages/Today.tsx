import { decks } from '../lib/data';
import { counts, deckItems, progressOf, type Scope } from '../lib/session';
import { dayKey } from '../lib/srs';
import { setSettings, streak, useStore } from '../lib/store';

export function Today({ onStart }: { onStart: (scope: Scope) => void }) {
  const state = useStore();
  const now = Date.now();
  const mix = counts(state, {}, now);
  const total = mix.due + mix.fresh;
  const today = state.log[dayKey(now)];
  const all = progressOf(decks.flatMap(deckItems), state);
  const days = streak(state, now);

  return (
    <div className="page">
      <section className="card hero">
        <div>
          <h1>
            <span lang="zh" className="c-ink">
              粵
            </span>{' '}
            →{' '}
            <span lang="zh" className="m-ink">
              普
            </span>
          </h1>
          <p className="muted">
            {total === 0
              ? 'You are caught up. New cards unlock tomorrow, or study any track below.'
              : `${mix.due} to review and ${mix.fresh} new. About ${Math.max(2, Math.round(total * 0.3))} minutes.`}
          </p>
        </div>
        <button className="btn primary big" disabled={total === 0} onClick={() => onStart({})}>
          {total === 0 ? 'All done' : 'Start session'}
        </button>
      </section>

      <section className="stats">
        <div className="stat">
          <div className="stat-n">{days}</div>
          <div className="stat-l">day streak</div>
        </div>
        <div className="stat">
          <div className="stat-n">{today?.r ?? 0}</div>
          <div className="stat-l">answers today</div>
        </div>
        <div className="stat">
          <div className="stat-n">{all.met}</div>
          <div className="stat-l">words met</div>
        </div>
        <div className="stat">
          <div className="stat-n">{all.solid}</div>
          <div className="stat-l">words solid</div>
        </div>
      </section>

      <h2 className="section-h">Tracks</h2>
      <p className="muted small">
        Ticked tracks feed the daily session. Use Study to focus on one track, for example before a meeting or a call
        home.
      </p>
      <section className="tracks">
        {decks.map((deck) => {
          const p = progressOf(deckItems(deck), state);
          const c = counts(state, { deckId: deck.id }, now);
          const on = state.settings.decksOn[deck.id] !== false;
          return (
            <div className="card track" key={deck.id}>
              <div className="track-head">
                <span className={`track-zh ${deck.target === 'c' ? 'c-ink' : 'm-ink'}`} lang="zh">
                  {deck.zh}
                </span>
                <div className="track-title">
                  <h3>{deck.title}</h3>
                  <span className="muted small">
                    {p.met} of {p.items} met · {p.solid} solid
                  </span>
                </div>
                <button className="btn" disabled={c.due + c.fresh === 0} onClick={() => onStart({ deckId: deck.id })}>
                  Study
                </button>
              </div>
              <p className="muted small">{deck.blurb}</p>
              <div className="bar">
                <div className="bar-fill soft" style={{ width: `${(p.met / p.items) * 100}%` }} />
                <div className="bar-fill over" style={{ width: `${(p.solid / p.items) * 100}%` }} />
              </div>
              <label className="check small">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => setSettings({ decksOn: { ...state.settings.decksOn, [deck.id]: e.target.checked } })}
                />
                In the daily session
              </label>
            </div>
          );
        })}
      </section>
    </div>
  );
}
