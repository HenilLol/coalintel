import logging
import threading
from typing import List, Optional

logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384

# Global cached model instance and thread lock
_model_instance = None
_model_lock = threading.Lock()


def get_embedding_model():
    """Lazy-loads and caches the SentenceTransformer all-MiniLM-L6-v2 model as a thread-safe singleton."""
    global _model_instance
    if _model_instance is None:
        with _model_lock:
            if _model_instance is None:
                try:
                    from sentence_transformers import SentenceTransformer
                    logger.info(f"Loading SentenceTransformer singleton model '{EMBEDDING_MODEL_NAME}'...")
                    _model_instance = SentenceTransformer(EMBEDDING_MODEL_NAME)
                    logger.info("SentenceTransformer singleton model loaded successfully.")
                except Exception as e:
                    logger.warning(f"Could not load sentence_transformers: {e}. Fallback deterministic mock embeddings enabled.")
                    _model_instance = "MOCK"
    return _model_instance


def _generate_deterministic_mock_vector(text: str) -> List[float]:
    """Generates a reproducible 384-d float vector for fallback test/host environments."""
    if not text:
        return [0.0] * EMBEDDING_DIMENSION
    import hashlib
    h = hashlib.sha256(text.encode("utf-8")).digest()
    vector = [(float(b) / 255.0) - 0.5 for b in h]
    # Extend to 384 float dimensions deterministically
    vector = (vector * (EMBEDDING_DIMENSION // len(vector) + 1))[:EMBEDDING_DIMENSION]
    return vector


def generate_embedding(text: str) -> List[float]:
    """Generates a 384-dimensional float vector for an input text string."""
    if not text:
        return [0.0] * EMBEDDING_DIMENSION

    model = get_embedding_model()
    if model == "MOCK" or model is None:
        return _generate_deterministic_mock_vector(text)

    try:
        embedding = model.encode(
            text,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embedding.tolist()
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return _generate_deterministic_mock_vector(text)


def generate_batch_embeddings(texts: List[str], batch_size: int = 32) -> List[List[float]]:
    """
    Generates 384-dimensional embeddings for a batch list of text strings.
    Processes in bounded batches to conserve memory during inference.
    """
    if not texts:
        return []

    model = get_embedding_model()
    if model == "MOCK" or model is None:
        return [_generate_deterministic_mock_vector(t) for t in texts]

    all_embeddings: List[List[float]] = []
    
    for i in range(0, len(texts), batch_size):
        batch_slice = texts[i : i + batch_size]
        try:
            embs = model.encode(
                batch_slice,
                batch_size=len(batch_slice),
                show_progress_bar=False,
                convert_to_numpy=True,
                normalize_embeddings=True
            )
            all_embeddings.extend(embs.tolist())
        except Exception as e:
            logger.error(f"Error in batch embedding slice [{i}:{i+len(batch_slice)}]: {e}")
            all_embeddings.extend([_generate_deterministic_mock_vector(t) for t in batch_slice])

    return all_embeddings
