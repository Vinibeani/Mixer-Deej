param([string]$ArduinoCli = 'arduino-cli', [string]$ConfigFile)
$ErrorActionPreference = 'Stop'
$options = @()
if ($ConfigFile) { $options += @('--config-file', $ConfigFile) }
& $ArduinoCli core update-index @options
if ($LASTEXITCODE -ne 0) { throw 'Falha ao atualizar o índice Arduino.' }
& $ArduinoCli core install 'arduino:avr@1.8.6' @options
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar Arduino AVR Boards.' }
& $ArduinoCli lib install 'U8g2@2.36.17' @options
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar U8g2.' }
