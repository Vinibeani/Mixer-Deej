const { test } = require('node:test');
const assert = require('node:assert/strict');
const { packet, parseInput, parseAck, frame, FrameDecoder, crc16 } = require('../lib/protocol.cjs');
function input(values = [0, 25, 75, 100], changed = 0) {
  const data = packet(0x10, [...values, changed, 0xa1, 2, 0, 0x3c, 1]);
  [0, 256, 768, 1023].forEach((v, i) => data.writeUInt16LE(v, 14 + i * 2));
  return data;
}
test('rejects unrelated protocols, bad identity and malformed levels', () => {
  assert.equal(parseInput(Buffer.alloc(64)), null);
  assert.equal(parseInput(input([101, 0, 0, 0])), null);
  assert.equal(parseInput(Buffer.alloc(65)), null);
  assert.equal(parseInput(packet(2, [0])), null);
  for (const byte of [2, 9, 10, 13]) { const data = input(); data[byte] = 0; assert.equal(parseInput(data), null); }
  const bad = input(); bad.writeUInt16LE(1024, 14); assert.equal(parseInput(bad), null);
});
test('decodes changes without treating heartbeat as a volume command', () => {
  assert.deepEqual(parseInput(input()).values, [0, 25, 75, 100]);
  assert.deepEqual(parseInput(input()).raw, [0, 256, 768, 1023]);
  assert.equal(parseInput(input()).changed, 0);
  assert.equal(parseInput(input(undefined, 10)).changed, 10);
});
test('preserves full OLED bitmap and reserves the last byte for the token', () => {
  const bitmap = Array(32).fill(255); const report = packet(2, [3, ...bitmap]);
  assert.equal(report.length, 64); assert.equal(report[4], 3);
  assert.deepEqual([...report.subarray(5, 37)], bitmap);
  assert.throws(() => packet(1, Array(60).fill(0)));
});
test('CRC matches the independent CCITT-FALSE reference vector', () => {
  assert.equal(crc16(Buffer.from('123456789')), 0x29b1);
  assert.equal(frame(input()).length, 66);
});
test('acknowledgement identifies command and sequence independently of volume', () => {
  const ack = packet(0x11, [2, 255]);
  assert.deepEqual(parseAck(ack), { command: 2, token: 255 });
  assert.equal(parseInput(ack), null);
  assert.equal(parseAck(packet(0x10)), null);
});

test('Nano identity includes firmware and optional OLED address', () => {
  const data = input(); data[12] = 0;
  assert.deepEqual(parseInput(data).device, { name:'Mixer de Audio', model:'Arduino Nano · ATmega328P', firmware:'MX Nano v2.0', oledAddress:null });
  for (const address of [0x3c, 0x3d]) {
    data[12] = address;
    assert.equal(parseInput(data).device.oledAddress, address);
  }
  data[9] = 0;
  assert.equal(parseInput(data), null);
});

test('serial decoder handles every split, concatenation, corruption and noise', () => {
  const good = frame(input());
  for (let split = 1; split < good.length; split++) {
    const reports = [], decoder = new FrameDecoder(d => reports.push(d));
    decoder.push(good.subarray(0, split)); assert.equal(reports.length, 0);
    decoder.push(good.subarray(split)); assert.equal(reports.length, 1);
  }
  const reports = [], decoder = new FrameDecoder(d => reports.push(d));
  const corrupt = Buffer.from(good); corrupt[17] ^= 1;
  decoder.push(Buffer.concat([Buffer.alloc(10000, 77), corrupt, good, good]));
  assert.equal(reports.length, 2); assert.ok(decoder.buffer.length < 66);
});
