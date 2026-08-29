import logging
from typing import List

logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384

# Global cached model instance
_model_instance = None


def get_embedding_model():
    """Lazy-loads and caches the SentenceTransformer all-MiniLM-L6-v2 model."""
    global _model_instance
    if _model_instance is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading SentenceTransformer model '{EMBEDDING_MODEL_NAME}'...")
            _model_instance = SentenceTransformer(EMBEDDING_MODEL_NAME)
            logger.info("SentenceTransformer model loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load sentence_transformers: {e}. Fallback mock embeddings enabled.")
            _model_instance = "MOCK"
    return _model_instance


def generate_embedding(text: str) -> List[float]:
    """Generates a 384-dimensional float vector for input text string."""
    if not text:
        return [0.0] * EMBEDDING_DIMENSION

    model = get_embedding_model()
    if model == "MOCK" or model is None:
        # Deterministic mock 384-d embedding vector for test/host environments
        import hashlib
        h = hashlib.sha256(text.encode("utf-8")).digest()
        vector = [(float(b) / 255.0) - 0.5 for b in h]
        # Extend to 384 float dimensions deterministically
        vector = (vector * (EMBEDDING_DIMENSION // len(vector) + 1))[:EMBEDDING_DIMENSION]
        return vector

    try:
        embedding = model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return [0.0] * EMBEDDING_DIMENSION


def generate_batch_embeddings(texts: List[str]) -> List[List[float]]:
    """Generates 384-dimensional embeddings for a batch list of text strings."""
    if not texts:
        return []
    return [generate_embedding(t) for t in texts]
