"use client";
import { useState } from "react";
import axios from "axios";

export default function UploadPanel({ onUploaded }: { onUploaded?: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ added: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.post("http://localhost:8000/upload", { text });
      setResult(res.data);
      onUploaded?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await axios.delete("http://localhost:8000/corpus");
      setResult(null);
      setText("");
    } catch {
      setError("Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono uppercase tracking-widest text-text-dim">
          Knowledge Base
        </div>
        <button
          onClick={handleReset}
          disabled={loading}
          className="text-xs font-mono text-text-dim hover:text-hallucinated transition-colors disabled:opacity-40"
        >
          Reset to default
        </button>
      </div>

      <p className="text-xs text-text-dim leading-relaxed">
        Paste text or upload a <span className="text-accent">.txt</span> file to use as the retrieval knowledge base.
      </p>

      {/* File upload */}
      <label className="flex items-center gap-2 px-3 py-2 bg-bg border border-dashed border-border hover:border-accent rounded-lg cursor-pointer transition-colors">
        <span className="text-xs text-text-dim font-mono">Choose .txt file</span>
        <input type="file" accept=".txt" onChange={handleFile} className="hidden" />
      </label>

      {/* Text paste */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Or paste your document text here..."
        rows={6}
        className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm font-mono text-text placeholder-muted outline-none focus:border-accent transition-colors resize-none"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-dim font-mono">
          {text.trim() ? `~${Math.ceil(text.split(/\s+/).length / 200)} chunks` : "No text"}
        </span>
        <button
          onClick={handleUpload}
          disabled={loading || !text.trim()}
          className="px-4 py-2 bg-accent hover:bg-accent-dim disabled:opacity-40 text-white text-sm font-mono rounded-lg transition-colors"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {result && (
        <div className="text-xs text-safe bg-safe/5 border border-safe/20 rounded-lg px-3 py-2 font-mono">
          ✓ Added {result.added} chunks — corpus now has {result.total} total
        </div>
      )}

      {error && (
        <div className="text-xs text-hallucinated bg-hallucinated/5 border border-hallucinated/20 rounded-lg px-3 py-2 font-mono">
          {error}
        </div>
      )}
    </div>
  );
}