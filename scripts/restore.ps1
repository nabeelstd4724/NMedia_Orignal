param([Parameter(Mandatory=$true)][string]$Archive)
$ErrorActionPreference = "Stop"
Expand-Archive -Path $Archive -DestinationPath . -Force
Write-Output "Restored $Archive"
