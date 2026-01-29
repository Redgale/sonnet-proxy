// State management
const state = {
  history: [],
  currentUrl: null
};

// DOM Elements
const proxyForm = document.getElementById('proxyForm');
const urlInput = document.getElementById('urlInput');
const errorMessage = document.getElementById('errorMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const proxyContent = document.getElementById('proxyContent');
const contentFrame = document.getElementById('contentFrame');
const displayUrl = document.getElementById('displayUrl');
const closeBtn = document.getElementById('closeBtn');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');

// Load history from localStorage
function loadHistory() {
  const saved = localStorage.getItem('proxyHistory');
  if (saved) {
    state.history = JSON.parse(saved);
    renderHistory();
  }
}

// Save history to localStorage
function saveHistory() {
  localStorage.setItem('proxyHistory', JSON.stringify(state.history));
}

// Add to history
function addToHistory(url) {
  const entry = {
    url,
    timestamp: new Date().toLocaleString()
  };

  // Remove duplicates
  state.history = state.history.filter(h => h.url !== url);
  
  // Add to beginning
  state.history.unshift(entry);
  
  // Keep only last 20
  state.history = state.history.slice(0, 20);
  
  saveHistory();
  renderHistory();
}

// Render history
function renderHistory() {
  if (state.history.length === 0) {
    historySection.classList.add('hidden');
    return;
  }

  historySection.classList.remove('hidden');
  historyList.innerHTML = state.history
    .map(entry => `
      <li class="history-item">
        <a href="#" class="history-link" data-url="${entry.url}">
          ${new URL(entry.url).hostname}
        </a>
        <span class="history-time">${entry.timestamp}</span>
      </li>
    `)
    .join('');

  // Add click handlers
  document.querySelectorAll('.history-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      urlInput.value = link.dataset.url;
      fetchProxy(link.dataset.url);
    });
  });
}

// Show error
function showError(message) {
  errorMessage.textContent = `❌ ${message}`;
  errorMessage.style.display = 'block';
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 5000);
}

// Clear error
function clearError() {
  errorMessage.textContent = '';
  errorMessage.style.display = 'none';
}

// Fetch via proxy
async function fetchProxy(url) {
  clearError();
  
  if (!url.trim()) {
    showError('Please enter a URL');
    return;
  }

  loadingSpinner.classList.remove('hidden');
  proxyContent.classList.add('hidden');

  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url.trim() })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch URL');
    }

    // Store current URL
    state.currentUrl = data.url;

    // Add to history
    addToHistory(data.url);

    // Display content
    displayUrl.textContent = data.url;
    
    if (data.contentType.includes('text/html')) {
      // For HTML, we need to rewrite relative URLs
      const modifiedHtml = rewriteUrls(data.content, data.url);
      contentFrame.innerHTML = modifiedHtml;
    } else if (data.contentType.includes('text/')) {
      // For plain text
      contentFrame.innerHTML = `<pre>${escapeHtml(data.content)}</pre>`;
    } else {
      // For other content types
      contentFrame.innerHTML = `<p>Content type: ${data.contentType}</p><p>Unable to display in proxy frame.</p>`;
    }

    proxyContent.classList.remove('hidden');
    
  } catch (error) {
    showError(error.message);
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

// Rewrite URLs in HTML to go through proxy
function rewriteUrls(html, baseUrl) {
  const baseUrlObj = new URL(baseUrl);
  
  // Create a temporary container
  const container = document.createElement('div');
  container.innerHTML = html;

  // Rewrite src attributes
  container.querySelectorAll('[src]').forEach(el => {
    try {
      const href = el.getAttribute('src');
      if (!href.startsWith('data:') && !href.startsWith('javascript:')) {
        const absoluteUrl = new URL(href, baseUrl).href;
        el.setAttribute('data-original-src', absoluteUrl);
      }
    } catch (e) {
      console.warn('Invalid URL:', el.getAttribute('src'));
    }
  });

  // Rewrite href attributes
  container.querySelectorAll('[href]').forEach(el => {
    try {
      const href = el.getAttribute('href');
      if (!href.startsWith('#') && !href.startsWith('javascript:')) {
        const absoluteUrl = new URL(href, baseUrl).href;
        el.setAttribute('onclick', `window.proxyLink('${absoluteUrl}'); return false;`);
        el.style.cursor = 'pointer';
      }
    } catch (e) {
      console.warn('Invalid URL:', el.getAttribute('href'));
    }
  });

  return container.innerHTML;
}

// Proxy link handler
window.proxyLink = function(url) {
  urlInput.value = url;
  fetchProxy(url);
  window.scrollTo(0, 0);
};

// Escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Event Listeners
proxyForm.addEventListener('submit', (e) => {
  e.preventDefault();
  fetchProxy(urlInput.value);
});

closeBtn.addEventListener('click', () => {
  proxyContent.classList.add('hidden');
  contentFrame.innerHTML = '';
  urlInput.value = '';
  urlInput.focus();
});

// Initialize
loadHistory();
urlInput.focus();