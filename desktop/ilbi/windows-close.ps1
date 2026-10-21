param([Parameter(Mandatory=$true)][string]$InstallDirectory)
$ErrorActionPreference = 'Stop'
$executable = [IO.Path]::GetFullPath((Join-Path $InstallDirectory 'ILBI.exe'))
function Find-InstalledProcesses {
    @(Get-Process -Name ILBI -ErrorAction SilentlyContinue | Where-Object {
        try { $_.Path -and [string]::Equals([IO.Path]::GetFullPath($_.Path), $executable, [StringComparison]::OrdinalIgnoreCase) } catch { $false }
    })
}
$wasRunning = (Find-InstalledProcesses).Count -gt 0
if ($wasRunning) {
    # Ask ILBI through its single-instance channel, even when minimized or when
    # Windows cannot identify its main window. Older apps also get WM_CLOSE.
    $null = Start-Process -FilePath $executable -ArgumentList '--ilbi-quit-for-update' -WindowStyle Hidden -PassThru
}
$deadline = (Get-Date).AddSeconds(180)
do {
    $running = Find-InstalledProcesses
    if ($running.Count -eq 0) { if ($wasRunning) { exit 10 } else { exit 0 } }
    foreach ($process in $running) {
        try { if ($process.MainWindowHandle -ne 0) { $null = $process.CloseMainWindow() } } catch {}
    }
    Start-Sleep -Milliseconds 300
} while ((Get-Date) -lt $deadline)
# Never terminate a store process while it may still be committing a sale.
exit 1
