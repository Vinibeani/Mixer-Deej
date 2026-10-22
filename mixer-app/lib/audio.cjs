const { spawn } = require('node:child_process');
const path = require('node:path');
class AudioService {
  constructor(onError = () => {}) { this.pending = new Map(); this.next = 0; this.onError = onError; }
  start() {
    if (process.platform !== 'win32') throw Error('O controle de áudio requer Windows.');
    const bridge = path.join(__dirname, '../audio/bridge.ps1').replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
    this.child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', bridge], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let buffered = '';
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', chunk => {
      buffered += chunk;
      let index;
      while ((index = buffered.indexOf('\n')) !== -1) {
        const line = buffered.slice(0, index); buffered = buffered.slice(index + 1);
        try {
          const msg = JSON.parse(line); const pending = this.pending.get(msg.id);
          if (pending) { clearTimeout(pending.timer); this.pending.delete(msg.id); msg.error ? pending.reject(Error(msg.error)) : pending.resolve(msg.result); }
        } catch { /* Ignore PowerShell startup diagnostics; stderr is reported separately. */ }
      }
    });
    this.child.stderr.on('data', data => this.onError(data.toString().slice(0, 600)));
    this.child.on('error', error => this.fail(error));
    this.child.on('exit', () => { this.child = null; this.fail(Error('Serviço de áudio encerrado. Reinicie o aplicativo.')); });
  }
  fail(error) {
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(error); }
    this.pending.clear(); this.onError(error.message);
  }
  request(command, values = {}) {
    return new Promise((resolve, reject) => {
      if (!this.child || this.child.stdin.destroyed) return reject(Error('Serviço de áudio indisponível.'));
      const id = ++this.next;
      const timer = setTimeout(() => { this.pending.delete(id); reject(Error('O serviço de áudio não respondeu.')); }, command==='all-apps'?45000:12000);
      this.pending.set(id, { resolve, reject, timer });
      this.child.stdin.write(JSON.stringify({ id, command, ...values }) + '\n', error => {
        if (error) { clearTimeout(timer); this.pending.delete(id); reject(error); }
      });
    });
  }
  close() { this.child?.stdin.end(); }
}
module.exports = { AudioService };
