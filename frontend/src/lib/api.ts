import axios from "axios";
import { QueryResponse, EvalResult } from "@/types";
import { QueryResponse, EvalResult, CompareResponse } from "@/types";

export async function compareAnswers(
  question: string,
  answer_a: string,
  answer_b: string,
  top_k: number = 3
): Promise<CompareResponse> {
  const res = await api.post("/compare", { question, answer_a, answer_b, top_k });
  return res.data;
}
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 60000,
});

export async function queryRAG(
  question: string,
  top_k: number = 3
): Promise<QueryResponse> {
  const res = await api.post("/query", { question, top_k });
  return res.data;
}

export async function runEvaluation(num_samples: number = 20): Promise<EvalResult> {
  const res = await api.post("/evaluate", { num_samples });
  return res.data;
}
