import abc
import logging
from typing import Dict, Any, List, Optional
from config import settings

logger = logging.getLogger(__name__)


class BaseLLMProvider(abc.ABC):
    """
    Abstract Base Class for COALINTEL LLM Providers.
    Ensures backend vendor-independence between Gemini, OpenAI, or Degraded Mode.
    """

    @abc.abstractmethod
    def generate_completion(
        self,
        prompt: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate completion given user query prompt and isolated context chunks.
        Must return dict containing:
        - 'answer': str
        - 'citations': List[Dict[str, Any]]
        - 'degraded_mode': bool
        """
        pass


class DegradedLLMProvider(BaseLLMProvider):
    """
    Fallback Provider used when no LLM API key is present or LLM API times out.
    Returns raw retrieved document context chunks without synthesis.
    """

    def generate_completion(
        self,
        prompt: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        logger.warning("Operating in Degraded Mode: Returning raw context snippets.")
        
        formatted_snippets = []
        citations = []
        
        for idx, chunk in enumerate(context_chunks, 1):
            doc_name = chunk.get("filename", "Document.pdf")
            page_num = chunk.get("page_number", 1)
            snippet = chunk.get("chunk_text", "")
            
            formatted_snippets.append(f"[{idx}] {snippet} (Source: {doc_name}, Page {page_num})")
            citations.append({
                "document_name": doc_name,
                "page_number": page_num,
                "citation_tag": f"[{doc_name}, Page {page_num}]"
            })
            
        answer_text = (
            "⚠️ DEGRADED MODE (LLM Provider API unavailable or unconfigured):\n\n"
            "Direct Document Context Snippets Found:\n" + "\n\n".join(formatted_snippets)
        )
        
        return {
            "answer": answer_text,
            "citations": citations,
            "degraded_mode": True,
            "provider": "degraded"
        }


class GeminiLLMProvider(BaseLLMProvider):
    """
    Hosted Gemini API LLM Provider implementation.
    """

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash", timeout: float = 10.0):
        self.api_key = api_key
        self.model_name = model_name
        self.timeout = timeout
        self.degraded_fallback = DegradedLLMProvider()

    def generate_completion(
        self,
        prompt: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not self.api_key or self.api_key == "your-api-key-here":
            logger.info("No valid Gemini API key configured. Falling back to Degraded Mode.")
            return self.degraded_fallback.generate_completion(prompt, context_chunks)
            
        # Placeholder for Day 5 RAG completion logic
        return {
            "answer": f"Gemini Provider placeholder response for prompt: '{prompt}'",
            "citations": [],
            "degraded_mode": False,
            "provider": "gemini"
        }


class OpenAILLMProvider(BaseLLMProvider):
    """
    Hosted OpenAI API LLM Provider implementation.
    """

    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini", timeout: float = 10.0):
        self.api_key = api_key
        self.model_name = model_name
        self.timeout = timeout
        self.degraded_fallback = DegradedLLMProvider()

    def generate_completion(
        self,
        prompt: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not self.api_key or self.api_key == "your-api-key-here":
            logger.info("No valid OpenAI API key configured. Falling back to Degraded Mode.")
            return self.degraded_fallback.generate_completion(prompt, context_chunks)
            
        # Placeholder for Day 5 RAG completion logic
        return {
            "answer": f"OpenAI Provider placeholder response for prompt: '{prompt}'",
            "citations": [],
            "degraded_mode": False,
            "provider": "openai"
        }


def get_llm_provider(
    provider_name: Optional[str] = None,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    timeout: Optional[float] = None
) -> BaseLLMProvider:
    """
    Factory function returning the configured LLM provider according to environment settings.
    """
    p_name = (provider_name or settings.LLM_PROVIDER).lower()
    key = api_key or settings.LLM_API_KEY
    m_name = model_name or settings.LLM_MODEL_NAME
    t_out = timeout or settings.LLM_TIMEOUT_SECONDS

    if p_name == "gemini":
        return GeminiLLMProvider(api_key=key, model_name=m_name, timeout=t_out)
    elif p_name == "openai":
        return OpenAILLMProvider(api_key=key, model_name=m_name, timeout=t_out)
    else:
        return DegradedLLMProvider()
