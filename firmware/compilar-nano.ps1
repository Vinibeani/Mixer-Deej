param([string]$ArduinoCli, [string]$ConfigFile)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (!$ArduinoCli) {
  $bundled = Join-Path $root '.dev-tools/arduino/arduino-cli.exe'
  $ArduinoCli = if (Test-Path -LiteralPath $bundled) { $bundled } else { 'arduino-cli' }
}
if (!$ConfigFile) {
  $bundledConfig = Join-Path $root '.dev-tools/arduino/arduino-cli.yaml'
  if (Test-Path -LiteralPath $bundledConfig) { $ConfigFile = $bundledConfig }
}
$options = @()
if ($ConfigFile) { $options += @('--config-file', $ConfigFile) }
& $ArduinoCli compile --clean --fqbn 'arduino:avr:nano:cpu=atmega328' --build-path (Join-Path $PSScriptRoot '.compile-nano') --output-dir (Join-Path $PSScriptRoot 'build-nano') @options (Join-Path $PSScriptRoot 'MixerNano')
if ($LASTEXITCODE -ne 0) { throw 'Falha na compilação para o Nano.' }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'build-nano/MixerNano.ino.hex') -Destination (Join-Path $PSScriptRoot 'MixerNano-ATmega328P-5V16MHz.hex') -Force
