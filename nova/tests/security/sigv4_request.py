"""One signed AWS SigV4 request helper.

Both consumers mount this module: the object-init sidecar (admin API calls) and the
object prefix isolation test (S3 data calls). The signer covers the small AWS SigV4
subset that the object store cares about: a signed host, a signed payload and a sorted
query. It holds no third-party dependency.
"""

import datetime
import hashlib
import hmac
import http.client
import urllib.parse

# The region and the service that the object store signs with.
REGION = "us-east-1"
SERVICE = "s3"

# The path that the canonical URI keeps. The object store accepts the raw path.
EMPTY_PAYLOAD = hashlib.sha256(b"").hexdigest()


def _uri_escape(value):
    """Escape one value for a canonical query line."""
    return urllib.parse.quote(str(value), safe="-_.~")


def _signing_key(secret, datestamp):
    """Return the derived signing key of the day."""
    def _hmac(key, message):
        return hmac.new(key, message.encode("utf-8"), hashlib.sha256).digest()
    date_key = _hmac(("AWS4" + secret).encode("utf-8"), datestamp)
    region_key = _hmac(date_key, REGION)
    service_key = _hmac(region_key, SERVICE)
    return _hmac(service_key, "aws4_request")


def canonical_request(method, path, query, headers, payload_hash):
    """Return the canonical request text of one call."""
    signed = sorted(headers)
    text = [method.upper(), path, ""]
    pairs = sorted((key, _uri_escape(value)) for key, value in query.items())
    if pairs:
        text[2] = "&".join("%s=%s" % (key, value) for key, value in pairs)
    header_lines = ["".join([name, ":", headers[name].strip(), "\n"]) for name in signed]
    body = [
        "\n".join(text),
        "".join(header_lines),
        ";".join(signed),
        payload_hash,
    ]
    return "\n".join(body)


def signed_request(host, port, method, path, query, body, access_key, secret_key, timeout=10.0):
    """Send one signed request. Return (status, body, headers).

    The body is a byte string or None. The status is an int. A connection error
    raises, so the caller decides the failure semantics.
    """
    payload = body if body is not None else b""
    payload_hash = hashlib.sha256(payload).hexdigest()
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    datestamp = now[:8]
    headers = {
        "host": "%s:%s" % (host, port),
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": now,
    }
    if body is not None:
        headers["content-type"] = "application/json"
    request_text = canonical_request(method, path, query, headers, payload_hash)
    scope = "%s/%s/%s/aws4_request" % (datestamp, REGION, SERVICE)
    string_to_sign = "\n".join([
        "AWS4-HMAC-SHA256", now, scope, hashlib.sha256(request_text.encode("utf-8")).hexdigest()])
    signature = hmac.new(
        _signing_key(secret_key, datestamp), string_to_sign.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    credential = "%s/%s" % (access_key, scope)
    delimiter = ";"
    headers["Authorization"] = (
        "AWS4-HMAC-SHA256 Credential=%s, SignedHeaders=%s, Signature=%s" % (
            credential, delimiter.join(sorted(headers)), signature))
    if body is not None:
        headers["content-length"] = str(len(payload))
    connection = http.client.HTTPConnection(host, int(port), timeout=timeout)
    target = path if not query else path + "?" + "&".join(
        "%s=%s" % (key, _uri_escape(value)) for key, value in sorted(query.items()))
    connection.request(method.upper(), target, body=payload, headers=headers)
    response = connection.getresponse()
    response_body = response.read()
    response_headers = dict(response.getheaders())
    status = response.status
    connection.close()
    return status, response_body, response_headers
