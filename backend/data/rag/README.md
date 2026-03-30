# RAG knowledge base (Agriora)

Add `.md` files here. Each `## Heading` starts a **chunk** used for retrieval.

The predict API prepends top-matching chunks to the news text so sentiment / lexical news features see grounded context.

- Keep chunks under ~800 words.
- Prefer English for lexical `nf_*` features; short Myanmar glosses in parentheses are OK.

Env:

- `AGRIORA_RAG=0` — disable RAG entirely.
- `AGRIORA_RAG_EMBEDDINGS=0` — use fast TF–IDF only (no transformer download).
