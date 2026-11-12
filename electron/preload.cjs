// The only bridge between the page and the desktop shell: text-to-speech
// through the operating system. The page gets no file or process access.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cantoNative', {
  voices: () => ipcRenderer.invoke('speech:voices'),
  speak: (request) => ipcRenderer.invoke('speech:speak', request),
  stop: () => ipcRenderer.invoke('speech:stop'),
});
