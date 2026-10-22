const { EventEmitter } = require('node:events');
const { packet, frame, FrameDecoder, parseInput, parseAck } = require('./protocol.cjs');
const USB_IDS = new Set(['1a86:7523', '1a86:5523', '1a86:55d4', '0403:6001', '10c4:ea60', '2341:0043', '2a03:0043']);
function isCandidate(info) { return USB_IDS.has(`${info.vendorId}:${info.productId}`.toLowerCase()); }
class SerialMixer extends EventEmitter {
  constructor({ SerialPort = require('serialport').SerialPort, ackTimeout = 700, handshakeTimeout = 6500, silenceTimeout = 4500 } = {}) {
    super(); Object.assign(this, { SerialPort, ackTimeout, handshakeTimeout, silenceTimeout });
    this.port = null; this.connected = false; this.sequence = 0; this.queue = []; this.inflight = null; this.generation = 0;
  }
  async devices() {
    return (await this.SerialPort.list()).map(info => ({ path: info.path,
      name: `${this.connected && this.port?.path === info.path ? 'Mixer de Audio' : isCandidate(info) ? 'Arduino Nano' : 'Porta serial'} (${info.path})`,
      serial: info.serialNumber || '', automatic: isCandidate(info) }));
  }
  async connect(selected) {
    const generation = ++this.generation;
    const devices = await this.devices();
    if (this.generation !== generation) return;
    if (!devices.some(d => d.path === selected)) throw Error('Selecione uma porta serial disponível.');
    this.disconnect();
    const port = new this.SerialPort({ path: selected, baudRate: 115200, autoOpen: false, lock: true });
    this.port = port;
    this.emit('status', { connected: false, name: selected, message: 'Aguardando firmware MX Nano v2…' });
    const decoder = new FrameDecoder(data => {
      if (this.port !== port) return;
      const input = parseInput(data);
      if (input) {
        const first = !this.connected; this.connected = true;
        clearTimeout(this.handshakeTimer); clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => this.disconnect('O Nano parou de enviar dados. Verifique o cabo USB.'), this.silenceTimeout);
        this.silenceTimer.unref?.();
        this.emit('input', input, first); return;
      }
      const ack = parseAck(data);
      if (this.connected && ack && this.inflight && ack.command === this.inflight.data[3] && ack.token === this.inflight.data[63]) {
        clearTimeout(this.ackTimer); this.inflight = null; this.pump();
      }
    });
    port.on('data', chunk => { if (this.port === port) decoder.push(chunk); });
    port.on('error', error => { if (this.port === port) this.disconnect(`Falha na porta serial: ${error.message}`); });
    port.on('close', () => { if (this.port === port) this.disconnect('USB desconectado.'); });
    try { await new Promise((resolve, reject) => port.open(error => error ? reject(error) : resolve())); }
    catch (error) {
      if (this.port === port) this.disconnect('Não foi possível abrir a porta. Feche o Monitor Serial e outras cópias do mixer.');
      throw Error(`Não foi possível abrir ${selected}: ${error.message}`);
    }
    if (this.port !== port) { if (port.isOpen) port.close(() => {}); return; }
    if (!this.connected) {
      this.handshakeTimer = setTimeout(() => this.disconnect('O firmware MX Nano v2 não respondeu. Confira o HEX e a porta selecionada.'), this.handshakeTimeout);
      this.handshakeTimer.unref?.();
    }
  }
  disconnect(message = 'Desconectado') {
    this.generation++;
    clearTimeout(this.handshakeTimer); clearTimeout(this.silenceTimer); clearTimeout(this.ackTimer);
    const previous = this.port; this.port = null; this.connected = false; this.queue = []; this.inflight = null;
    if (previous?.isOpen) previous.close(() => {});
    this.emit('status', { connected: false, message });
  }
  send(command, payload) {
    if (!this.port?.isOpen || !this.connected) return;
    const key = command === 2 ? `icon-${payload[0]}` : `cmd-${command}`;
    const data = packet(command, payload); data[63] = ++this.sequence & 255;
    this.queue = this.queue.filter(item => item.key !== key);
    this.queue.push({ key, data, tries: 0 }); this.pump();
  }
  pump() {
    if (!this.connected || !this.port?.isOpen || this.inflight) return;
    this.inflight = this.queue.shift() || null; if (!this.inflight) return;
    const item = this.inflight, port = this.port;
    const transmit = () => {
      if (this.port !== port || this.inflight !== item) return;
      if (++item.tries > 3) { this.disconnect('O Nano não confirmou a configuração enviada.'); return; }
      this.ackTimer = setTimeout(transmit, this.ackTimeout); this.ackTimer.unref?.();
      port.write(frame(item.data), error => {
        if (error && this.port === port) this.disconnect(`Falha no envio serial: ${error.message}`);
      });
    };
    transmit();
  }
}
module.exports = { SerialMixer, isCandidate };
