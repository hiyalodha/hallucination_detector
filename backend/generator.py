import os
from groq import Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
class Generator:
    def __init__(self):
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY environment variable not set.")
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = "llama-3.1-8b-instant"

    def generate(self, question: str, context: str) -> str:
        prompt = f"""You are a helpful assistant. Answer the question using ONLY the information provided in the context below.
If the context does not contain enough information, say so clearly. Do not add facts from outside the context.
Always answer in complete, declarative sentences. Never use bullet points, lists, or fragment headers.
Context:
{context}
Question: {question}
Answer in 1-3 complete sentences:"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            temperature=0.2,
        )
        return response.choices[0].message.content.strip()