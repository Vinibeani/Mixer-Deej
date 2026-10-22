# Validação da migração para Arduino Nano

Data: **18/10/2026**, Windows 11 x64 do usuário.

## Firmware

- Placa física identificada: CH340 `VID_1A86&PID_7523`, COM12, assinatura ATmega328P `0x1E950F`.
- Bootloader respondeu a **115200 baud** (opção Novo); a tentativa inicial a 57600 não concluiu e foi encerrada.
- Firmware MX Nano v2.0 compilado com Arduino AVR Boards 1.8.6 e U8g2 2.36.17.
- Flash: **15.140 / 30.720 bytes**. RAM estática: **1.155 / 2.048 bytes**.
- HEX somente de aplicação, gravado com `arduino-cli upload --verify`; retorno zero. Nenhum fuse ou bootloader foi gravado. Os valores de fuse informados pelo protocolo STK500 do bootloader não foram usados como leitura confiável dos fuses físicos.
- SHA256 do HEX: `5BF31095DE50E85F9C15D701710A0DFB506B26B6128DF4D46A627207C61A5710`.
- Uma cópia dos fontes do pacote de entrega foi compilada pelo script portátil e reproduziu o mesmo HEX byte a byte.

## Serial física e aplicativo

- `tools/check-nano.cjs COM12`: recebeu identidade MX Nano v2.0, quatro valores ADC, **10 comandos confirmados**, desconexão e reconexão. Não carregou o serviço de áudio.
- `tools/check-nano-app.cjs`: conexão automática com o Nano real dentro do Electron; nome **Mixer de Audio**, modelo **Arduino Nano · ATmega328P**, versão **MX Nano v2.0**, status **Conectado**. Desconectar permaneceu desconectado após o próximo ciclo automático; Conectar restabeleceu a conexão.
- Perfil de teste isolado, sem destinos de áudio. Configurações reais e autostart do usuário não foram alterados.
- `tools/smoke.cjs`: quatro canais, três modelos de tela, 1.897 ícones/495 marcas, busca em português, bitmap OLED e persistência. As opções removidas continuaram ausentes.
- **20 testes automatizados passaram**: CRC com vetor de referência, fragmentação em cada posição de corte, ruído, corrupção, validação de identidade, confirmação/sequência, reenvio, timeout, reconexão, cancelamento de conexão e seleção de ícones.
- Executável portátil **0.4.0** gerado e executado com `--verify`: quatro canais, três modelos de tela, enumeração serial e serviço de áudio disponíveis no pacote.
- A mesma verificação física do aplicativo foi executada carregando o `main.cjs` de `resources/app.asar`, comprovando a biblioteca serial nativa e a conexão automática da versão empacotada.
- SHA256 do executável: `E234FCC23D0A680458792A2DF1509F7E1C1928CF95C14F14E3E5AE452D9CE2AF`.

## Nome no Windows

- `windows/Configurar-Nano.ps1 -Modo Aplicar -Porta COM12`: backup das propriedades anteriores e aplicação de nome, modelo do contêiner, categoria e ícone.
- `windows/Consultar-Apresentacao.ps1`: o catálogo Dispositivos e Impressoras retornou **Mixer de Audio**, categoria **Input / Dispositivo de entrada**, ícone próprio do projeto.
- PnP do Nano permaneceu com status OK. Driver CH340, classe Ports e COM12 preservados. A alteração é local ao computador/instância USB.

## Pendências físicas

A OLED não respondeu ao Nano nesta validação (`oledAddress: null`). Os quatro potenciômetros novos não foram validados fisicamente. Os valores ADC observados sem circuito completo não demonstram leitura de um potenciômetro nem substituem teste de curso 0–1023. A validação comprovou comunicação e integração do aplicativo com a placa, não o funcionamento de uma montagem ainda não concluída.

## Diferença para a versão anterior

O aplicativo 0.4.0 e o firmware MX Nano v2 se comunicam por serial. Não usam a interface HID do Pro Micro nem são compatíveis com o firmware original do Dot X. A interface e as funcionalidades solicitadas pelo usuário foram preservadas.

