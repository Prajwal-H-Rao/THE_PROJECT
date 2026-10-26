"""RQ worker queue for document parsing jobs."""

from datetime import datetime
from typing import Any

import redis
from rq import Queue, Worker
from rq.job import Job

from nova.services.document_service.schemas import DocumentServiceSettings, WorkerSettings


def get_redis_connection(settings: WorkerSettings) -> redis.Redis:
    """Get Redis connection for RQ."""
    return redis.from_url(settings.redis_url, decode_responses=True)


def get_parse_queue(settings: WorkerSettings) -> Queue:
    """Get the parse job queue."""
    conn = get_redis_connection(settings)
    return Queue("document_parse", connection=conn, default_timeout=settings.default_timeout)


def enqueue_parse_job(
    document_id: str,
    quarantine_path: str,
    mime_type: str,
    settings: DocumentServiceSettings,
) -> str:
    """Enqueue a document parsing job."""
    queue = get_parse_queue(settings.worker)
    job = queue.enqueue(
        "nova.services.document_service.worker.tasks.parse_document_task",
        document_id=document_id,
        quarantine_path=quarantine_path,
        mime_type=mime_type,
        job_timeout=settings.worker.default_timeout,
        job_id=f"parse-{document_id}",
    )
    return job.id


def get_job_status(job_id: str, settings: WorkerSettings) -> dict[str, Any]:
    """Get the status of a parsing job."""
    conn = get_redis_connection(settings.worker)
    try:
        job = Job.fetch(job_id, connection=conn)
        return {
            "job_id": job.id,
            "status": job.get_status(),
            "result": job.result,
            "exc_info": job.exc_info,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "ended_at": job.ended_at.isoformat() if job.ended_at else None,
        }
    except Exception:
        return {"job_id": job_id, "status": "not_found"}


def start_worker(settings: WorkerSettings) -> Worker:
    """Start an RQ worker for document parsing."""
    conn = get_redis_connection(settings)
    queues = [
        Queue("document_parse", connection=conn),
        Queue("document_parse_dead_letter", connection=conn),
    ]
    worker = Worker(queues, connection=conn, max_jobs=settings.max_jobs)
    return worker


def requeue_failed_job(job_id: str, settings: WorkerSettings) -> bool:
    """Requeue a failed job."""
    conn = get_redis_connection(settings)
    try:
        job = Job.fetch(job_id, connection=conn)
        if job.is_failed:
            job.requeue()
            return True
        return False
    except Exception:
        return False


def move_to_dead_letter(job_id: str, settings: WorkerSettings) -> bool:
    """Move a failed job to the dead letter queue."""
    conn = get_redis_connection(settings)
    try:
        job = Job.fetch(job_id, connection=conn)
        if job.is_failed:
            dlq = Queue("document_parse_dead_letter", connection=conn)
            job.meta["moved_to_dlq_at"] = datetime.utcnow().isoformat()
            job.save()
            dlq.enqueue_job(job)
            return True
        return False
    except Exception:
        return False