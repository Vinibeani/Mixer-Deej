# Mixer de Audio no Painel de Controle

O Nano CH340 deste projeto foi configurado em 18/10/2026 para aparecer como **Mixer de Audio**, categoria **Dispositivo de entrada**, com o ícone próprio. O nome e os metadados foram conferidos no catálogo Dispositivos e Impressoras do Windows.

## Aplicar no Nano CH340

O arquivo `Configurar-Nano.ps1` aceita `-Modo Verificar`, `Aplicar` ou `Restaurar`, sempre com `-Porta COM12` (troque pela porta real). Ele identifica o único CH340 `VID_1A86&PID_7523` mapeado para aquela COM e ajusta só esse dispositivo.

```powershell
./windows/Configurar-Nano.ps1 -Modo Verificar -Porta COM12
# Aplicar ou restaurar exige PowerShell como administrador:
./windows/Configurar-Nano.ps1 -Modo Aplicar -Porta COM12
./windows/Configurar-Nano.ps1 -Modo Restaurar -Porta COM12
```

O script salva um backup por dispositivo antes de mudar nome, modelo do contêiner, categoria e ícone. Não altera o driver CH340, classe Ports, COM, firmware ou identificadores USB. O resultado fica em `resultado-nano.json`. A categoria representa um controlador físico; não cria uma saída de som USB.

O ajuste é **local a este Windows**. O ATmega328P não controla o descritor USB do CH340. Em outro computador, ou se o Windows criar uma nova instância ao mudar de porta USB, aplique o ajuste novamente. Mantenha `mixer-app/assets/icon.ico` no caminho em que o script foi aplicado; se mover o projeto, reaplique. Pode ser necessário atualizar ou reabrir o Painel de Controle.

As propriedades de categoria e ícone usam metadados de contêiner das versões recentes do Windows 11. Em versões anteriores, o nome amigável pode ser ajustado, mas os metadados podem não aparecer da mesma forma. `Consultar-Apresentacao.ps1` lê o catálogo para conferir o resultado.

`Configurar-Dispositivo.ps1` pertence ao histórico Pro Micro e não deve ser usado no Nano.

Referências Microsoft: [nome amigável do dispositivo](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/devpkey-device-friendlyname), [metadados de contêiner](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/driver-package-container-metadata).
