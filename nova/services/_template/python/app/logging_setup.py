"""Write the service logs as JSON. Every log line carries the same fields."""

import json
import logging
import sys

# The fields that every log line carries.
FIELDS = ("name", "level", "message")


class JsonFormatter(logging.Formatter):
    """Write one log record as one JSON object."""

    def format(self, record):
        """Return the record as a JSON object."""
        payload = {field: getattr(record, field, "") for field in FIELDS}
        payload["time"] = record.created
        if record.exc_info:
            payload["error"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def configure_logging(level="INFO"):
    """Send the service logs to the standard output as JSON."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
    return root
