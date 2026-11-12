// Desktop shell for Canto → Mando: one window showing the built web app,
// plus text-to-speech through macOS's own `say` command.
const { app, BrowserWindow, ipcMain, nativeTheme, net, protocol, shell } = require('electron');
const { execFile, spawn } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
// Set CANTO_DEV_URL=http://localhost:5173 to point the window at `npm run dev`.
const DEV_URL = process.env.CANTO_DEV_URL;
const APP_URL = 'app://canto/index.html';

// Serving the app from its own scheme (rather than file://) gives it a stable
// origin, so saved progress survives updates and fetch() works for stroke data.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function serveApp() {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
    if (!file.startsWith(DIST + path.sep)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

// ---- speech ------------------------------------------------------------------
// Chromium's built-in speech is silent with some macOS voices (Tingting, the
// main Mandarin one, among them). The `say` command drives the same voices
// reliably, so on a Mac the app speaks through that instead.

const NOVELTY = ['Shelley', 'Flo', 'Sandy', 'Reed', 'Eddy', 'Rocko', 'Grandma', 'Grandpa'];
const LOCALES = { m: ['zh_CN', 'zh_TW'], c: ['zh_HK'] };
const FAVOURITE = { m: 'Tingting', c: 'Sinji' };

function rank(voice, lang) {
  const novelty = NOVELTY.findIndex((n) => voice.name.startsWith(n));
  let score = 0;
  if (voice.locale !== 'zh_TW') score += 100;
  if (novelty < 0) score += 40;
  else score -= novelty * 0.1;
  if (/premium/i.test(voice.name)) score += 4;
  else if (/enhanced/i.test(voice.name)) score += 2;
  if (voice.name.startsWith(FAVOURITE[lang])) score += 1;
  return score;
}

let voicesPromise;
/** Installed voices per language, best first: { m: [{ name, taiwan }], c: [...] }. */
function listVoices() {
  voicesPromise ??= new Promise((resolve) => {
    if (process.platform !== 'darwin') return resolve({ m: [], c: [] });
    execFile('say', ['-v', '?'], (error, stdout) => {
      const found = new Map();
      if (!error)
        for (const line of stdout.split('\n')) {
          // e.g. "Tingting (Chinese (China mainland)) zh_CN    # 你好！我叫婷婷。"
          const match = line.match(/^(.+?)\s+([a-z]{2}_[A-Z]{2})\s+#/);
          if (match) found.set(match[1].trim(), { name: match[1].trim(), locale: match[2] });
        }
      const forLang = (lang) =>
        [...found.values()]
          .filter((v) => LOCALES[lang].includes(v.locale))
          // Taiwan-accent novelty voices add nothing over the mainland ones.
          .filter((v) => !(v.locale === 'zh_TW' && NOVELTY.some((n) => v.name.startsWith(n))))
          .sort((a, b) => rank(b, lang) - rank(a, lang))
          .map((v) => ({ name: v.name, taiwan: v.locale === 'zh_TW' }));
      resolve({ m: forLang('m'), c: forLang('c') });
    });
  });
  return voicesPromise;
}

let speaking = null;
function stopSpeaking() {
  if (speaking) speaking.kill();
  speaking = null;
}

async function speak(request) {
  const { text, lang, voice, rate } = request ?? {};
  if (typeof text !== 'string' || !text || text.length > 500 || (lang !== 'm' && lang !== 'c')) return false;
  const voices = (await listVoices())[lang];
  if (voices.length === 0) return false;
  // Only ever pass `say` a voice name that it listed itself.
  const chosen = voices.find((v) => v.name === voice) ?? voices[0];
  const speed = Math.min(1.2, Math.max(0.5, Number(rate) || 1));
  stopSpeaking();
  // Arguments go straight to the program, never through a shell.
  const child = spawn('say', ['-v', chosen.name, '-r', String(Math.round(180 * speed)), '--', text], {
    stdio: 'ignore',
  });
  speaking = child;
  child.on('exit', () => {
    if (speaking === child) speaking = null;
  });
  return true;
}

// ---- window ------------------------------------------------------------------

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 400,
    minHeight: 560,
    title: 'Canto → Mando',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#171411' : '#f6f1e7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // The window only ever shows the app itself; any other link opens in the browser.
  const isApp = (url) => url.startsWith('app://canto/') || (DEV_URL && url.startsWith(DEV_URL));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!isApp(url)) event.preventDefault();
  });

  win.loadURL(DEV_URL ?? APP_URL);
  return win;
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    serveApp();
    ipcMain.handle('speech:voices', () => listVoices());
    ipcMain.handle('speech:speak', (_event, request) => speak(request));
    ipcMain.handle('speech:stop', () => stopSpeaking());
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    stopSpeaking();
    app.quit();
  });
}
