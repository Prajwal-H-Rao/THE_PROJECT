#!/usr/bin/env bash
# NOVA database restore script.
# Restores a backup created by backup.sh into an empty database.
# Usage: ./restore.sh <backup_file> [target_db]
#   target_db defaults to nova_restore_$(date +%s)

set -euo pipefail

BACKUP_FILE="${1:-}"
TARGET_DB="${2:-nova_restore_$(date +%s)}"

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
    echo "Usage: $0 <backup_file> [target_db]"
    exit 1
fi

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-nova}"
PGDATABASE="${PGDATABASE:-postgres}"  -- connect to maintenance db

# Age decryption key (private key). Set NOVA_BACKUP_AGE_PRIVKEY in env.
AGE_PRIVKEY="${NOVA_BACKUP_AGE_PRIVKEY:-}"

echo "[restore] Restoring $BACKUP_FILE to database $TARGET_DB"
echo "[restore] Host: $PGHOST:$PGPORT, User: $PGUSER"

# Create target database (must not exist)
psql --host="$PGHOST" --port="$PGPORT" --username="$PGUSER" --dbname="$PGDATABASE" \
    -c "CREATE DATABASE $TARGET_DB;" \
    || { echo "[restore] Database $TARGET_DB already exists or create failed"; exit 1; }

# Decrypt and decompress, then restore
if [[ -n "$AGE_PRIVKEY" ]]; then
    echo "[restore] Decrypting with age..."
    age -d -i <(echo "$AGE_PRIVKEY") "$BACKUP_FILE" | zstd -d -c | pg_restore \
        --host="$PGHOST" \
        --port="$PGPORT" \
        --username="$PGUSER" \
        --dbname="$TARGET_DB" \
        --no-owner \
        --no-privileges \
        --jobs=4 \
        --verbose
else
    echo "[restore] WARNING: NOVA_BACKUP_AGE_PRIVKEY not set, assuming unencrypted backup"
    zstd -d -c "$BACKUP_FILE" | pg_restore \
        --host="$PGHOST" \
        --port="$PGPORT" \
        --username="$PGUSER" \
        --dbname="$TARGET_DB" \
        --no-owner \
        --no-privileges \
        --jobs=4 \
        --verbose
fi

echo "[restore] Done. Database $TARGET_DB ready."
echo "[restore] Verify with: psql -h $PGHOST -U $PGUSER -d $TARGET_DB -c '\\dt'"