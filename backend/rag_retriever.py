"""
Lightweight RAG over curated markdown in backend/data/rag/*.md.

- Default: TF–IDF retrieval (no extra model download).
- Optional: multilingual MiniLM embeddings (set AGRIORA_RAG_SEMANTIC=1).

Disabled entirely when AGRIORA_RAG=0.
"""

from __future__ import annotations

import logging
import os
import re
from pathlib import Path
from typing import Any, Sequence, Union

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[1]
_RAG_DIR = _ROOT / "backend" / "data" / "rag"

_MAX_RAG_INJECT_CHARS = 3800
_TOP_K = 4


def _rag_enabled() -> bool:
    v = os.environ.get("AGRIORA_RAG", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def _semantic_enabled() -> bool:
    v = os.environ.get("AGRIORA_RAG_SEMANTIC", "0").strip().lower()
    return v in ("1", "true", "yes", "on")


def _parse_markdown_chunks(text: str, source_name: str) -> list[tuple[str, str]]:
    """Split on ## headings; first chunk may be preamble under filename."""
    chunks: list[tuple[str, str]] = []
    parts = re.split(r"(?m)^##\s+", text)
    for i, part in enumerate(parts):
        part = part.strip()
        if not part:
            continue
        lines = part.split("\n", 1)
        title = lines[0].strip()[:120]
        body = lines[1].strip() if len(lines) > 1 else lines[0].strip()
        if i == 0 and not text.lstrip().startswith("#"):
            title = title or source_name
        if not body:
            body = title
        chunks.append((title or source_name, body[:6000]))
    return chunks


def _load_all_chunks() -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    if not _RAG_DIR.is_dir():
        return out
    for path in sorted(_RAG_DIR.glob("*.md")):
        if path.name.upper() == "README.MD":
            continue
        try:
            raw = path.read_text(encoding="utf-8")
        except OSError:
            continue
        out.extend(_parse_markdown_chunks(raw, path.stem))
    return out


def _mean_pool(
    last_hidden_state: Any, attention_mask: Any
) -> np.ndarray:
    mask = attention_mask.unsqueeze(-1).expand(last_hidden_state.size()).float()
    summed = (last_hidden_state * mask).sum(dim=1)
    counts = mask.sum(dim=1).clamp(min=1e-9)
    return (summed / counts).cpu().numpy()


class RAGRetriever:
    def __init__(self) -> None:
        self.chunks: list[tuple[str, str]] = []
        self._tfidf: TfidfVectorizer | None = None
        self._X_tfidf: Any = None
        self._emb: np.ndarray | None = None
        self._semantic_model: Any = None
        self._semantic_tokenizer: Any = None
        self._ready = False
        self._mode = "off"

    def load(self) -> None:
        if self._ready:
            return
        self.chunks = _load_all_chunks()
        if not self.chunks:
            logger.info("RAG: no chunks under %s", _RAG_DIR)
            self._ready = True
            self._mode = "empty"
            return

        combined = [f"{t}. {b}" for t, b in self.chunks]
        self._tfidf = TfidfVectorizer(
            max_features=12000,
            ngram_range=(1, 2),
            min_df=1,
            strip_accents="unicode",
        )
        self._X_tfidf = self._tfidf.fit_transform(combined)
        self._mode = "tfidf"

        if _semantic_enabled():
            try:
                self._build_semantic_embeddings(combined)
                self._mode = "semantic"
                logger.info("RAG: semantic embeddings loaded (%d chunks)", len(self.chunks))
            except Exception as e:
                logger.warning("RAG: semantic load failed, using TF–IDF only: %s", e)

        self._ready = True
        logger.info("RAG: ready mode=%s chunks=%d", self._mode, len(self.chunks))

    def _build_semantic_embeddings(self, texts: list[str]) -> None:
        import torch
        from transformers import AutoModel, AutoTokenizer

        mid = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        tok = AutoTokenizer.from_pretrained(mid)
        model = AutoModel.from_pretrained(mid)
        model.eval()
        vecs: list[np.ndarray] = []
        bs = 16
        with torch.no_grad():
            for i in range(0, len(texts), bs):
                batch = texts[i : i + bs]
                enc = tok(
                    batch,
                    padding=True,
                    truncation=True,
                    max_length=256,
                    return_tensors="pt",
                )
                out = model(**enc)
                pooled = _mean_pool(out.last_hidden_state, enc["attention_mask"])
                vecs.append(pooled)
        mat = np.vstack(vecs)
        norms = np.linalg.norm(mat, axis=1, keepdims=True)
        norms = np.where(norms < 1e-12, 1.0, norms)
        self._emb = (mat / norms).astype(np.float32)
        self._semantic_model = model
        self._semantic_tokenizer = tok

    def _embed_query_semantic(self, query: str) -> np.ndarray:
        import torch

        assert self._semantic_tokenizer is not None and self._semantic_model is not None
        enc = self._semantic_tokenizer(
            [query[:2000]],
            padding=True,
            truncation=True,
            max_length=256,
            return_tensors="pt",
        )
        with torch.no_grad():
            out = self._semantic_model(**enc)
            q = _mean_pool(out.last_hidden_state, enc["attention_mask"])[0]
        n = float(np.linalg.norm(q))
        if n < 1e-12:
            return q.astype(np.float32)
        return (q / n).astype(np.float32)

    def search(self, query: str, k: int = _TOP_K) -> list[tuple[str, str]]:
        self.load()
        if not self.chunks or self._mode in ("off", "empty"):
            return []
        q = (query or "").strip()
        if len(q) < 8:
            q = "commodity food rice agriculture prices weather Myanmar"
        k = min(k, len(self.chunks))

        if self._emb is not None:
            qv = self._embed_query_semantic(q)
            sims = self._emb @ qv
            idx = np.argsort(-sims)[:k]
            return [self.chunks[int(i)] for i in idx]

        assert self._tfidf is not None and self._X_tfidf is not None
        qv = self._tfidf.transform([q])
        sims = cosine_similarity(qv, self._X_tfidf)[0]
        idx = np.argsort(-sims)[:k]
        return [self.chunks[int(i)] for i in idx]


_retriever: RAGRetriever | None = None


def get_rag_retriever() -> RAGRetriever | None:
    global _retriever
    if not _rag_enabled():
        return None
    if _retriever is None:
        _retriever = RAGRetriever()
    return _retriever


def rag_runtime_status() -> dict[str, Any]:
    """For /api/model-card and health checks."""
    if not _rag_enabled():
        return {"enabled": False}
    r = get_rag_retriever()
    if r is None:
        return {"enabled": False}
    r.load()
    return {
        "enabled": True,
        "chunks": len(r.chunks),
        "mode": r._mode,
        "semantic_env": _semantic_enabled(),
    }


def augment_news_for_ml(
    news_headline: Union[str, Sequence[str]],
    *,
    top_k: int = _TOP_K,
) -> tuple[Union[str, Sequence[str]], list[str]]:
    """
    Prepend compact retrieved notes to the news payload used by build_inference_features_and_meta.

    Returns (possibly augmented input, source titles for API/UI).
    """
    r = get_rag_retriever()
    if r is None:
        return news_headline, []

    if isinstance(news_headline, (list, tuple)):
        parts = [str(x).strip() for x in news_headline if str(x).strip()]
        query = " ".join(parts[:8])[:4000]
    else:
        query = str(news_headline).strip()[:4000]

    hits = r.search(query, k=top_k)
    if not hits:
        return news_headline, []

    titles = [h[0] for h in hits]
    blob_parts = [f"{t}: {b}" for t, b in hits]
    blob = "\n\n".join(blob_parts)
    if len(blob) > _MAX_RAG_INJECT_CHARS:
        blob = blob[: _MAX_RAG_INJECT_CHARS] + "…"

    prefix = "[Agriora reference — curated notes]\n" + blob + "\n[Live headlines & context]\n"

    if isinstance(news_headline, (list, tuple)):
        rest = list(news_headline)
        if not rest:
            return [prefix.strip()], titles
        merged_first = prefix + rest[0]
        return [merged_first] + rest[1:], titles

    return prefix + str(news_headline), titles
