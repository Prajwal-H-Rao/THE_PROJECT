"""Test for task 06.12: sandbox the worker so escape fixtures fail.

stdlib-only: reads the three artifact files as text and asserts each
sandbox directive is present (spec:673, spec:692) and each escape path
is absent. Runs with plain python3; no docker or pytest installed here.
"""

import json
import pathlib

WORKER_DIR = pathlib.Path(__file__).resolve().parent

REQUIRED_COMPOSE_DIRECTIVES = (
    "read_only:",
    "tmpfs:",
    "cap_drop:",
    "- ALL",
    "seccomp:",
    "no-new-privileges:",
    "mem_limit:",
    "cpus:",
    "pids_limit:",
)


def read(name: str) -> str:
    """Return one artifact's text. The file must exist."""
    return (WORKER_DIR / name).read_text(encoding="utf-8")


def test_image_runs_non_root() -> None:
    """The Dockerfile must end as a non-root user."""
    source = read("Dockerfile")
    assert "USER docworker" in source, "non-root USER directive missing"
    assert "USER root" not in source, "the image must never run as root"


def test_compose_holds_every_sandbox_directive() -> None:
    """The sandbox Compose file must declare every runtime guard."""
    source = read("sandbox-compose.yaml")
    missing = [d for d in REQUIRED_COMPOSE_DIRECTIVES if d not in source]
    assert not missing, "missing sandbox directives: " + ", ".join(missing)


def test_escape_paths_are_absent() -> None:
    """The sandbox must expose no Docker socket and no database route."""
    source = read("sandbox-compose.yaml")
    assert "docker.sock" not in source, "Docker socket must stay mounted out"
    assert "postgres" not in source, "no database route belongs in the sandbox"
    # spec:814: one input object in, one scoped result out; a writable host
    # mount breaks that rule, so an empty volume list must stand.
    assert "volumes: []" in source, "no writable host mount may be declared"


def test_seccomp_profile_blocks_setuid_paths() -> None:
    """The seccomp profile must deny the signature setting calls."""
    profile = json.loads(read("seccomp-worker.json"))
    assert profile["defaultAction"] == "SCMP_ACT_ALLOW"
    denied = {c for s in profile["syscalls"] for c in s["names"]}
    for call in ("mount", "unshare", "setns", "ptrace", "keyctl"):
        assert call in denied, "seccomp profile must deny " + call


if __name__ == "__main__":
    test_image_runs_non_root()
    test_compose_holds_every_sandbox_directive()
    test_escape_paths_are_absent()
    test_seccomp_profile_blocks_setuid_paths()
    print("PASS test_sandbox: worker sandbox directives present, escape paths absent")
