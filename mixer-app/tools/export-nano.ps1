param([string]$Destino)
$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (!$Destino) { $version = (Get-Content -LiteralPath (Join-Path $root 'mixer-app/package.json') -Raw | ConvertFrom-Json).version; $Destino = Join-Path $root "entregas/mixer-de-audio-nano-fonte-$version" }
if (Test-Path -LiteralPath $Destino) { throw 'Destino existente. Escolha outra pasta para preservar a entrega anterior.' }
New-Item -ItemType Directory -Path $Destino | Out-Null
foreach ($folder in @('mixer-app','firmware','windows','licenses','docs/images')) {
  New-Item -ItemType Directory -Path (Join-Path $Destino $folder) -Force | Out-Null
}
foreach ($file in @('README.md','THIRD_PARTY.md','VALIDACAO-NANO.md')) {
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $Destino $file)
}
foreach ($file in @('package.json','package-lock.json','main.cjs','preload.cjs','README.md','.gitignore')) {
  Copy-Item -LiteralPath (Join-Path $root "mixer-app/$file") -Destination (Join-Path $Destino "mixer-app/$file")
}
foreach ($folder in @('audio','assets','lib','ui','test','tools')) {
  Copy-Item -LiteralPath (Join-Path $root "mixer-app/$folder") -Destination (Join-Path $Destino 'mixer-app') -Recurse
}
Copy-Item -LiteralPath (Join-Path $root 'firmware/MixerNano') -Destination (Join-Path $Destino 'firmware') -Recurse
foreach ($file in @('README.md','PROTOCOLO-NANO.md','preparar-nano.ps1','compilar-nano.ps1','gravar-nano.ps1','compilar.ps1','gravar.ps1','MixerNano-ATmega328P-5V16MHz.hex')) {
  Copy-Item -LiteralPath (Join-Path $root "firmware/$file") -Destination (Join-Path $Destino "firmware/$file")
}
foreach ($file in @('Configurar-Nano.ps1','Consultar-Apresentacao.ps1','README.md')) {
  Copy-Item -LiteralPath (Join-Path $root "windows/$file") -Destination (Join-Path $Destino "windows/$file")
}
Copy-Item -LiteralPath (Join-Path $root 'mixer-app/node_modules/serialport/LICENSE') -Destination (Join-Path $Destino 'licenses/SerialPort-MIT.txt')
Copy-Item -LiteralPath (Join-Path $root 'mixer-app/node_modules/@serialport/bindings-cpp/LICENSE') -Destination (Join-Path $Destino 'licenses/SerialPort-bindings-MIT.txt')
Copy-Item -LiteralPath (Join-Path $root '.dev-tools/arduino/user/libraries/U8g2/LICENSE') -Destination (Join-Path $Destino 'licenses/U8g2.txt')
foreach ($image in @('mixer-preview.png','mixer-nano-connected.png','mixer-labels-preview.png')) {
  Copy-Item -LiteralPath (Join-Path $root $image) -Destination (Join-Path $Destino "docs/images/$image")
}
@'
**/node_modules/
**/dist/
.dev-tools/
.arduino/
firmware/.compile*/
firmware/build*/
**/.qa-*/
**/mixer.json*
windows/backup-*.json
windows/resultado-*.json
.env
.env.*
*.log
*.tmp
*.bak
Thumbs.db
.DS_Store
'@ | Set-Content -LiteralPath (Join-Path $Destino '.gitignore') -Encoding utf8
@'
* text=auto
*.hex text eol=lf
*.png binary
*.ico binary
'@ | Set-Content -LiteralPath (Join-Path $Destino '.gitattributes') -Encoding utf8
Add-Content -LiteralPath (Join-Path $Destino 'README.md') -Encoding utf8 -Value "`nEste pacote de fontes contém somente a versão Nano ativa. Executáveis, ferramentas locais, configurações pessoais e históricos não estão incluídos. O aplicativo portátil é distribuído separadamente; também pode ser gerado com npm run pack."
$zip = $Destino + '.zip'
if (Test-Path -LiteralPath $zip) { throw 'ZIP de destino existente.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($Destino, $zip, [IO.Compression.CompressionLevel]::Optimal, $true)
Get-FileHash -LiteralPath $zip -Algorithm SHA256
