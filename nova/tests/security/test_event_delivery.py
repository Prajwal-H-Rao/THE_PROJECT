"""Prove that a re-delivered event records exactly once on the consumer side.

The outbox and the receipts tables live in the jobs_service schema. The producer
inserts one envelope row into the outbox. The consumer writes one receipts row per
event id. The receipts table has the event id as its primary key, so a second
delivery cannot hold a second row (module 01 task 13, spec:755 and spec:756).
"""

import json
import os
import psycopg


# The role that owns the queue flow for this phase of the plan.
OWNER = "jobs_service"


def password_of(role: str) -> str:
    """Return the password of one role. The environment holds it."""
    name = "NOVA_PG_PASSWORD_" + role.upper()
    value = os.environ.get(name, "")
    if value == "":
        raise AssertionError("the environment holds no " + name)
    return value


def os_env(name: str) -> str:
    """Return one environment value as text, empty when absent."""
    return os.environ.get(name, "")


def connection() -> psycopg.Connection:
    """Return a connection as the owning role."""
    return psycopg.connect(
        host=os_env("NOVA_PG_HOST") or "postgres",
        port=int(os_env("NOVA_PG_PORT") or "5432"),
        dbname=os_env("NOVA_PG_DATABASE") or "nova",
        user=OWNER,
        password=password_of(OWNER),
    )


def envelope(event_id: str) -> dict:
    """Return one envelope record in the wire shape of spec:755."""
    return {
        "event_id": event_id,
        "event_type": "note.created",
        "schema_version": 1,
        "occurred_at": "2026-10-23T09:00:00Z",
        "producer": "notes-service",
        "correlation_id": "corr-1",
        "causation_id": "cause-1",
        "subject_id": "note-1",
        "user_id": "user-1",
    }


OUTBOX_INSERT = (
    "INSERT INTO jobs_service.queue_outbox (event_id, event_type, schema_version,"
    " occurred_at, producer, correlation_id, causation_id, subject_id, user_id,"
    " payload) VALUES (%(event_id)s, %(event_type)s, %(schema_version)s,"
    " %(occurred_at)s, %(producer)s, %(correlation_id)s, %(causation_id)s,"
    " %(subject_id)s, %(user_id)s, %(payload_json)s"
)


def test_the_outbox_holds_the_produced_event_once():
    """The producer inserts one envelope row. A repeated insert changes nothing."""
    record = dict(envelope("outbox-once"), payload_json=json.dumps(envelope("outbox-once")))
    with connection() as conn, conn.cursor() as cursor:
        cursor.execute(OUTBOX_INSERT + ")", record)
        conn.commit()
        # WHY: a second insert with the same id violates the primary key, so the test
        # proves the dedupe rule by catching exactly that failure instead of ignoring it.
        caught = False
        try:
            cursor.execute(OUTBOX_INSERT + ")", record)
            conn.commit()
        except psycopg.errors.UniqueViolation:
            caught = True
            conn.rollback()
        assert caught, "the outbox accepted a duplicate event id"


def test_a_re_delivered_event_id_records_once():
    """Two deliveries write one receipt row."""
    with connection() as conn, conn.cursor() as cursor:
        for _ in range(2):
            cursor.execute(
                "INSERT INTO jobs_service.event_receipts (event_id, event_type) VALUES"
                " (%(event_id)s, %(event_type)s) ON CONFLICT (event_id) DO NOTHING",
                envelope("delivery-replay"),
            )
            conn.commit()
        cursor.execute(
            "SELECT COUNT(*) FROM jobs_service.event_receipts WHERE event_id = %(event_id)s",
            envelope("delivery-replay"),
        )
        assert cursor.fetchone()[0] == 1, "a re-delivered event recorded more than once"


def test_the_duplicate_delivery_writes_zero_rows():
    """The second insert of the same event id writes zero rows."""
    with connection() as conn, conn.cursor() as cursor:
        cursor.execute(
            "INSERT INTO jobs_service.event_receipts (event_id, event_type) VALUES"
            " (%(event_id)s, %(event_type)s)",
            envelope("delivery-rowcount"),
        )
        conn.commit()
        cursor.execute(
            "INSERT INTO jobs_service.event_receipts (event_id, event_type) VALUES"
            " (%(event_id)s, %(event_type)s) ON CONFLICT (event_id) DO NOTHING",
            envelope("delivery-rowcount"),
        )
        conn.commit()
        assert cursor.rowcount == 0, "the duplicate insert wrote a row"
