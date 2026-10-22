param(
  [Parameter(Mandatory=$true)][ValidatePattern('^COM[0-9]+$')][string]$Porta,
  [ValidateSet('Antigo','Novo')][string]$Bootloader = 'Novo',
  [string]$ArduinoCli, [string]$ConfigFile
)
# Current project target: Arduino Nano ATmega328P.
& (Join-Path $PSScriptRoot 'gravar-nano.ps1') @PSBoundParameters
