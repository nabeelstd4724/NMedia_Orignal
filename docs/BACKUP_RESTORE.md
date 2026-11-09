# Backup and restore

The current repositories are in-memory, so a backup captures configuration,
source, and future persistence files rather than live user records. Never put
`.env` files or credentials into an archive.

```bash
BACKUP_DIR=./backups sh scripts/backup.sh
sh scripts/restore.sh backups/nmedia-YYYYMMDDTHHMMSSZ.tgz
# PowerShell: .\scripts\backup.ps1; .\scripts\restore.ps1 -Archive .\backups\nmedia-YYYYMMDDTHHMMSSZ.zip
```

Run restore in a clean checkout, review the archive contents, copy environment
values from a secret manager, then run `npm ci` and `npm run check`. When a
durable database is introduced, add a provider-native encrypted database dump
and retention policy to this runbook.
