param(
  [Parameter(Mandatory = $true)][ValidatePattern('^COM[0-9]+$')][string]$Porta,
  [ValidateSet('Antigo', 'Novo')][string]$Bootloader = 'Novo',
  [string]$ArduinoCli, [string]$ConfigFile
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if ($Porta -notin [System.IO.Ports.SerialPort]::GetPortNames()) { throw "Porta $Porta não encontrada." }
$device = Get-PnpDevice -PresentOnly -Class Ports | Where-Object {
  $parameters = "Registry::HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Enum\$($_.InstanceId)\Device Parameters"
  (Get-ItemProperty -LiteralPath $parameters -Name PortName -ErrorAction SilentlyContinue).PortName -eq $Porta
}
if (!$device) { throw 'Não foi possível identificar a placa dessa porta.' }
if ($device.InstanceId -match 'VID_1B4F|VID_2341&PID_8036|VID_2A03&PID_8036') { throw 'Essa porta pertence a uma placa Pro Micro/Leonardo. Não grave o HEX do Nano nela.' }
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
$cpu = if ($Bootloader -eq 'Antigo') { 'atmega328old' } else { 'atmega328' }
& $ArduinoCli upload --verify --fqbn "arduino:avr:nano:cpu=$cpu" --port $Porta --input-file (Join-Path $PSScriptRoot 'MixerNano-ATmega328P-5V16MHz.hex') @options
if ($LASTEXITCODE -ne 0) { throw 'Falha na gravação. Confira a porta e tente a outra opção de bootloader. Nenhum fuse foi alterado.' }
