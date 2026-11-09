#!/usr/bin/env sh
set -eu
: "${BACKUP_DIR:=./backups}"
mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
tar -czf "$BACKUP_DIR/nmedia-$stamp.tgz" --exclude='./node_modules' --exclude='./.next' --exclude='./backups' .
