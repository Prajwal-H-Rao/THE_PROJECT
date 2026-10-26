"""Python mirror of service-token.ts for cross-language JWT parity.

This module reproduces the exact canonicalization and verification logic
from nova/packages/contracts/service-token.ts so that Python services
can issue and verify service JWTs identically to TypeScript services.
"""

import base64
import hashlib
import hmac
import json
import re
import time
from dataclasses import dataclass
from typing import Optional


# The algorithm the contract pins. Every other algorithm value is a rejection.
TOKEN_ALGORITHM = "HS256"

# The default lifetime of one service token in seconds.
DEFAULT_TOKEN_TTL_SECONDS = 300

# The pattern that a base64url part must match.
BASE64URL_PATTERN = re.compile(r"^[A-Za-z0-9_-]+$")


def encode(value: object) -> str:
    """Base64url of one JSON value without padding."""
    return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")


def is_text(value: object) -> bool:
    """Return true when the value is a text that holds no empty string."""
    return isinstance(value, str) and value != ""


def is_number(value: object) -> bool:
    """Return true when the value is a finite number."""
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value == value and value != float("inf") and value != float("-inf")


def sign_payload(payload: str, secret: str) -> bytes:
    """Sign one covered string. The secret stays in the environment of the caller."""
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()


def digest(value: bytes) -> bytes:
    """The digest of a signature buffer. Every digest holds exactly 32 bytes."""
    return hashlib.sha256(value).digest()


def issue_token(
    iss: str,
    aud: str,
    sub: str,
    scope: str,
    secret: str,
    ttl_seconds: Optional[int] = None,
    now_seconds: Optional[int] = None,
) -> str:
    """Issue one service token. The caller supplies the claims, the secret and the clock."""
    ttl = ttl_seconds if ttl_seconds is not None else DEFAULT_TOKEN_TTL_SECONDS
    now = now_seconds if now_seconds is not None else int(time.time())
    header = {"alg": TOKEN_ALGORITHM, "typ": "JWT"}
    body = {"iss": iss, "aud": aud, "sub": sub, "scope": scope, "iat": now, "exp": now + ttl}
    # WHY: the covered string includes the header, so an algorithm swap breaks the signature.
    covered = encode(header) + "." + encode(body)
    return covered + "." + sign_payload(covered, secret).decode("ascii").rstrip("=")


def decode_part(part: str) -> Optional[dict]:
    """Read and parse a token part. A malformed part is a rejection, never a throw."""
    if not BASE64URL_PATTERN.match(part):
        return None
    try:
        # Add padding if needed
        padding = 4 - (len(part) % 4) if len(part) % 4 != 0 else 0
        decoded = base64.urlsafe_b64decode(part + "=" * padding).decode("utf-8")
        parsed = json.loads(decoded)
        if not isinstance(parsed, dict):
            return None
        return parsed
    except Exception:
        return None


@dataclass(frozen=True)
class ServiceClaims:
    iss: str
    aud: str
    sub: str
    scope: str
    iat: int
    exp: int


@dataclass(frozen=True)
class VerifyOptions:
    issuer: str
    audience: str
    required_scope: Optional[str] = None


@dataclass(frozen=True)
class ServiceVerificationOk:
    ok: bool = True
    claims: Optional[ServiceClaims] = None


@dataclass(frozen=True)
class ServiceVerificationError:
    ok: bool = False
    reason: str = ""


ServiceVerification = ServiceVerificationOk | ServiceVerificationError


def read_claims(record: dict) -> Optional[ServiceClaims]:
    """Build the claims of one record, or None when a field is missing or wrongly typed."""
    record_iss = record.get("iss")
    record_aud = record.get("aud")
    record_sub = record.get("sub")
    record_scope = record.get("scope")
    record_iat = record.get("iat")
    record_exp = record.get("exp")

    if not (is_text(record_iss) and is_text(record_aud) and is_text(record_sub) and is_text(record_scope)):
        return None
    # WHY: a scope list with a doubled space would let an empty scope through the split.
    if "  " in record_scope or record_scope.startswith(" ") or record_scope.endswith(" "):
        return None
    if not (is_number(record_iat) and is_number(record_exp)):
        return None
    return ServiceClaims(
        iss=record_iss,
        aud=record_aud,
        sub=record_sub,
        scope=record_scope,
        iat=int(record_iat),
        exp=int(record_exp),
    )


def verify_token(token: str, secret: str, options: VerifyOptions, now_seconds: int) -> ServiceVerification:
    """Verify a service token. It never throws and its reason codes name no secret."""
    parts = token.split(".")
    if len(parts) != 3:
        return ServiceVerificationError(reason="malformed_token")
    head, body, signature = parts

    header_record = decode_part(head)
    if header_record is None:
        return ServiceVerificationError(reason="malformed_token")
    header_alg = header_record.get("alg")
    header_type = header_record.get("typ")

    # WHY: an unsigned call names alg none. The fixed pin rejects every other algorithm.
    if header_alg != TOKEN_ALGORITHM:
        return ServiceVerificationError(reason="unsupported_algorithm")
    if header_type != "JWT":
        return ServiceVerificationError(reason="bad_header")

    claimed = sign_payload(head + "." + body, secret)
    try:
        given = base64.urlsafe_b64decode(signature + "=" * ((4 - len(signature) % 4) % 4))
    except Exception:
        return ServiceVerificationError(reason="bad_signature")

    # WHY: both digests hold 32 bytes, so the comparison never throws and never leaks a length.
    if not hmac.compare_digest(digest(claimed), digest(given)):
        return ServiceVerificationError(reason="bad_signature")

    record = decode_part(body)
    if record is None:
        return ServiceVerificationError(reason="bad_claims")

    claims = read_claims(record)
    if claims is None:
        return ServiceVerificationError(reason="bad_claims")

    if claims.exp <= now_seconds:
        return ServiceVerificationError(reason="expired_token")
    if claims.iss != options.issuer:
        return ServiceVerificationError(reason="unknown_issuer")
    if claims.aud != options.audience:
        return ServiceVerificationError(reason="unknown_audience")

    required = options.required_scope
    if required is not None:
        scopes = claims.scope.split(" ")
        if required not in scopes:
            return ServiceVerificationError(reason="missing_scope")

    return ServiceVerificationOk(claims=claims)