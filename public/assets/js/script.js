// Elements
const chatContainer = document.getElementById('chat-container');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');
const clearBtn = document.getElementById('clear-chat');

// Session storage keys
const STORAGE_KEY = 'asana_chat_history';
const SESSION_ID_KEY = 'asana_session_id';

// Generate or retrieve session ID
let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
if (!sessionId) {
    // Generate UUID-like session ID
    sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    console.log('🆔 New session ID generated:', sessionId);
} else {
    console.log('🆔 Existing session ID:', sessionId);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
    initializeTheme();
});

// Load chat history from session storage
function loadChatHistory() {
    const history = sessionStorage.getItem(STORAGE_KEY);
    if (history) {
        const messages = JSON.parse(history);
        if (messages.length > 0) {
            // Remove welcome message
            const welcomeMsg = chatContainer.querySelector('.welcome-message');
            if (welcomeMsg) welcomeMsg.remove();

            // Restore all messages
            messages.forEach(msg => {
                createChatElement(msg.text, msg.type);
            });
        }
    }
}

// Save message to session storage
function saveMessage(text, type) {
    const history = sessionStorage.getItem(STORAGE_KEY);
    const messages = history ? JSON.parse(history) : [];
    messages.push({ text, type, timestamp: Date.now() });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

// Clear chat history
clearBtn.addEventListener('click', () => {
    if (confirm('Clear all chat history?')) {
        sessionStorage.removeItem(STORAGE_KEY);
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <span class="material-symbols-rounded">assistant</span>
                <h2>Welcome to Asana Coaching Assistant</h2>
                <p>Ask me about your clients' project status, tasks, and progress.</p>
                <div class="example-queries">
                    <p><strong>Try asking:</strong></p>
                    <ul>
                        <li>"Give me a status update on [client name]"</li>
                        <li>"What tasks were completed for [client] this week?"</li>
                        <li>"Show me [client]'s project progress"</li>
                    </ul>
                </div>
            </div>
        `;
    }
});

// Theme toggle
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.innerHTML = '<span class="material-symbols-rounded">light_mode</span>';
    }
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    themeToggle.innerHTML = isLight
        ? '<span class="material-symbols-rounded">light_mode</span>'
        : '<span class="material-symbols-rounded">dark_mode</span>';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// Create chat element
function createChatElement(message, type) {
    const chat = document.createElement('div');
    chat.classList.add('chat', type);

    // Remove welcome message on first chat
    const welcomeMsg = chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();

    if (type === 'outgoing') {
        chat.innerHTML = `
            <div class="chat-content">
                <div class="chat-details">
                    <p>${message}</p>
                </div>
            </div>
        `;
    } else {
        chat.innerHTML = `
            <div class="chat-content">
                <span class="material-symbols-rounded">smart_toy</span>
                <div class="chat-details">
                    <p>${message}</p>
                </div>
            </div>
        `;
    }

    chatContainer.appendChild(chat);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return chat;
}

// Create typing indicator
function showTypingIndicator() {
    const chat = document.createElement('div');
    chat.classList.add('chat', 'incoming', 'typing-indicator');
    chat.innerHTML = `
        <div class="chat-content">
            <span class="material-symbols-rounded">smart_toy</span>
            <div class="chat-details">
                <div class="typing-animation">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>
        </div>
    `;
    chatContainer.appendChild(chat);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return chat;
}

// Send message to backend
async function sendMessage(userMessage) {
    if (!userMessage.trim()) return;

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Disable send button
    sendBtn.disabled = true;

    // Display user message
    createChatElement(userMessage, 'outgoing');
    saveMessage(userMessage, 'outgoing');

    // Show typing indicator
    const typingIndicator = showTypingIndicator();

    try {
        console.log('📤 Sending message with sessionId:', sessionId);

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                sessionId: sessionId
            }),
        });

        // Remove typing indicator
        typingIndicator.remove();

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            createChatElement(`Error: ${data.error}`, 'incoming error-message');
            saveMessage(`Error: ${data.error}`, 'incoming');
        } else {
            createChatElement(data.response, 'incoming');
            saveMessage(data.response, 'incoming');
        }
    } catch (error) {
        console.error('Error:', error);
        typingIndicator.remove();
        const errorMsg = 'Sorry, I encountered an error. Please try again.';
        createChatElement(errorMsg, 'incoming error-message');
        saveMessage(errorMsg, 'incoming');
    } finally {
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

// Send button click
sendBtn.addEventListener('click', () => {
    sendMessage(chatInput.value);
});

// Enter key to send (Shift+Enter for new line)
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(chatInput.value);
    }
});

// Auto-resize textarea
chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});
