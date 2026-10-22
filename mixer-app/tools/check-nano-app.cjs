// Isolated profile: none of the channels has audio targets.
const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
app.setPath('userData', path.join(__dirname, '../.qa-nano-profile'));
app.on('browser-window-created', (_, win) => {
  win.webContents.setBackgroundThrottling(false);
  win.webContents.once('did-finish-load', async () => {
    try {
      const result = await win.webContents.executeJavaScript(`(async () => {
        await new Promise(r=>setTimeout(r,2500));
        const initial = await window.mixer.state();
        if(initial.config.channels.some(c=>c.targets.length))throw Error('O perfil de teste contém destinos de áudio.');
        const devices = await window.mixer.devices();
        if(devices.length!==1)throw Error('Esperava exatamente uma placa MX.');
        await openSettings();
        const detectedName = document.getElementById('deviceName').textContent;
        if(detectedName==='—')throw Error('O nome USB não apareceu antes de conectar.');
        if(!initial.status.connected)throw Error('Não conectou automaticamente ao abrir.');
        const state = await window.mixer.state();
        const result = { connected:state.status.connected, message:state.status.message, device:state.status.device, detectedName, name:document.getElementById('deviceName').textContent, model:document.getElementById('deviceModel').textContent, firmware:document.getElementById('deviceFirmware').textContent, label:document.getElementById('connection').textContent.trim(), error:document.getElementById('deviceError').textContent };
        if(state.status.connected && [result.name,result.model,result.firmware].includes('—'))throw Error('Informações conectadas incompletas.');
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
        return result;
      })()`);
      await fs.writeFile(path.join(__dirname, '../../mixer-nano-connected.png'), (await win.webContents.capturePage()).toPNG());
      result.autoConnected = true;
      const manualPause = await win.webContents.executeJavaScript(`(async()=>{
        await window.mixer.disconnect();await new Promise(r=>setTimeout(r,3500));
        return !(await window.mixer.state()).status.connected;
      })()`);
      if(!manualPause)throw Error('Desconectar foi ignorado pela conexão automática.');
      result.manualDisconnectRespected = true;
      const reconnected = await win.webContents.executeJavaScript(`(async()=>{
        const devices=await window.mixer.devices();
        await window.mixer.connect(devices[0].path);
        await new Promise(r=>setTimeout(r,2800));
        const state=await window.mixer.state();
        await window.mixer.disconnect();
        return state.status.connected;
      })()`);
      if(!reconnected)throw Error('Falha na reconexão serial.');
      result.reconnected = true;
      console.log(JSON.stringify(result)); if(result.connected)app.quit();else app.exit(1);
    } catch(error) { console.error(error); app.exit(1); }
  });
});
setTimeout(()=>app.exit(2),20000).unref();
require(process.env.MIXER_TEST_MAIN || '../main.cjs');
