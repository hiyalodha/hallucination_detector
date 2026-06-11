"use client";
import { useState } from "react";
import { compareAnswers } from "@/lib/api";
import { CompareResponse, TokenHighlight } from "@/types";

function TokenText({ highlights }: { highlights: TokenHighlight[] }) {
  return (
    <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
      {highlights.map((t, i) => (
        <span
          key={i}
          title={`Grounding: ${t.score}%`}
          className={`rounded px-0.5 ${
            t.grounded
              ? "bg-safe/10 text-text"
              : "bg-hallucinated/20 text-hallucinated"
          }`}
        >
          {t.token}
        </span>
      ))}
    </div>
  );
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  const colors =
    label === "SAFE"
      ? "text-safe border-safe/30"
      : label === "RISKY"
      ? "text-risky border-risky/30"
      : "text-hallucinated border-hallucinated/30";
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${colors}`}>
      {label} · {Math.round(score)}
    </span>
  );
}

export default function ComparePanel() {
  const [question, setQuestion] = useState("");
  const [answerA, setAnswerA] = useState("");
  const [answerB, setAnswerB] = useState("");
  const [topK, setTopK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!question.trim() || !answerA.trim() || !answerB.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await compareAnswers(question, answerA, answerB, topK);
      setResult(res);
    } catch {
      setError("Compare failed. Is FastAPI running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="text-xs font-mono uppercase tracking-widest text-text-dim">
          Compare Mode
        </div>

        <div>
          <div className="text-xs text-text-dim font-mono mb-1">Question</div>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter a question..."
            className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm font-mono text-text placeholder-muted outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-text-dim font-mono mb-1">Answer A</div>
            <textarea
              value={answerA}
              onChange={(e) => setAnswerA(e.target.value)}
              placeholder="Paste or type answer A..."
              rows={4}
              className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm font-mono text-text placeholder-muted outline-none focus:border-accent transition-colors resize-none"
            />
          </div>
          <div>
            <div className="text-xs text-text-dim font-mono mb-1">Answer B</div>
            <textarea
              value={answerB}
              onChange={(e) => setAnswerB(e.target.value)}
              placeholder="Paste or type answer B..."
              rows={4}
              className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm font-mono text-text placeholder-muted outline-none focus:border-accent transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-dim font-mono">top_k:</span>
            {[2, 3, 5].map((k) => (
              <button
                key={k}
                onClick={() => setTopK(k)}
                className={`w-8 h-7 text-xs font-mono rounded transition-colors ${
                  topK === k
                    ? "bg-accent text-white"
                    : "bg-bg border border-border text-text-dim hover:text-text"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <button
            onClick={handleCompare}
            disabled={loading || !question.trim() || !answerA.trim() || !answerB.trim()}
            className="px-6 py-2.5 bg-accent hover:bg-accent-dim disabled:opacity-40 text-white text-sm font-mono rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                Comparing...
              </>
            ) : (
              "Compare"
            )}
          </button>
        </div>

        {error && (
          <div className="text-sm text-hallucinated font-mono">{error}</div>
        )}
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-text-dim">Answer A</span>
              <ScoreBadge label={result.score_a.label} score={result.score_a.final_score} />
            </div>
            <TokenText highlights={result.highlights_a} />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-bg rounded-lg p-3 border border-border">
                <div className="text-xs text-text-dim font-mono mb-1">NLI</div>
                <div className="text-lg font-mono text-text">{result.score_a.nli_score.toFixed(1)}%</div>
              </div>
              <div className="bg-bg rounded-lg p-3 border border-border">
                <div className="text-xs text-text-dim font-mono mb-1">Semantic</div>
                <div className="text-lg font-mono text-text">{result.score_a.semantic_score.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-text-dim">Answer B</span>
              <ScoreBadge label={result.score_b.label} score={result.score_b.final_score} />
            </div>
            <TokenText highlights={result.highlights_b} />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-bg rounded-lg p-3 border border-border">
                <div className="text-xs text-text-dim font-mono mb-1">NLI</div>
                <div className="text-lg font-mono text-text">{result.score_b.nli_score.toFixed(1)}%</div>
              </div>
              <div className="bg-bg rounded-lg p-3 border border-border">
                <div className="text-xs text-text-dim font-mono mb-1">Semantic</div>
                <div className="text-lg font-mono text-text">{result.score_b.semantic_score.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-6 space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-text-dim">
              Shared Context ({result.context_chunks.length} chunks)
            </div>
            <div className="space-y-3">
              {result.context_chunks.map((chunk, i) => (
                <div key={i} className="bg-bg rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-accent">Chunk {i + 1}</span>
                    <span className="text-xs font-mono text-text-dim">sim: {(chunk.score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-sm text-text leading-relaxed">{chunk.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}