"""
Dead Letter Queue (task 16.3) - DLQ per queue for failed messages that cannot be processed.
"""

import json
import time
from collections import deque
from dataclasses import dataclass, asdict


@dataclass
class DLQEntry:
    message_id: str
    queue_name: str
    payload: str
    error: str
    retry_count: int
    first_failed_at: str
    last_attempt_at: str


class DLQ:
    """Dead Letter Queue - stores messages that cannot be processed after retries."""

    def __init__(self, max_size: int = 10000):
        self._queue: deque[DLQEntry] = deque(maxlen=max_size)
        self._by_id: dict[str, DLQEntry] = {}

    def enqueue(self, message_id: str, queue_name: str,
                payload: str, error: str) -> None:
        """Add a message to the DLQ."""
        now = time.time()
        entry = DLQEntry(
            message_id=message_id,
            queue_name=queue_name,
            payload=payload,
            error=error,
            retry_count=1,
            first_failed_at=now,
            last_attempt_at=now,
        )
        if message_id in self._by_id:
            # Update existing entry
            existing = self._by_id[message_id]
            existing.retry_count += 1
            existing.last_attempt_at = now
            existing.error = error
        else:
            self._by_id[message_id] = entry
            self._queue.append(entry)

    def get(self, message_id: str) -> DLQEntry | None:
        return self._by_id.get(message_id)

    def get_all(self) -> list[DLQEntry]:
        return list(self._queue)

    def get_by_queue(self, queue_name: str) -> list[DLQEntry]:
        return [e for e in self._queue if e.queue_name == queue_name]

    def mark_processed(self, message_id: str) -> bool:
        """Mark a DLQ entry as manually processed/removed."""
        if message_id in self._by_id:
            entry = self._by_id.pop(message_id)
            self._queue = deque(
                [e for e in self._queue if e.message_id != message_id]
            )
            return True
        return False

    def clear(self) -> None:
        self._queue.clear()
        self._by_id.clear()

    def count(self) -> int:
        return len(self._queue)

    def count_by_queue(self, queue_name: str) -> int:
        return sum(1 for e in self._queue if e.queue_name == queue_name)


dlq = DLQ()
