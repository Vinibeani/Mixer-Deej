$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -Path (Join-Path $PSScriptRoot 'CoreAudio.cs')
while ($null -ne ($line = [Console]::ReadLine())) {
    $request = $null
    try {
        $request = $line | ConvertFrom-Json
        switch ($request.command) {
            'list' { $result = @([MixerAudio.Controller]::List()) }
            'set' { $result = @{ matched = [MixerAudio.Controller]::Set([string[]]$request.targets, [single]$request.volume) } }
            'endpoints' { $result = @([MixerAudio.Controller]::Endpoints()) }
            'all-apps' {
                $apps = @{}
                $shell = New-Object -ComObject WScript.Shell
                try {
                    $folders = @([Environment]::GetFolderPath('CommonStartMenu'), [Environment]::GetFolderPath('StartMenu'))
                    foreach ($folder in $folders) {
                        Get-ChildItem -LiteralPath $folder -Filter '*.lnk' -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
                            $shortcut = $shell.CreateShortcut($_.FullName)
                            try { $target = $shortcut.TargetPath; if ($target -match '\.exe$' -and (Test-Path -LiteralPath $target)) { $apps[$target] = @{ target = $target; path = $target; name = $_.BaseName } } }
                            finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shortcut) }
                        }
                    }
                } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
                foreach ($key in @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths','HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths')) {
                    Get-ChildItem -LiteralPath $key -ErrorAction SilentlyContinue | ForEach-Object {
                        $target = $_.GetValue('')
                        if ($target) {
                            $target = $target.Trim('"')
                            if ((Test-Path -LiteralPath $target -PathType Leaf) -and (-not $apps.ContainsKey($target))) {
                                $apps[$target] = @{ target = $target; path = $target; name = [IO.Path]::GetFileNameWithoutExtension($target) }
                            }
                        }
                    }
                }
                $result = @($apps.Values | Sort-Object name)
            }
            default { throw 'Comando de áudio desconhecido.' }
        }
        $response = @{ id = $request.id; result = $result }
    } catch {
        $response = @{ id = $request.id; error = $_.Exception.Message }
    }
    [Console]::WriteLine((ConvertTo-Json -InputObject $response -Depth 8 -Compress))
}
