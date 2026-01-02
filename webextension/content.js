// Prevent duplicate injection
if (!document.getElementById("my-extension-fab")) {
  // Create floating action button
  const button = document.createElement("button");
  button.id = "my-extension-fab";
  button.innerText = "💬";
  button.title = "Chat with this page";

  // Create chat slider/drawer
  const chatSlider = document.createElement("div");
  chatSlider.id = "doubt-solver-slider";
  chatSlider.innerHTML = `
    <div class="slider-container">
      <div class="slider-header">
        <h3>💬 Chat with this page</h3>
        <button class="close-btn" id="close-slider">×</button>
      </div>
      <div class="slider-status" id="slider-status">Scrape a page to begin...</div>
      <div class="slider-chat-window" id="slider-chat-window"></div>
      <form class="slider-chat-form" id="slider-chat-form">
        <input type="text" id="slider-chat-input" placeholder="Ask a question..." autocomplete="off" disabled>
        <button type="submit" id="slider-send-btn" disabled>Send</button>
      </form>
    </div>
  `;

  // Append elements to body
  document.body.appendChild(button);
  document.body.appendChild(chatSlider);

  // API URLs
  const API_INDEX_URL = 'http://127.0.0.1:8000/scrape-and-index';
  const API_CHAT_URL = 'http://127.0.0.1:8000/chat';

  let currentSessionId = null;
  let isIndexing = false;

  // Helper function to add messages to chat
  function addMessage(text, sender) {
    const chatWindow = document.getElementById('slider-chat-window');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', `${sender}-message`);
    messageDiv.textContent = text;
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  // Function to scrape and index current page
  async function startIndexing() {
    if (isIndexing || currentSessionId) return;

    isIndexing = true;
    const statusDiv = document.getElementById('slider-status');
    const chatInput = document.getElementById('slider-chat-input');
    const sendBtn = document.getElementById('slider-send-btn');

    statusDiv.textContent = 'Scraping and indexing content... Please wait.';

    try {
      console.log('Starting indexing for URL:', window.location.href);
      
      // Use chrome.runtime.sendMessage instead of fetch to avoid permission prompt
      const response = await chrome.runtime.sendMessage({
        action: 'scrapeAndIndex',
        url: window.location.href
      });

      console.log('Response:', response);
      
      if (!response.success) {
        console.error('Server error:', response.error);
        throw new Error(response.error || 'Failed to index content.');
      }

      console.log('Indexing successful:', response.data);
      currentSessionId = response.data.session_id;

      statusDiv.textContent = 'Ready! Ask a question below.';
      chatInput.disabled = false;
      sendBtn.disabled = false;
      chatInput.focus();

    } catch (error) {
      console.error('Indexing error:', error);
      if (error.message === 'Failed to fetch') {
        statusDiv.textContent = 'Error: Cannot connect to server. Make sure FastAPI is running on port 8000.';
      } else {
        statusDiv.textContent = `Error: ${error.message}`;
      }
    } finally {
      isIndexing = false;
    }
  }

  // Handle chat form submission
  document.getElementById('slider-chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const chatInput = document.getElementById('slider-chat-input');
    const sendBtn = document.getElementById('slider-send-btn');
    const question = chatInput.value.trim();

    if (!question || !currentSessionId) return;

    addMessage(question, 'user');
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    addMessage('Thinking...', 'bot');

    try {
      // Use chrome.runtime.sendMessage instead of fetch to avoid permission prompt
      const response = await chrome.runtime.sendMessage({
        action: 'chat',
        session_id: currentSessionId,
        question: question
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get answer.');
      }

      const thinkingMsg = document.querySelector('#slider-chat-window .bot-message:last-child');
      thinkingMsg.textContent = response.data.answer;

    } catch (error) {
      const thinkingMsg = document.querySelector('#slider-chat-window .bot-message:last-child');
      thinkingMsg.textContent = `Error: ${error.message}`;
    } finally {
      chatInput.disabled = false;
      sendBtn.disabled = false;
      chatInput.focus();
    }
  });

  // Open slider when floating button is clicked
  button.addEventListener("click", () => {
    chatSlider.classList.add("open");
    button.style.display = "none"; // Hide button when slider opens

    // Start indexing if not already done
    if (!currentSessionId && !isIndexing) {
      startIndexing();
    }
  });

  // Close slider
  document.getElementById('close-slider').addEventListener('click', () => {
    chatSlider.classList.remove("open");
    button.style.display = "flex"; // Show button when slider closes
  });
}
