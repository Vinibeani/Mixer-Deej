const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('mixer', {
  state: () => ipcRenderer.invoke('state'),
  save: config => ipcRenderer.invoke('save', config),
  devices: () => ipcRenderer.invoke('devices'),
  connect: devicePath => ipcRenderer.invoke('connect', devicePath),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  sessions: () => ipcRenderer.invoke('sessions'),
  endpoints: () => ipcRenderer.invoke('endpoints'),
  allApps: () => ipcRenderer.invoke('all-apps'),
  program: () => ipcRenderer.invoke('program'),
  volume: (channel, volume) => ipcRenderer.invoke('volume', channel, volume),
  window: action => ipcRenderer.send('window', action),
  on: handler => { const listener = (_, event) => handler(event); ipcRenderer.on('update', listener); return () => ipcRenderer.removeListener('update', listener); }
});
