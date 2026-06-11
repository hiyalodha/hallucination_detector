from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from retriever import Retriever
from scorer import HallucinationScorer
from generator import Generator
app = FastAPI(title="HallucinationDetector API")
import os

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
async def warmup():
    import asyncio
    import logging
    logger = logging.getLogger("uvicorn")
    logger.info("Warming up models...")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: scorer.score(
        "warmup sentence for model initialization",
        "this is a warmup context to preload the NLI and semantic models into memory"
    ))
    logger.info("Models warmed up and ready.")

retriever = Retriever()
scorer = HallucinationScorer()
generator = Generator()


class QueryRequest(BaseModel):
    question: str
    top_k: Optional[int] = 3

class UploadRequest(BaseModel):
    text: str

class Chunk(BaseModel):
    text: str
    score: float

class ScoreDetail(BaseModel):
    nli_score: float
    semantic_score: float
    final_score: float
    label: str
    flagged_sentences: List[str]

class TokenHighlight(BaseModel):
    token: str
    score: float
    grounded: bool

class QueryResponse(BaseModel):
    question: str
    answer: str
    context_chunks: List[Chunk]
    score_detail: ScoreDetail
    token_highlights: List[TokenHighlight]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    try:
        chunks = retriever.retrieve(req.question, top_k=req.top_k)
        context = " ".join([c["text"] for c in chunks])
        answer = generator.generate(req.question, context)
        score_detail = scorer.score(answer, context)
        highlights = scorer.highlight_tokens(answer, context)
        return QueryResponse(
            question=req.question,
            answer=answer,
            context_chunks=[Chunk(text=c["text"], score=c["score"]) for c in chunks],
            score_detail=ScoreDetail(**score_detail),
            token_highlights=[TokenHighlight(**h) for h in highlights],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CompareRequest(BaseModel):
    question: str
    answer_a: str
    answer_b: str
    top_k: Optional[int] = 3

class CompareResponse(BaseModel):
    question: str
    context_chunks: List[Chunk]
    answer_a: str
    answer_b: str
    score_a: ScoreDetail
    score_b: ScoreDetail
    highlights_a: List[TokenHighlight]
    highlights_b: List[TokenHighlight]

@app.post("/compare", response_model=CompareResponse)
def compare(req: CompareRequest):
    try:
        chunks = retriever.retrieve(req.question, top_k=req.top_k)
        context = " ".join([c["text"] for c in chunks])
        score_a = scorer.score(req.answer_a, context)
        score_b = scorer.score(req.answer_b, context)
        highlights_a = scorer.highlight_tokens(req.answer_a, context)
        highlights_b = scorer.highlight_tokens(req.answer_b, context)
        return CompareResponse(
            question=req.question,
            context_chunks=[Chunk(text=c["text"], score=c["score"]) for c in chunks],
            answer_a=req.answer_a,
            answer_b=req.answer_b,
            score_a=ScoreDetail(**score_a),
            score_b=ScoreDetail(**score_b),
            highlights_a=[TokenHighlight(**h) for h in highlights_a],
            highlights_b=[TokenHighlight(**h) for h in highlights_b],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
def upload(req: UploadRequest):
    try:
        words = req.text.split()
        chunks = []
        chunk_size = 200
        overlap = 20
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)
        retriever.add_documents(chunks)
        return {"added": len(chunks), "total": len(retriever.chunks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/corpus")
def reset_corpus():
    try:
        import os
        corpus_path = os.path.join("data", "corpus.json")
        if os.path.exists(corpus_path):
            os.remove(corpus_path)
        retriever._load_corpus()
        return {"status": "reset", "total": len(retriever.chunks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)