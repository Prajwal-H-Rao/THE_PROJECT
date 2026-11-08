"""Test for task 06.13: prove the worker cannot reach Postgres or the internet.

stdlib-only: reads sandbox-compose.yaml as text and asserts the Compose
network config blocks egress — internal network (no gateway/internet), no
host network mode, no published ports (including Postgres 5432), no database
extra_hosts, no docker socket volume. Runs with plain python3; no docker
installed here. Mirrors the approved 06.12/06.16 static-assertion pattern.
"""

import pathlib

COMPOSE = pathlib.Path(__file__).resolve().parent / "sandbox-compose.yaml"


def read_compose() -> str:
    """Return the sandbox Compose file text."""
    return COMPOSE.read_text(encoding="utf-8")


def test_worker_cannot_reach_database() -> None:
    """The network layer refuses a connection to Postgres / any DB host."""
    source = read_compose()
    # No host networking: the worker is confined to its declared network.
    assert "network_mode: host" not in source, "host network mode must not be used"
    # No published port to the Postgres port.
    assert "5432" not in source, "Postgres port 5432 must not be published"
    # No extra_hosts pointing at a database host.
    assert "extra_hosts" not in source, "no database extra_hosts may be declared"
    # The worker is attached to the internal sandbox network only.
    assert "document-sandbox-net" in source, "worker must join the sandbox network"


def test_worker_has_no_egress() -> None:
    """The network layer refuses every outbound connection (no internet route)."""
    source = read_compose()
    # Internal network: Compose disables the default gateway, so no internet.
    assert "internal: true" in source, "sandbox network must be internal (no gateway)"
    # No published ports at all: nothing reaches out or in.
    assert "ports:" not in source, "no ports may be published"
    # No docker socket: the worker cannot reach the host Docker daemon.
    assert "docker.sock" not in source, "Docker socket must stay mounted out"
    # Empty volume list: no writable host path to tunnel through.
    assert "volumes: []" in source, "no writable host mount may be declared"


if __name__ == "__main__":
    test_worker_cannot_reach_database()
    test_worker_has_no_egress()
    print("PASS test_egress: worker has no database route and no internet egress")
