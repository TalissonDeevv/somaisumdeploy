const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
// The automated desktop runner supplies a fresh temporary profile. Normal
// launches retain the existing application profile and migrated V2 saves.
if(process.env.SMUD_TEST_PROFILE) app.setPath('userData', path.resolve(process.env.SMUD_TEST_PROFILE));
app.whenReady().then(() => {
  const entry = pathToFileURL(path.join(__dirname, '../dist/index.html')).href;
  const COMMUNITY_URL = 'https://discord.talissonsouza.com.br';
  ipcMain.handle('open-deploy-community', async (event, ...args) => {
    if(args.length || event.senderFrame?.url !== entry || !BrowserWindow.getAllWindows().some(win => win.webContents === event.sender)) return false;
    try { await shell.openExternal(COMMUNITY_URL); return true; } catch { return false; }
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  const createWindow = () => {
    const win = new BrowserWindow({ width: 1440, height: 900, minWidth: 800, minHeight: 600, backgroundColor: '#101923', autoHideMenuBar: true, icon:path.join(__dirname,'../dist/assets/app.png'),
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, preload:path.join(__dirname,'preload.cjs') } });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => { if (url !== entry) event.preventDefault(); });
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  };
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => app.quit());
