"""The Docker probe of the network rules. It prints one record line and exits by rule.

The probe makes one connect attempt against the Postgres target with a short timeout.
It prints one named record line that carries the target, the port, the mode, the
outcome and the failure kind. The CI step asserts the line, so a probe that never
attempts cannot pass a deny step, and a broken allow cannot pass on presence alone.

Exit rules. The deny mode exits 1 when the connect succeeds, else 0. The allow mode
exits 0 when the connect succeeds, else 1. Both rules fail their own non-attempt states.
"""

import socket
import os
import sys

# The connect timeout in seconds. A hang must never stall the CI step.
CONNECT_TIMEOUT = 5.0

# The failure kinds that the record line carries. A deny record without a kind fails CI.
KIND_CONNECTED = "connected"
KIND_DNS = "dns"
KIND_TIMEOUT = "timeout"
KIND_REFUSED = "refused"
KIND_OTHER = "other"


def attempt(target, port):
    """Return (connected, kind) for one connect attempt against the target."""
    try:
        info = socket.getaddrinfo(target, int(port), type=socket.SOCK_STREAM)
    except socket.gaierror:
        return False, KIND_DNS
    except ValueError:
        return False, KIND_OTHER
    for family, _, _, _, address in info:
        try:
            with socket.create_connection((address[0], int(port)), timeout=CONNECT_TIMEOUT):
                return True, KIND_CONNECTED
        except ConnectionRefusedError:
            # WHY: one address may refuse. The loop tries every resolved address once.
            continue
        except socket.timeout:
            continue
        except OSError:
            continue
    return False, KIND_REFUSED


def record_line(host, port, mode, connected, kind):
    """Return the record line of one probe run. The CI step asserts the interesting parts."""
    outcome = KIND_CONNECTED if connected else "blocked"
    return "PROBE target=%s port=%s mode=%s outcome=%s kind=%s" % (
        host, port, mode, outcome, kind)


def mode_arguments():
    """Return the probe mode from the command line, or exit with a usage error."""
    argv = sys.argv[1:]
    if len(argv) != 2 or argv[0] != "--mode" or argv[1] not in ("allow", "deny"):
        print("usage: probe.py --mode allow|deny")
        sys.exit(2)
    return argv[1]


def main():
    """Print one record line and exit by the mode rule."""
    mode = mode_arguments()
    host = os.environ["NOVA_PROBE_DB_HOST"]
    port = os.environ["NOVA_PROBE_DB_PORT"]
    connected, kind = attempt(host, port)
    line = record_line(host, port, mode, connected, kind)
    print(line)
    # WHY: the print order hides nothing. The line lands on stdout before the exit code.
    sys.stdout.flush()
    if mode == "deny":
        sys.exit(1 if connected else 0)
    sys.exit(0 if connected else 1)


if __name__ == "__main__":
    main()
