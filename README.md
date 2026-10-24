# Mixer de Audio — Arduino Nano

Mixer físico de quatro canais para Windows, com quatro potenciômetros B10K e OLED SSD1306 branca de 0,96″. Aplicativo **0.4.1**, firmware **MX Nano v2.0**, placa **Nano clássico ATmega328P, 5 V / 16 MHz**. A comunicação é USB serial a 115200 baud.

## Arquivos para usar

- Aplicativo portátil: `mixer-app/dist/Mixer de Audio 0.4.1.exe`.
- Firmware: `firmware/MixerNano-ATmega328P-5V16MHz.hex`.
- Código do Arduino: `firmware/MixerNano/MixerNano.ino`.
- Ligações e gravação: [firmware/README.md](firmware/README.md).
- Nome e ícone no Painel de Controle: [windows/README.md](windows/README.md).

## Atualização 0.4.1

O botão de cada canal não mostra mais a quantidade de aplicativos associados. **Atualizar** consulta novamente as sessões de áudio de todas as saídas do Windows e refaz o catálogo instalado quando **Todos os aplicativos** está marcado. A identificação dos processos ficou mais tolerante a restrições de acesso e ao fechamento de uma sessão durante a consulta.

Os nomes originais dos processos são mantidos, sem rótulos especiais para jogos. Com o programa aberto e com áudio, clique em **Atualizar** e associe-o ao canal desejado. Esta versão usa o mesmo firmware e mantém as configurações existentes.

O HEX foi gravado e verificado no Nano CH340 conectado à COM12 em 18/10/2026. Essa placa usa o bootloader **Novo**, a 115200 baud. O número da porta pode mudar. Não grave o HEX do Nano no Pro Micro.

## O que permanece no aplicativo

- Quatro canais, com um ou vários destinos de áudio: aplicativos, volume geral, microfone, sons do sistema e dispositivos de entrada/saída.
- Interface em português, quatro seletores de ícones e três modelos de tela: Colunas, Linhas e Canal em destaque.
- Catálogo de 1.897 ícones, incluindo 495 marcas, com busca e recentes; o ícone selecionado é enviado à OLED.
- Brilho da OLED, bandeja, iniciar com Windows e inversão dos controles.
- Conexão automática, informações do firmware e reconexão USB.

O áudio passa pelas APIs Core Audio do Windows. O Arduino transmite posições e recebe informações da tela; não é uma placa de som USB. HID e serial não mudam a resolução analógica: o Nano clássico usa ADC de 10 bits, de 0 a 1023.

## Estrutura atual

`mixer-app/` contém o aplicativo, interface, integração de áudio e testes. `firmware/MixerNano/` contém o sketch atual. `windows/` contém o ajuste local de nome, categoria e ícone. `entregas/` contém os pacotes preparados para uso e arquivo privado. As versões Pro Micro anteriores permanecem como histórico; os fontes antigos empacotados estão em `entregas/mixer-de-audio-fonte-0.3.4/`. O REA e os arquivos do Dot X são referências de desenvolvimento, não dependências do mixer.

## Desenvolvimento

Em `mixer-app`, com Node.js 24 e npm disponíveis:

```powershell
npm ci
npm test
npm start
npm run pack
```

O firmware usa Arduino AVR Boards **1.8.6** e U8g2 **2.36.17**. Veja os scripts de preparação e compilação no guia de firmware. Dependências, condições de uso e referência visual estão em `THIRD_PARTY.md` no pacote de fontes. Nenhuma licença pública foi escolhida para o código próprio.

## Validação e limites

O protocolo serial inclui CRC, confirmação de comandos, descarte de quadros inválidos e timeout de conexão. Os testes cobrem leitura fragmentada, corrupção, reconexão e preservação da seleção de ícones. A comunicação com o Nano real e a conexão automática no aplicativo foram verificadas, com perfil de teste sem destinos de áudio.

Na validação de 18/10/2026, a OLED não respondeu ao Nano e os potenciômetros novos ainda não foram validados fisicamente. Leituras de entradas desconectadas são flutuantes. A migração não comprova o funcionamento das ligações ainda não montadas. Evidências em [VALIDACAO-NANO.md](VALIDACAO-NANO.md).

Em 23/10/2026, o usuário confirmou que a montagem com a OLED e os quatro potenciômetros está funcionando. A atualização 0.4.1 foi verificada separadamente no Windows, sem regravar o Arduino.

Este pacote de fontes contém somente a versão Nano ativa. Executáveis, ferramentas locais, configurações pessoais e históricos não estão incluídos. O aplicativo portátil é distribuído separadamente; também pode ser gerado com npm run pack.
