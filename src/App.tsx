import { useState } from 'react';
import type { Scope } from './lib/session';
import { Browse } from './pages/Browse';
import { Patterns } from './pages/Patterns';
import { Roots } from './pages/Roots';
import { Session } from './pages/Session';
import { Settings } from './pages/Settings';
import { Today } from './pages/Today';
import { Write } from './pages/Write';

const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'browse', label: 'Library' },
  { id: 'patterns', label: 'Sounds' },
  { id: 'write', label: 'Writing' },
  { id: 'roots', label: 'Roots' },
  { id: 'settings', label: 'Settings' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [session, setSession] = useState<Scope | null>(null);

  if (session) return <Session scope={session} onExit={() => setSession(null)} />;

  return (
    <>
      <nav className="nav">
        {TABS.map((t) => (
          <button key={t.id} className={`nav-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'today' && <Today onStart={setSession} />}
      {tab === 'browse' && <Browse onStart={setSession} />}
      {tab === 'patterns' && <Patterns />}
      {tab === 'write' && <Write />}
      {tab === 'roots' && <Roots onStart={setSession} />}
      {tab === 'settings' && <Settings />}
    </>
  );
}
