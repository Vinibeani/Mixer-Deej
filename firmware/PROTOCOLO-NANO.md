# MX Nano v2

Serial **115200, 8N1**, sem controle de fluxo. O firmware envia posições a cada movimento (máximo de 50 mensagens/s) e heartbeat a cada segundo. A abertura da COM pode reiniciar o Nano; o aplicativo espera até 6,5 s pela identificação válida antes de conectar. Nenhum comando é enviado antes dessa identificação.

Cada quadro tem 66 bytes: 64 bytes de conteúdo e CRC-16/CCITT-FALSE nos bytes 64–65, menos significativo primeiro. Parâmetros: polinômio `0x1021`, inicial `0xFFFF`, sem reflexão, XOR final zero; vetor `123456789` → `0x29B1`. Os receptores recuperam a sincronização após ruído ou quadros incompletos.

| Bytes do conteúdo | Conteúdo |
| --- | --- |
| 0–2 | `4D 58 02` (MX, versão 2) |
| 3 | Tipo/comando |
| 4–62 | Dados e preenchimento zero |
| 63 | Sequência do comando enviado pelo PC |

Comandos PC → Nano:

- `01`: byte 4 = layout 0, 1 ou 2.
- `02`: byte 4 = canal 0–3; bytes 5–36 = XBM 16×16, bit menos significativo primeiro.
- `03`: bytes 4–7 = níveis exibidos 0–100; não altera as posições físicas.
- `04`: byte 4 = brilho/contraste OLED 0–255.

Confirmação Nano → PC `11`: byte 4 = comando; byte 5 = sequência recebida. O PC mantém um comando em trânsito, tenta até três envios e exige comando/sequência correspondentes. Comandos são idempotentes. Atualizações pendentes do mesmo item são substituídas pela mais recente.

Posições Nano → PC `10`: bytes 4–7 = posições 0–100; byte 8 = máscara dos canais alterados; byte 9 = `A1`; bytes 10–11 = versão 2.0; byte 12 = endereço OLED ou zero; byte 13 = modelo 1 (Nano ATmega328P); bytes 14–21 = quatro leituras ADC de 16 bits little-endian (0–1023), com média de quatro amostras antes da filtragem de volume. O heartbeat tem máscara zero. A primeira mensagem depois de ligar tem máscara 15 e sincroniza os quatro volumes. O PC confirma a identidade por assinatura, CRC, modelo e versão, não só pelo fabricante do adaptador USB.

Somente canais marcados alteram o áudio. Atualizações externas do Windows e mudanças feitas pelo mouse podem mudar os níveis na tela; um novo movimento físico reassume o canal. O firmware não grava EEPROM. A recepção serial é atendida entre transferências I2C para evitar transbordamento do buffer UART durante o desenho.

Este protocolo não é o protocolo do produto Dot X nem o MX HID v1 do histórico Pro Micro.
