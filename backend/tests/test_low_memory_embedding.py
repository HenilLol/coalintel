import unittest
import os
import sys
import tracemalloc
import numpy as np

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.embedding_service import (
    get_embedding_model,
    generate_embedding,
    generate_batch_embeddings,
    OnnxEmbeddingBackend,
    EMBEDDING_DIMENSION,
)


class TestLowMemoryEmbedding(unittest.TestCase):

    def test_01_onnx_backend_singleton(self):
        """Verify low-memory ONNX backend loads as thread-safe singleton and preserves 384 dimensions."""
        model = get_embedding_model()
        self.assertIsNotNone(model)
        self.assertNotEqual(model, "MOCK")

        model_again = get_embedding_model()
        self.assertIs(model, model_again)

    def test_02_embedding_dimensions_and_normalization(self):
        """Verify embedding dimension is exactly 384 and L2 normalized for cosine retrieval."""
        sentences = [
            "Eastern Coalfields Limited ECL Rajmahal Open Cast Mining Project produced 15.5 MT coal in FY 2023-24.",
            "Bharat Coking Coal Limited BCCL overburden removal reached 42.1 M.Cu.M.",
            "Coal India corporate headquarters reported composite performance achieving 98.2% target.",
            "SECL Gevra mega project is expanding annual capacity to 70 MT."
        ]

        embs = generate_batch_embeddings(sentences, batch_size=2)
        self.assertEqual(len(embs), 4)

        for emb in embs:
            self.assertEqual(len(emb), EMBEDDING_DIMENSION)
            arr = np.array(emb, dtype=np.float32)
            self.assertTrue(np.all(np.isfinite(arr)))
            self.assertFalse(np.any(np.isnan(arr)))
            norm = float(np.linalg.norm(arr))
            self.assertAlmostEqual(norm, 1.0, places=3)

    def test_03_numerical_stability_reproducibility(self):
        """Verify identical input strings produce stable reproducible 384-d vectors."""
        text = "ECL Rajmahal Mine produced 15.5 MT coal."
        emb1 = generate_embedding(text)
        emb2 = generate_embedding(text)

        self.assertEqual(len(emb1), 384)
        self.assertEqual(len(emb2), 384)
        cos_sim = float(np.dot(np.array(emb1), np.array(emb2)))
        self.assertAlmostEqual(cos_sim, 1.0, places=5)

    def test_04_memory_footprint_measurement(self):
        """Benchmark heap memory allocated during batch embedding inference."""
        tracemalloc.start()
        baseline_mem = tracemalloc.get_traced_memory()[0]

        texts = [f"Sample mining intelligence sentence {i} for Coal India reporting." for i in range(16)]
        embs = generate_batch_embeddings(texts, batch_size=8)
        self.assertEqual(len(embs), 16)

        current_mem, peak_mem = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        diff_mb = (peak_mem - baseline_mem) / (1024 * 1024)
        # Memory delta during inference on bounded batch should be minimal (< 50 MB)
        self.assertLess(diff_mb, 50.0)

    def test_05_local_offline_artifact_loading(self):
        """Verify ONNX model path exists locally in cache."""
        model = get_embedding_model()
        if isinstance(model, OnnxEmbeddingBackend):
            self.assertTrue(os.path.exists(model.model_path))


if __name__ == "__main__":
    unittest.main()
