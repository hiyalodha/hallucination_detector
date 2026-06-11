import json
import os
import re
import numpy as np
from sentence_transformers import SentenceTransformer

HALUEVAL_PATH = os.path.join(os.path.dirname(__file__), "data", "halueval_sample.json")

NLI_ENTAILMENT_THRESHOLD = 0.5
HALLUCINATION_THRESHOLD = 40


class HallucinationScorer:
    def __init__(self):
        self.semantic_model = SentenceTransformer("all-MiniLM-L6-v2")

    def _split_sentences(self, text: str):
        sentences = re.split(r"(?<=[.!?])\s+|(?<=:)\s+|(?<=\n)", text.strip())
        sentences = [s.strip() for s in sentences if s.strip() and len(s.split()) > 2]
        return sentences

    def _nli_score(self, answer: str, context: str) -> float:
        # NLI disabled for deployment — using semantic only
        return 0.5

    def _semantic_score(self, answer: str, context: str) -> float:
        embs = self.semantic_model.encode([answer, context], convert_to_numpy=True)
        embs = embs / np.linalg.norm(embs, axis=1, keepdims=True)
        return float(np.dot(embs[0], embs[1]))

    def _flag_sentences(self, answer: str, context: str) -> list:
        sentences = self._split_sentences(answer)
        flagged = []
        for sent in sentences:
            embs = self.semantic_model.encode([sent, context], convert_to_numpy=True)
            embs = embs / np.linalg.norm(embs, axis=1, keepdims=True)
            sim = float(np.dot(embs[0], embs[1]))
            if sim < 0.35:
                flagged.append(sent)
        return flagged

    def score(self, answer: str, context: str) -> dict:
        nli = self._nli_score(answer, context)
        semantic = self._semantic_score(answer, context)

        final = semantic * 100

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

        if not sentences:
            words = answer.split()
            for word in words:
                result.append({"token": word, "score": 50.0, "grounded": True})
            return result

        for sent in sentences:
            embs = self.semantic_model.encode([sent, context], convert_to_numpy=True)
            embs = embs / np.linalg.norm(embs, axis=1, keepdims=True)
            sim = float(np.dot(embs[0], embs[1]))
            grounded = sim >= 0.35

            for word in sent.split():
                result.append({
                    "token": word,
                    "score": round(sim * 100, 1),
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

        from sklearn.metrics import precision_score, recall_score, f1_score
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