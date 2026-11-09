param([string]$BackupDir = "./backups")
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$destination = Join-Path $BackupDir "nmedia-$stamp.zip"
Compress-Archive -Path "backend","frontend","contracts","database","docs","scripts","package.json","package-lock.json","Dockerfile","docker-compose.yml" -DestinationPath $destination
Write-Output "Created $destination"
