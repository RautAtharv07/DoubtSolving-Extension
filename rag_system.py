import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
# --- IMPORT THE NEW OPENAI CLIENT ---
from openai import OpenAI
# ------------------------------------
import os
from dotenv import load_dotenv

# Load API Key from .env file
load_dotenv()
API_KEY = os.getenv("TOGETHER_API_KEY")
if not API_KEY:
    raise ValueError("TOGETHER_API_KEY not found in .env file. Please add it.")

# --- CREATE THE NEW CLIENT OBJECT ---
# This is the main change for the new version.
# We pass the api_key and base_url when we create the client.
client = OpenAI(
    api_key=API_KEY,
    base_url="https://api.together.xyz/v1",
)
# ------------------------------------

class RAGSystem:
    def __init__(self, raw_text: str):
        print("Initializing RAG System...")
        if not isinstance(raw_text, str):
            raise TypeError(f"RAGSystem expects a string for raw_text, but got {type(raw_text)}")
        
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_text(raw_text)
        self.docs = [Document(page_content=chunk) for chunk in chunks]
        print(f"Split text into {len(self.docs)} chunks.")

        if not self.docs:
            raise ValueError("The scraped content was empty after processing. Cannot create a RAG system.")

        print("Creating embeddings for chunks...")
        embeddings = self.embedding_model.encode([chunk.page_content for chunk in self.docs])
        dimension = embeddings.shape[1]
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(np.array(embeddings))
        print("FAISS index created successfully.")

    def _retrieve(self, query: str, k: int = 5):
        # ... (this method does not need to change)
        print(f"Retrieving documents for query: '{query}'")
        query_vec = self.embedding_model.encode([query])
        _distances, indices = self.index.search(np.array(query_vec), k)
        return [self.docs[i] for i in indices[0]]

    def _generate_answer(self, context: str, query: str):
        print("Generating answer with LLM using new openai v1.0+ syntax...")
        prompt = f"""Use the provided context below to answer the user's question. If the context doesn't contain the answer, state that you cannot answer based on the information provided.

Context:
{context}

Question:
{query}

Answer:"""

        try:
            # --- THIS IS THE NEW SYNTAX FOR MAKING THE API CALL ---
            response = client.chat.completions.create(
                model="mistralai/Mistral-7B-Instruct-v0.2",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based only on the given context."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=512,
                temperature=0.7
            )
            # The response object is also different. We access the content like this:
            return response.choices[0].message.content
            # --------------------------------------------------------
        except Exception as e:
            print(f"Error calling LLM API: {e}")
            return "There was an error communicating with the language model."

    def answer_question(self, query: str):
        # ... (this method does not need to change)
        if not hasattr(self, 'index'):
             return "The RAG system could not be initialized, likely due to empty content."
        relevant_docs = self._retrieve(query)
        combined_context = "\n\n".join([doc.page_content for doc in relevant_docs])
        answer = self._generate_answer(combined_context, query)
        return answer