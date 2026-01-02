document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chat-window');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const statusDiv = document.getElementById('status');

    const API_INDEX_URL = 'http://127.0.0.1:8000/scrape-and-index';
    const API_CHAT_URL = 'http://127.0.0.1:8000/chat';
    
    let currentSessionId = null;

    // Helper function to add messages to the chat window
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight; // Auto-scroll to bottom
    }

    // Function to handle the initial scraping and indexing
    async function startIndexing(url) {
        statusDiv.textContent = 'Scraping and indexing content... This may take a moment.';
        try {
            const response = await fetch(API_INDEX_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to index content.');
            }

            const data = await response.json();
            currentSessionId = data.session_id;

            statusDiv.textContent = 'Ready! Ask a question below.';
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();

        } catch (error) {
            statusDiv.textContent = `Error: ${error.message}`;
        }
    }

    // Get current tab URL from background script
    chrome.runtime.sendMessage({ action: "getCurrentTabUrl" }, (response) => {
        if (response && response.url) {
            console.log('Current URL:', response.url);
            startIndexing(response.url);
        } else {
            statusDiv.textContent = 'Could not get current tab URL.';
        }
    });

    // Handle form submission to send a question
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = chatInput.value.trim();
        if (!question || !currentSessionId) return;

        addMessage(question, 'user');
        chatInput.value = '';
        chatInput.disabled = true;
        sendBtn.disabled = true;

        addMessage('Thinking...', 'bot');

        try {
            const response = await fetch(API_CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: currentSessionId, question: question }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to get answer.');
            }
            
            const data = await response.json();

            // Replace "Thinking..." with the real answer
            const thinkingMsg = chatWindow.querySelector('.bot-message:last-child');
            thinkingMsg.textContent = data.answer;

        } catch (error) {
            const thinkingMsg = chatWindow.querySelector('.bot-message:last-child');
            thinkingMsg.textContent = `Error: ${error.message}`;
        } finally {
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();
        }
    });
});