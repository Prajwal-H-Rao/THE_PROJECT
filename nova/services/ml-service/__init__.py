"""ML service Flask app for classification and embeddings."""

from flask import Flask, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

from nova.services.ml_service.schemas.ml import (
    ClassificationRequest,
    ClassificationResponse,
    ClassificationResult,
    EmbeddingRequest,
    EmbeddingResponse,
    ExtractedSkill,
    SkillExtractionRequest,
    SkillExtractionResponse,
)

# Lazy-loaded models
_embedding_model = None
_classification_model = None
_skill_model = None


def create_app() -> Flask:
    """Create the ML service Flask application."""
    app = Flask("nova-ml-service")
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10MB

    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(e):
        return jsonify({"error": "payload_too_large", "message": "Request exceeds 10MB"}), 413

    @app.route("/health/live", methods=["GET"])
    def health_live():
        return jsonify({"status": "live"})

    @app.route("/health/ready", methods=["GET"])
    def health_ready():
        # Check if models are loaded
        ready = _embedding_model is not None
        return jsonify({
            "status": "ready" if ready else "loading",
            "models": {
                "embedding": _embedding_model is not None,
                "classification": _classification_model is not None,
                "skill_extraction": _skill_model is not None,
            }
        }), 200 if ready else 503

    @app.route("/api/v1/embeddings", methods=["POST"])
    def embeddings():
        """Generate embeddings for texts."""
        global _embedding_model

        try:
            req = EmbeddingRequest(**request.get_json())
        except Exception as e:
            return jsonify({"error": "invalid_request", "message": str(e)}), 400

        if _embedding_model is None:
            _load_embedding_model(req.model)

        try:
            embeddings = _embedding_model.encode(
                req.texts,
                normalize_embeddings=req.normalize,
                show_progress_bar=False,
            )
            return jsonify(EmbeddingResponse(
                embeddings=embeddings.tolist(),
                model=req.model,
                dimensions=embeddings.shape[1],
            ).model_dump()), 200
        except Exception as e:
            return jsonify({"error": "embedding_failed", "message": str(e)}), 500

    @app.route("/api/v1/classify", methods=["POST"])
    def classify():
        """Classify text (zero-shot or fixed labels)."""
        global _classification_model

        try:
            req = ClassificationRequest(**request.get_json())
        except Exception as e:
            return jsonify({"error": "invalid_request", "message": str(e)}), 400

        if _classification_model is None:
            _load_classification_model(req.model)

        try:
            if req.labels:
                # Zero-shot classification
                result = _classification_model(req.text, req.labels, multi_label=False)
                classifications = [
                    ClassificationResult(label=label, score=score)
                    for label, score in zip(result["labels"], result["scores"])
                ]
            else:
                # Standard classification
                result = _classification_model(req.text)
                classifications = [
                    ClassificationResult(label=r["label"], score=r["score"])
                    for r in result
                ]

            return jsonify(ClassificationResponse(
                classifications=classifications,
                model=req.model,
            ).model_dump()), 200
        except Exception as e:
            return jsonify({"error": "classification_failed", "message": str(e)}), 500

    @app.route("/api/v1/skills/extract", methods=["POST"])
    def extract_skills():
        """Extract skills from resume text."""
        global _skill_model

        try:
            req = SkillExtractionRequest(**request.get_json())
        except Exception as e:
            return jsonify({"error": "invalid_request", "message": str(e)}), 400

        if _skill_model is None:
            _load_skill_model(req.model)

        try:
            # Use the skill extraction model
            # This is a placeholder - in reality would use a trained NER model
            skills = _skill_model(req.text)
            return jsonify(SkillExtractionResponse(
                skills=skills,
                model=req.model,
            ).model_dump()), 200
        except Exception as e:
            return jsonify({"error": "extraction_failed", "message": str(e)}), 500

    return app


def _load_embedding_model(model_name: str):
    """Load sentence transformer model for embeddings."""
    global _embedding_model
    from sentence_transformers import SentenceTransformer
    _embedding_model = SentenceTransformer(model_name)
    _embedding_model.eval()


def _load_classification_model(model_name: str):
    """Load classification model."""
    global _classification_model
    from transformers import pipeline
    _classification_model = pipeline(
        "zero-shot-classification",
        model=model_name,
        device=-1,  # CPU
    )


def _load_skill_model(model_name: str):
    """Load skill extraction model."""
    global _skill_model
    # Placeholder - would load a trained NER/skill extraction model
    def extractor(text: str) -> list[ExtractedSkill]:
        # Simple keyword-based extraction as fallback
        skill_keywords = {
            "programming": ["python", "java", "javascript", "typescript", "go", "rust", "c++", "c#"],
            "frameworks": ["react", "vue", "angular", "django", "flask", "fastapi", "spring", "express"],
            "databases": ["postgresql", "mysql", "mongodb", "redis", "elasticsearch", "sqlite"],
            "cloud": ["aws", "gcp", "azure", "docker", "kubernetes", "terraform"],
            "ml": ["pytorch", "tensorflow", "scikit-learn", "pandas", "numpy", "huggingface"],
        }
        text_lower = text.lower()
        skills = []
        for category, keywords in skill_keywords.items():
            for kw in keywords:
                if kw in text_lower:
                    idx = text_lower.index(kw)
                    skills.append(ExtractedSkill(
                        skill=kw,
                        category=category,
                        confidence=0.8,
                        source_span={"char_start": idx, "char_end": idx + len(kw)},
                    ))
        return skills
    _skill_model = extractor