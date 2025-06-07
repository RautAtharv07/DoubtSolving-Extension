from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
import uuid
from fastapi.middleware.cors import CORSMiddleware
# Import our system components
from scraper import scrape_text_from_url
from rag_system import RAGSystem

app = FastAPI(
    title="Custom RAG Chat API",
    description="An API to scrape a webpage and chat with its content using Together.ai.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for public API)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)
# In-memory storage for our RAG sessions (for demo purposes)
chat_sessions = {}

# --- Pydantic Models ---
class IndexRequest(BaseModel):
    url: HttpUrl

class IndexResponse(BaseModel):
    session_id: str
    message: str

class ChatRequest(BaseModel):
    session_id: str
    question: str

class ChatResponse(BaseModel):
    answer: str

# --- API Endpoints ---
@app.post("/scrape-and-index", response_model=IndexResponse)
async def scrape_and_index(request: IndexRequest):
    """
    Scrapes a URL, processes its content, and prepares a RAG session.
    """
    url_to_scrape = str(request.url)
    
    try:
        # 1. Scrape the content
        text_content = scrape_text_from_url(url_to_scrape)
        if not text_content:
            raise HTTPException(status_code=400, detail="Could not extract text from the URL.")

        # 2. Create and store the RAG system instance
        session_id = str(uuid.uuid4())
        chat_sessions[session_id] = RAGSystem(raw_text=text_content)
        
        return {
            "session_id": session_id,
            "message": "Content indexed successfully. Ready to chat."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")


@app.post("/chat", response_model=ChatResponse)
async def chat_with_data(request: ChatRequest):
    """
    Asks a question to a previously indexed RAG session.
    """
    session = chat_sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Please scrape a URL first.")
        
    # Get the answer from our RAG system
    answer = session.answer_question(request.question)
    
    return {"answer": answer}