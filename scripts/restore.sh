#!/usr/bin/env sh
set -eu
archive=${1:?Usage: scripts/restore.sh path/to/backup.tgz}
tar -xzf "$archive" -C .
printf 'Restored %s\n' "$archive"
