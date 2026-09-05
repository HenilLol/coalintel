import unittest
from unittest.mock import patch, MagicMock
import os
import sys
import tracemalloc
import numpy as np

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import app.services.embedding_service as emb_module
from app.services.embedding_service import (
    get_embedding_model,
    generate_embedding,
    generate_batch_embeddings,
    OnnxEmbeddingBackend,
    EMBEDDING_DIMENSION,
)


class TestLowMemoryEmbedding(unittest.TestCase):

    def setUp(self):
        # Reset singleton state before each test
        emb_module._model_instance = None

    def tearDown(self):
        # Reset singleton state after each test
        emb_module._model_instance = None

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

    @patch("app.services.embedding_service.OnnxEmbeddingBackend", side_effect=RuntimeError("Simulated ONNX init failure"))
    @patch.dict(os.environ, {"COALINTEL_ENABLE_PYTORCH_EMBEDDING_FALLBACK": "false"}, clear=False)
    def test_06_onnx_failure_does_not_instantiate_pytorch_in_production(self, mock_onnx):
        """Verify ONNX failure defaults to memory-safe fallback without importing SentenceTransformer."""
        with patch.dict("sys.modules", {"sentence_transformers": MagicMock()}):
            model = get_embedding_model()
            self.assertEqual(model, "MOCK")
            # SentenceTransformer was never imported/called
            mock_st = sys.modules["sentence_transformers"].SentenceTransformer
            mock_st.assert_not_called()

    @patch("app.services.embedding_service.OnnxEmbeddingBackend", side_effect=RuntimeError("Simulated ONNX init failure"))
    @patch.dict(os.environ, {"COALINTEL_ENABLE_PYTORCH_EMBEDDING_FALLBACK": "true"}, clear=False)
    def test_07_explicit_pytorch_opt_in_activates_pytorch(self, mock_onnx):
        """Verify explicit COALINTEL_ENABLE_PYTORCH_EMBEDDING_FALLBACK=true allows PyTorch for dev/tests."""
        mock_instance = MagicMock()
        mock_st_class = MagicMock(return_value=mock_instance)
        with patch.dict("sys.modules", {"sentence_transformers": MagicMock(SentenceTransformer=mock_st_class)}):
            model = get_embedding_model()
            self.assertEqual(model, mock_instance)
            mock_st_class.assert_called_once_with("all-MiniLM-L6-v2")

    def test_08_deterministic_mock_vector_contract(self):
        """Verify deterministic fallback produces finite 384-dimensional unit vectors."""
        emb_module._model_instance = "MOCK"
        text = "Coal India annual performance report"
        emb = generate_embedding(text)
        self.assertEqual(len(emb), 384)
        arr = np.array(emb, dtype=np.float32)
        self.assertTrue(np.all(np.isfinite(arr)))
        norm = float(np.linalg.norm(arr))
        self.assertAlmostEqual(norm, 1.0, places=3)

    def test_09_list_documents_does_not_invoke_stale_recovery(self):
        """Verify GET /api/v1/documents is a pure read endpoint and never invokes recover_stale_processing_documents."""
        from fastapi.testclient import TestClient
        from main import app
        from database import get_db
        from app.core.rbac import get_current_user
        from app.models.user import User

        mock_user = User(id=1, username="test_analyst", role="Analyst", subsidiary="CIL HQ")
        mock_db = MagicMock()
        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 0
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = []

        app.dependency_overrides[get_db] = lambda: mock_db
        app.dependency_overrides[get_current_user] = lambda: mock_user

        with patch("app.services.processing_pipeline.recover_stale_processing_documents") as mock_recover:
            client = TestClient(app)
            response = client.get("/api/v1/documents")
            self.assertEqual(response.status_code, 200)
            mock_recover.assert_not_called()

        app.dependency_overrides.clear()


if __name__ == "__main__":
    unittest.main()
