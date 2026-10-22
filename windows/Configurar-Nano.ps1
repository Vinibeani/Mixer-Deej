param([ValidateSet('Verificar','Aplicar','Restaurar')][string]$Modo = 'Verificar', [Parameter(Mandatory=$true)][ValidatePattern('^COM[0-9]+$')][string]$Porta)
$ErrorActionPreference = 'Stop'
$resultFile = Join-Path $PSScriptRoot 'resultado-nano.json'
try {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class NanoDeviceProperties {
  [StructLayout(LayoutKind.Sequential)] public struct Key { public Guid Id; public uint Pid; }
  public class Value { public bool Exists; public uint Type; public string Data; }
  [DllImport("cfgmgr32.dll", CharSet=CharSet.Unicode, ExactSpelling=true)] static extern uint CM_Locate_DevNodeW(out uint node, string id, uint flags);
  [DllImport("cfgmgr32.dll", ExactSpelling=true)] static extern uint CM_Get_DevNode_PropertyW(uint node, ref Key key, out uint type, byte[] buffer, ref uint size, uint flags);
  [DllImport("cfgmgr32.dll", ExactSpelling=true)] static extern uint CM_Set_DevNode_PropertyW(uint node, ref Key key, uint type, byte[] buffer, uint size, uint flags);
  static uint Node(string id) { uint n; uint c=CM_Locate_DevNodeW(out n,id,0); if(c!=0)throw new Exception("Localizar dispositivo: CM "+c); return n; }
  static Key Prop(uint pid) { return new Key {Id=new Guid(pid==14?"a45c254e-df1c-4efd-8020-67d146a850e0":"7d0300e4-4fb7-493d-8a95-656f00e6a271"),Pid=pid}; }
  public static Value Read(string id,uint pid) {
    var k=Prop(pid); uint t,s=0,n=Node(id); uint c=CM_Get_DevNode_PropertyW(n,ref k,out t,null,ref s,0);
    if(c==37)return new Value {Exists=false,Type=0,Data=""};
    if(c!=0 && c!=26)throw new Exception("Ler propriedade: CM "+c);
    if(s>1048576)throw new Exception("Propriedade muito grande");
    byte[] b=new byte[s]; c=CM_Get_DevNode_PropertyW(n,ref k,out t,b,ref s,0);
    if(c!=0)throw new Exception("Ler propriedade: CM "+c);
    return new Value {Exists=true,Type=t,Data=Convert.ToBase64String(b)};
  }
  public static void Write(string id,uint pid,uint type,string data) {
    var k=Prop(pid); byte[] b=type==0?null:Convert.FromBase64String(data);
    uint c=CM_Set_DevNode_PropertyW(Node(id),ref k,type,b,b==null?0:(uint)b.Length,0);
    if(c!=0)throw new Exception("Gravar propriedade: CM "+c+" (51 = requer administrador)");
  }
}
'@
  $devices = @(Get-PnpDevice -PresentOnly -Class Ports | Where-Object { $_.InstanceId -match '^USB\\VID_1A86&PID_7523\\[^\\]+$' })
  # Locate the exact CH340 interface by its COM mapping, even after renaming it.
  $matches = @($devices | Where-Object {
    $parameters = "Registry::HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Enum\$($_.InstanceId)\Device Parameters"
    (Get-ItemProperty -LiteralPath $parameters -Name PortName -ErrorAction SilentlyContinue).PortName -eq $Porta
  })
  if($matches.Count -ne 1) { throw "Conecte o Nano CH340 na porta $Porta. Nenhum outro dispositivo será alterado." }
  $deviceId = $matches[0].InstanceId
  $backupName = 'backup-nano-' + ($deviceId -replace '[^A-Za-z0-9_-]', '_') + '.json'
  $backupFile = Join-Path $PSScriptRoot $backupName
  $properties = @(14,2,4,5) # Friendly name, container model, category and icon; no driver/class changes.
  $before = @($properties | ForEach-Object { [pscustomobject]@{Id=$_;Value=[NanoDeviceProperties]::Read($deviceId,$_)} })
  if($Modo -ne 'Verificar') {
    $admin = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if(!$admin) { throw 'O Windows exige administrador para ajustar nome, categoria e ícone deste Nano.' }
    if($Modo -eq 'Aplicar') {
      if(!(Test-Path -LiteralPath $backupFile)) { [pscustomobject]@{DeviceId=$deviceId;Properties=$before} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $backupFile -Encoding UTF8 }
      $backup = Get-Content -LiteralPath $backupFile -Raw | ConvertFrom-Json
      if($backup.DeviceId -ne $deviceId) { throw 'O backup pertence a outro dispositivo.' }
      $iconPath = (Resolve-Path (Join-Path $PSScriptRoot '../mixer-app/assets/icon.ico')).Path
      try {
        [NanoDeviceProperties]::Write($deviceId,14,0x12,[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes("Mixer de Audio`0")))
        [NanoDeviceProperties]::Write($deviceId,2,0x12,[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes("Mixer de Audio`0")))
        [NanoDeviceProperties]::Write($deviceId,4,0x2012,[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes("Input`0`0")))
        [NanoDeviceProperties]::Write($deviceId,5,0x12,[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($iconPath+"`0")))
      } catch {
        foreach($p in $before) { [NanoDeviceProperties]::Write($deviceId,$p.Id,$p.Value.Type,$p.Value.Data) }
        throw
      }
    } else {
      $backup = Get-Content -LiteralPath $backupFile -Raw | ConvertFrom-Json
      if($backup.DeviceId -ne $deviceId) { throw 'O backup pertence a outro dispositivo.' }
      foreach($p in $backup.Properties) { [NanoDeviceProperties]::Write($deviceId,$p.Id,$p.Value.Type,$p.Value.Data) }
    }
  }
  $after = @($properties | ForEach-Object { $v=[NanoDeviceProperties]::Read($deviceId,$_); [pscustomobject]@{Id=$_;Exists=$v.Exists;Type=$v.Type;Text=if($v.Exists){[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($v.Data)).Trim([char]0)}else{''}} })
  $result = [pscustomobject]@{Ok=$true;Mode=$Modo;DeviceId=$deviceId;Properties=$after}
  $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $resultFile -Encoding UTF8
  $result | ConvertTo-Json -Depth 8
} catch {
  [pscustomobject]@{Ok=$false;Mode=$Modo;Error=$_.Exception.Message} | ConvertTo-Json | Set-Content -LiteralPath $resultFile -Encoding UTF8
  throw
}
