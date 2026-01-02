// Background service worker to handle API calls
// This prevents the "local network" permission prompt

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeAndIndex') {
    // Handle scrape and index request
    fetch('http://127.0.0.1:8000/scrape-and-index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: request.url })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.detail || 'Failed to index content.');
          });
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'chat') {
    // Handle chat request
    fetch('http://127.0.0.1:8000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        session_id: request.session_id, 
        question: request.question 
      })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.detail || 'Failed to get answer.');
          });
        }
        return response.json();
      })
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep the message channel open for async response
  }
});
