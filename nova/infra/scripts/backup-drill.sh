#!/usr/bin/env bash
# NOVA backup drill test.
# Runs a full backup -> restore -> verify cycle against a local Postgres.
# Used by CI to prove the backup/restore works.

set -euo pipefail

# Use the compose stack's postgres
COMPOSE_FILES="-f nova/infra/compose/compose.yaml -f nova/infra/compose/compose.platform.yaml"
COMPOSE_PROFILE="test"

echo "[drill] Starting backup drill..."

# Ensure postgres is up
docker compose $COMPOSE_FILES --profile $COMPOSE_PROFILE up -d postgres
docker compose $COMPOSE_FILES --profile $COMPOSE_PROFILE exec -T postgres pg_isready -U nova -d nova

# Create test data
echo "[drill] Creating test data..."
docker compose $COMPOSE_FILES --profile $COMPOSE_PROFILE exec -T postgres psql -U nova -d nova -c "
    INSERT INTO identity_service.users (email, display_name) VALUES ('drill@example.com', 'Drill User')
    ON CONFLICT (email) DO NOTHING;
    INSERT INTO finance_service.finances (user_id, type, amount, currency, category, occurred_at)
    SELECT user_id, 'expense', 42.50, 'USD', 'test', now()
    FROM identity_service.users WHERE email = 'drill@example.com';
"

# Run backup
BACKUP_FILE="drill-backup-$(date +%F-%H%M%S).dump.zst"
echo "[drill] Running backup to $BACKUP_FILE..."
NOVA_BACKUP_AGE_PUBKEY="" ./nova/infra/scripts/backup.sh "$BACKUP_FILE"

# Verify backup exists and is non-empty
[[ -f "$BACKUP_FILE" && -s "$BACKUP_FILE" ]] || { echo "[drill] Backup file missing or empty"; exit 1; }
echo "[drill] Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Create restore target DB name
RESTORE_DB="nova_drill_$(date +%s)"

# Run restore
echo "[drill] Running restore to $RESTORE_DB..."
NOVA_BACKUP_AGE_PRIVKEY="" PGDATABASE=postgres ./nova/infra/scripts/restore.sh "$BACKUP_FILE" "$RESTORE_DB"

# Verify restore
echo "[drill] Verifying restore..."
USER_COUNT=$(docker compose $COMPOSE_FILES --profile $COMPOSE_PROFILE exec -T postgres psql -U nova -d "$RESTORE_DB" -t -c "SELECT count(*) FROM identity_service.users WHERE email = 'drill@example.com';" | tr -d ' ')
FINANCE_COUNT=$(docker compose $COMPOSE_FILES --profile $COMPOSE_PROFILE exec -T postgres psql -U nova -d "$RESTORE_DB" -t -c "SELECT count(*) FROM finance_service.finances WHERE category = 'test';" | tr -d ' ')

if [[ "$USER_COUNT" -eq 1 && "$FINANCE_COUNT" -eq 1 ]]; then
    echo "[drill] PASS: Restored data matches (1 user, 1 finance row)"
else
    echo "[drill] FAIL: Expected 1 user and 1 finance row, got $USER_COUNT users and $FINANCE_COUNT finance rows"
    exit 1
fi

# Cleanup
docker compose $COMPOSE_FILES --profile $COMPOSE_PROFILE exec -T postgres psql -U nova -d postgres -c "DROP DATABASE $RESTORE_DB;"
rm -f "$BACKUP_FILE"

echo "[drill] Backup drill completed successfully!"