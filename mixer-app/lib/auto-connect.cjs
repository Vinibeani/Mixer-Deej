class AutoConnect {
  constructor({ list, busy, connect, error = () => {}, now = Date.now, interval = 3000, retry = 10000 }) {
    Object.assign(this, { list, busy, connect, error, now, interval, retry });
    this.enabled = true; this.pending = false; this.nextAttempt = 0;
  }
  async scan() {
    if (!this.enabled || this.pending || this.busy() || this.now() < this.nextAttempt) return;
    this.pending = true;
    try {
      const devices = await this.list();
      if (!this.enabled || this.busy() || devices.length !== 1) return;
      this.nextAttempt = this.now() + this.retry;
      await this.connect(devices[0].path);
    } catch (error) { this.nextAttempt = this.now() + this.retry; this.error(error); }
    finally { this.pending = false; }
  }
  confirmed() { this.nextAttempt = 0; }
  start() { if (!this.timer) { void this.scan(); this.timer = setInterval(() => void this.scan(), this.interval); this.timer.unref(); } }
  stop() { this.enabled = false; clearInterval(this.timer); this.timer = null; }
}
module.exports = { AutoConnect };
