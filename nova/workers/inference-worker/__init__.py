"""Inference worker for ML tasks."""

import json
import os
import redis
from rq import Queue, Worker

# ML service endpoint
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8080")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


def get_redis_connection():
    return redis.from_url(REDIS_URL, decode_responses=True)


def get_inference_queue() -> Queue:
    conn = get_redis_connection()
    return Queue("ml_inference", connection=conn, default_timeout=120)


def enqueue_embedding_job(texts: list[str], model: str = "all-MiniLM-L6-v2") -> str:
    queue = get_inference_queue()
    job = queue.enqueue(
        "nova.workers.inference_worker.tasks.embedding_task",
        texts=texts,
        model=model,
        job_timeout=120,
    )
    return job.id


def enqueue_classification_job(text: str, labels: list[str] | None = None, model: str = "distilbert-base-uncased") -> str:
    queue = get_inference_queue()
    job = queue.enqueue(
        "nova.workers.inference_worker.tasks.classification_task",
        text=text,
        labels=labels,
        model=model,
        job_timeout=120,
    )
    return job.id


def enqueue_skill_extraction_job(text: str, model: str = "skill-extractor-v1") -> str:
    queue = get_inference_queue()
    job = queue.enqueue(
        "nova.workers.inference_worker.tasks.skill_extraction_task",
        text=text,
        model=model,
        job_timeout=120,
    )
    return job.id


def start_worker():
    conn = get_redis_connection()
    queues = [Queue("ml_inference", connection=conn)]
    worker = Worker(queues, connection=conn)
    worker.work(with_scheduler=True)