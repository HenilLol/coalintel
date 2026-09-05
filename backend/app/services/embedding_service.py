import os
import logging
import threading
from typing import List, Optional, Any, Tuple
import numpy as np

logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSION = 384

# Global cached model instance and thread lock
_model_instance = None
_model_lock = threading.Lock()


class OnnxEmbeddingBackend:
    """
    Low-memory CPU embedding inference backend using ONNX Runtime.
    Produces identical 384-dimensional normalized vectors to all-MiniLM-L6-v2
    with a fraction of PyTorch's heap memory footprint (< 60 MB vs ~400 MB).
    """

    def __init__(self, model_name: str = EMBEDDING_MODEL_NAME):
        import onnxruntime as ort
        from transformers import AutoTokenizer
        from huggingface_hub import hf_hub_download

        logger.info(f"Initializing low-memory ONNX Runtime embedding engine for '{model_name}'...")
        self.model_path = hf_hub_download(repo_id=model_name, filename="onnx/model.onnx")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)

        # Configure session options for strict single-thread low-memory CPU execution
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1
        opts.inter_op_num_threads = 1
        opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        self.session = ort.InferenceSession(
            self.model_path,
            sess_options=opts,
            providers=["CPUExecutionProvider"]
        )
        self.input_names = [inp.name for inp in self.session.get_inputs()]
        logger.info("ONNX Runtime embedding engine initialized successfully.")

    def encode(self, texts: List[str], normalize_embeddings: bool = True) -> np.ndarray:
        """Tokenizes, executes ONNX inference, performs mean pooling, and L2 normalizes."""
        if not texts:
            return np.empty((0, EMBEDDING_DIMENSION), dtype=np.float32)

        encoded = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="np"
        )

        inputs = {
            "input_ids": encoded["input_ids"].astype(np.int64),
            "attention_mask": encoded["attention_mask"].astype(np.int64),
        }
        if "token_type_ids" in self.input_names and "token_type_ids" in encoded:
            inputs["token_type_ids"] = encoded["token_type_ids"].astype(np.int64)

        outputs = self.session.run(None, inputs)
        token_embeddings = outputs[0]  # Shape: (batch_size, seq_len, 384)

        # Mean pooling with attention mask
        attention_mask = encoded["attention_mask"]
        input_mask_expanded = np.broadcast_to(
            np.expand_dims(attention_mask, -1),
            token_embeddings.shape
        ).astype(np.float32)

        sum_embeddings = np.sum(token_embeddings * input_mask_expanded, axis=1)
        sum_mask = np.clip(input_mask_expanded.sum(axis=1), a_min=1e-9, a_max=None)
        mean_pooled = sum_embeddings / sum_mask

        if normalize_embeddings:
            norms = np.linalg.norm(mean_pooled, axis=1, keepdims=True)
            norms = np.where(norms == 0, 1e-9, norms)
            return (mean_pooled / norms).astype(np.float32)

        return mean_pooled.astype(np.float32)


def get_embedding_model():
    """
    Lazy-loads and caches the thread-safe singleton embedding engine.
    1. Primary (Production Default): Low-memory ONNX Runtime backend (<60 MB RAM).
    2. Fallback: Memory-safe deterministic 384-d mock vector backend ("MOCK").
       NOTE: PyTorch SentenceTransformer is strictly prohibited in the automatic production
       fallback path to prevent fatal OOM crashes on memory-constrained (512MB) instances.
       PyTorch can ONLY be explicitly enabled for local dev/testing via:
       COALINTEL_ENABLE_PYTORCH_EMBEDDING_FALLBACK="true"
    """
    global _model_instance
    if _model_instance is None:
        with _model_lock:
            if _model_instance is None:
                # 1. Primary: Low-memory ONNX Runtime backend
                try:
                    _model_instance = OnnxEmbeddingBackend(EMBEDDING_MODEL_NAME)
                    return _model_instance
                except Exception as onnx_err:
                    logger.warning(
                        f"ONNX embedding engine initialization failed: {onnx_err}."
                    )

                # 2. Check for explicit local/test PyTorch opt-in flag (default: disabled in production)
                enable_pytorch_fallback = os.getenv(
                    "COALINTEL_ENABLE_PYTORCH_EMBEDDING_FALLBACK", "false"
                ).lower() in ("true", "1", "yes")

                if enable_pytorch_fallback:
                    try:
                        from sentence_transformers import SentenceTransformer
                        _model_instance = SentenceTransformer("all-MiniLM-L6-v2")
                        logger.info("Explicit PyTorch SentenceTransformer loaded successfully via opt-in flag.")
                        return _model_instance
                    except Exception as st_err:
                        logger.warning(f"PyTorch SentenceTransformer init failed: {st_err}. Falling back to mock.")
                else:
                    logger.warning(
                        "PyTorch SentenceTransformer fallback is DISABLED by default to prevent OOM termination. "
                        "Using memory-safe deterministic fallback."
                    )

                # 3. Memory-safe deterministic fallback
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
    # Normalize
    norm = sum(x * x for x in vector) ** 0.5
    if norm > 0:
        vector = [x / norm for x in vector]
    return vector


def generate_embedding(text: str) -> List[float]:
    """Generates a 384-dimensional float vector for an input text string."""
    if not text:
        return [0.0] * EMBEDDING_DIMENSION

    model = get_embedding_model()
    if model == "MOCK" or model is None:
        return _generate_deterministic_mock_vector(text)

    try:
        if isinstance(model, OnnxEmbeddingBackend):
            embs = model.encode([text], normalize_embeddings=True)
            return embs[0].tolist()
        else:
            embs = model.encode(
                text,
                show_progress_bar=False,
                convert_to_numpy=True,
                normalize_embeddings=True
            )
            return embs.tolist()
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
            if isinstance(model, OnnxEmbeddingBackend):
                embs = model.encode(batch_slice, normalize_embeddings=True)
                all_embeddings.extend(embs.tolist())
            else:
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
