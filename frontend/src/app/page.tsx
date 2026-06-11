"use client";
import { useState, useEffect } from "react";
import { queryRAG } from "@/lib/api";
import { QueryResponse } from "@/types";
import ScoreGauge from "@/components/ScoreGauge";
import ContextPanel from "@/components/ContextPanel";
import UploadPanel from "@/components/UploadPanel";
import ComparePanel from "@/components/ComparePanel";

interface HistoryItem {
  question: string;
  label: string;
  score: number;
  timestamp: string;
}

const EXAMPLE_QUESTIONS = [
  "Where is the Eiffel Tower located?",
  "Who developed the theory of relativity?",
  "What is the speed of light?",
  "Who wrote Hamlet?",
];

export default function Home() {
  const [mode, setMode] = useState<"detect" | "compare">("detect");
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("query_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const handleQuery = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSlow(false);

    const slowTimer = setTimeout(() => setSlow(true), 4000);

    try {
      const res = await queryRAG(question, topK);
      setResult(res);
      const newItem: HistoryItem = {
        question: question,
        label: res.score_detail.label,
        score: Math.round(res.score_detail.final_score),
        timestamp: new Date().toLocaleTimeString(),
      };
      const updated = [newItem, ...history].slice(0, 20);
      setHistory(updated);
      localStorage.setItem("query_history", JSON.stringify(updated));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || "Backend unreachable. Is FastAPI running?");
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-sm font-semibold tracking-wide text-text">
            HallucinationDetector
          </span>
          <span className="text-xs text-text-dim font-mono px-2 py-0.5 bg-border rounded">
            v1.0
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
            {(["detect", "compare"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-1.5 text-xs font-mono rounded-md transition-colors capitalize ${
                  mode === m ? "bg-accent text-white" : "text-text-dim hover:text-text"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs font-mono px-3 py-1.5 bg-surface border border-border hover:border-accent text-text-dim hover:text-text rounded-lg transition-colors"
          >
            History ({history.length})
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {showHistory && (
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-text-dim">
                Query History
              </span>
              <button
                onClick={() => {
                  setHistory([]);
                  localStorage.removeItem("query_history");
                }}
                className="text-xs font-mono text-text-dim hover:text-hallucinated transition-colors"
              >
                Clear
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-text-dim font-mono">No history yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setQuestion(item.question);
                      setMode("detect");
                      setShowHistory(false);
                    }}
                    className="flex items-center justify-between px-3 py-2 bg-bg border border-border hover:border-accent rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-text truncate group-hover:text-accent transition-colors">
                        {item.question}
                      </p>
                      <p className="text-xs text-text-dim font-mono mt-0.5">{item.timestamp}</p>
                    </div>
                    <span className={`ml-3 text-xs font-mono px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      item.label === "SAFE"
                        ? "text-safe border-safe/30"
                        : item.label === "RISKY"
                        ? "text-risky border-risky/30"
                        : "text-hallucinated border-hallucinated/30"
                    }`}>
                      {item.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === "detect" ? (
          <>
            <UploadPanel />
            <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
              <div className="text-xs font-mono uppercase tracking-widest text-text-dim">
                Query
              </div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuestion(q)}
                    className="text-xs font-mono px-3 py-1.5 bg-bg border border-border hover:border-accent text-text-dim hover:text-text rounded-lg transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything..."
                rows={3}
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm font-mono text-text placeholder-muted outline-none focus:border-accent transition-colors resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleQuery();
                }}
              />
              <div className="flex flex-col gap-3">
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
                    onClick={handleQuery}
                    disabled={loading || !question.trim()}
                    className="px-6 py-2.5 bg-accent hover:bg-accent-dim disabled:opacity-40 text-white text-sm font-mono rounded-lg transition-colors flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Detect  ⌘↵"
                    )}
                  </button>
                </div>
                {slow && loading && (
                  <p className="text-xs text-text-dim font-mono text-center">
                    First query takes longer — models are warming up...
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-hallucinated/30 bg-hallucinated/5 px-4 py-3 text-sm text-hallucinated font-mono">
                {error}
              </div>
            )}

            {result && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
                    <div className="text-xs font-mono uppercase tracking-widest text-text-dim">
                      Generated Answer
                    </div>
                    <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {result.token_highlights && result.token_highlights.length > 0
                        ? result.token_highlights.map((t, i) => (
                            <span
                              key={i}
                              title={`Grounding: ${t.score}%`}
                              className={`rounded px-0.5 transition-colors ${
                                t.grounded
                                  ? "bg-safe/10 text-text"
                                  : "bg-hallucinated/20 text-hallucinated"
                              }`}
                            >
                              {t.token}
                            </span>
                          ))
                        : <p className="text-text">{result.answer}</p>
                      }
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                      <span className="flex items-center gap-1.5 text-xs text-text-dim">
                        <span className="w-2.5 h-2.5 rounded-sm bg-safe/30 inline-block" />
                        Grounded
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-text-dim">
                        <span className="w-2.5 h-2.5 rounded-sm bg-hallucinated/30 inline-block" />
                        Ungrounded
                      </span>
                    </div>
                  </div>
                  <ScoreGauge score={result.score_detail} />
                </div>
                <ContextPanel chunks={result.context_chunks} />
              </div>
            )}
          </>
        ) : (
          <ComparePanel />
        )}

      </main>
    </div>
  );
}