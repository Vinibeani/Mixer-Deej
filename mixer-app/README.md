# Mixer de Audio — 0.4.1 para Nano

Aplicativo portátil para Windows x64. Abra `dist/Mixer de Audio 0.4.1.exe`. Usa Arduino Nano ATmega328P 5 V/16 MHz, firmware MX Nano v2 e comunicação USB serial a 115200 baud.

A interface preserva os quatro controles, associações a aplicativos e áudio do sistema, os 1.897 ícones e as três prévias da OLED. Continua em português, sem MIDI, sem botão de comunidade e sem texto ou envio de imagem como rótulo. O ícone do projeto, configurações, bandeja e opção de iniciar com Windows foram preservados.

## Usar

1. Grave o firmware Nano; consulte `../firmware/README.md`.
2. Feche o Monitor Serial e as outras cópias do mixer. Abra o executável 0.4.1.
3. Com uma única interface USB serial compatível, a conexão começa automaticamente. O status só fica Conectado após a identificação do firmware.
4. Com várias interfaces, selecione a COM do Nano em Configurações → Dispositivo e clique em Conectar. Desconectar pausa a conexão automática até Conectar ou reiniciar o aplicativo.
5. Clique no botão abaixo de cada controle para associar aplicativos, volume geral, microfone ou dispositivos de áudio. Escolha o ícone na aba Ícones.
6. Selecione Colunas, Linhas ou Canal em destaque à direita. Brilho da OLED fica em Configurações.

## Atualização 0.4.1

- O botão do canal mostra apenas o ícone escolhido, sem contador de aplicativos. A seleção de vários aplicativos permanece disponível.
- **Atualizar** consulta novamente as sessões de áudio em todas as saídas ativas do Windows, inclusive executáveis abertos depois do mixer. Com **Todos os aplicativos** marcado, também refaz a consulta aos programas instalados.
- A identificação dos processos usa `QueryFullProcessImageName` com permissão de consulta limitada. Se o Windows não liberar o caminho, a sessão pode ser identificada pelo nome do processo. Uma sessão encerrada durante a consulta não interrompe a leitura das demais.
- Os nomes originais dos processos são mantidos. Não há renomeação específica para LoL ou outros jogos: qualquer aplicativo que crie uma sessão de áudio pode ser encontrado ao clicar em **Atualizar**.
- A busca aceita o nome exibido e o caminho/nome do executável. Passe o mouse sobre a linha para consultar o destino.

Nenhuma atualização do HEX é necessária para esta versão. O firmware MX Nano v2 permanece compatível. As configurações de canais e ícones existentes são mantidas.

O nome, modelo e versão vêm da identificação do firmware. O adaptador USB do Nano pode continuar com o nome do fabricante no Windows até aplicar `../windows/Configurar-Nano.ps1`. Essa configuração local não interfere na comunicação serial.

Os canais podem ser configurados sem placa. Sem potenciômetros, as entradas analógicas ficam flutuantes; não associe destinos de áudio a esses canais durante a montagem. O áudio é alterado por Core Audio no Windows, não passa pelo Arduino.

As configurações anteriores são mantidas em `%APPDATA%/mixer-de-audio/mixer.json`. A primeira posição física recebida sincroniza os volumes. Movimentos posteriores retomam o controle após uma alteração feita pelo mouse ou no Windows. Não há motores nem soft takeover.

## Desenvolvimento

Com Node.js 24 e npm no PATH:

```powershell
npm ci
npm test
npm start
npm run pack
```

No ambiente local deste projeto, adicione `.dev-tools` ao PATH para usar o npm já preparado. Não é necessário reinstalar dependências globalmente. O executável inclui a biblioteca serial nativa; não depende do Node instalado na máquina de uso.

`tools/smoke.cjs` verifica os menus, português, ícones e persistência com perfil separado e conexão automática desabilitada. `tools/check-nano.cjs COM12` testa a serial física sem carregar o serviço de áudio. `tools/check-nano-app.cjs` verifica conexão automática, informações, desconexão e reconexão em perfil sem destinos. Execute essas ferramentas com outras cópias do mixer e monitores seriais fechados.

O teste de empacotamento `--verify` também usa perfil isolado. Testes físicos dos novos potenciômetros e OLED no Nano dependem de suas ligações; ver `../VALIDACAO-NANO.md`.

O ícone próprio está em `assets/icon.svg`, com recursos PNG/ICO para aplicativo e bandeja. Font Awesome: `ui/ICON-LICENSE.txt` e `ui/BRAND-ICON-LICENSE.txt`. A aparência usa Dot X como referência visual; este aplicativo é uma implementação independente.
