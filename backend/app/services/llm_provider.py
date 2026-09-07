import re
import abc
import logging
from typing import Dict, Any, List, Optional
from config import settings
from app.services.normalization_service import KNOWN_MINES

logger = logging.getLogger(__name__)


class BaseLLMProvider(abc.ABC):
    """
    Abstract Base Class for COALINTEL LLM Providers.
    Ensures backend vendor-independence between Gemini, OpenAI, or Degraded Mode.
    """
    provider_name: str = "base"

    @abc.abstractmethod
    def generate(self, prompt: str) -> str:
        """Generates answer string given XML-isolated prompt."""
        pass

    @abc.abstractmethod
    def generate_completion(
        self,
        prompt: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate completion given user query prompt and isolated context chunks.
        """
        pass


class DegradedLLMProvider(BaseLLMProvider):
    """
    Fallback Provider used when no LLM API key is present or LLM API times out.
    Returns grounded evidence citations without inventing content.
    """
    provider_name: str = "degraded"

    @staticmethod
    def _parse_structured_chunk(chunk_text: str) -> Optional[Dict[str, Any]]:
        """Extracts structured metric fields from chunk text if present."""
        if "mine entity:" not in chunk_text.lower() and "metric:" not in chunk_text.lower():
            return None

        mine_m = re.search(r"Mine Entity:\s*([^\|\n]+)", chunk_text, re.IGNORECASE)
        metric_m = re.search(r"Metric:\s*([^\|\n]+)", chunk_text, re.IGNORECASE)
        raw_val_m = re.search(r"Raw Extracted Value:\s*([^\|\n]+)", chunk_text, re.IGNORECASE)
        norm_val_m = re.search(r"Normalized Value:\s*([^\|\n]+)", chunk_text, re.IGNORECASE)
        fy_m = re.search(r"Fiscal Year:\s*([^\|\n]+)", chunk_text, re.IGNORECASE)
        snippet_m = re.search(r"Raw Evidence Snippet:\s*(.+)", chunk_text, re.DOTALL | re.IGNORECASE)

        mine_name = mine_m.group(1).strip() if mine_m else None
        metric_name = metric_m.group(1).strip() if metric_m else "Production"
        raw_val = raw_val_m.group(1).strip() if raw_val_m else None
        norm_val = norm_val_m.group(1).strip() if norm_val_m else None
        fy = fy_m.group(1).strip() if fy_m else "FY 2023-24"
        snippet = snippet_m.group(1).strip() if snippet_m else ""

        if raw_val and norm_val and raw_val.lower() != norm_val.lower() and not raw_val.upper().endswith("MT"):
            val_display = f"{raw_val} ({norm_val})"
        elif norm_val:
            val_display = norm_val
        elif raw_val:
            val_display = raw_val
        else:
            val_display = None

        return {
            "mine_name": mine_name,
            "metric_name": metric_name,
            "value": val_display,
            "fiscal_year": fy,
            "snippet": snippet
        }

    def generate(self, prompt: str) -> str:
        """Grounded synthesis of XML context for degraded/local execution."""
        # Extract untrusted context block strictly within XML boundary delimiters
        ctx_match = re.search(r"<untrusted_document_context>\s*(.*?)\s*</untrusted_document_context>", prompt, re.DOTALL)
        if not ctx_match:
            return "Insufficient evidence found for this query."
        context_str = ctx_match.group(1).strip()

        if not context_str or "Insufficient evidence" in context_str:
            return "Insufficient evidence found for this query."

        # Parse retrieved evidence chunks strictly from context_str using canonical citation tag headers
        chunk_pattern = re.compile(
            r"\[([A-Za-z0-9_\-\.]+),\s*Page\s*(\d+)\]\s*\n(.*?)(?=(?:\[[A-Za-z0-9_\-\.]+\,\s*Page\s*\d+\])|\Z)",
            re.DOTALL
        )
        parsed_chunks = []
        for match in chunk_pattern.finditer(context_str):
            parsed_chunks.append({
                "filename": match.group(1),
                "page_number": int(match.group(2)),
                "tag": f"[{match.group(1)}, Page {match.group(2)}]",
                "text": match.group(3).strip()
            })

        if not parsed_chunks:
            return "Insufficient evidence found for this query."

        # Extract user query
        q_match = re.search(r"USER QUESTION:\s*(.*?)(?:\n|$)", prompt)
        user_query = q_match.group(1).strip() if q_match else prompt
        q_lower = user_query.lower()

        # Target mine detection
        target_mine = None
        for km in KNOWN_MINES:
            if km.lower() in q_lower:
                target_mine = km
                break
        if not target_mine:
            requested_mines = re.findall(r"\b([A-Z][a-z]+(?:\s+(?:OC|OpenCast|Mine))?)\b", user_query)
            for rm in requested_mines:
                if rm.lower() not in ["what", "where", "total", "coal", "production", "overburden", "fiscal", "year", "compare", "versus", "ecl", "bccl", "secl", "mcl", "cil"]:
                    target_mine = rm
                    break

        base_mine = re.sub(r"\s+(?:OC|OpenCast|UG|Underground|Mine|Colliery)\b", "", target_mine, flags=re.IGNORECASE).strip() if target_mine else None

        if target_mine:
            mine_in_context = target_mine.lower() in context_str.lower() or (base_mine and base_mine.lower() in context_str.lower())
            if not mine_in_context:
                return "Insufficient evidence found for this query."

        # Check if comparison query
        is_comparison = "compare" in q_lower or "versus" in q_lower or "vs" in q_lower
        if is_comparison and len(parsed_chunks) >= 2:
            ans_parts = ["According to ingested document evidence:"]
            for c in parsed_chunks:
                s_info = self._parse_structured_chunk(c["text"])
                if s_info and s_info["value"]:
                    m_label = s_info["mine_name"]
                    if not m_label or m_label == "Unspecified Mine":
                        sub_m = re.search(r"\b([A-Z]{3,4})\b", c["filename"] + " " + c["text"])
                        m_label = f"{sub_m.group(1)} Total" if sub_m else "Total"
                    ans_parts.append(f"- {m_label} {s_info['metric_name']}: {s_info['value']} {c['tag']}")
                else:
                    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", c["text"]) if s.strip()]
                    rel_s = sentences[0] if sentences else c["text"][:120]
                    ans_parts.append(f"- {rel_s} {c['tag']}")
            return "\n".join(ans_parts)

        # Find best matching chunk for target mine or general query
        best_chunk = None
        if target_mine:
            mine_terms = [target_mine.lower()]
            if base_mine and len(base_mine) >= 3:
                mine_terms.append(base_mine.lower())

            # 1. Look for chunk where structured mine_name matches target mine
            for c in parsed_chunks:
                s_info = self._parse_structured_chunk(c["text"])
                if s_info and s_info["mine_name"]:
                    m_lower = s_info["mine_name"].lower()
                    if any(mt in m_lower for mt in mine_terms):
                        best_chunk = c
                        break
            # 2. Look for chunk where raw evidence snippet explicitly contains target mine
            if not best_chunk:
                for c in parsed_chunks:
                    t_lower = c["text"].lower()
                    snippet_part = t_lower.split("raw evidence snippet:")[-1] if "raw evidence snippet:" in t_lower else t_lower
                    if any(mt in snippet_part for mt in mine_terms):
                        best_chunk = c
                        break
            # 3. Check any chunk containing target mine
            if not best_chunk:
                for c in parsed_chunks:
                    t_lower = c["text"].lower()
                    if any(mt in t_lower for mt in mine_terms):
                        best_chunk = c
                        break
        else:
            # Check if query asks for aggregate/total
            if "total" in q_lower:
                for c in parsed_chunks:
                    if "total" in c["text"].lower() or "as a whole" in c["text"].lower():
                        best_chunk = c
                        break
            if not best_chunk:
                best_chunk = parsed_chunks[0]

        if not best_chunk:
            return "Insufficient evidence found for this query."

        tag = best_chunk["tag"]
        chunk_text = best_chunk["text"]

        # 1. Dynamic synthesis from structured metric evidence
        s_info = self._parse_structured_chunk(chunk_text)
        if s_info and s_info["value"]:
            m_name = s_info["mine_name"]
            m_metric = s_info["metric_name"]
            m_val = s_info["value"]
            m_fy = s_info["fiscal_year"]

            if not m_name or m_name == "Unspecified Mine":
                sub_m = re.search(r"\b([A-Z]{3,4})\b", best_chunk["filename"] + " " + chunk_text)
                sub_label = f"{sub_m.group(1)} total" if sub_m else "Total"
                return f"According to ingested document evidence {tag}, {sub_label} {m_metric.lower()} was {m_val} in {m_fy}."
            else:
                return f"According to ingested document evidence {tag}, {m_name} {m_metric.lower()} was {m_val} in {m_fy}."

        # 2. Dynamic synthesis from unstructured text chunk
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", chunk_text) if s.strip()]
        relevant_sentence = None
        if target_mine:
            for s in sentences:
                if target_mine.lower() in s.lower():
                    relevant_sentence = s
                    break
        if not relevant_sentence and sentences:
            # Prioritize sentence with numbers/units
            for s in sentences:
                if re.search(r"\d+(?:\.\d+)?\s*(?:MT|Lakh|Million|Tonnes|M\.Cu\.M|MCuM)", s, re.IGNORECASE):
                    relevant_sentence = s
                    break
            if not relevant_sentence:
                relevant_sentence = sentences[0]

        if relevant_sentence:
            return f"According to ingested document evidence {tag}: \"{relevant_sentence}\""

        return "Insufficient evidence found for this query."

    def generate_completion(
        self,
        prompt: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        answer_text = self.generate(prompt)
        citations = []
        for c in context_chunks:
            fname = c.get("filename", "Document.pdf")
            pnum = c.get("page_number", 1)
            citations.append({
                "document_name": fname,
                "page_number": pnum,
                "citation_tag": f"[{fname}, Page {pnum}]"
            })
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
    provider_name: str = "gemini"

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash", timeout: float = 10.0):
        self.api_key = api_key
        self.model_name = model_name
        self.timeout = timeout
        self.degraded_fallback = DegradedLLMProvider()

    def generate(self, prompt: str) -> str:
        if not self.api_key or self.api_key == "your-api-key-here":
            return self.degraded_fallback.generate(prompt)
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content(prompt)
            return response.text if response and hasattr(response, "text") else self.degraded_fallback.generate(prompt)
        except Exception as err:
            logger.warning(f"Gemini API invocation failed ({err}). Falling back to degraded grounded synthesis.")
            return self.degraded_fallback.generate(prompt)

    def generate_completion(
        self,
        prompt: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        ans = self.generate(prompt)
        return {
            "answer": ans,
            "citations": [],
            "degraded_mode": not bool(self.api_key),
            "provider": "gemini"
        }


class OpenAILLMProvider(BaseLLMProvider):
    """
    Hosted OpenAI API LLM Provider implementation.
    """
    provider_name: str = "openai"

    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini", timeout: float = 10.0):
        self.api_key = api_key
        self.model_name = model_name
        self.timeout = timeout
        self.degraded_fallback = DegradedLLMProvider()

    def generate(self, prompt: str) -> str:
        if not self.api_key or self.api_key == "your-api-key-here":
            return self.degraded_fallback.generate(prompt)
        try:
            import openai
            client = openai.OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                timeout=self.timeout
            )
            return response.choices[0].message.content
        except Exception as err:
            logger.warning(f"OpenAI API invocation failed ({err}). Falling back to degraded grounded synthesis.")
            return self.degraded_fallback.generate(prompt)

    def generate_completion(
        self,
        prompt: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        ans = self.generate(prompt)
        return {
            "answer": ans,
            "citations": [],
            "degraded_mode": not bool(self.api_key),
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
