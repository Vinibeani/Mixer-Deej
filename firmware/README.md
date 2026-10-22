# Firmware Nano + SSD1306

A versão atual usa **Arduino Nano clássico ATmega328P, 5 V / 16 MHz**, com comunicação **USB serial a 115200 baud**. Arquivo: `MixerNano-ATmega328P-5V16MHz.hex`. Fonte: `MixerNano/MixerNano.ino`.

## Ligações

Desconecte o USB antes de soldar ou mudar os fios.

| Componente | Pino no Nano |
| --- | --- |
| Terminal central do B10K 1 | A0 |
| Terminal central do B10K 2 | A1 |
| Terminal central do B10K 3 | A2 |
| Terminal central do B10K 4 | A3 |
| Um terminal externo de cada B10K | 5V |
| Outro terminal externo de cada B10K | GND |
| OLED GND | GND |
| OLED VDD/VCC | 5V, se o módulo aceitar alimentação e sinais de 5 V |
| OLED SDA | A4 |
| OLED SCL/SCK | A5 |

Use o pino **5V**, não VIN. Todos os GND devem estar em comum. No Nano, a OLED usa **A4/A5**, não os pinos 2/3 usados no Pro Micro. Não use D0/D1 para os potenciômetros: são usados pela comunicação serial.

O SSD1306 não garante, sozinho, a tolerância de todo o módulo a 5 V. Siga a especificação do módulo; para módulo exclusivamente 3,3 V, use alimentação e adaptação de nível adequadas. A tela branca usa os mesmos desenhos monocromáticos. O firmware procura 0x3C e 0x3D e continua operando sem OLED.

Potenciômetros B10K de três terminais podem ser ligados diretamente, sem resistor, diodo ou capacitor em série. Com a peça desconectada, confira perto de 10 kΩ entre os terminais externos e resistência variável do central para um externo. Depois de montar, a tensão do central para GND deve percorrer aproximadamente 0 V até a tensão do 5V ao girar. Se o sentido ficar invertido, troque somente as duas extremidades ou use a inversão no aplicativo.

Fios curtos de cobre de cabo de rede podem servir. Isole as soldas e dê apoio mecânico aos fios rígidos para evitar quebras. A filtragem não corrige uma entrada sem sinal. Canais desconectados podem variar; durante testes sem todos os potenciômetros, mantenha os canais sem associação a destinos de áudio.

## Gravar o HEX

O arquivo contém somente a aplicação. Não substitui o bootloader e não deve ser gravado no Pro Micro, Nano Every, Nano ESP32 ou outras placas da família Nano.

O Nano CH340 conectado neste projeto foi identificado na **COM12**, com bootloader **Novo** (115200 baud), e a gravação foi verificada em 18/10/2026. Feche o aplicativo e o Monitor Serial antes de gravar.

Com Arduino CLI disponível, na raiz do projeto:

```powershell
./firmware/gravar-nano.ps1 -Porta COM12 -Bootloader Novo
```

Para outro Nano ATmega328P que use o bootloader antigo, o mesmo HEX serve; escolha `-Bootloader Antigo` (57600 baud). O script verifica a memória gravada e não altera fuses. O número da COM deve corresponder à sua placa. No Arduino IDE, selecione Nano e o processador/bootloader correspondente; o sketch também pode ser aberto e enviado diretamente pelo IDE.

O aplicativo 0.4.0 só conecta depois que o firmware MX Nano v2 responde. Não use o executável antigo 0.3.x, que se comunicava por HID. No Gerenciador de Dispositivos, o nome do adaptador CH340 é independente do programa do ATmega328P: veja `../windows/README.md` para aplicar Mixer de Audio localmente.

## Preparar e recompilar

Dependências: Arduino AVR Boards **1.8.6** e U8g2 **2.36.17**. FQBN: `arduino:avr:nano:cpu=atmega328`. A compilação também serve ao bootloader antigo porque contém apenas o aplicativo.

```powershell
./firmware/preparar-nano.ps1
./firmware/compilar-nano.ps1
```

Os scripts aceitam `-ArduinoCli CAMINHO` e `-ConfigFile CAMINHO`. Neste ambiente, o compilador local de `.dev-tools/arduino` já está configurado; no pacote de fontes, o padrão usa `arduino-cli` do PATH. Resultado: `MixerNano-ATmega328P-5V16MHz.hex`. A compilação de referência usa **15.140 bytes de flash** e **1.155 bytes de RAM**, deixando 893 bytes para variáveis locais/pilha.

## Leitura e tela

Cada canal descarta a primeira conversão após mudar a entrada, faz média de quatro leituras e aplica suavização e histerese no volume. As leituras ADC vão de 0 a 1023; o aplicativo recebe também esses valores para diagnóstico. HID não acrescentaria precisão ao ADC.

Os três layouts, quatro ícones e brilho são reenviados pelo aplicativo na conexão. Recepção serial e OLED são atendidas sem depender de uma tela presente. Um timeout I2C desativa o desenho até reiniciar a placa, mantendo a serial disponível. Detalhes em `PROTOCOLO-NANO.md`.

As pastas `MixerProMicro/` e `diagnostico/`, quando presentes no ambiente de trabalho, pertencem à versão anterior e não são usadas pela versão Nano.
