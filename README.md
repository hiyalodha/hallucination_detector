# HallucinationDetector
A real-time hallucination detection system for RAG pipelines. Paste a question, get an answer generated from retrieved context, and see exactly how grounded that answer is — down to the word level.
Built because RAG systems confidently produce wrong answers all the time, and there's no easy way to catch it without manually checking sources.

---

## What it does
You ask a question. The system retrieves relevant chunks from a knowledge base, generates an answer using Llama 3.1, then scores how well that answer is actually supported by the retrieved context.
The scoring uses two signals:
- **Semantic similarity** — how close the answer is to the context in embedding space
- **NLI (Natural Language Inference)** — whether the context logically entails the answer, using a DeBERTa cross-encoder
These combine into a final score (0–100) with a label: SAFE, RISKY, or HALLUCINATED. Individual sentences get flagged if they contradict the context, and each word is highlighted green (grounded) or red (ungrounded).

---

## Features

- **Detect mode** — ask anything, get a scored and highlighted answer
- **Compare mode** — run two different answers against the same context side by side
- **Document upload** — paste or upload your own text as the knowledge base
- **Query history** — all past queries saved locally with their scores
- **Token highlighting** — word-level grounding visualization

---

## Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 15, Tailwind CSS |
| Backend | FastAPI, Python |
| Retrieval | FAISS, sentence-transformers (all-MiniLM-L6-v2) |
| Generation | Groq API (Llama 3.1 8B Instant) |
| Scoring | cross-encoder/nli-MiniLM2-L6-H768 + cosine similarity |
---

## Running locally
**Prerequisites:** Python 3.10+, Node.js 18+, a free [Groq API key](https://console.groq.com)
**Backend**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your GROQ_API_KEY to .env
python main.py
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000`
First run downloads two models (~800MB total). Subsequent starts are fast.

---

## How the scoring works
Every answer goes through three checks:
1. The full answer is compared against the retrieved context using a cross-encoder NLI model. This gives an entailment probability — how likely the context actually supports the claim being made.
2. The answer and context are encoded into embedding vectors and compared via cosine similarity. This catches semantic overlap even when the exact wording differs.
3. Each sentence is scored individually. Sentences with high contradiction scores and low entailment get flagged. The final score weights semantic similarity more heavily, with contradiction as a penalty.
The system is deliberately conservative — it would rather flag a correct answer as RISKY than miss a hallucinated one as SAFE.

---

## Limitations
- The NLI model underperforms on short, list-style answers. Full declarative sentences score more accurately.
- The knowledge base resets on backend restart (free tier). Persistence requires a database layer.
- Scoring reflects grounding in retrieved context only — not factual correctness in the real world. An answer can be grounded but still wrong if the corpus is wrong.

---

## Project structure
hallucination-detector/
├── backend/
│   ├── main.py          # FastAPI app, endpoints
│   ├── retriever.py     # FAISS index, document storage
│   ├── generator.py     # Groq LLM wrapper
│   ├── scorer.py        # NLI + semantic scoring
│   └── data/            # Corpus storage
└── frontend/
├── src/app/         # Next.js pages
└── src/components/  # UI components

---