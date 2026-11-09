import { useRef, useState } from 'react';
import { speak, useVoices } from '../lib/speech';
import { exportState, importState, resetState, setSettings, useStore } from '../lib/store';
import type { Lang } from '../lib/types';

const SAMPLE: Record<Lang, string> = { m: '你好，很高兴认识你', c: '你好，好高興識到你' };

function VoicePicker({ lang, label }: { lang: Lang; label: string }) {
  const { settings } = useStore();
  const voices = useVoices()[lang];
  const key = lang === 'm' ? 'voiceM' : 'voiceC';
  return (
    <label className="field">
      <span>{label}</span>
      {voices.length === 0 ? (
        <span className="muted small">
          No {label.toLowerCase()} found. On a Mac, add one under System Settings → Accessibility → Spoken Content.
        </span>
      ) : (
        <span className="row">
          <select value={settings[key]} onChange={(e) => setSettings({ [key]: e.target.value })}>
            <option value="">Automatic</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} {v.localService ? '' : '(online)'}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => speak(SAMPLE[lang], lang)}>
            Test
          </button>
        </span>
      )}
    </label>
  );
}

function NumberField({
  label,
  help,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
      />
      <span className="muted small">{help}</span>
    </label>
  );
}

export function Settings() {
  const { settings } = useStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportState()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `canto-mando-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Backup downloaded.');
  };

  return (
    <div className="page">
      <h1>Settings</h1>

      <section className="card">
        <h3>Characters</h3>
        <div className="row">
          {(
            [
              ['s', 'Simplified first', '学习'],
              ['t', 'Traditional first', '學習'],
            ] as const
          ).map(([value, label, sample]) => (
            <label key={value} className={`choice ${settings.script === value ? 'on' : ''}`}>
              <input type="radio" name="script" checked={settings.script === value} onChange={() => setSettings({ script: value })} />
              <span lang="zh" className="choice-sample">
                {sample}
              </span>
              {label}
            </label>
          ))}
        </div>
        <p className="muted small">The other script is always shown beside it when the two differ.</p>
      </section>

      <section className="card">
        <h3>Session size</h3>
        <NumberField
          label="New cards per session"
          help="Each word has two cards: say it and read it."
          value={settings.newPerSession}
          min={0}
          max={30}
          onChange={(n) => setSettings({ newPerSession: n })}
        />
        <NumberField
          label="New cards per day"
          help="Caps the daily session across all your breaks."
          value={settings.dailyNew}
          min={0}
          max={200}
          onChange={(n) => setSettings({ dailyNew: n })}
        />
        <NumberField
          label="Reviews per session"
          help="Anything beyond this waits for the next round."
          value={settings.maxReviews}
          min={5}
          max={200}
          onChange={(n) => setSettings({ maxReviews: n })}
        />
      </section>

      <section className="card">
        <h3>Audio</h3>
        <label className="check">
          <input type="checkbox" checked={settings.autoplay} onChange={(e) => setSettings({ autoplay: e.target.checked })} />
          Play audio automatically
        </label>
        <label className="field">
          <span>Speaking speed · {settings.rate.toFixed(2)}×</span>
          <input
            type="range"
            min={0.5}
            max={1.2}
            step={0.05}
            value={settings.rate}
            onChange={(e) => setSettings({ rate: Number(e.target.value) })}
          />
        </label>
        <VoicePicker lang="m" label="Mandarin voice" />
        <VoicePicker lang="c" label="Cantonese voice" />
      </section>

      <section className="card">
        <h3>Your data</h3>
        <p className="muted small">
          Progress and journal entries are stored in this browser only. Download a backup to move them to another
          browser or device.
        </p>
        <div className="row">
          <button className="btn" onClick={download}>
            Download backup
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            Restore from backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                importState(await file.text());
                setMessage('Backup restored.');
              } catch (err) {
                setMessage(`Could not restore: ${err instanceof Error ? err.message : 'unreadable file'}`);
              }
            }}
          />
          {!confirmReset ? (
            <button className="btn danger" onClick={() => setConfirmReset(true)}>
              Erase everything
            </button>
          ) : (
            <>
              <button
                className="btn danger solid"
                onClick={() => {
                  resetState();
                  setConfirmReset(false);
                  setMessage('All progress and journal entries erased.');
                }}
              >
                Yes, erase progress and journal
              </button>
              <button className="btn" onClick={() => setConfirmReset(false)}>
                Keep my data
              </button>
            </>
          )}
        </div>
        {message && <p className="small">{message}</p>}
      </section>
    </div>
  );
}
