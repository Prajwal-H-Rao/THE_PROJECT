"""Pydantic contracts for ML service."""

from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field


class EmbeddingRequest(BaseModel):
    """Request for text embeddings."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    texts: list[str] = Field(min_length=1, max_length=100, description="Texts to embed")
    model: str = Field(default="all-MiniLM-L6-v2", description="Embedding model")
    normalize: bool = Field(default=True, description="Normalize embeddings")


class EmbeddingResponse(BaseModel):
    """Response with embeddings."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    embeddings: list[list[float]] = Field(description="Embedding vectors")
    model: str = Field(description="Model used")
    dimensions: int = Field(description="Embedding dimensions")


class ClassificationRequest(BaseModel):
    """Request for text classification."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    text: str = Field(min_length=1, max_length=10000, description="Text to classify")
    model: str = Field(default="distilbert-base-uncased", description="Classification model")
    labels: list[str] | None = Field(default=None, description="Candidate labels for zero-shot")


class ClassificationResult(BaseModel):
    """Single classification result."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    label: str = Field(description="Predicted label")
    score: float = Field(ge=0.0, le=1.0, description="Confidence score")


class ClassificationResponse(BaseModel):
    """Response with classifications."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    classifications: list[ClassificationResult] = Field(description="Top predictions")
    model: str = Field(description="Model used")


class SkillExtractionRequest(BaseModel):
    """Request for skill extraction from resume text."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    text: str = Field(min_length=1, max_length=50000, description="Resume text")
    model: str = Field(default="skill-extractor-v1", description="Extraction model")


class ExtractedSkill(BaseModel):
    """An extracted skill with provenance."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    skill: str = Field(description="Skill name")
    category: str | None = Field(default=None, description="Skill category")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")
    source_span: dict[str, Any] | None = Field(default=None, description="Source location in text")


class SkillExtractionResponse(BaseModel):
    """Response with extracted skills."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    skills: list[ExtractedSkill] = Field(description="Extracted skills")
    model: str = Field(description="Model used")