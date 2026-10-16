import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Europa Voxel',
    fullscreen: true, // F11 to leave/enter full screen
    autoHideMenuBar: true,
    backgroundColor: '#8fd3ff',
    webPreferences: { preload: fileURLToPath(new URL('./preload.cjs', import.meta.url)) },
  });
  win.loadFile(fileURLToPath(new URL('../dist/index.html', import.meta.url)));
});

app.on('window-all-closed', () => app.quit());

// ---- English voice with the voices installed in Windows (System.Speech) ----
// The text goes through an environment variable, never inside the command itself.
const SCRIPT = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$en = @($s.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'en-*' })
if ($en.Count -eq 0) { exit 2 }
$s.SelectVoice($en[[int]$env:VOICE_INDEX % $en.Count].VoiceInfo.Name)
$s.Rate = [int]$env:VOICE_RATE
$s.Volume = [int]$env:VOICE_VOLUME
$s.Speak($env:VOICE_TEXT)
`;
let speaking = null;

ipcMain.handle('voice:speak', (_e, text, { voice = 0, rate = 0, volume = 100 } = {}) => {
  speaking?.kill();
  if (process.platform !== 'win32') return false;
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', SCRIPT], {
      windowsHide: true,
      env: { ...process.env, VOICE_TEXT: String(text), VOICE_INDEX: String(voice | 0), VOICE_RATE: String(rate | 0), VOICE_VOLUME: String(volume | 0) },
    });
    speaking = child;
    child.on('error', () => resolve(false));
    child.on('exit', (code) => {
      if (speaking === child) speaking = null;
      resolve(code === 0);
    });
  });
});
ipcMain.on('voice:stop', () => {
  speaking?.kill();
  speaking = null;
});
