export interface Chunk {
  text: string;
  score: number;
}

export interface ScoreDetail {
  nli_score: number;
  semantic_score: number;
  final_score: number;
  label: "SAFE" | "RISKY" | "HALLUCINATED";
  flagged_sentences: string[];
}

export interface QueryResponse {
  question: string;
  answer: string;
  context_chunks: Chunk[];
  score_detail: ScoreDetail;
  token_highlights: TokenHighlight[];
}

export interface TokenHighlight {
  token: string;
  score: number;
  grounded: boolean;
}

export interface CompareResponse {
  question: string;
  context_chunks: Chunk[];
  answer_a: string;
  answer_b: string;
  score_a: ScoreDetail;
  score_b: ScoreDetail;
  highlights_a: TokenHighlight[];
  highlights_b: TokenHighlight[];
}