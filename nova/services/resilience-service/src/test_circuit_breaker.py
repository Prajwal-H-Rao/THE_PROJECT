"""Tests for circuit breaker (task 16.2) and DLQ (task 16.3)."""

import pytest

from circuit_breaker import CircuitBreaker, CircuitBreakerRegistry
from dlq import DLQ


def test_circuit_breaker_starts_closed():
    cb = CircuitBreaker("test", threshold=3)
    assert cb.state == "closed"
    assert cb.can_execute() is True


def test_circuit_breaker_opens_after_threshold():
    cb = CircuitBreaker("test", threshold=3)
    for _ in range(3):
        cb.record_failure()
    assert cb.state == "open"
    assert cb.can_execute() is False


def test_circuit_breaker_half_open_after_timeout():
    cb = CircuitBreaker("test", threshold=1, recovery_timeout=0.1)
    cb.record_failure()
    assert cb.state == "open"
    assert cb.can_execute() is False
    import time
    time.sleep(0.11)
    assert cb.can_execute() is True  # half-open
    assert cb.state == "half_open"


def test_circuit_breaker_closes_after_success():
    cb = CircuitBreaker("test", threshold=1)
    cb.record_failure()
    assert cb.state == "open"
    cb.record_success()
    assert cb.state == "closed"
    assert cb.can_execute() is True


def test_dlq_enqueue_and_get():
    dlq = DLQ()
    dlq.enqueue("msg-1", "queue-1", '{"data": "test"}', "connection error")
    entry = dlq.get("msg-1")
    assert entry is not None
    assert entry.connector_id == "msg-1"
    assert entry.queue_name == "queue-1"


def test_dlq_duplicate_increments_count():
    dlq = DLQ()
    dlq.enqueue("msg-1", "queue-1", '{"data": "test"}', "error1")
    dlq.enqueue("msg-1", "queue-1", '{"data": "test"}', "error2")
    entry = dlq.get("msg-1")
    assert entry.retry_count == 2


def test_dlq_count_by_queue():
    dlq = DLQ()
    dlq.enqueue("msg-1", "queue-1", "{}", "err")
    dlq.enqueue("msg-2", "queue-2", "{}", "err")
    assert dlq.count_by_queue("queue-1") == 1
    assert dlq.count_by_queue("queue-2") == 1


def test_dlq_clear():
    dlq = DLQ()
    dlq.enqueue("msg-1", "queue-1", "{}", "err")
    dlq.clear()
    assert dlq.count() == 0


def test_circuit_breaker_registry():
    reg = CircuitBreakerRegistry()
    cb1 = reg.get_or_create("svc-a")
    cb2 = reg.get_or_create("svc-a")
    assert cb1 is cb2
    cb3 = reg.get_or_create("svc-b")
    assert cb3 is not cb1