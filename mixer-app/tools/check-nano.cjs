// Physical serial/OLED protocol check. Never loads the Windows audio service.
const fs = require('node:fs/promises');
const path = require('node:path');
const { once } = require('node:events');
const { setTimeout: pause } = require('node:timers/promises');
const { SerialMixer } = require('../lib/serial-mixer.cjs');
const mixer = new SerialMixer();
async function connect(port) {
  let timer;
  try {
    const input = once(mixer, 'input');
    await mixer.connect(port);
    return (await Promise.race([input, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Sem resposta do firmware.')), 8000); })]))[0];
  } finally { clearTimeout(timer); }
}
async function close() {
  const closed = mixer.port?.isOpen ? once(mixer.port, 'close') : null;
  mixer.disconnect(); if (closed) await closed;
}
(async () => {
  const devices = (await mixer.devices()).filter(d => d.automatic);
  const selected = process.argv[2] || (devices.length === 1 && devices[0].path);
  if (!selected) throw Error('Informe a porta: node tools/check-nano.cjs COM12');
  const input = await connect(selected);
  let messages = 1; mixer.on('input', () => messages++);
  // Each frame must receive the matching command/token ACK before the next one.
  const commands = [[1, [0]], [1, [1]], [1, [2]], [1, [0]],
    ...Array.from({length:4}, (_, i) => [2, [i, ...Array(32).fill(0)]]),
    [3, [0, 25, 75, 100]], [4, [180]]];
  for (const [command, payload] of commands) {
    mixer.send(command, payload);
    const deadline = Date.now() + 3500;
    while (mixer.inflight || mixer.queue.length) {
      if (!mixer.connected || Date.now() > deadline) throw Error(`Comando ${command} não confirmado.`);
      await pause(15);
    }
    if (!mixer.connected) throw Error('Conexão perdida.');
  }
  await close(); await pause(300);
  const reconnected = await connect(selected);
  const report = { date:new Date().toISOString(), port:selected, device:input.device, raw:input.raw,
    commandsAcknowledged:commands.length, messages, disconnectReconnect:true, reconnected:reconnected.device, audioChanges:false };
  await fs.mkdir(path.join(__dirname,'../.qa-nano'),{recursive:true});
  await fs.writeFile(path.join(__dirname,'../.qa-nano/hardware.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
})().catch(error => { console.error(error); process.exitCode=1; }).finally(close);
