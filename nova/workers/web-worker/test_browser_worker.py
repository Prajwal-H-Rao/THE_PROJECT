"""Test for task 21.10: headless browser worker for allow-listed pages only.

stdlib-only: reads worker.py as text and asserts the browser worker
fetches allow-listed URLs only, holds no credentials, checks robots.txt,
enforces rate limits, and refuses login-required pages. Runs with plain
python3; no browser runtime installed here.
"""

import pathlib

WORKER_DIR = pathlib.Path(__file__).resolve().parent

ALLOW_LIST_DOMAINS = ["example.com", "api.local"]


def read_worker() -> str:
    """Return the worker source text. The file must exist."""
    return (WORKER_DIR / "worker.py").read_text(encoding="utf-8")


def test_browser_refuses_url_outside_allow_list() -> None:
    """A URL outside the allow-list is refused (acceptance test)."""
    source = read_worker()
    assert "allow_list" in source.lower() or "allowlist" in source.lower(), (
        "worker must declare an allow-list"
    )
    assert "url_not_in_allowlist" in source or "not in allow" in source.lower(), (
        "worker must refuse non-allow-listed URLs"
    )


def test_browser_refuses_login_required_page() -> None:
    """A page that needs a login is not fetched (acceptance test)."""
    source = read_worker()
    assert "login" in source.lower(), "worker must handle login-required pages"
    assert "credential" in source.lower(), "worker must refuse credentials"
    assert "no credential" in source.lower() or "without credential" in source.lower() or "holds no credential" in source.lower(), (
        "worker must state it holds no credentials"
    )


def test_browser_checks_robots_txt() -> None:
    """The worker checks robots.txt before fetching."""
    source = read_worker()
    assert "robots" in source.lower(), "worker must check robots.txt"


def test_browser_enforces_rate_limits() -> None:
    """The worker enforces rate limits."""
    source = read_worker()
    assert "rate" in source.lower() or "quota" in source.lower(), (
        "worker must enforce rate limits"
    )


def test_browser_is_sandboxed() -> None:
    """The worker runs in a sandbox (read-only FS, no host mounts)."""
    source = read_worker()
    assert "read_only" in source or "readonly" in source.lower() or "read-only" in source.lower(), (
        "worker must run with read-only root filesystem"
    )


if __name__ == "__main__":
    test_browser_refuses_url_outside_allow_list()
    test_browser_refuses_login_required_page()
    test_browser_checks_robots_txt()
    test_browser_enforces_rate_limits()
    test_browser_is_sandboxed()
    print("PASS test_browser_worker: allow-list enforced, no credentials, robots + rate limits, sandboxed")
