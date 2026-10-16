// Gives the game access to the Windows voices (Electron has no voices of its own on Windows).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nativeVoice', {
  speak: (text, options) => ipcRenderer.invoke('voice:speak', text, options),
  stop: () => ipcRenderer.send('voice:stop'),
});
