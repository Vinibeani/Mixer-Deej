param([string]$ArduinoCli, [string]$ConfigFile)
# Current project target: Arduino Nano ATmega328P.
& (Join-Path $PSScriptRoot 'compilar-nano.ps1') @PSBoundParameters
