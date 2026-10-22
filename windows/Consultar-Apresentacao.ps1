# Read the metadata used by the Devices and Printers catalog; no UI interaction.
$ErrorActionPreference='Stop'
$deviceShell = New-Object -ComObject Shell.Application
try {
  $deviceFolder = $deviceShell.Namespace('shell:::{A8A91A66-3A7D-4424-8D24-04E180695C7A}')
  @($deviceFolder.Items()) | Where-Object { $_.Name -eq 'Mixer de Audio' } | ForEach-Object {
    [pscustomobject]@{
      Name=$_.Name
      CategoryIds=$_.ExtendedProperty('System.Devices.CategoryIds')
      Category=$_.ExtendedProperty('System.Devices.Category')
      Icon=$_.ExtendedProperty('System.Devices.Icon')
      ContainerId=$_.ExtendedProperty('System.Devices.ContainerId')
    }
  } | ConvertTo-Json -Depth 5
} finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($deviceShell) }
