"use client";
import { ScoreDetail } from "@/types";

const labelColors = {
  SAFE: { text: "text-safe", bg: "bg-safe", bar: "#22c55e", dot: "bg-safe" },
  RISKY: { text: "text-risky", bg: "bg-risky", bar: "#f59e0b", dot: "bg-risky" },
  HALLUCINATED: { text: "text-hallucinated", bg: "bg-hallucinated", bar: "#ef4444", dot: "bg-hallucinated" },
};

export default function ScoreGauge({ score }: { score: ScoreDetail }) {
  const colors = labelColors[score.label];

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-text-dim">
          Hallucination Score
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold ${colors.text} border border-current`}>
          {score.label}
        </span>
      </div>

      {/* Big number */}
      <div className="text-center py-2">
        <span className={`text-6xl font-mono font-semibold ${colors.text}`}>
          {score.final_score.toFixed(0)}
        </span>
        <span className="text-text-dim font-mono text-xl">/100</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full score-bar"
          style={{
            width: `${score.final_score}%`,
            backgroundColor: colors.bar,
          }}
        />
      </div>

      {/* Sub scores */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="bg-bg rounded-lg p-3 border border-border">
          <div className="text-xs text-text-dim font-mono mb-1">NLI Score</div>
          <div className="text-lg font-mono font-medium text-text">
            {score.nli_score.toFixed(1)}
            <span className="text-text-dim text-sm">%</span>
          </div>
        </div>
        <div className="bg-bg rounded-lg p-3 border border-border">
          <div className="text-xs text-text-dim font-mono mb-1">Semantic Score</div>
          <div className="text-lg font-mono font-medium text-text">
            {score.semantic_score.toFixed(1)}
            <span className="text-text-dim text-sm">%</span>
          </div>
        </div>
      </div>

      {/* Flagged sentences */}
      {score.flagged_sentences.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-widest text-text-dim">
            Flagged Sentences ({score.flagged_sentences.length})
          </div>
          <div className="space-y-2">
            {score.flagged_sentences.map((s, i) => (
              <div
                key={i}
                className="text-xs text-hallucinated bg-hallucinated/5 border border-hallucinated/20 rounded-lg px-3 py-2 font-mono leading-relaxed"
              >
                ⚠ {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {score.flagged_sentences.length === 0 && (
        <div className="text-xs text-safe bg-safe/5 border border-safe/20 rounded-lg px-3 py-2 font-mono">
          ✓ No individual sentences flagged
        </div>
      )}
    </div>
  );
}
