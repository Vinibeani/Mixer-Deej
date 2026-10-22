# Componentes e referências

O código próprio deste projeto ainda não possui uma licença pública escolhida. Os componentes de terceiros mantêm seus respectivos avisos e condições.

| Componente | Versão | Origem e condições |
| --- | --- | --- |
| Electron | 38.2.0 | [electron/electron](https://github.com/electron/electron), MIT e avisos de seus componentes |
| SerialPort e bindings C++ | 13.0.0 | [serialport/node-serialport](https://github.com/serialport/node-serialport), MIT; avisos em `licenses/` no pacote de fontes |
| Font Awesome Free Solid/Brands | 6.7.2 | [FortAwesome/Font-Awesome](https://github.com/FortAwesome/Font-Awesome), ícones CC BY 4.0/código MIT; avisos em `mixer-app/ui/ICON-LICENSE.txt` e `BRAND-ICON-LICENSE.txt` |
| electron-builder | 26.0.12 | [electron-userland/electron-builder](https://github.com/electron-userland/electron-builder), MIT |
| rcedit | 4.0.1 | [electron/node-rcedit](https://github.com/electron/node-rcedit), MIT |
| Arduino AVR Core | 1.8.6 | [arduino/ArduinoCore-avr](https://github.com/arduino/ArduinoCore-avr), LGPL 2.1 ou posterior conforme cabeçalhos |
| U8g2 | 2.36.17 | [olikraus/u8g2](https://github.com/olikraus/u8g2), BSD de duas cláusulas no código; fontes gráficas têm condições e créditos próprios |

As dependências transitivas e suas versões estão em `mixer-app/package-lock.json`; os avisos correspondentes acompanham os pacotes instalados. Os recursos compilados e o runtime Electron mantêm seus avisos na distribuição. O gerador opcional do ícone usa `sharp` (Apache-2.0), que pode ser instalado separadamente para regerar os recursos; os PNG/ICO prontos já estão incluídos e não exigem esse gerador para compilar o aplicativo.

O firmware Nano não usa HID-Project nem SparkFun AVR Boards. A aparência e organização do aplicativo usam [Dot X, da Dot Matrix Labs](https://docs.dotmatrixlabs.com/dot-x/getting-started.html) como referência solicitada pelo usuário. O código é uma implementação independente; o executável e o instalador do produto original não estão no pacote. REA também não é uma dependência do mixer.
