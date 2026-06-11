"use client";
import { Chunk } from "@/types";

export default function ContextPanel({ chunks }: { chunks: Chunk[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <div className="text-xs font-mono uppercase tracking-widest text-text-dim">
        Retrieved Context ({chunks.length} chunks)
      </div>
      <div className="space-y-3">
        {chunks.map((chunk, i) => (
          <div key={i} className="bg-bg rounded-lg border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-accent">Chunk {i + 1}</span>
              <span className="text-xs font-mono text-text-dim">
                sim: {(chunk.score * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-text leading-relaxed">{chunk.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
