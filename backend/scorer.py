import json
import os
import re
import numpy as np
from sentence_transformers import SentenceTransformer, CrossEncoder
from sklearn.metrics import precision_score, recall_score, f1_score
HALUEVAL_PATH = os.path.join(os.path.dirname(__file__), "data", "halueval_sample.json")
NLI_ENTAILMENT_THRESHOLD = 0.5
HALLUCINATION_THRESHOLD = 40

class HallucinationScorer:
    def __init__(self):
        self.semantic_model = SentenceTransformer("all-MiniLM-L6-v2")
        self.nli_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-2-v2")

    def _split_sentences(self, text: str):
        sentences = re.split(r"(?<=[.!?])\s+|(?<=:)\s+|(?<=\n)", text.strip())
        sentences = [s.strip() for s in sentences if s.strip() and len(s.split()) > 2]
        return sentences

    def _nli_score(self, answer: str, context: str) -> float:
        full_result = self.nli_model.predict([(context, answer)], apply_softmax=True)
        full_entailment = float(full_result[0][1])

        sentences = self._split_sentences(answer)
        if not sentences:
            return full_entailment

        sent_scores = self.nli_model.predict(
            [(context, s) for s in sentences], apply_softmax=True
        )
        max_sent = max(float(s[1]) for s in sent_scores)

        return max(full_entailment, max_sent * 0.9)

    def _semantic_score(self, answer: str, context: str) -> float:
        embs = self.semantic_model.encode([answer, context], convert_to_numpy=True)
        embs = embs / np.linalg.norm(embs, axis=1, keepdims=True)
        return float(np.dot(embs[0], embs[1]))

    def _flag_sentences(self, answer: str, context: str) -> list:
        sentences = self._split_sentences(answer)
        flagged = []

        if not sentences:
            return flagged

        full_result = self.nli_model.predict([(context, answer)], apply_softmax=True)
        full_entailment = float(full_result[0][1])

        sent_results = self.nli_model.predict(
            [(context, s) for s in sentences], apply_softmax=True
        )

        for sent, result in zip(sentences, sent_results):
            entailment = float(result[1])
            contradiction = float(result[0])
            effective = max(entailment, full_entailment * 0.7)
            if effective < NLI_ENTAILMENT_THRESHOLD and contradiction > 0.3:
                flagged.append(sent)

        return flagged

    def score(self, answer: str, context: str) -> dict:
        nli = self._nli_score(answer, context)
        semantic = self._semantic_score(answer, context)
        full_result = self.nli_model.predict([(context, answer)], apply_softmax=True)
        contradiction = float(full_result[0][0])
        contradiction_penalty = contradiction * 30 if contradiction > 0.4 else 0
        final = (semantic * 100) - contradiction_penalty

        final = max(0, min(100, final))

        if final >= 70:
            label = "SAFE"
        elif final >= 40:
            label = "RISKY"
        else:
            label = "HALLUCINATED"

        flagged = self._flag_sentences(answer, context)

        return {
            "nli_score": round(nli * 100, 2),
            "semantic_score": round(semantic * 100, 2),
            "final_score": round(final, 2),
            "label": label,
            "flagged_sentences": flagged,
        }

    def highlight_tokens(self, answer: str, context: str) -> list:
        sentences = self._split_sentences(answer)
        result = []

        overall = self.nli_model.predict([(context, answer)], apply_softmax=True)
        overall_entailment = float(overall[0][1])
        overall_contradiction = float(overall[0][0])

        if not sentences:
            words = answer.split()
            grounded = overall_contradiction < 0.4
            for word in words:
                result.append({
                    "token": word,
                    "score": round(overall_entailment * 100, 1),
                    "grounded": grounded
                })
            return result

        sent_results = self.nli_model.predict(
            [(context, s) for s in sentences], apply_softmax=True
        )

        for sent, sent_result in zip(sentences, sent_results):
            words = sent.split()
            sent_contradiction = float(sent_result[0])
            sent_entailment = float(sent_result[1])
            effective_entailment = max(sent_entailment, overall_entailment * 0.8)
            grounded = sent_contradiction < 0.4 or effective_entailment >= 0.5

            for word in words:
                result.append({
                    "token": word,
                    "score": round(effective_entailment * 100, 1),
                    "grounded": grounded
                })
            if result:
                result[-1]["token"] += " "

        return result

    def evaluate_halueval(self, num_samples: int = 20) -> dict:
        if not os.path.exists(HALUEVAL_PATH):
            return {
                "error": "HaluEval sample not found. Please add data/halueval_sample.json",
                "precision": None,
                "recall": None,
                "f1": None,
                "total_samples": 0,
            }

        with open(HALUEVAL_PATH) as f:
            data = json.load(f)

        samples = data[:num_samples]
        y_true = []
        y_pred = []

        for item in samples:
            context = item.get("context", "")
            answer = item.get("answer", "")
            is_hallucinated = item.get("hallucinated", False)

            result = self.score(answer, context)
            predicted_hallucinated = result["label"] == "HALLUCINATED"

            y_true.append(int(is_hallucinated))
            y_pred.append(int(predicted_hallucinated))

        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)

        return {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "total_samples": len(samples),
            "hallucinated_count": sum(y_true),
            "detected_count": sum(y_pred),
        }