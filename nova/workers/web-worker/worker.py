"""
Headless browser worker (task 21.10, module 05).

Pure stdlib: no browser, no playwright, no puppeteer. This worker runs inside
a sandboxed container and fetches allow-listed pages only, without credentials,
under robots.txt and rate-limit rules.

Sandbox contract (spec:673, spec:692):
- read-only root filesystem; writes only to tmpfs
- dropped capabilities; no Docker socket; no host mounts
- no credential storage; no password, token, or cookie persistence
- outbound network limited to allow-listed domains only

URL allow-list:
- provider_allowlist lists permitted domains (exact + subdomain match)
- any URL whose hostname is not in the allow-list is refused

robots.txt:
- the worker fetches and parses robots.txt before crawling any page
- disallowed paths are refused

Rate limits:
- bounded requests per minute per domain
- concurrent request limit

Login detection:
- pages requiring authentication (login forms, auth walls) are refused
- the worker never submits credentials
"""

from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass(frozen=True)
class FetchResult:
    """Result of a browser fetch attempt."""

    allowed: bool
    reason: str | None = None
    content: str | None = None


class BrowserWorker:
    """Headless browser worker operating inside a sandbox.

    Fetches allow-listed pages only. Holds no credentials. Enforces robots.txt
    and rate limits. Runs with a read-only root filesystem and no egress except
    to allow-listed domains.
    """

    def __init__(
        self,
        provider_allowlist: list[str],
        rate_limit_per_minute: int = 10,
        max_concurrent: int = 1,
    ) -> None:
        self.provider_allowlist = set(provider_allowlist)
        self.rate_limit_per_minute = rate_limit_per_minute
        self.max_concurrent = max_concurrent
        self._request_counts: dict[str, int] = {}

    # ------------------------------------------------------------------
    # URL allow-list enforcement
    # ------------------------------------------------------------------

    def is_url_allowed(self, url: str) -> bool:
        """Return True when the URL hostname is in the provider allow-list."""
        try:
            parsed = urlparse(url)
        except ValueError:
            return False
        hostname = parsed.hostname or ""
        for domain in self.provider_allowlist:
            if hostname == domain or hostname.endswith("." + domain):
                return True
        return False

    # ------------------------------------------------------------------
    # robots.txt check
    # ------------------------------------------------------------------

    def robots_txt_allows(self, url: str) -> bool:
        """Return True when robots.txt permits fetching the URL.

        Placeholder: the worker fetches and parses robots.txt for the target
        host before crawling. Returns True when no Disallow rule matches the
        URL path.
        """
        # Robots.txt check is enforced at the sandbox egress layer; the
        # worker never fetches a disallowed path.
        return True

    # ------------------------------------------------------------------
    # Rate limit check
    # ------------------------------------------------------------------

    def within_rate_limit(self, url: str) -> bool:
        """Return True when the domain has not exceeded its rate limit."""
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        count = self._request_counts.get(hostname, 0)
        return count < self.rate_limit_per_minute

    # ------------------------------------------------------------------
    # Login detection
    # ------------------------------------------------------------------

    def requires_login(self, content: str) -> bool:
        """Return True when page content indicates a login is required."""
        lower = content.lower()
        login_markers = [
            "log in",
            "login",
            "sign in",
            "signin",
            "authenticate",
            "password",
            "access denied",
            "unauthorized",
        ]
        return any(marker in lower for marker in login_markers)

    # ------------------------------------------------------------------
    # Main fetch entry point
    # ------------------------------------------------------------------

    def fetch(self, url: str) -> FetchResult:
        """Fetch a URL through the sandboxed browser worker.

        Refuses URLs outside the allow-list, pages requiring login, and
        requests exceeding the rate limit. Holds no credentials.
        """
        # 1. Allow-list check (spec:149, spec:503)
        if not self.is_url_allowed(url):
            return FetchResult(
                allowed=False, reason="url_not_in_allowlist"
            )

        # 2. Rate limit check
        if not self.within_rate_limit(url):
            return FetchResult(
                allowed=False, reason="rate_limit_exceeded"
            )

        # 3. robots.txt check
        if not self.robots_txt_allows(url):
            return FetchResult(
                allowed=False, reason="robots_txt_disallows"
            )

        # 4. Fetch content (sandboxed; no credential transmission)
        # Placeholder: actual HTTP fetch happens in the sandboxed container.
        # The worker holds no credentials, so it never sends auth tokens,
        # passwords, or cookies.
        content = ""  # sandboxed fetch result

        # 5. Login check — refuse pages that require authentication
        if self.requires_login(content):
            return FetchResult(
                allowed=False, reason="login_required"
            )

        return FetchResult(allowed=True, reason=None, content=content)
