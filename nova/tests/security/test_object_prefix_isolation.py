"""The object prefix isolation test of the object store identities.

It proves the rule of module 01 row 7 the store can enforce today: a signed request
with identity alpha against the store of identity beta must be denied, and the same
request against its own store must be allowed. The positive control keeps the deny
honest: an identity with no grants everywhere would deny everything for a false proof.

The identities come from the environment that the tests container receives. The store
name of an identity equals its name. The test holds no third-party dependency.
"""

import os

import sigv4_request


def env_identity(index_name):
    """Return the (user, password) pair for one identity, with a named gap on failure."""
    user = os.environ.get("NOVA_OBJECT_USER_" + index_name)
    password = os.environ.get("NOVA_OBJECT_PASSWORD_" + index_name)
    if not user or not password:
        raise KeyError("the tests container holds no identity values for " + index_name)
    return user, password


def store_host():
    """Return the store host and port that the tests container receives."""
    host = os.environ.get("NOVA_OBJECT_HOST")
    port = int(os.environ.get("NOVA_OBJECT_PORT", "9000"))
    if not host:
        raise KeyError("the tests container holds no NOVA_OBJECT_HOST")
    return host, port


def list_store(user, password, target_store, max_keys):
    """Send one signed ListObjects call. Return the status code."""
    host, port = store_host()
    query = {"list-type": "2", "max-keys": str(max_keys)}
    status, _body, _headers = sigv4_request.signed_request(
        host, port, "GET", "/" + target_store, query, None, user, password)
    return status


def put_object(user, password, target_store, key, content):
    """Send one signed PutObject call. Return the status code."""
    host, port = store_host()
    status, _body, _headers = sigv4_request.signed_request(
        host, port, "PUT", "/" + target_store + "/" + key, {}, content,
        user, password)
    return status


# The proof of the deny rule. A peer listing or writing the other store must see 403.
CROSS_STATUS_DENIED = 403

# The proof of the positive control. The own store must answer. A flat deny-all setup
# would deny the peer and its own store alike, and the guard would mean nothing.
OWN_STATUS_ALLOWED = 200


def test_cross_store_listing_denied():
    """Identity alpha cannot list the store of beta, and beta cannot list alpha's."""
    user_alpha, password_alpha = env_identity("ALPHA")
    user_beta, password_beta = env_identity("BETA")
    assert list_store(user_alpha, password_alpha, user_beta, 1) == CROSS_STATUS_DENIED
    assert list_store(user_beta, password_beta, user_alpha, 1) == CROSS_STATUS_DENIED


def test_own_store_listing_allowed():
    """Each identity lists its own store. The positive control keeps the deny honest."""
    user_alpha, password_alpha = env_identity("ALPHA")
    user_beta, password_beta = env_identity("BETA")
    assert list_store(user_alpha, password_alpha, user_alpha, 10) == OWN_STATUS_ALLOWED
    assert list_store(user_beta, password_beta, user_beta, 10) == OWN_STATUS_ALLOWED


def test_cross_store_write_denied_and_own_write_allowed():
    """The write path follows the same scope. A peer put is denied, an own put is allowed."""
    user_alpha, password_alpha = env_identity("ALPHA")
    user_beta, password_beta = env_identity("BETA")
    assert put_object(user_alpha, password_alpha, user_beta, "cross.bin", b"x1") \
        == CROSS_STATUS_DENIED
    assert put_object(user_alpha, password_alpha, user_alpha, "own.bin", b"ok1") \
        == OWN_STATUS_ALLOWED
    assert put_object(user_beta, password_beta, user_beta, "own.bin", b"ok2") \
        == OWN_STATUS_ALLOWED
