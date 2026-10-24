const { app, BrowserWindow, ipcMain, dialog, nativeImage, Tray, Menu } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { AudioService } = require('./lib/audio.cjs');
const { AutoConnect } = require('./lib/auto-connect.cjs');
const { SerialMixer } = require('./lib/serial-mixer.cjs');
const { selection } = require('./ui/icon-catalog.js');
const { matches: matchesAudioTarget } = require('./ui/audio-targets.js');
const knownIcons = new Set(require('./ui/icons.json').map(icon=>icon.name));
const verify = process.argv.includes('--verify');
if (verify) app.setPath('userData', path.join(app.getPath('temp'), 'mixer-audio-verification'));
let win, config, audio, tray, quitting = false, pollTimer, legacyConfig = null, legacyBackupName = '.before-icons-only.bak', saveQueue = Promise.resolve();
let status = { connected: false, message: 'Desconectado' };
let autoConnector;
const serial = new SerialMixer();
const defaults = () => ({ iconSelectionVersion:1,layout: 0, brightness: 180, general: {autostart:false, tray:false, inverted:false}, channels: Array.from({ length: 4 }, () => ({ symbol:null, targetNames:{}, targets: [], icon: null, bitmap: Array(32).fill(0), volume: 0 })) });
const publish = event => { if (win && !win.isDestroyed()) win.webContents.send('update', event); };
function validate(input) {
  if (!input || !Number.isInteger(input.layout) || input.layout < 0 || input.layout > 2 || !Array.isArray(input.channels) || input.channels.length !== 4) throw Error('Configuração inválida.');
  return { iconSelectionVersion:1,layout: input.layout, brightness: Number.isInteger(input.brightness) ? Math.max(0,Math.min(255,input.brightness)):180,
    general:{autostart:!!input.general?.autostart,tray:!!input.general?.tray,inverted:!!input.general?.inverted},
    channels: input.channels.map(c => {
    if (!Array.isArray(c.targets) || c.targets.length > 24 || c.targets.some(t => typeof t !== 'string' || t.length > 1024)) throw Error('Seleção de aplicativos inválida.');
    if (!Array.isArray(c.bitmap) || c.bitmap.length !== 32 || c.bitmap.some(b => !Number.isInteger(b) || b < 0 || b > 255)) throw Error('Ícone OLED inválido.');
    const image = value => typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(value) && value.length<400000?value:null;
    const names={}; for(const target of c.targets) if(typeof c.targetNames?.[target]==='string') names[target]=c.targetNames[target].slice(0,120);
    const symbol=selection(c,input.iconSelectionVersion,knownIcons);
    return { symbol,targetNames:names, targets: [...new Set(c.targets)], icon:symbol?image(c.icon):null, bitmap:symbol?c.bitmap:Array(32).fill(0), volume: Math.max(0, Math.min(100, Math.round(Number(c.volume) || 0))) };
  }) };
}
async function persist() {
  const data = JSON.stringify(config, null, 2);
  const file = path.join(app.getPath('userData'), 'mixer.json');
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    if(legacyConfig!==null){try{await fs.writeFile(file+legacyBackupName,legacyConfig,{encoding:'utf8',flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}legacyConfig=null;}
    await fs.writeFile(file + '.tmp', data, 'utf8'); await fs.rename(file + '.tmp', file);
  });
  return saveQueue;
}
function disconnect(message = 'Desconectado') {
  serial.disconnect(message);
}
function send(command, payload) {
  serial.send(command, payload);
}
function syncScreen() {
  send(1, [config.layout]);
  config.channels.forEach((c, i) => send(2, [i, ...c.bitmap]));
  send(3, config.channels.map(c => c.volume));
  send(4, [config.brightness]);

}
// Keep only the latest pending position per channel while the audio service is busy.
const volumeJobs = new Map();
let draining = false;
async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (volumeJobs.size) {
      const [channel, volume] = volumeJobs.entries().next().value; volumeJobs.delete(channel);
      const targets = config.channels[channel].targets;
      if (targets.length) {
        try {
          const result = await audio.request('set', { targets, volume: volume / 100 });
          if (!result.matched) publish({ type: 'notice', message: `Canal ${channel+1}: nenhum destino de áudio ativo.` });
        } catch (e) { publish({ type: 'notice', message: e.message }); }
      }
    }
  } finally { draining = false; }
}
function setVolume(channel, value, fromHardware = false) {
  if (!Number.isInteger(channel) || channel < 0 || channel > 3 || !Number.isFinite(value)) throw Error('Canal ou volume inválido.');
  const volume = Math.round(Math.max(0, Math.min(100, value)));
  config.channels[channel].volume = volume;
  publish({ type: 'volume', channel, volume }); volumeJobs.set(channel, volume); void drain();
  if (!fromHardware) send(3, config.channels.map(c => c.volume));
}
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  try { const raw=await fs.readFile(path.join(app.getPath('userData'), 'mixer.json'), 'utf8');const parsed=JSON.parse(raw);config=validate(parsed);if('midi' in parsed||parsed.channels.some(c=>'midi' in c)){legacyConfig=raw;legacyBackupName='.before-midi-removal.bak';}else if(parsed.iconSelectionVersion!==1)legacyConfig=raw; }
  catch { config = defaults(); }
  win = new BrowserWindow({ width: 800, height: 600, minWidth: 800, minHeight: 600, backgroundColor: '#20211e', icon:path.join(__dirname,'assets/icon.png'), frame: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.on('close',event=>{if(config.general.tray&&!quitting&&!verify){event.preventDefault();win.hide();}});
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  audio = new AudioService(message => publish({ type: 'notice', message }));
  try { audio.start(); } catch (e) { status.audioError = e.message; }
  ipcMain.handle('state', () => ({ config, status }));
  ipcMain.handle('save', async (_, input) => {
    const next=validate(input);
    if(next.general.autostart!==config.general.autostart){if(!app.isPackaged)throw Error('A opção de iniciar com o Windows está disponível no aplicativo instalado.');app.setLoginItemSettings({openAtLogin:next.general.autostart,path:process.env.PORTABLE_EXECUTABLE_FILE||app.getPath('exe')});}
    config=next; await persist(); syncScreen(); return config;
  });
  ipcMain.handle('devices', () => serial.devices());
  serial.on('status', next => { status = next; publish({ type: 'status', ...status }); });
  serial.on('input', (input, first) => {
    if (first) autoConnector?.confirmed();
    const deviceChanged = JSON.stringify(status.device) !== JSON.stringify(input.device);
    status = { connected: true, name: input.device.name, message: `Dispositivo conectado · Serial · ${serial.port.path}`, device: input.device };
    if (first || deviceChanged) publish({ type: 'status', ...status });
    input.values.forEach((volume, i) => {
      if (input.changed & (1 << i)) setVolume(i, config.general.inverted ? 100 - volume : volume, !config.general.inverted);
    });
    if (first) syncScreen();
  });
  async function connectDevice(selected) { await serial.connect(selected); return status; }
  autoConnector = new AutoConnect({
    list: async () => (await serial.devices()).filter(d => d.automatic),
    busy: () => !!serial.port || quitting,
    connect: connectDevice,
    error: error => publish({type:'notice',message:error.message})
  });
  ipcMain.handle('connect', (_, selected) => { autoConnector.enabled = true; return connectDevice(selected); });
  ipcMain.handle('disconnect', () => { autoConnector.enabled = false; disconnect(); });
  async function withIcons(sessions) {
    return Promise.all(sessions.map(async s => {
      if (s.path) { try { s.icon = (await app.getFileIcon(s.path, { size: 'normal' })).toDataURL(); } catch {} }
      return s;
    }));
  }
  ipcMain.handle('sessions', async () => withIcons(await audio.request('list')));
  ipcMain.handle('endpoints', async () => audio.request('endpoints'));
  ipcMain.handle('all-apps', async () => withIcons(await audio.request('all-apps')));
  ipcMain.handle('program', async()=>{
    const result=await dialog.showOpenDialog(win,{title:'Selecionar aplicativo',buttonLabel:'Selecionar',filters:[{name:'Aplicativo',extensions:['exe']}],properties:['openFile']});
    if(result.canceled)return null;
    const file=result.filePaths[0];return (await withIcons([{target:file,path:file,name:path.basename(file,'.exe')}]))[0];
  });
  ipcMain.handle('volume', (_, channel, volume) => setVolume(channel, volume));
  ipcMain.on('window', (_, action) => { if (action === 'close') win.close(); else if (action === 'minimize') win.minimize(); });
  tray=new Tray(nativeImage.createFromPath(path.join(__dirname,'assets/tray.png')));tray.setToolTip('Mixer de Áudio');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Abrir mixer',click:()=>{win.show();win.focus();}},{label:'Sair',click:()=>{quitting=true;app.quit();}}]));tray.on('double-click',()=>{win.show();win.focus();});
  let polling=false;
  pollTimer=setInterval(async()=>{
    if(polling||draining)return;polling=true;
    try{
      const snapshot=[...await audio.request('list'),...await audio.request('endpoints')];
      if(draining||volumeJobs.size)return;
      let changed=false;
      config.channels.forEach((c,i)=>{const s=c.targets.map(target=>snapshot.find(s=>matchesAudioTarget(target,s))).find(Boolean);if(s){const volume=Math.round(s.volume*100);if(Math.abs(volume-c.volume)>1){c.volume=volume;changed=true;publish({type:'volume',channel:i,volume});}}});
      if(changed)send(3,config.channels.map(c=>c.volume));
    }catch(e){publish({type:'audio-status',message:e.message});}finally{polling=false;}
  },2000);
  await win.loadFile(path.join(__dirname, 'ui/index.html'));
  if (!verify && !process.argv.includes('--no-auto-connect')) autoConnector.start();
  if (verify) {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const ui = await win.webContents.executeJavaScript(`({ channels: document.querySelectorAll('.channel').length, layouts: document.querySelectorAll('.layout-option').length })`);
      if (ui.channels !== 4 || ui.layouts !== 3) throw Error('Falha na montagem da interface.');
      const sessions = await audio.request('list');
      const devices = (await serial.devices()).filter(d => d.automatic);
      const report = { ...ui, sessions: sessions.length, compatibleDevices: devices.length, packaged: app.isPackaged };
      await fs.mkdir(app.getPath('userData'), { recursive: true });
      await fs.writeFile(path.join(app.getPath('userData'), 'result.json'), JSON.stringify(report, null, 2));
      await fs.writeFile(path.join(app.getPath('userData'), 'preview.png'), (await win.webContents.capturePage()).toPNG());
      console.log(JSON.stringify(report)); app.quit();
    } catch (error) { console.error(error); app.exit(1); }
  }
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { quitting=true;autoConnector?.stop();clearInterval(pollTimer);disconnect(); audio?.close();tray?.destroy(); });
