"""Prove that one service cannot read or write the schema of another service."""

import os
import pathlib
import re

import psycopg
import pytest
from psycopg import sql

# The spec that names the services of the catalogue.
SPEC_PATH = pathlib.Path(__file__).resolve().parents[3] / "NOVA_Full_Updated_Spec.md"

# The init script that holds the roles and the exclusions.
INIT_SCRIPT = pathlib.Path(__file__).resolve().parents[2] / "db" / "init" / "01-roles.sql"

# The script that holds the schemas.
SCHEMA_SCRIPT = pathlib.Path(__file__).resolve().parents[2] / "db" / "init" / "02-schemas.sql"

# The heading of the catalogue section of the spec.
CATALOGUE_HEADING = "## Microservice Catalogue"

# The two services that the isolation test uses. The first owns data. The second is the peer.
OWNER = "identity_service"
PEER = "audit_activity_service"


def password_of(role: str) -> str:
    """Return the password of one role. The environment holds it."""
    name = "NOVA_PG_PASSWORD_" + role.upper()
    value = os.environ.get(name)
    if value is None or value == "":
        raise AssertionError("the environment holds no " + name)
    return value


def connection(role: str) -> psycopg.Connection:
    """Return a connection as one service role."""
    return psycopg.connect(
        host=os.environ.get("NOVA_PG_HOST", "127.0.0.1"),
        port=os.environ.get("NOVA_PG_PORT", "5432"),
        dbname=os.environ.get("NOVA_PG_DATABASE", "nova"),
        user=role,
        password=password_of(role),
    )


def catalogue_names() -> set[str]:
    """Return the service names of the spec catalogue in snake case."""
    names = set()
    inside = False
    for line in SPEC_PATH.read_text(encoding="utf-8").splitlines():
        if line.startswith(CATALOGUE_HEADING):
            inside = True
            continue
        if inside and line.startswith("## "):
            break
        if not inside:
            continue
        match = re.match(r"^\|\s*`([^`]+)`", line)
        if match is not None:
            names.add(match.group(1).replace("-", "_"))
    return names


def roles_in_init() -> set[str]:
    """Return the role names that the init script creates."""
    text = INIT_SCRIPT.read_text(encoding="utf-8")
    return set(re.findall(r"^CREATE ROLE ([a-z_]+) ", text, re.MULTILINE))


def exclusions_in_init() -> set[str]:
    """Return the service names that the init script holds no role for."""
    text = INIT_SCRIPT.read_text(encoding="utf-8")
    return set(re.findall(r"^-- exclusion: ([a-z_]+)$", text, re.MULTILINE))


def schemas_in_init() -> set[str]:
    """Return the schema names that the init script creates."""
    text = SCHEMA_SCRIPT.read_text(encoding="utf-8")
    return set(re.findall(r"^CREATE SCHEMA ([a-z_]+) ", text, re.MULTILINE))


def peer_table(peer: psycopg.Connection) -> None:
    """Create the table that the peer owns."""
    peer.execute(sql.SQL("CREATE TABLE IF NOT EXISTS {} (id int)").format(
        sql.Identifier(PEER, "probe")))
    peer.execute(sql.SQL("INSERT INTO {} VALUES (1)").format(sql.Identifier(PEER, "probe")))


def test_every_service_has_a_role_or_an_exclusion() -> None:
    """Every service of the catalogue holds a role or a named exclusion."""
    covered = roles_in_init() | exclusions_in_init()
    assert covered == catalogue_names()


def test_the_catalogue_holds_every_service() -> None:
    """The catalogue of the spec holds the 23 services of the layout record."""
    assert len(catalogue_names()) == 23


def test_a_service_holds_no_role_and_no_exclusion() -> None:
    """No service holds both a role and an exclusion."""
    assert roles_in_init() & exclusions_in_init() == set()


def test_every_role_holds_a_schema() -> None:
    """Every role holds a schema of its own."""
    assert schemas_in_init() == roles_in_init()


def test_every_role_can_log_in() -> None:
    """Every role holds a password that opens its own account."""
    for role in sorted(roles_in_init()):
        with connection(role) as peer:
            row = peer.execute("SELECT current_user").fetchone()
        assert row is not None
        assert row[0] == role


def test_no_role_holds_a_grant_on_another_schema() -> None:
    """No role holds a table grant on the schema of another service."""
    with connection(OWNER) as owner:
        grants = owner.execute(
            "SELECT DISTINCT table_schema, grantee FROM information_schema.role_table_grants "
            "WHERE table_schema = ANY(%s)",
            (list(roles_in_init()),)).fetchall()
    assert grants == []


def test_service_cannot_read_peer_schema() -> None:
    """A service reads no table of another service."""
    with connection(PEER) as peer:
        peer_table(peer)
    with connection(OWNER) as owner:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            owner.execute(sql.SQL("SELECT id FROM {}").format(sql.Identifier(PEER, "probe")))


def test_service_cannot_write_peer_schema() -> None:
    """A service writes no table of another service."""
    with connection(PEER) as peer:
        peer_table(peer)
    with connection(OWNER) as owner:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            owner.execute(sql.SQL("INSERT INTO {} VALUES (2)").format(sql.Identifier(PEER, "probe")))


def test_service_cannot_create_in_peer_schema() -> None:
    """A service creates no object in the schema of another service."""
    with connection(OWNER) as owner:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            owner.execute(sql.SQL("CREATE TABLE {} (id int)").format(
                sql.Identifier(PEER, "planted")))


def test_service_cannot_use_peer_credential() -> None:
    """A service opens no other service, not even with the password of that service."""
    # WHY: the server refuses the handshake before any statement runs.
    with pytest.raises(psycopg.OperationalError):
        psycopg.connect(
            host=os.environ.get("NOVA_PG_HOST", "127.0.0.1"),
            port=os.environ.get("NOVA_PG_PORT", "5432"),
            dbname=os.environ.get("NOVA_PG_DATABASE", "nova"),
            user=PEER,
            password=password_of(OWNER),
        )


def test_service_uses_its_own_schema() -> None:
    """A service reads and writes its own schema."""
    with connection(OWNER) as owner:
        owner.execute(sql.SQL("CREATE TABLE IF NOT EXISTS {} (id int)").format(
            sql.Identifier(OWNER, "own_probe")))
        owner.execute(sql.SQL("TRUNCATE {}").format(sql.Identifier(OWNER, "own_probe")))
        owner.execute(sql.SQL("INSERT INTO {} VALUES (1)").format(
            sql.Identifier(OWNER, "own_probe")))
        count = owner.execute(sql.SQL("SELECT count(*) FROM {}").format(
            sql.Identifier(OWNER, "own_probe"))).fetchone()
    assert count is not None
    assert count[0] == 1


def test_unqualified_table_lands_in_the_own_schema() -> None:
    """An unqualified table lands in the schema of the service that creates it."""
    with connection(OWNER) as owner:
        owner.execute("DROP TABLE IF EXISTS unqualified_probe")
        owner.execute("CREATE TABLE unqualified_probe (id int)")
        owner.execute("INSERT INTO unqualified_probe VALUES (1)")
        schema = owner.execute(
            "SELECT table_schema FROM information_schema.tables WHERE table_name = %s",
            ("unqualified_probe",)).fetchone()
    assert schema is not None
    assert schema[0] == OWNER
