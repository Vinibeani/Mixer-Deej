const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { setTimeout: pause } = require('node:timers/promises');
const { SerialPortMock } = require('serialport');
const { SerialMixer, isCandidate } = require('../lib/serial-mixer.cjs');
const { packet, frame, FrameDecoder } = require('../lib/protocol.cjs');
let number = 0;
const report = () => frame(packet(0x10, [0, 25, 75, 100, 15, 0xa1, 2, 0, 0, 1]));
async function setup(t, options = {}) {
  const path = `COM_TEST_${++number}`;
  SerialPortMock.binding.createPort(path, { record: true, vendorId: '1A86', productId: '7523', maxReadSize: 7 });
  const mixer = new SerialMixer({ SerialPort: SerialPortMock, handshakeTimeout: 200, silenceTimeout: 1000, ...options });
  t.after(async () => {
    const closed = mixer.port?.isOpen ? once(mixer.port, 'close') : null;
    mixer.disconnect(); if (closed) await closed;
  });
  await mixer.connect(path); return { mixer, path, port: mixer.port };
}
async function identify(mixer, port) {
  const received = once(mixer, 'input'); port.port.emitData(report()); await received;
}
function written(port) {
  const packets = []; new FrameDecoder(d => packets.push(d)).push(port.port.recording); return packets;
}
test('recognizes USB serial candidates but excludes Pro Micro and unrelated USB IDs', () => {
  assert.equal(isCandidate({vendorId:'1A86',productId:'7523'}), true);
  assert.equal(isCandidate({vendorId:'1B4F',productId:'9206'}), false);
  assert.equal(isCandidate({}), false);
});
test('does not transmit to unidentified devices or claim a connection from random bytes', async t => {
  const { mixer, port } = await setup(t);
  mixer.send(1, [0]); port.port.emitData(Buffer.from('A0=123\nMX unrelated\n'));
  await pause(15); assert.equal(mixer.connected, false); assert.equal(port.port.recording.length, 0);
  await identify(mixer, port); assert.equal(mixer.connected, true);
});
test('queues commands, ignores wrong ACK, coalesces pending screen updates', async t => {
  const { mixer, port } = await setup(t); await identify(mixer, port);
  mixer.send(1, [0]); mixer.send(3, [1, 2, 3, 4]); mixer.send(3, [10, 20, 30, 40]);
  await pause(10); assert.equal(written(port).length, 1);
  port.port.emitData(frame(packet(0x11, [1, 99]))); await pause(10); assert.equal(written(port).length, 1);
  const first = written(port)[0]; port.port.emitData(frame(packet(0x11, [1, first[63]])));
  await pause(10); const sent = written(port); assert.equal(sent.length, 2);
  assert.deepEqual([...sent[1].subarray(4, 8)], [10, 20, 30, 40]);
  port.port.emitData(frame(packet(0x11, [3, sent[1][63]]))); await pause(10); assert.equal(mixer.inflight, null);
});
test('retries a missing confirmation and then disconnects', async t => {
  const { mixer, port } = await setup(t, { ackTimeout: 20 }); await identify(mixer, port);
  const statuses = []; mixer.on('status', s => statuses.push(s)); mixer.send(1, [2]);
  await pause(100); assert.equal(mixer.port, null); assert.equal(written(port).length, 3);
  assert.match(statuses.at(-1).message, /confirmou/);
});
test('disconnects silent firmware and cancels a connection pending enumeration', async t => {
  const { mixer, port } = await setup(t, { silenceTimeout: 25 }); await identify(mixer, port);
  await pause(50); assert.equal(mixer.port, null);
  let release; mixer.devices = () => new Promise(resolve => release = resolve);
  const connecting = mixer.connect('COM_NEVER'); mixer.disconnect(); release([{path:'COM_NEVER'}]);
  await connecting; assert.equal(mixer.port, null);
});
test('releases the port and accepts a new connection after manual disconnect', async t => {
  const { mixer, port, path } = await setup(t); await identify(mixer, port);
  const closed = once(port, 'close'); mixer.disconnect(); await closed;
  await mixer.connect(path); await identify(mixer, mixer.port); assert.equal(mixer.connected, true);
});
