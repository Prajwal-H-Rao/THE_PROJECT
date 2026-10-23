#!/usr/bin/env bash
# NOVA database backup script.
# Creates a compressed, encrypted backup of the nova database.
# Usage: ./backup.sh [output_file]
#   output_file defaults to backup-$(date +%F-%H%M%S).dump.zst.age

set -euo pipefail

OUT_FILE="${1:-backup-$(date +%F-%H%M%S).dump.zst.age}"
PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-nova}"
PGDATABASE="${PGDATABASE:-nova}"

# Age encryption key (public key). Set NOVA_BACKUP_AGE_PUBKEY in env.
# Generate with: age-keygen -o key.txt && age-keygen -y key.txt > pubkey.txt
AGE_PUBKEY="${NOVA_BACKUP_AGE_PUBKEY:-}"

echo "[backup] Starting backup to $OUT_FILE"
echo "[backup] Host: $PGHOST:$PGPORT, DB: $PGDATABASE, User: $PGUSER"

# Dump with custom format, no owner/privileges (roles restored separately)
pg_dump \
    --host="$PGHOST" \
    --port="$PGPORT" \
    --username="$PGUSER" \
    --dbname="$PGDATABASE" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --compress=0 \
    | zstd -c -T0 -19 \
    | {
        if [[ -n "$AGE_PUBKEY" ]]; then
            age -r "$AGE_PUBKEY" -o "$OUT_FILE"
        else
            cat > "$OUT_FILE"
            echo "[backup] WARNING: NOVA_BACKUP_AGE_PUBKEY not set, backup NOT encrypted"
        fi
    }

echo "[backup] Done. Size: $(du -h "$OUT_FILE" | cut -f1)"
echo "[backup] To restore: ./restore.sh $OUT_FILE"