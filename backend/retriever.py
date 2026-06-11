import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
CORPUS_PATH = os.path.join(os.path.dirname(__file__), "data", "corpus.json")

class Retriever:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.chunks = []
        self.index = None
        self._load_corpus()

    def _load_corpus(self):
        if not os.path.exists(CORPUS_PATH):
            # Create a small default corpus if none exists
            default_chunks = [
                "The Eiffel Tower is located in Paris, France. It was constructed between 1887 and 1889.",
                "Albert Einstein developed the theory of relativity. He was born in Ulm, Germany in 1879.",
                "Python is a high-level programming language created by Guido van Rossum in 1991.",
                "The Amazon River is the largest river by discharge volume of water in the world.",
                "Mount Everest is the highest mountain in the world at 8,849 meters above sea level.",
                "The Great Wall of China was built over centuries to protect Chinese states from invasions.",
                "William Shakespeare was an English playwright born in Stratford-upon-Avon in 1564.",
                "The human brain contains approximately 86 billion neurons.",
                "DNA stands for deoxyribonucleic acid, which carries genetic information in living organisms.",
                "The speed of light in a vacuum is approximately 299,792 kilometers per second.",
                "The Mona Lisa was painted by Leonardo da Vinci, likely between 1503 and 1519.",
                "Photosynthesis is the process by which plants use sunlight to produce food from CO2 and water.",
                "The Pacific Ocean is the largest and deepest ocean on Earth.",
                "Mahatma Gandhi led India's nonviolent independence movement against British rule.",
                "The Roman Empire at its peak covered about 5 million square kilometers.",
                "Antibiotics are medicines that kill or slow the growth of bacteria.",
                "The first computer program is credited to Ada Lovelace, written in the 1840s.",
                "Black holes are regions of spacetime where gravity is so strong that nothing can escape.",
                "The French Revolution began in 1789 and ended in 1799, reshaping French society.",
                "Oxygen makes up about 21% of Earth's atmosphere.",
            ]
            os.makedirs(os.path.dirname(CORPUS_PATH), exist_ok=True)
            with open(CORPUS_PATH, "w") as f:
                json.dump(default_chunks, f)
            self.chunks = default_chunks
        else:
            with open(CORPUS_PATH) as f:
                self.chunks = json.load(f)

        embeddings = self.model.encode(self.chunks, convert_to_numpy=True)
        embeddings = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(embeddings.astype(np.float32))

    def retrieve(self, query: str, top_k: int = 3):
        query_emb = self.model.encode([query], convert_to_numpy=True)
        query_emb = query_emb / np.linalg.norm(query_emb, axis=1, keepdims=True)
        scores, indices = self.index.search(query_emb.astype(np.float32), top_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.chunks):
                results.append({"text": self.chunks[idx], "score": float(score)})
        return results

    def add_documents(self, texts: list):
        self.chunks.extend(texts)
        new_embs = self.model.encode(texts, convert_to_numpy=True)
        new_embs = new_embs / np.linalg.norm(new_embs, axis=1, keepdims=True)
        self.index.add(new_embs.astype(np.float32))
        with open(CORPUS_PATH, "w") as f:
            json.dump(self.chunks, f)
