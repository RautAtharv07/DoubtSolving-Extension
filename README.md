# DoubtSolving-Extension
[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/RautAtharv07/DoubtSolving-Extension.git)

This project is a browser extension that allows users to ask questions about the content of the current webpage. It scrapes the page, processes the text using a Retrieval Augmented Generation (RAG) system powered by Together.ai, and provides a chat interface within the extension popup to interact with the page's content.

## Features

*   **Chat with Current Webpage:** Open the extension on any webpage to start asking questions about its content.
*   **Contextual Q&A:** The system uses a RAG pipeline to retrieve relevant text chunks from the scraped page and generate answers based on that context.
*   **Powered by Together.ai:** Leverages the `mistralai/Mistral-7B-Instruct-v0.2` model via Together.ai for generating answers.
*   **FastAPI Backend:** A Python-based backend serves the scraping, indexing, and chat functionalities.
*   **Browser Extension:** A simple browser extension (Chromium-based) provides the user interface.

## How it Works

The system consists of three main components:

1.  **Browser Extension (`webextension/`)**:
    *   When the user opens the extension popup, `popup.js` sends the current tab's URL to the backend.
    *   It provides a chat interface for the user to ask questions.
    *   User questions are sent to the backend, and answers are displayed in the chat window.

2.  **FastAPI Backend (`main.py`)**:
    *   **`/scrape-and-index` endpoint**: Receives a URL from the extension, uses `scraper.py` to fetch and extract text content from the webpage. Then, it initializes a `RAGSystem` instance with this text, which involves chunking, embedding, and indexing the content. A unique `session_id` for this processed page is returned.
    *   **`/chat` endpoint**: Receives a `session_id` and a user's `question`. It retrieves the corresponding `RAGSystem` instance and uses it to generate an answer based on the indexed content and the question.

3.  **RAG System (`rag_system.py`)**:
    *   **Text Processing**: Splits the scraped text into manageable chunks using `RecursiveCharacterTextSplitter`.
    *   **Embedding**: Uses `sentence-transformers` (`all-MiniLM-L6-v2`) to generate embeddings for each text chunk.
    *   **Vector Store**: Employs `FAISS` (IndexFlatL2) to store and efficiently search these embeddings.
    *   **Retrieval**: When a question is asked, the system embeds the question and retrieves the most relevant text chunks from the FAISS index.
    *   **Generation**: The retrieved chunks (context) and the original question are passed to the `mistralai/Mistral-7B-Instruct-v0.2` model via the Together.ai API (using the `openai` client library configured for Together.ai). The model generates an answer based on the provided context.

4.  **Web Scraper (`scraper.py`)**:
    *   Uses `requests` to fetch the HTML of a given URL.
    *   Uses `BeautifulSoup4` with `lxml` parser to parse the HTML.
    *   Extracts the page title, the first `<h1>` tag, and the main body content.
    *   Cleans the content by removing common non-content tags like `<nav>`, `<footer>`, `<script>`, etc.
    *   Combines the extracted text parts into a single text block.

## Setup and Installation

### Prerequisites

*   Python 3.8+
*   A Chromium-based browser (e.g., Google Chrome, Brave) for the extension.
*   A `TOGETHER_API_KEY` from [Together.ai](https://www.together.ai/).

### 1. Backend Setup

Follow these steps to set up and run the FastAPI backend:

```bash
# Clone the repository
git clone https://github.com/RautAtharv07/DoubtSolving-Extension.git
cd DoubtSolving-Extension

# Create a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Create a .env file in the root directory of the project
# (i.e., DoubtSolving-Extension/.env)
# Add your Together.ai API key to it:
echo "TOGETHER_API_KEY=your_actual_together_api_key" > .env

# Run the FastAPI backend
# The backend will be available at http://127.0.0.1:8000 by default
uvicorn main:app --reload
```

**Note:** The `requirements.txt` should include packages like `fastapi`, `uvicorn[standard]`, `pydantic`, `requests`, `beautifulsoup4`, `lxml`, `sentence-transformers`, `faiss-cpu`, `openai`, `python-dotenv`, `numpy`, `langchain`.

### 2. Browser Extension Setup

1.  **Configure Backend URL:**
    The extension is configured to use a deployed backend at `https://my-rag-scraper-api.onrender.com`.
    If you are running the backend locally (e.g., at `http://127.0.0.1:8000`), you need to update the API URLs in two files:
    *   `webextension/popup.js`:
        Change `API_INDEX_URL` and `API_CHAT_URL`.
        ```javascript
        // const API_INDEX_URL = 'https://my-rag-scraper-api.onrender.com/scrape-and-index';
        // const API_CHAT_URL = 'https://my-rag-scraper-api.onrender.com/chat';
        const API_INDEX_URL = 'http://127.0.0.1:8000/scrape-and-index';
        const API_CHAT_URL = 'http://127.0.0.1:8000/chat';
        ```
    *   `webextension/manifest.json`:
        Update the `host_permissions` to include your local backend URL.
        ```json
        "host_permissions": [
          "http://127.0.0.1:8000/*"
        ],
        ```

2.  **Load the Extension in your Browser:**
    *   Open your Chromium-based browser (e.g., Chrome).
    *   Go to the extensions page (e.g., `chrome://extensions/`).
    *   Enable "Developer mode" (usually a toggle in the top right corner).
    *   Click on "Load unpacked".
    *   Navigate to and select the `webextension` directory from this project.
    *   The "Simple Web Scraper" (DoubtSolving-Extension) should now appear in your list of extensions. You can pin it to your toolbar for easy access.

## Usage

1.  Ensure the FastAPI backend server is running.
2.  Navigate to any webpage you want to ask questions about.
3.  Click on the DoubtSolving-Extension icon in your browser's toolbar.
4.  The extension will automatically start scraping and indexing the current page. The status "Scraping and indexing content..." will be displayed.
5.  Once ready (status changes to "Ready! Ask a question below."), type your question into the input field and press Enter or click "Send".
6.  The answer from the RAG system will appear in the chat window.

## API Endpoints (FastAPI Backend)

The backend exposes the following API endpoints:

*   **`POST /scrape-and-index`**:
    *   **Request Body**: `{"url": "string (HttpUrl)"}`
    *   **Description**: Scrapes the content from the provided URL, processes it, and initializes a RAG session.
    *   **Response**: `{"session_id": "string", "message": "string"}`

*   **`POST /chat`**:
    *   **Request Body**: `{"session_id": "string", "question": "string"}`
    *   **Description**: Takes a session ID and a question, and returns an answer generated by the RAG system for that session's content.
    *   **Response**: `{"answer": "string"}`

## Technologies Used

*   **Backend**:
    *   Python
    *   FastAPI (for the web server and API)
    *   Pydantic (for data validation)
    *   Uvicorn (ASGI server)
*   **Web Scraping**:
    *   Requests (for HTTP calls)
    *   BeautifulSoup4 (for HTML parsing)
    *   lxml (HTML parser)
*   **RAG System & NLP**:
    *   Sentence-Transformers (`all-MiniLM-L6-v2` for embeddings)
    *   FAISS (for similarity search in vector embeddings)
    *   Langchain (for text splitting)
    *   OpenAI Python client (configured for Together.ai)
    *   Together.ai (hosting `mistralai/Mistral-7B-Instruct-v0.2` LLM)
    *   NumPy
*   **Browser Extension**:
    *   HTML, CSS, JavaScript
    *   WebExtensions API
*   **Environment Management**:
    *   `python-dotenv` (for managing API keys)
