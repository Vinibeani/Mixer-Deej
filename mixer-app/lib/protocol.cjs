// MX Nano v2: 64-byte payload + CRC-16/CCITT-FALSE, little-endian checksum.
const MAGIC = [0x4d, 0x58, 2];
const valid = data => data.length === 64 && MAGIC.every((v, i) => data[i] === v);
function packet(command, payload = []) {
  if (payload.length > 59) throw Error('Mensagem excede o limite do protocolo serial.');
  const data = Buffer.alloc(64); data.set(MAGIC); data[3] = command; data.set(payload, 4);
  return data;
}
function crc16(data) {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
  }
  return crc;
}
function frame(data) {
  if (!valid(data)) throw Error('Pacote MX Nano inválido.');
  const output = Buffer.alloc(66); output.set(data); output.writeUInt16LE(crc16(data), 64); return output;
}
class FrameDecoder {
  constructor(onPacket) { this.onPacket = onPacket; this.buffer = Buffer.alloc(0); }
  push(chunk) {
    for (let offset = 0; offset < chunk.length; offset += 256) {
      this.buffer = Buffer.concat([this.buffer, chunk.subarray(offset, offset + 256)]);
      while (this.buffer.length >= 3) {
        if (!MAGIC.every((v, i) => this.buffer[i] === v)) { this.buffer = this.buffer.subarray(1); continue; }
        if (this.buffer.length < 66) break;
        const data = this.buffer.subarray(0, 64);
        if (crc16(data) !== this.buffer.readUInt16LE(64)) { this.buffer = this.buffer.subarray(1); continue; }
        this.buffer = this.buffer.subarray(66); this.onPacket(Buffer.from(data));
      }
    }
  }
}
function parseInput(data) {
  if (!valid(data) || data[3] !== 0x10 || data[9] !== 0xa1 || data[10] !== 2 || data[13] !== 1) return null;
  const values = Array.from(data.subarray(4, 8));
  const raw = Array.from({ length: 4 }, (_, i) => data.readUInt16LE(14 + i * 2));
  if (values.some(v => v > 100) || raw.some(v => v > 1023) || data[8] > 15) return null;
  return { values, raw, changed: data[8], device: {
    name: 'Mixer de Audio', model: 'Arduino Nano · ATmega328P', firmware: `MX Nano v${data[10]}.${data[11]}`,
    oledAddress: [0x3c, 0x3d].includes(data[12]) ? data[12] : null
  } };
}
function parseAck(data) {
  return valid(data) && data[3] === 0x11 ? { command: data[4], token: data[5] } : null;
}
module.exports = { packet, parseInput, parseAck, crc16, frame, FrameDecoder };
