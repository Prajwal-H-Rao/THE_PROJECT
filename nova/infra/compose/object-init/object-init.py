"""The object store init sidecar. It creates the identities the isolation test uses.

The container mounts sigv4_request.py for its signing helper. The script waits for the
store to answer its readiness probe, creates one store name per synthetic identity,
creates one IAM user per identity, writes a least-privilege policy that scopes the user
to its own store, and attaches the policy. Every identity value comes from the
environment. The container never invents a secret.

The admin API answers on two path forms. The script tries the MinIO-compatible prefix
first and falls back to the native prefix, so both store versions work.
"""

import json
import os
import sys
import time

import http.client

sys.path.insert(0, os.environ.get("INIT_MOUNTS", "/opt"))

import sigv4_request

# The wait for the store readiness probe. Sixty calls at two seconds covers a cold start.
READY_ATTEMPTS = 60
READY_DELAY_SECONDS = 2.0

# The two path forms of the admin API. The first that answers wins.
ADMIN_PREFIXES = ("/minio/admin/v3", "/rustfs/admin/v3")

# The built actions of the least-privilege policy. The scope is the identity's own store.
POLICY_ACTIONS = ["s3:*"]


def env_required(name):
    """Return one required environment value, or exit with a named reason."""
    value = os.environ.get(name)
    if not value:
        print("the init sidecar holds no " + name)
        sys.exit(2)
    return value


def host_of():
    """Return the store service name from the environment."""
    return env_required("NOVA_OBJECT_HOST")


def call_store(method, path, query, body, access_key, secret_key):
    """Send one request to the store. Return the parsed response as (status, body)."""
    host = host_of()
    status, response, _headers = sigv4_request.signed_request(
        host, 9000, method, path, query or {}, body, access_key, secret_key)
    return status, response


def wait_ready():
    """Poll the readiness probe until it answers. Exit when the store never gets ready."""
    host = host_of()
    for _ in range(READY_ATTEMPTS):
        # WHY: the probe of the store is unauthenticated. No signature goes on the wire.
        try:
            connection = http.client.HTTPConnection(host, 9000, timeout=3.0)
            connection.request("GET", "/health/ready")
            response = connection.getresponse()
            status = response.status
            response.read()
            connection.close()
        except OSError as error:
            print("the store is not reachable yet: " + str(error))
            time.sleep(READY_DELAY_SECONDS)
            continue
        if status == 200:
            return
        time.sleep(READY_DELAY_SECONDS)
    print("the store never answered its readiness probe")
    sys.exit(1)


def identities():
    """Return the two synthetic identity pairs from the environment."""
    return [
        {
            "user": env_required("NOVA_OBJECT_USER_ALPHA"),
            "password": env_required("NOVA_OBJECT_PASSWORD_ALPHA"),
        },
        {
            "user": env_required("NOVA_OBJECT_USER_BETA"),
            "password": env_required("NOVA_OBJECT_PASSWORD_BETA"),
        },
    ]


def root_credentials():
    """Return the root credentials of the store from the environment."""
    return env_required("NOVA_OBJECT_ROOT_USER"), env_required("NOVA_OBJECT_ROOT_PASSWORD")


def policy_document(store_name):
    """Return the least-privilege policy of one identity. The scope is its own store."""
    arn = "arn:aws:s3:::" + store_name
    return {
        "Version": "2012-10-17",
        "Statement": [
            {"Effect": "Allow", "Action": POLICY_ACTIONS, "Resource": [arn, arn + "/*"]}
        ],
    }


def admin_call(method, action, query, body, root_user, root_password):
    """Call one admin API action, trying both path forms. Return (status, body)."""
    payload = None if body is None else json.dumps(body).encode("utf-8")
    last = None
    for prefix in ADMIN_PREFIXES:
        status, response = call_store(method, prefix + "/" + action, query, payload,
                                      root_user, root_password)
        if status == 200:
            return status, response
        last = (status, response)
    return last


def ensure_store(store_name, root_user, root_password):
    """Create the store of one identity. An already-owned store is fine."""
    status, response = call_store("PUT", "/" + store_name, {}, None, root_user, root_password)
    # WHY: 200 and 409 both mean the store name exists. The second form carries the XML error.
    if status not in (200, 201, 409):
        print("the store name " + store_name + " failed with status " + str(status)
              + ": " + response.decode("utf-8", "replace")[:200])
        sys.exit(1)


def ensure_identity(identity, root_user, root_password):
    """Create the user, the policy and the binding of one identity."""
    store_name = identity["user"]
    ensure_store(store_name, root_user, root_password)
    status, response = admin_call(
        "PUT", "add-user", {"accessKey": identity["user"]},
        {"secretKey": identity["password"], "status": "enabled"}, root_user, root_password)
    if status != 200:
        print("the identity " + identity["user"] + " failed with status " + str(status)
              + ": " + response.decode("utf-8", "replace")[:200])
        sys.exit(1)
    policy_name = identity["user"] + "-access"
    status, response = admin_call(
        "PUT", "add-policy", {"name": policy_name}, policy_document(store_name),
        root_user, root_password)
    if status != 200:
        print("the policy " + policy_name + " failed with status " + str(status)
              + ": " + response.decode("utf-8", "replace")[:200])
        sys.exit(1)
    status, response = admin_call(
        "PUT", "set-user-or-group-policy",
        {"policyName": policy_name, "userOrGroup": identity["user"], "isGroup": "false"},
        None, root_user, root_password)
    if status != 200:
        # WHY: some store versions expose the same action under the shorter action name.
        status, response = admin_call(
            "PUT", "set-policy",
            {"policyName": policy_name, "userOrGroup": identity["user"], "isGroup": "false"},
            None, root_user, root_password)
    if status != 200:
        print("the policy binding of " + identity["user"] + " failed with status "
              + str(status) + ": " + response.decode("utf-8", "replace")[:200])
        sys.exit(1)


def main():
    """Provision the identities the isolation test uses and exit by success."""
    wait_ready()
    root_user, root_password = root_credentials()
    for identity in identities():
        ensure_identity(identity, root_user, root_password)
    print("the object identities are ready")
    sys.exit(0)


if __name__ == "__main__":
    main()
