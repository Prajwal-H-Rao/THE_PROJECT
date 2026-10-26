"""Inference worker tasks for ML service."""

import httpx
import os
from typing import Any

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://ml-service:8080")


async def _call_ml_service(endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Call the ML service API."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{ML_SERVICE_URL}/api/v1{endpoint}",
            json=payload,
        )
        response.raise_for_status()
        return response.json()


def embedding_task(texts: list[str], model: str = "all-MiniLM-L6-v2") -> dict[str, Any]:
    """Generate embeddings for texts."""
    import asyncio
    return asyncio.run(_call_ml_service("/embeddings", {
        "texts": texts,
        "model": model,
        "normalize": True,
    }))


def classification_task(text: str, labels: list[str] | None = None, model: str = "distilbert-base-uncased") -> dict[str, Any]:
    """Classify text."""
    import asyncio
    return asyncio.run(_call_ml_service("/classify", {
        "text": text,
        "labels": labels,
        "model": model,
    }))


def skill_extraction_task(text: str, model: str = "skill-extractor-v1") -> dict[str, Any]:
    """Extract skills from resume text."""
    import asyncio
    return asyncio.run(_call_ml_service("/skills/extract", {
        "text": text,
        "model": model,
    }))


# Sync wrappers for RQ
def embedding_task_sync(texts: list[str], model: str = "all-MiniLM-L6-v2") -> dict[str, Any]:
    return embedding_task(texts, model)


def classification_task_sync(text: str, labels: list[str] | None = None, model: str = "distilbert-base-uncased") -> dict[str, Any]:
    return classification_task(text, labels, model)


def skill_extraction_task_sync(text: str, model: str = "skill-extractor-v1") -> dict[str, Any]:
    return skill_extraction_task(text, model)