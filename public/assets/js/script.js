// Elements
const chatContainer = document.getElementById('chat-container');
const messagesContainer = document.getElementById('messages-container');
const welcomeScreen = document.getElementById('welcome-screen');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');
const newChatBtn = document.getElementById('new-chat-btn');
const mobileNewChat = document.getElementById('mobile-new-chat');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const conversationsList = document.getElementById('conversations-list');

// Search elements
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const searchResults = document.getElementById('search-results');

// State
let currentSessionId = null;
let conversations = [];
let searchDebounceTimer = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadConversations();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Send button
    sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

    // Enter key to send (Shift+Enter for new line)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(chatInput.value);
        }
    });

    // Auto-resize textarea and enable/disable send button
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        sendBtn.disabled = !this.value.trim();
    });

    // New chat buttons
    newChatBtn.addEventListener('click', startNewChat);
    mobileNewChat.addEventListener('click', startNewChat);

    // Mobile sidebar toggle
    mobileMenuBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Quick actions
    document.querySelectorAll('.quick-action').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            if (prompt) {
                chatInput.value = prompt;
                sendBtn.disabled = false;
                chatInput.focus();
            }
        });
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim()) {
                searchResults.style.display = 'block';
            }
        });
    }

    if (searchClear) {
        searchClear.addEventListener('click', clearSearch);
    }

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (searchResults && !searchResults.contains(e.target) &&
            !searchInput.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

// Toggle mobile sidebar
function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
}

// Theme functions
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeButton(true);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeButton(isDark);
}

function updateThemeButton(isDark) {
    const icon = themeToggle.querySelector('.material-symbols-rounded');
    const text = themeToggle.querySelector('.toggle-text');
    icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    text.textContent = isDark ? 'Light Mode' : 'Dark Mode';
}

// Load conversations from server
async function loadConversations() {
    try {
        const response = await fetch('/api/sessions');
        const data = await response.json();
        conversations = data.sessions || [];
        renderConversationsList();

        // Check if there's a session ID in sessionStorage
        const savedSessionId = sessionStorage.getItem('asana_session_id');
        if (savedSessionId) {
            const existingConv = conversations.find(c => c.session_id === savedSessionId);
            if (existingConv) {
                await selectConversation(savedSessionId);
                return;
            }
        }

        // No existing session, show welcome screen
        showWelcomeScreen();
    } catch (error) {
        console.error('Error loading conversations:', error);
        showWelcomeScreen();
    }
}

// Render conversations list in sidebar
function renderConversationsList() {
    if (conversations.length === 0) {
        conversationsList.innerHTML = `
            <div class="no-conversations">
                <span class="material-symbols-rounded">chat_bubble_outline</span>
                <p>No conversations yet</p>
            </div>
        `;
        return;
    }

    conversationsList.innerHTML = conversations.map(conv => {
        const isActive = conv.session_id === currentSessionId;
        const title = conv.current_client || 'New Conversation';
        const time = formatTime(conv.last_activity);

        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" data-session-id="${conv.session_id}">
                <span class="material-symbols-rounded">chat_bubble</span>
                <div class="conversation-info">
                    <div class="conversation-title">${escapeHtml(title)}</div>
                    <div class="conversation-preview">${time}</div>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    conversationsList.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => {
            selectConversation(item.dataset.sessionId);
            // Close mobile sidebar
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    });
}

// Format time for display
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Select a conversation
async function selectConversation(sessionId) {
    currentSessionId = sessionId;
    sessionStorage.setItem('asana_session_id', sessionId);

    // Update active state in sidebar
    renderConversationsList();

    // Load messages for this session
    try {
        const response = await fetch(`/api/sessions/${sessionId}/messages`);
        const data = await response.json();
        const messages = data.messages || [];

        if (messages.length === 0) {
            showWelcomeScreen();
        } else {
            hideWelcomeScreen();
            renderMessages(messages);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        showWelcomeScreen();
    }
}

// Render messages
function renderMessages(messages) {
    messagesContainer.innerHTML = messages.map(msg => createMessageHTML(msg.content, msg.role)).join('');
    scrollToBottom();
}

// Create message HTML
function createMessageHTML(content, role) {
    const isUser = role === 'user';
    const avatar = isUser ? 'person' : 'smart_toy';
    const roleLabel = isUser ? 'You' : 'Asana Coach';

    return `
        <div class="message ${role}">
            <div class="message-avatar">
                <span class="material-symbols-rounded">${avatar}</span>
            </div>
            <div class="message-content">
                <div class="message-role">${roleLabel}</div>
                <div class="message-text">${formatMessageText(content)}</div>
            </div>
        </div>
    `;
}

// Format message text (handle markdown-like formatting)
function formatMessageText(text) {
    // Escape HTML first
    let formatted = escapeHtml(text);

    // Bold: **text** or __text__
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Lists: - item or * item
    formatted = formatted.replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>');

    // Numbered lists: 1. item
    formatted = formatted.replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>');

    return formatted;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show/hide welcome screen
function showWelcomeScreen() {
    welcomeScreen.style.display = 'flex';
    messagesContainer.innerHTML = '';
}

function hideWelcomeScreen() {
    welcomeScreen.style.display = 'none';
}

// Start new chat
async function startNewChat() {
    try {
        const response = await fetch('/api/sessions/new', { method: 'POST' });
        const data = await response.json();
        currentSessionId = data.sessionId;
        sessionStorage.setItem('asana_session_id', currentSessionId);

        // Reload conversations to include the new one
        await loadConversations();

        // Show welcome screen
        showWelcomeScreen();

        // Close mobile sidebar
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        }
    } catch (error) {
        console.error('Error creating new chat:', error);
    }
}

// Scroll to bottom
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Add message to UI
function addMessageToUI(content, role) {
    hideWelcomeScreen();
    messagesContainer.insertAdjacentHTML('beforeend', createMessageHTML(content, role));
    scrollToBottom();
}

// Show typing indicator
function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message assistant typing';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
        <div class="message-avatar">
            <span class="material-symbols-rounded">smart_toy</span>
        </div>
        <div class="message-content">
            <div class="message-role">Asana Coach</div>
            <div class="typing-indicator">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>
    `;
    messagesContainer.appendChild(indicator);
    scrollToBottom();
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

// Send message
async function sendMessage(userMessage) {
    if (!userMessage.trim()) return;

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendBtn.disabled = true;

    // Ensure we have a session
    if (!currentSessionId) {
        await startNewChat();
    }

    // Display user message
    addMessageToUI(userMessage, 'user');

    // Show typing indicator
    showTypingIndicator();

    try {
        console.log('Sending message with sessionId:', currentSessionId);

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userMessage,
                sessionId: currentSessionId
            }),
        });

        removeTypingIndicator();

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            addMessageToUI(`Error: ${data.error}`, 'assistant');
        } else {
            addMessageToUI(data.response, 'assistant');

            // Update session ID if returned
            if (data.sessionId && data.sessionId !== currentSessionId) {
                currentSessionId = data.sessionId;
                sessionStorage.setItem('asana_session_id', currentSessionId);
            }
        }

        // Reload conversations to update sidebar
        await loadConversations();

    } catch (error) {
        console.error('Error:', error);
        removeTypingIndicator();
        addMessageToUI('Sorry, I encountered an error. Please try again.', 'assistant');
    } finally {
        chatInput.focus();
    }
}

// Search Functions
function handleSearchInput(e) {
    const query = e.target.value.trim();

    // Show/hide clear button
    if (searchClear) {
        searchClear.style.display = query ? 'flex' : 'none';
    }

    // Clear previous timer
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }

    // Hide results if query is empty
    if (!query) {
        searchResults.style.display = 'none';
        conversationsList.style.display = 'block';
        return;
    }

    // Debounce search
    searchDebounceTimer = setTimeout(() => {
        performSearch(query);
    }, 300);
}

async function performSearch(query) {
    try {
        // Show loading state
        searchResults.innerHTML = `
            <div class="search-loading">
                <span class="material-symbols-rounded">search</span>
                <p>Searching...</p>
            </div>
        `;
        searchResults.style.display = 'block';
        conversationsList.style.display = 'none';

        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        renderSearchResults(data.results, query);
    } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = `
            <div class="search-no-results">
                <span class="material-symbols-rounded">error</span>
                <p>Search error. Please try again.</p>
            </div>
        `;
    }
}

function renderSearchResults(results, query) {
    if (!results || results.length === 0) {
        searchResults.innerHTML = `
            <div class="search-no-results">
                <span class="material-symbols-rounded">search_off</span>
                <p>No results found for "${escapeHtml(query)}"</p>
            </div>
        `;
        return;
    }

    const html = results.map(result => {
        const time = formatTime(result.createdAt);
        const roleIcon = result.role === 'user' ? 'person' : 'smart_toy';
        const highlightedSnippet = highlightSearchTerms(result.snippet, query);

        return `
            <div class="search-result-item" data-session-id="${result.sessionId}">
                <div class="search-result-header">
                    <span class="material-symbols-rounded">${roleIcon}</span>
                    <span class="search-result-title">${escapeHtml(result.sessionTitle)}</span>
                    <span class="search-result-time">${time}</span>
                </div>
                <div class="search-result-snippet">${highlightedSnippet}</div>
            </div>
        `;
    }).join('');

    searchResults.innerHTML = html;

    // Add click handlers
    searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const sessionId = item.dataset.sessionId;
            selectConversation(sessionId);
            clearSearch();

            // Close mobile sidebar
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    });
}

function highlightSearchTerms(text, query) {
    if (!text || !query) return escapeHtml(text);

    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function clearSearch() {
    if (searchInput) {
        searchInput.value = '';
    }
    if (searchClear) {
        searchClear.style.display = 'none';
    }
    if (searchResults) {
        searchResults.style.display = 'none';
        searchResults.innerHTML = '';
    }
    conversationsList.style.display = 'block';
}
