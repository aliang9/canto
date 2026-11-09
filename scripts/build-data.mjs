// Turns the hand-written decks in content/ into the JSON the app loads:
//   src/data/generated/decks.json     every item with both scripts and both readings
//   src/data/generated/patterns.json  Cantonese -> Mandarin sound-shift statistics
//   src/data/generated/pairs.json     per-character reading pairs for the tone game
//   public/hanzi/*.json               stroke data for every character used
//
// Run with `npm run data` (also runs automatically before dev and build).
// Pass --review to print every generated reading for proofreading.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin } from 'pinyin-pro';
import ToJyutping from 'to-jyutping';
import * as OpenCC from 'opencc-js';
import { decks as sourceDecks } from '../content/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/data/generated');
const hanziOut = path.join(root, 'public/hanzi');
const hanziSrc = path.join(root, 'node_modules/hanzi-writer-data');
const review = process.argv.includes('--review');

const convert = OpenCC.Converter({ from: 'hk', to: 'cn' });
// Keep the Cantonese characters people actually type rather than rare variants.
const SIMP_FIX = { '𠮶': '嗰', '𩠌': '餸' };
const toSimp = (s) => Array.from(convert(s), (ch) => SIMP_FIX[ch] ?? ch).join('');

// Corrections to generated readings, applied everywhere the word appears.
// Mandarin fixes are keyed by the Simplified word, Cantonese by the Traditional.
const PY_WORD_FIX = {
  东西: 'dōng xi', 朋友: 'péng you', 时候: 'shí hou', 谢谢: 'xiè xie', 太太: 'tài tai',
  意思: 'yì si', 地方: 'dì fang', 明白: 'míng bai', 厉害: 'lì hai', 麻烦: 'má fan',
  客气: 'kè qi', 关系: 'guān xi', 先生: 'xiān sheng', 学生: 'xué sheng', 晚上: 'wǎn shang',
  早上: 'zǎo shang', 清楚: 'qīng chu', 看看: 'kàn kan', 舒服: 'shū fu', 多少: 'duō shao',
  听得懂: 'tīng de dǒng', 说得: 'shuō de', 吃得: 'chī de', 听不懂: 'tīng bu dǒng',
  对不起: 'duì bu qǐ', 差不多: 'chà bu duō', 一期: 'yī qī', 教我: 'jiāo wǒ',
  供孩子: 'gōng hái zi', 方为: 'fāng wéi', 谁: 'shéi',
};
const JP_CHAR_FIX = { 呢: 'ni1' };
const JP_WORD_FIX = {
  睇下: 'tai2 haa5', 問下: 'man6 haa5', 諗下: 'nam2 haa5', 幫下: 'bong1 haa5', 試下: 'si3 haa5',
  傾下: 'king1 haa5', 確認下: 'kok3 jing6 haa5', 開緊會: 'hoi1 gan2 wui2',
  蛋白質: 'daan6 baak6 zat1', 分子: 'fan1 zi2', 知識產權: 'zi1 sik1 caan2 kyun4',
  通量: 'tung1 loeng6', 準確率: 'zeon2 kok3 leot2', 表位: 'biu2 wai6', 舅父: 'kau5 fu2',
  返鄉下: 'faan1 hoeng1 haa2', 爺爺: 'je4 je2', 婆婆: 'po4 po2', 公公: 'gung4 gung1',
};

function applyWordFixes(readings, text, table) {
  const out = [...readings];
  const cs = chars(text);
  for (const [word, fixed] of Object.entries(table)) {
    const w = chars(word);
    const syl = fixed.split(' ');
    for (let i = 0; i + w.length <= cs.length; i++)
      if (w.every((ch, k) => cs[i + k] === ch)) syl.forEach((r, k) => (out[i + k] = r));
  }
  return out;
}

const TONE_MARKS = ['āēīōūǖ', 'áéíóúǘ', 'ǎěǐǒǔǚ', 'àèìòùǜ'];
function toneOfPinyin(syllable) {
  for (const ch of syllable) {
    const i = TONE_MARKS.findIndex((set) => set.includes(ch));
    if (i >= 0) return String(i + 1);
  }
  return '0';
}
const isHan = (ch) => /\p{Script=Han}/u.test(ch);
const chars = (s) => Array.from(s);

function fail(msg) {
  console.error(`build-data: ${msg}`);
  process.exit(1);
}

function hash(s) {
  let h = 5381;
  for (const ch of s) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return h.toString(36);
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---- readings --------------------------------------------------------------

function mandarinReadings(simp) {
  const arr = pinyin(simp, { type: 'array' });
  const cs = chars(simp);
  if (arr.length !== cs.length) fail(`pinyin length mismatch for "${simp}"`);
  return applyWordFixes(cs.map((ch, i) => (isHan(ch) ? arr[i] : '')), simp, PY_WORD_FIX);
}

function cantoneseReadings(trad) {
  const list = ToJyutping.getJyutpingList(trad);
  const cs = chars(trad);
  if (list.length !== cs.length) fail(`jyutping length mismatch for "${trad}"`);
  const base = list.map(([ch, jp]) => {
    if (!isHan(ch)) return '';
    if (JP_CHAR_FIX[ch]) return JP_CHAR_FIX[ch];
    if (!jp) fail(`no jyutping for "${ch}" in "${trad}"`);
    return jp;
  });
  return applyWordFixes(base, trad, JP_WORD_FIX);
}

// "py: 長=cháng; jp: 蛋=daan6, 白=baak6"  or a full reading  "jp: je4 je2"
function parseOverrides(text, where) {
  const out = { py: null, jp: null };
  if (!text) return out;
  for (const part of text.split(';')) {
    const m = part.trim().match(/^(py|jp)\s*:\s*(.+)$/);
    if (!m) fail(`bad override "${part}" in ${where}`);
    const [, kind, body] = m;
    if (body.includes('=')) {
      const map = {};
      for (const pair of body.split(',')) {
        const [ch, reading] = pair.split('=').map((x) => x.trim());
        if (!ch || !reading) fail(`bad override pair "${pair}" in ${where}`);
        map[ch] = reading;
      }
      out[kind] = { map };
    } else {
      out[kind] = { full: body.trim().split(/\s+/) };
    }
  }
  return out;
}

function applyOverride(readings, text, override, where) {
  if (!override) return readings;
  const cs = chars(text);
  if (override.full) {
    const hanCount = cs.filter(isHan).length;
    if (override.full.length !== hanCount)
      fail(`override has ${override.full.length} syllables for ${hanCount} characters in ${where}`);
    let i = 0;
    return cs.map((ch) => (isHan(ch) ? override.full[i++] : ''));
  }
  for (const ch of Object.keys(override.map))
    if (!cs.includes(ch)) fail(`override character "${ch}" not found in ${where}`);
  return readings.map((r, i) => override.map[cs[i]] ?? r);
}

// ---- decks -----------------------------------------------------------------

const seenIds = new Set();

function buildItem(line, deck, where) {
  const fields = line.split('|').map((f) => f.trim());
  if (fields.length < 3) fail(`need at least "Mandarin | Cantonese | English" in ${where}`);
  const [mT, cRaw, en, note = '', overrideText = ''] = fields;
  if (!mT || !en) fail(`missing Mandarin or English in ${where}`);
  const cT = cRaw || mT;
  const ov = parseOverrides(overrideText, where);

  const mS = toSimp(mT);
  const cS = toSimp(cT);
  if (chars(mS).length !== chars(mT).length || chars(cS).length !== chars(cT).length)
    fail(`script conversion changed length in ${where}`);

  const py = applyOverride(mandarinReadings(mS), mT, ov.py, where);
  const jp = applyOverride(cantoneseReadings(cT), cT, ov.jp, where);

  const id = `${deck.id}-${hash(`${mT}|${cT}`)}`;
  if (seenIds.has(id)) fail(`duplicate item in ${where}`);
  seenIds.add(id);

  const item = {
    id,
    en,
    sentence: /[，。？！、]/.test(mT) || chars(mT).length > 5,
    same: mT === cT,
    m: { t: mT, s: mS, py },
    c: { t: cT, s: cS, jp },
  };
  if (note) item.note = note;
  return item;
}

const decks = sourceDecks.map((deck) => ({
  id: deck.id,
  title: deck.title,
  zh: deck.zh,
  target: deck.target,
  blurb: deck.blurb,
  units: deck.units.map((unit) => {
    const lines = unit.items
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const out = {
      id: `${deck.id}-${slug(unit.title) || hash(unit.title)}`,
      title: unit.title,
      items: lines.map((line, i) => buildItem(line, deck, `${deck.id} / ${unit.title} / line ${i + 1}`)),
    };
    if (unit.explain) out.explain = unit.explain;
    if (unit.journal) out.journal = true;
    return out;
  }),
}));

// ---- sound-shift statistics --------------------------------------------------
// The 3,755 level-1 characters of GB2312 are the standard "common characters"
// list. For each one, compare its usual Cantonese and Mandarin readings.

function commonCharacters() {
  const decoder = new TextDecoder('gb2312');
  let out = '';
  for (let hi = 0xb0; hi <= 0xd7; hi++)
    for (let lo = 0xa1; lo <= 0xfe; lo++) {
      if (hi === 0xd7 && lo > 0xf9) break;
      out += decoder.decode(new Uint8Array([hi, lo]));
    }
  return chars(out);
}

function splitJyutping(jp) {
  const tone = jp.slice(-1);
  const body = jp.slice(0, -1);
  if (body === 'm' || body === 'ng') return { initial: '', final: body, tone };
  const m = body.match(/^(ng|gw|kw|[bpmfdtnlgkhwzcsj])?([a-z]+)$/);
  if (!m) return null;
  return { initial: m[1] ?? '', final: m[2], tone };
}

function splitPinyin(ch) {
  const tone = pinyin(ch, { pattern: 'num' });
  const initial = pinyin(ch, { pattern: 'initial' });
  const final = pinyin(ch, { pattern: 'final', toneType: 'none' });
  if (!final) return null;
  return { initial, final, tone: String(tone) };
}

const deckChars = new Set();
for (const d of decks) for (const u of d.units) for (const it of u.items) for (const ch of chars(it.m.s)) if (isHan(ch)) deckChars.add(ch);

const samples = [];
for (const ch of commonCharacters()) {
  const jpRaw = ToJyutping.getJyutpingList(ch)[0]?.[1];
  if (!jpRaw) continue;
  const c = splitJyutping(jpRaw);
  const m = splitPinyin(ch);
  if (!c || !m || m.tone === '0') continue;
  const checked = /[ptk]$/.test(c.final);
  samples.push({ ch, c, m, toneKey: checked ? `${c.tone}s` : c.tone });
}

function tabulate(keyOf, outOf, { minCount = 1, maxOut = 4 } = {}) {
  const groups = new Map();
  for (const s of samples) {
    const k = keyOf(s);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }
  const rows = [];
  for (const [key, list] of groups) {
    if (list.length < minCount) continue;
    const outs = new Map();
    for (const s of list) {
      const o = outOf(s);
      if (!outs.has(o)) outs.set(o, []);
      outs.get(o).push(s.ch);
    }
    const out = [...outs.entries()]
      .map(([m, cs]) => ({
        m,
        p: cs.length / list.length,
        // Prefer example characters the learner will meet in the decks.
        ex: [...cs].sort((a, b) => Number(deckChars.has(b)) - Number(deckChars.has(a))).slice(0, 5),
      }))
      .sort((a, b) => b.p - a.p)
      .slice(0, maxOut);
    rows.push({ c: key, n: list.length, out });
  }
  return rows;
}

const toneOrder = ['1', '2', '3', '4', '5', '6', '1s', '3s', '6s'];
const tones = tabulate((s) => s.toneKey, (s) => s.m.tone)
  .filter((r) => toneOrder.includes(r.c))
  .sort((a, b) => toneOrder.indexOf(a.c) - toneOrder.indexOf(b.c));
const initials = tabulate((s) => s.c.initial || '∅', (s) => s.m.initial || '∅', { minCount: 10 }).sort(
  (a, b) => b.n - a.n,
);
const finals = tabulate((s) => s.c.final, (s) => s.m.final, { minCount: 20, maxOut: 3 }).sort((a, b) => b.n - a.n);

const bestGuessRate = (rows) => rows.reduce((sum, r) => sum + r.out[0].p * r.n, 0) / rows.reduce((sum, r) => sum + r.n, 0);

const patterns = {
  n: samples.length,
  toneAccuracy: bestGuessRate(tones),
  initialAccuracy: bestGuessRate(initials),
  tones,
  initials,
  finals,
};

// Character pairs for the tone game: characters from same-word items, where
// both readings were generated in the context of a real word.
const pairMap = new Map();
for (const d of decks)
  for (const u of d.units)
    for (const it of u.items) {
      if (!it.same) continue;
      const s = chars(it.m.s);
      const t = chars(it.m.t);
      s.forEach((ch, i) => {
        if (!isHan(ch) || pairMap.has(ch)) return;
        // 一 and 不 change tone depending on what follows, so they mislead inside words.
        if ((ch === '一' || ch === '不') && s.length > 1) return;
        const py = it.m.py[i];
        const jp = it.c.jp[i];
        const cj = splitJyutping(jp);
        const mt = toneOfPinyin(py);
        // Neutral-tone syllables say nothing about the tone shift.
        if (!cj || mt === '0') return;
        const checked = /[ptk]$/.test(cj.final);
        pairMap.set(ch, { s: ch, t: t[i], py, jp, mt, ck: checked ? `${cj.tone}s` : cj.tone, w: it.m.s, en: it.en });
      });
    }
const pairs = [...pairMap.values()];

// ---- write -----------------------------------------------------------------

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'decks.json'), JSON.stringify(decks));
fs.writeFileSync(path.join(outDir, 'patterns.json'), JSON.stringify(patterns));
fs.writeFileSync(path.join(outDir, 'pairs.json'), JSON.stringify(pairs));

// Stroke data for every character used, in both scripts.
fs.rmSync(hanziOut, { recursive: true, force: true });
fs.mkdirSync(hanziOut, { recursive: true });
const strokeChars = new Set();
for (const d of decks)
  for (const u of d.units)
    for (const it of u.items)
      for (const text of [it.m.s, it.m.t, it.c.s, it.c.t]) for (const ch of chars(text)) if (isHan(ch)) strokeChars.add(ch);
const available = [];
for (const ch of strokeChars) {
  const src = path.join(hanziSrc, `${ch}.json`);
  if (!fs.existsSync(src)) continue;
  fs.copyFileSync(src, path.join(hanziOut, `${ch}.json`));
  available.push(ch);
}
fs.writeFileSync(path.join(outDir, 'strokes.json'), JSON.stringify(available.sort()));

const itemCount = decks.reduce((n, d) => n + d.units.reduce((k, u) => k + u.items.length, 0), 0);
console.log(
  `build-data: ${decks.length} decks, ${itemCount} items, ${pairs.length} tone-game characters, ` +
    `${available.length}/${strokeChars.size} characters with stroke data, ` +
    `tone rule accuracy ${(patterns.toneAccuracy * 100).toFixed(1)}% over ${samples.length} characters`,
);

if (review) {
  for (const d of decks)
    for (const u of d.units) {
      console.log(`\n## ${d.id} / ${u.title}`);
      for (const it of u.items) {
        const py = it.m.py.filter(Boolean).join(' ');
        const jp = it.c.jp.filter(Boolean).join(' ');
        console.log(`${it.m.s}  ${py}  ||  ${it.c.s}  ${jp}`);
      }
    }
}
