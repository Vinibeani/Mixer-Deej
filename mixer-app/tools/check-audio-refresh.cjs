// Test only a silent audio session created by this tool; never alter user sessions.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { AudioService } = require('../lib/audio.cjs');
const audio = new AudioService();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let worker;
async function run() {
  audio.start();
  const before = await audio.request('list');
  // PCM silence, 8 kHz / 16 bit / mono, one second, played in a distinct process.
  const script = `
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'
$buffer = New-Object IO.MemoryStream
$writer = New-Object IO.BinaryWriter($buffer)
$writer.Write([Text.Encoding]::ASCII.GetBytes('RIFF')); $writer.Write([int]16036)
$writer.Write([Text.Encoding]::ASCII.GetBytes('WAVEfmt ')); $writer.Write([int]16)
$writer.Write([int16]1); $writer.Write([int16]1); $writer.Write([int]8000); $writer.Write([int]16000)
$writer.Write([int16]2); $writer.Write([int16]16)
$writer.Write([Text.Encoding]::ASCII.GetBytes('data')); $writer.Write([int]16000)
$writer.Write((New-Object byte[] 16000)); $buffer.Position=0
$player = New-Object System.Media.SoundPlayer($buffer)
$player.Load(); $player.PlayLooping()
[Console]::WriteLine('READY')
[void][Console]::ReadLine()
$player.Stop(); $player.Dispose(); $writer.Dispose(); $buffer.Dispose()
`;
  worker = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '', diagnostics = '';
  worker.stdout.on('data', data => { output += data; });
  worker.stderr.on('data', data => { diagnostics += data; });
  let testSession;
  for (let i = 0; i < 15; i++) {
    await pause(300);
    if (diagnostics) throw Error(diagnostics);
    if (output.includes('READY')) {
      const current = await audio.request('list');
      // Resolve the actual path separately; only the dedicated worker may be set.
      const pidRows = await new Promise((resolve, reject) => {
        const query = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${worker.pid}).Path`], { windowsHide: true });
        let path = ''; query.stdout.on('data', d => { path += d; }); query.on('error', reject); query.on('exit', code => code ? reject(Error('Cannot inspect test worker')) : resolve(path.trim()));
      });
      testSession = current.find(s => s.path?.toLowerCase() === pidRows.toLowerCase());
      // A shell audio session may predate the test: do not control that path.
      if (testSession && !before.some(s => s.target.toLowerCase() === testSession.target.toLowerCase())) break;
      testSession = null;
    }
  }
  assert.ok(testSession, 'Fresh refresh must discover the new silent session (without an existing PowerShell audio session)');
  assert.equal(testSession.name, testSession.processName, 'Original process name must be preserved');
  const controlled = await audio.request('set', { targets: [testSession.target], volume: 0.37 });
  assert.ok(controlled.matched > 0);
  const refreshed = await audio.request('list');
  assert.ok(Math.abs(refreshed.find(s => s.target === testSession.target).volume - 0.37) < 0.01);
  console.log(JSON.stringify({ freshSessionDiscovered: true, silentSessionVolumeVerified: true, originalNamePreserved: true, matched: controlled.matched }));
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (worker) { worker.stdin.end('\n'); await Promise.race([once(worker, 'exit'), pause(2000)]); if (worker.exitCode === null) worker.kill(); }
  audio.close();
});
