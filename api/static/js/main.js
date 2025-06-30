// DOM Elements
const chatMessages = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendButton = document.querySelector('.send-btn');
const container = document.querySelector('.container');
const themeToggle = document.querySelector('.theme-toggle');
const newChatBtn = document.querySelector('.new-chat');
const chatHistoryContainer = document.querySelector('.chat-history');
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.querySelector('.sidebar-toggle');
const mobileToggle = document.querySelector('.mobile-toggle');
const stopBtn = document.querySelector('.stop-btn');

// Function to toggle sidebar
function toggleSidebar() {
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// Add event listeners for sidebar toggle
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
}

// Handle mobile toggle button
if (mobileToggle) {
    mobileToggle.addEventListener('click', toggleSidebar);
}

// Global variables
let controller = null;

// Chat state variables
let currentChatId = null;
let currentUser = null;
let chatHistory = [];

// GSAP Animations
document.addEventListener('DOMContentLoaded', () => {
    // Initial animation for the container
    gsap.to('.container', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.3
    });
    
    // Stagger animation for sidebar header elements
    gsap.from('.sidebar-header', {
        opacity: 0,
        y: -20,
        duration: 0.8,
        ease: 'back.out(1.7)',
        delay: 0.8
    });
    
    // Animation for chat section
    gsap.from('.chat-section', {
        opacity: 0,
        scale: 0.95,
        duration: 0.8,
        ease: 'power2.out',
        delay: 1.2
    });
    
    // Logo click for mobile toggle
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    }
    
    // Default to dark mode
    let darkMode = true;
    
    // Initialize chat functionality
    initializeChats();
    
    // New chat functionality
    newChatBtn.addEventListener('click', function() {
        createNewChatSession();
    });
});

// Function to add a message to the chat
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    
    // Create a message content container for all message types
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageDiv.appendChild(messageContent);
    
    // Check if the content contains code blocks (```)
    if (type === 'assistant' && content.includes('```')) {
        // Parse markdown code blocks
        const formattedContent = parseCodeBlocks(content);
        
        // Replace emoji shortcodes if available
        if (typeof replaceEmojis === 'function') {
            messageContent.innerHTML = replaceEmojis(formattedContent);
        } else {
            messageContent.innerHTML = formattedContent;
        }
    } else {
        // Regular text message
        if (typeof replaceEmojis === 'function' && type === 'assistant') {
            // Replace emoji shortcodes and set as HTML
            messageContent.innerHTML = replaceEmojis(content);
        } else {
            // Regular text message without emoji processing
            const messagePara = document.createElement('p');
            messagePara.textContent = content;
            messageContent.appendChild(messagePara);
        }
    }
    
    // Add feedback options for assistant messages
    if (type === 'assistant') {
        const feedbackContainer = document.createElement('div');
        feedbackContainer.classList.add('message-feedback');
        feedbackContainer.innerHTML = `
            <button class="feedback-btn like-btn" title="Like"><i class="fas fa-thumbs-up"></i></button>
            <button class="feedback-btn dislike-btn" title="Dislike"><i class="fas fa-thumbs-down"></i></button>
            <button class="feedback-btn copy-btn" title="Copy"><i class="fas fa-copy"></i></button>
            <button class="feedback-btn speak-btn" title="Speak"><i class="fas fa-volume-up"></i></button>
        `;
        messageDiv.appendChild(feedbackContainer);
        
        // Add event listeners for feedback buttons
        const likeBtn = feedbackContainer.querySelector('.like-btn');
        const dislikeBtn = feedbackContainer.querySelector('.dislike-btn');
        const copyBtn = feedbackContainer.querySelector('.copy-btn');
        const speakBtn = feedbackContainer.querySelector('.speak-btn');
        
        likeBtn.addEventListener('click', () => {
            likeBtn.classList.toggle('active');
            if (dislikeBtn.classList.contains('active')) {
                dislikeBtn.classList.remove('active');
            }
        });
        
        dislikeBtn.addEventListener('click', () => {
            dislikeBtn.classList.toggle('active');
            if (likeBtn.classList.contains('active')) {
                likeBtn.classList.remove('active');
            }
        });
        
        copyBtn.addEventListener('click', () => {
            // Get text content from the message
            const textToCopy = messageContent.textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            });
        });
        
        speakBtn.addEventListener('click', () => {
            // Text-to-speech functionality
            const textToSpeak = messageContent.textContent;
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            window.speechSynthesis.speak(utterance);
            speakBtn.classList.add('active');
            
            utterance.onend = () => {
                speakBtn.classList.remove('active');
            };
        });
    }
    
    // Set initial state for GSAP animation
    gsap.set(messageDiv, { opacity: 0, y: 20 });
    
    chatMessages.appendChild(messageDiv);
    
    // Animate the message appearing
    gsap.to(messageDiv, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
    });
    
    // Scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

// Function to parse and format code blocks
function parseCodeBlocks(content) {
    // Split the content by code block markers
    let parts = content.split('```');
    let result = '';
    
    // Process each part
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            // Regular text - process lists, titles, and preserve line breaks
            let textContent = parts[i];
            
            // Process numbered lists (1. Item)
            textContent = textContent.replace(/^(\d+\.)\s+(.+)$/gm, '<div class="list-item"><span class="list-number">$1</span><span class="list-content">$2</span></div>');
            
            // Process bullet lists (- Item or * Item)
            textContent = textContent.replace(/^[\-\*]\s+(.+)$/gm, '<div class="list-item"><span class="list-bullet">•</span><span class="list-content">$1</span></div>');
            
            // Process markdown bold text for filenames with backticks
            textContent = textContent.replace(/`([^`]+)`/g, '<strong>$1</strong>');
            
            // Process markdown bold text - add colon if not present
            textContent = textContent.replace(/\*\*([^*:]+)\*\*/g, function(match, p1) {
                return '<h2 class="content-title">' + p1 + (p1.trim().endsWith(':') ? '' : ':') + '</h2>';
            });
            textContent = textContent.replace(/\*\*([^*]+:)\*\*/g, '<h2 class="content-title">$1</h2>');
            
            // Process markdown headers (###) - add colon if not present
            textContent = textContent.replace(/###\s+([^\n:]+)(?!:)/g, function(match, p1) {
                return '<h3 class="content-title">' + p1 + (p1.trim().endsWith(':') ? '' : ':') + '</h3>';
            });
            textContent = textContent.replace(/###\s+([^\n]+:)/g, '<h3 class="content-title">$1</h3>');
            
            // Process titles (lines followed by colon) - more carefully
            textContent = textContent.replace(/(^|<br>)([^<>:]+)(?!:)\s*(<br>|$)/g, function(match, p1, p2, p3) {
                // Only add colon if it's a title-like line (short, not a full paragraph)
                if (p2.trim().split(' ').length <= 5) {
                    return p1 + '<h3 class="content-title">' + p2 + (p2.trim().endsWith(':') ? '' : ':') + '</h3>' + p3;
                }
                return match; // Leave longer paragraphs unchanged
            });
            textContent = textContent.replace(/(^|<br>)([^<>]+:)\s*(<br>|$)/g, '$1<h3 class="content-title">$2</h3>$3');
            
            // Preserve other line breaks
            result += '<div class="text-content">' + textContent.replace(/\n/g, '<br>') + '</div>';
        } else {
            // Code block
            let codeContent = parts[i];
            let language = '';
            
            // Check if language is specified
            const firstLineBreak = codeContent.indexOf('\n');
            if (firstLineBreak > 0) {
                language = codeContent.substring(0, firstLineBreak).trim();
                codeContent = codeContent.substring(firstLineBreak + 1);
            }
            
            // Create code block element with copy button
            result += '<div class="code-block">';
            result += '<div class="code-header">';
            if (language) {
                result += '<div class="code-language">' + language + '</div>';
            }
            result += '<button class="copy-code-btn" onclick="copyCodeToClipboard(this, event)">Copy</button>';
            result += '</div>';
            // Escape HTML entities to prevent code from being executed
            const escapedContent = codeContent
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/\'/g, '&#039;');
            result += '<pre><code>' + escapedContent + '</code></pre>';
            result += '</div>';
        }
    }
    
    return result;
}

// Function to add loading indicator
function addLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('message', 'assistant', 'loading-message');
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.classList.add('loading');
    
    // Create a simple spinning circle (like DeepSeek)
    const circle = document.createElement('div');
    circle.classList.add('loading-circle');
    loadingIndicator.appendChild(circle);
    
    loadingDiv.appendChild(loadingIndicator);
    chatMessages.appendChild(loadingDiv);
    
    // Scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return loadingDiv;
}

// Function to remove loading indicator
function removeLoadingIndicator(loadingDiv) {
    if (loadingDiv && loadingDiv.parentNode) {
        chatMessages.removeChild(loadingDiv);
    } else {
        // Fallback: try to find and remove any loading indicators that might be present
        const loadingIndicator = document.querySelector('.message.loading-message');
        if (loadingIndicator && loadingIndicator.parentNode) {
            chatMessages.removeChild(loadingIndicator);
        }
    }
}

// Variables for response control
let isResponding = false;

// Function to send a message to the API
async function sendMessage(message) {
    try {
        // Disable user input while AI is responding
        userInput.disabled = true;
        sendButton.disabled = true;
        sendButton.style.display = 'none';
        stopBtn.style.display = 'flex';
        isResponding = true;
        
        // Create AbortController for the fetch request
        controller = new AbortController();
        const signal = controller.signal;
        
        // Save user message to Firebase if a chat is active
        if (currentChatId && currentUser) {
            console.log('Saving user message to chat:', currentChatId);
            const messageData = {
                role: 'user',
                content: message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            saveMessageToChat(currentChatId, messageData);
            
            // Update chat title if it's still the default "New Chat"
            const currentChat = chatHistory.find(chat => chat.id === currentChatId);
            if (currentChat && currentChat.title === 'New Chat') {
                // Use the first few words of the message as the chat title
                let newTitle = message.split(' ').slice(0, 4).join(' ');
                if (message.length > newTitle.length) {
                    newTitle += '...'; // Add ellipsis if the message is longer
                }
                
                // Update the title in Firebase
                renameChat(currentChatId, newTitle).then(success => {
                    if (success) {
                        // Update the title in the UI
                        const chatItem = document.querySelector(`.chat-item[data-id="${currentChatId}"]`);
                        if (chatItem) {
                            const titleElement = chatItem.querySelector('.chat-title');
                            if (titleElement) {
                                titleElement.textContent = newTitle;
                            }
                        }
                        
                        // Update the title in the local chat history
                        currentChat.title = newTitle;
                    }
                });
            }
        }
        
        // Add loading indicator
        const loadingIndicator = addLoadingIndicator();
        
        // Send the message to the API
        // Get the current user's ID token for authentication
        let headers = {
            'Content-Type': 'application/json'
        };
        
        // Add Firebase auth token if user is logged in
        if (firebase.auth().currentUser) {
            try {
                const token = await firebase.auth().currentUser.getIdToken(true);
                headers['Authorization'] = `Bearer ${token}`;
            } catch (tokenError) {
                console.error('Error getting auth token:', tokenError);
            }
        }
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ message }),
            signal: signal
        });
        
        // Remove loading indicator
        removeLoadingIndicator(loadingIndicator);
        
        if (!response.ok) {
            // Handle specific error status codes
            if (response.status === 401) {
                throw new Error('Authentication error: API key may be missing or invalid');
            } else {
                throw new Error('Failed to get response from API');
            }
        }
        
        const data = await response.json();
        
        // Add the assistant's response to the chat with typing animation
        if (data.response) {
            // Create the message container first
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'assistant');
            
            // Create message content container
            const messageContent = document.createElement('div');
            messageContent.classList.add('message-content');
            messageDiv.appendChild(messageContent);
            
            // Set initial state for GSAP animation
            gsap.set(messageDiv, { opacity: 0, y: 20 });
            
            // Add to chat
            chatMessages.appendChild(messageDiv);
            
            // Animate the message appearing
            gsap.to(messageDiv, {
                opacity: 1,
                y: 0,
                duration: 0.5,
                ease: 'power2.out'
            });
            
            // Scroll to the bottom of the chat
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Implement typing animation
            const content = data.response;
            let formattedContent = '';
            
            // Check if the content contains code blocks
            if (content.includes('```')) {
                // For code blocks, we'll type out everything character by character
                const parts = content.split('```');
                let processedParts = parts.map(() => ''); // Initialize empty processed parts
                
                // Process each part with a delay
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    
                    // Type out this part character by character
                    for (let j = 0; j < part.length; j++) {
                        await new Promise(resolve => setTimeout(resolve, 5)); // Increased typing speed (5ms)
                        processedParts[i] += part[j];
                        
                        // Format and display the current content
                        const currentContent = processedParts.join('```');
                        
                        // Parse and format the current content
                        const parsedContent = parseCodeBlocks(currentContent);
                        if (typeof replaceEmojis === 'function') {
                            messageContent.innerHTML = replaceEmojis(parsedContent);
                        } else {
                            messageContent.innerHTML = parsedContent;
                        }
                        
                        // Only auto-scroll if user hasn't manually scrolled up
                        if (chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 100) {
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    }
                    
                    // Small delay after completing a part
                    if (i < parts.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            } else {
                // Regular text message - type it out character by character
                for (let i = 0; i < content.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 5)); // Increased typing speed (5ms)
                    formattedContent += content[i];
                    
                    // Format and display the current content
                    if (typeof replaceEmojis === 'function') {
                        messageContent.innerHTML = replaceEmojis(formattedContent);
                    } else {
                        messageContent.innerHTML = formattedContent;
                    }
                    
                    // Only auto-scroll if user hasn't manually scrolled up
                    if (chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 100) {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                }
            }
            
            // Save assistant message to Firebase if a chat is active
            if (currentChatId && currentUser) {
                console.log('Saving assistant response to chat:', currentChatId);
                const messageData = {
                    role: 'assistant',
                    content: content,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                saveMessageToChat(currentChatId, messageData);
            }
            
            // Add feedback options after typing is complete
            const feedbackContainer = document.createElement('div');
            feedbackContainer.classList.add('message-feedback');
            feedbackContainer.innerHTML = `
                <button class="feedback-btn like-btn" title="Like"><i class="fas fa-thumbs-up"></i></button>
                <button class="feedback-btn dislike-btn" title="Dislike"><i class="fas fa-thumbs-down"></i></button>
                <button class="feedback-btn copy-btn" title="Copy"><i class="fas fa-copy"></i></button>
                <button class="feedback-btn speak-btn" title="Speak"><i class="fas fa-volume-up"></i></button>
            `;
            messageDiv.appendChild(feedbackContainer);
            
            // Add event listeners for feedback buttons
            const likeBtn = feedbackContainer.querySelector('.like-btn');
            const dislikeBtn = feedbackContainer.querySelector('.dislike-btn');
            const copyBtn = feedbackContainer.querySelector('.copy-btn');
            const speakBtn = feedbackContainer.querySelector('.speak-btn');
            
            likeBtn.addEventListener('click', () => {
                likeBtn.classList.toggle('active');
                if (dislikeBtn.classList.contains('active')) {
                    dislikeBtn.classList.remove('active');
                }
            });
            
            dislikeBtn.addEventListener('click', () => {
                dislikeBtn.classList.toggle('active');
                if (likeBtn.classList.contains('active')) {
                    likeBtn.classList.remove('active');
                }
            });
            
            copyBtn.addEventListener('click', () => {
                // Get text content from the message
                const textToCopy = messageContent.textContent;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                    }, 2000);
                });
            });
            
            // Variable to track if speech is active
            let isSpeaking = false;
            let currentUtterance = null;
            
            speakBtn.addEventListener('click', () => {
                // Text-to-speech functionality with toggle
                if (isSpeaking) {
                    // Stop speaking if already active
                    window.speechSynthesis.cancel();
                    speakBtn.classList.remove('active');
                    isSpeaking = false;
                } else {
                    // Start speaking
                    const textToSpeak = messageContent.textContent;
                    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
                    
                    // Get the selected voice from localStorage
                    const selectedVoice = localStorage.getItem('selectedVoice') || 'female-2'; // Default to Emily
                    
                    // Get available voices
                    const voices = window.speechSynthesis.getVoices();
                    
                    // Set voice based on selection
                    if (voices.length > 0) {
                        const voiceMap = {
                            'male-1': voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Mark')),
                            'male-2': voices.find(v => v.name.includes('Male') || v.name.includes('Thomas') || v.name.includes('John')),
                            'male-3': voices.find(v => v.name.includes('Male') || v.name.includes('James') || v.name.includes('Paul')),
                            'female-1': voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Karen')),
                            'female-2': voices.find(v => v.name.includes('Female') || v.name.includes('Emily') || v.name.includes('Lisa')),
                            'female-3': voices.find(v => v.name.includes('Female') || v.name.includes('Sophia') || v.name.includes('Victoria'))
                        };
                        
                        // Set the voice if found, otherwise use default
                        if (voiceMap[selectedVoice]) {
                            currentUtterance.voice = voiceMap[selectedVoice];
                        }
                    }
                    
                    // Set up event handlers
                    currentUtterance.onend = () => {
                        speakBtn.classList.remove('active');
                        isSpeaking = false;
                    };
                    
                    currentUtterance.onerror = () => {
                        speakBtn.classList.remove('active');
                        isSpeaking = false;
                    };
                    
                    // Start speaking
                    window.speechSynthesis.cancel(); // Cancel any ongoing speech first
                    window.speechSynthesis.speak(currentUtterance);
                    speakBtn.classList.add('active');
                    isSpeaking = true;
                }
            });
            
            // Ensure speech is canceled when navigating away from the message
            window.addEventListener('beforeunload', () => {
                if (isSpeaking) {
                    window.speechSynthesis.cancel();
                }
            });
            
            // Reset UI after response is complete
        userInput.disabled = false;
        sendButton.disabled = false;
        sendButton.style.display = 'flex';
        stopBtn.style.display = 'none';
        isResponding = false;
        controller = null;
        userInput.focus();
        } else if (data.error) {
            addMessage(`Error: ${data.error}`, 'system');
            // Reset UI in case of error
            userInput.disabled = false;
            sendButton.disabled = false;
            sendButton.style.display = 'flex';
            stopBtn.style.display = 'none';
            isResponding = false;
            controller = null;
            userInput.focus();
        }
    } catch (error) {
        console.error('Error:', error);
        // Don't show abort error messages to the user
        if (error.name !== 'AbortError') {
            // Check for specific error messages
            if (error.message.includes('API key')) {
                addMessage('Error: The API key is missing or invalid. Please check the server configuration.', 'system');
            } else {
                addMessage(`An error occurred: ${error.message}`, 'system');
            }
        }
        // Reset UI in case of error
        userInput.disabled = false;
        sendButton.disabled = false;
        sendButton.style.display = 'flex';
        stopBtn.style.display = 'none';
        isResponding = false;
        controller = null;
        userInput.focus();
    }
}

// Add event listener for stop button
if (stopBtn) {
    stopBtn.addEventListener('click', () => {
        if (controller && isResponding) {
            controller.abort();
            
            // Remove any existing loading indicators
            const loadingIndicator = document.querySelector('.message.loading-message');
            if (loadingIndicator && loadingIndicator.parentNode) {
                chatMessages.removeChild(loadingIndicator);
            }
            
            addMessage('Response stopped by user', 'system');
            
            // Reset UI
            userInput.disabled = false;
            sendButton.disabled = false;
            sendButton.style.display = 'flex';
            stopBtn.style.display = 'none';
            isResponding = false;
            controller = null;
            userInput.focus();
        }
    });
}

// Event listener for send button
sendButton.addEventListener('click', () => {
    const message = userInput.value.trim();
    
    if (message) {
        // Add the user's message to the chat
        addMessage(message, 'user');
        
        // Clear the input field
        userInput.value = '';
        
        // Send the message to the API
        sendMessage(message);
    }
});

// Event listener for Enter key
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendButton.click();
    }
});

// Focus the input field when the page loads
userInput.focus();

// Function to copy code to clipboard
function copyCodeToClipboard(button, event) {
    // If event is not passed directly, get it from the window
    event = event || window.event;
    
    const codeBlock = button.closest('.code-block');
    const codeElement = codeBlock.querySelector('code');
    const textToCopy = codeElement.textContent;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Change button text temporarily
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        // Reset button text after 2 seconds
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        button.textContent = 'Failed';
        setTimeout(() => {
            button.textContent = 'Copy';
        }, 2000);
    });
    
    // Prevent event bubbling if event exists
    if (event) {
        event.stopPropagation();
    }
}

// Button hover animation
sendButton.addEventListener('mouseenter', () => {
    gsap.to(sendButton, {
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out'
    });
});

sendButton.addEventListener('mouseleave', () => {
    gsap.to(sendButton, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
    });
});

// Textarea animation on focus
userInput.addEventListener('focus', () => {
    gsap.to(userInput, {
        boxShadow: '0 0 0 2px rgba(79, 172, 254, 0.7)',
        duration: 0.3
    });
});

userInput.addEventListener('blur', () => {
    gsap.to(userInput, {
        boxShadow: 'none',
        duration: 0.3
    });
});

// ===== Chat Management Functions =====

// Initialize chat functionality
async function initializeChats() {
    console.log('Initializing chats...');
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User authenticated:', user.email);
            currentUser = user;
            
            // Clean up any existing listener before setting up a new one
            if (window.chatUnsubscribe) {
                console.log('Cleaning up existing chat listener');
                window.chatUnsubscribe();
            }
            
            // Set up real-time listener for user's chats
            setupChatListener(user.uid);
            
            try {
                // Check if there's a chat ID in the URL
                const urlParams = new URLSearchParams(window.location.search);
                const urlChatId = urlParams.get('chat');
                
                if (urlChatId) {
                    console.log('Found chat ID in URL:', urlChatId);
                    
                    try {
                        // Verify this chat exists and belongs to the current user
                        const chatDoc = await firebase.firestore().collection('chats').doc(urlChatId).get();
                        
                        if (chatDoc.exists && chatDoc.data().userId === user.uid) {
                            console.log('Loading chat from URL');
                            loadChat(urlChatId);
                            return;
                        } else {
                            console.log('Chat from URL not found or does not belong to current user');
                        }
                    } catch (error) {
                        console.error('Error verifying chat from URL:', error);
                    }
                }
                
                // If no valid chat ID in URL, check localStorage
                const savedChatId = localStorage.getItem('currentChatId');
                
                if (savedChatId) {
                    console.log('Found saved chat ID in localStorage:', savedChatId);
                    
                    try {
                        // Verify this chat exists and belongs to the current user
                        const chatDoc = await firebase.firestore().collection('chats').doc(savedChatId).get();
                        
                        if (chatDoc.exists && chatDoc.data().userId === user.uid) {
                            console.log('Loading saved chat');
                            loadChat(savedChatId);
                            return;
                        } else {
                            console.log('Saved chat not found or does not belong to current user');
                            // Clear invalid saved chat ID
                            localStorage.removeItem('currentChatId');
                        }
                    } catch (error) {
                        console.error('Error verifying saved chat:', error);
                        
                        // If we're offline, we might not be able to verify the chat
                        // Try to load it anyway, the setupChatListener will handle validation when online
                        console.log('Attempting to load saved chat without verification (possibly offline)');
                        loadChat(savedChatId);
                        return;
                    }
                }
                
                // If no valid saved chat, check if user has any chats
                try {
                    // The setupChatListener will handle loading the first chat if available
                    // so we only need to create a new chat if there are no existing chats
                    const chatsSnapshot = await firebase.firestore().collection('chats')
                        .where('userId', '==', user.uid)
                        .orderBy('lastUpdated', 'desc')
                        .limit(1)
                        .get();
                        
                    if (chatsSnapshot.empty) {
                        console.log('No chats found, creating new chat session');
                        await createNewChatSession();
                    }
                    // We don't need to load the most recent chat here anymore
                    // as the setupChatListener will handle that
                } catch (error) {
                    console.error('Error checking for existing chats:', error);
                    
                    // If we're offline and can't query Firestore, try to load from localStorage
                    try {
                        const savedHistory = localStorage.getItem('chatHistory');
                        if (savedHistory) {
                            const parsedHistory = JSON.parse(savedHistory);
                            if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
                                console.log('Loading chat history from localStorage due to offline state');
                                chatHistory = parsedHistory;
                                
                                // Clear and rebuild sidebar
                                clearChatSidebar();
                                chatHistory.forEach(chat => addChatToSidebar(chat));
                                
                                // Load the first chat
                                if (chatHistory.length > 0) {
                                    loadChat(chatHistory[0].id);
                                    return;
                                }
                            }
                        }
                        
                        // If we couldn't load from localStorage either, create a new chat
                        console.log('No saved chats found, creating new chat session');
                        await createNewChatSession();
                    } catch (e) {
                        console.error('Error loading from localStorage, creating new chat:', e);
                        await createNewChatSession();
                    }
                }
            } catch (error) {
                console.error('Unexpected error during chat initialization:', error);
                // Create a new chat as a fallback
                try {
                    await createNewChatSession();
                } catch (e) {
                    console.error('Failed to create new chat session:', e);
                    alert('There was an error initializing the chat. Please try refreshing the page.');
                }
            }
        } else {
            console.log('User not authenticated');
            // Clear any existing chat data when not authenticated
            currentChatId = null;
            chatHistory = [];
            clearChatSidebar();
        }
    });
}

// Set up real-time listener for user's chats
function setupChatListener(userId) {
    console.log('Setting up real-time chat listener for user:', userId);
    
    // Clear existing chats from sidebar
    clearChatSidebar();
    
    // Reset chat history array
    chatHistory = [];
    
    // Set up real-time listener for chats collection with cache-first strategy
    const unsubscribe = firebase.firestore().collection('chats')
        .where('userId', '==', userId)
        .orderBy('lastUpdated', 'desc')
        .onSnapshot({
            // Listen for document changes
            next: (snapshot) => {
                console.log('Chat collection updated, document count:', snapshot.docs.length);
                
                // Handle added or modified chats
                snapshot.docChanges().forEach(change => {
                    const chatData = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    if (change.type === 'added') {
                        console.log('New chat added:', chatData.id, chatData.title);
                        // Add to local chat history array if not already present
                        if (!chatHistory.some(chat => chat.id === chatData.id)) {
                            chatHistory.unshift(chatData);
                            addChatToSidebar(chatData);
                        }
                    }
                    
                    if (change.type === 'modified') {
                        console.log('Chat modified:', chatData.id, chatData.title);
                        // Update in local chat history
                        const index = chatHistory.findIndex(chat => chat.id === chatData.id);
                        if (index !== -1) {
                            chatHistory[index] = chatData;
                        } else {
                            // If not found, add it (this can happen with offline/online syncing)
                            chatHistory.unshift(chatData);
                        }
                        
                        // Update in sidebar
                        updateChatInSidebar(chatData);
                    }
                    
                    if (change.type === 'removed') {
                        console.log('Chat removed:', chatData.id);
                        // Remove from local chat history
                        chatHistory = chatHistory.filter(chat => chat.id !== chatData.id);
                        
                        // Remove from sidebar
                        const chatItem = document.querySelector(`.chat-item[data-id="${chatData.id}"]`);
                        if (chatItem) {
                            const parentElement = chatItem.closest('.chat-history-item');
                            if (parentElement) {
                                parentElement.remove();
                            }
                        }
                        
                        // If the removed chat was active, load another chat or create a new one
                        if (currentChatId === chatData.id) {
                            if (chatHistory.length > 0) {
                                loadChat(chatHistory[0].id);
                            } else {
                                createNewChatSession();
                            }
                        }
                    }
                });
                
                // After initial load, if we have chats but none is selected, load the first one
                if (chatHistory.length > 0 && !currentChatId) {
                    console.log('Loading first chat from history');
                    loadChat(chatHistory[0].id);
                }
                
                // Save chat history to localStorage for backup persistence
                try {
                    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
                    console.log('Chat history saved to localStorage, count:', chatHistory.length);
                } catch (e) {
                    console.warn('Failed to save chat history to localStorage:', e);
                }
            },
            error: (error) => {
                console.error('Error listening to chat updates:', error);
                
                // If there's an error with the listener, try to load from localStorage
                try {
                    const savedHistory = localStorage.getItem('chatHistory');
                    if (savedHistory) {
                        const parsedHistory = JSON.parse(savedHistory);
                        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
                            console.log('Loading chat history from localStorage, count:', parsedHistory.length);
                            chatHistory = parsedHistory;
                            
                            // Clear and rebuild sidebar
                            clearChatSidebar();
                            chatHistory.forEach(chat => addChatToSidebar(chat));
                            
                            // Load the first chat
                            if (!currentChatId && chatHistory.length > 0) {
                                loadChat(chatHistory[0].id);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error loading chat history from localStorage:', e);
                }
            }
        });
        
    // Store the unsubscribe function in window to persist between page reloads
    window.chatUnsubscribe = unsubscribe;
    return unsubscribe;
}

// Clear chat sidebar
function clearChatSidebar() {
    console.log('Clearing chat history container');
    // Clear the chat history container except for the template
    const template = document.getElementById('chat-item-template');
    if (!template) {
        console.error('Chat item template not found');
        return;
    }
    
    while (chatHistoryContainer.firstChild) {
        if (chatHistoryContainer.firstChild === template) {
            break;
        }
        chatHistoryContainer.removeChild(chatHistoryContainer.firstChild);
    }
}

// Add a chat to the sidebar
function addChatToSidebar(chat) {
    // Clone the template
    const template = document.getElementById('chat-item-template');
    if (!template) {
        console.error('Chat item template not found');
        return;
    }
    
    // Check if chat already exists in sidebar
    const existingChatItem = document.querySelector(`.chat-item[data-id="${chat.id}"]`);
    if (existingChatItem) {
        console.log('Chat already exists in sidebar, updating instead');
        updateChatInSidebar(chat);
        return;
    }
    
    // Create a container for the chat item
    const chatHistoryItem = document.createElement('div');
    chatHistoryItem.classList.add('chat-history-item');
    
    // Clone the template content
    const clone = template.querySelector('.chat-item').cloneNode(true);
    clone.setAttribute('data-id', chat.id);
    
    const chatTitle = clone.querySelector('.chat-title');
    chatTitle.textContent = chat.title || 'New Chat';
    
    // Add the cloned chat item to the container
    chatHistoryItem.appendChild(clone);
    
    // Add click event to load chat
    clone.addEventListener('click', (e) => {
        // Ignore clicks on the menu toggle or menu items
        if (e.target.closest('.chat-menu-toggle') || e.target.closest('.chat-menu')) {
            return;
        }
        
        loadChat(chat.id);
    });
    
    // Add menu toggle functionality
    const menuToggle = clone.querySelector('.chat-menu-toggle');
    const menu = clone.querySelector('.chat-menu');
    
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('active');
        
        // Close other open menus
        document.querySelectorAll('.chat-menu.active').forEach(m => {
            if (m !== menu) {
                m.classList.remove('active');
            }
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', () => {
        menu.classList.remove('active');
    });
    
    // Rename chat functionality
    const renameBtn = clone.querySelector('.rename-chat');
    renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showRenameDialog(chat.id, chat.title);
    });
    
    // Delete chat functionality
    const deleteBtn = clone.querySelector('.delete-chat');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeleteChat(chat.id);
    });
    
    // Add to the chat history container
    chatHistoryContainer.insertBefore(chatHistoryItem, template);
    
    // Highlight if it's the current chat
    if (currentChatId === chat.id) {
        clone.classList.add('active');
    }
}

// Update a chat in the sidebar
function updateChatInSidebar(chat) {
    const chatItem = document.querySelector(`.chat-item[data-id="${chat.id}"]`);
    if (!chatItem) {
        console.log('Chat not found in sidebar, adding instead');
        addChatToSidebar(chat);
        return;
    }
    
    // Update chat title
    const chatTitle = chatItem.querySelector('.chat-title');
    if (chatTitle) {
        chatTitle.textContent = chat.title || 'New Chat';
    }
    
    // Highlight if it's the current chat
    if (currentChatId === chat.id) {
        chatItem.classList.add('active');
    }
}

// Remove a chat from the sidebar
function removeChatFromSidebar(chatId) {
    const chatItem = document.querySelector(`.chat-item[data-id="${chatId}"]`);
    if (chatItem) {
        // Get the parent chat-history-item container and remove it
        const chatHistoryItem = chatItem.closest('.chat-history-item');
        if (chatHistoryItem) {
            chatHistoryItem.remove();
        } else {
            // Fallback to removing just the chat item if container not found
            chatItem.remove();
        }
    }
}

// Create a new chat session
async function createNewChatSession() {
    console.log('Creating new chat session...');
    if (!currentUser) {
        console.log('Cannot create chat: No user logged in');
        return;
    }
    
    try {
        console.log('Creating new chat for user:', currentUser.uid);
        // Create a new chat in Firebase
        const chatId = await createNewChat(currentUser.uid);
        
        if (chatId) {
            console.log('New chat created with ID:', chatId);
            // Load the new chat immediately
            loadChat(chatId);
            console.log('Loaded new chat');
            
            // Note: The chat will be added to the sidebar automatically by the real-time listener
        } else {
            console.error('Failed to create new chat: No chat ID returned');
        }
    } catch (error) {
        console.error('Error creating new chat:', error);
    }
}

// Load a specific chat
async function loadChat(chatId) {
    if (!chatId) return;
    
    try {
        console.log('Loading chat:', chatId);
        // Set current chat ID
        currentChatId = chatId;
        
        // Store current chat ID in localStorage for persistence between page reloads
        localStorage.setItem('currentChatId', chatId);
        
        // Update URL with chat ID without reloading the page
        const newUrl = `${window.location.origin}${window.location.pathname}?chat=${chatId}`;
        window.history.pushState({ chatId: chatId }, '', newUrl);
        
        // Update active state in sidebar
        document.querySelectorAll('.chat-item').forEach(item => {
            if (item.getAttribute('data-id') === chatId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Clear chat messages
        while (chatMessages.children.length > 0) {
            chatMessages.removeChild(chatMessages.lastChild);
        }
        
        try {
            // Get chat data
            const chat = await getChat(chatId);
            
            if (chat) {
                // Get messages from the subcollection
                const messages = await getChatMessages(chatId);
                
                // Add system welcome message if no messages
                if (messages.length === 0) {
                    addMessage("Hello! I'm NumAI, powered by DeepSeek R1. How can I help you today?", 'system');
                } else {
                    // Add messages from chat history
                    messages.forEach(msg => {
                        addMessage(msg.content, msg.role);
                    });
                }
                
                // Save chat and messages to localStorage for offline access
                try {
                    localStorage.setItem('currentChatData', JSON.stringify({
                        chat: chat,
                        messages: messages,
                        timestamp: new Date().getTime()
                    }));
                    console.log('Chat data saved to localStorage for offline access');
                } catch (e) {
                    console.warn('Failed to save chat data to localStorage:', e);
                }
            }
        } catch (error) {
            console.error('Error fetching chat from Firestore:', error);
            console.log('Attempting to load chat from localStorage...');
            
            // Try to load from localStorage if available
            try {
                const savedChatData = localStorage.getItem('currentChatData');
                if (savedChatData) {
                    const parsedData = JSON.parse(savedChatData);
                    const chat = parsedData.chat;
                    const messages = parsedData.messages;
                    
                    if (chat && chat.id === chatId) {
                        console.log('Loading chat from localStorage cache');
                        
                        // Add system welcome message if no messages
                        if (!messages || messages.length === 0) {
                            addMessage("Hello! I'm NumAI, powered by DeepSeek R1. How can I help you today?", 'system');
                        } else {
                            // Add messages from cached history
                            messages.forEach(msg => {
                                addMessage(msg.content, msg.role);
                            });
                        }
                        
                        // Add offline indicator message
                        addMessage("You appear to be offline. Your messages will be saved and synchronized when you reconnect.", 'system', true);
                    } else {
                        // Wrong chat in cache
                        addMessage("You appear to be offline. This chat's history isn't available offline.", 'system', true);
                    }
                } else {
                    // No cache available
                    addMessage("You appear to be offline. Chat history isn't available.", 'system', true);
                }
            } catch (e) {
                console.error('Error loading chat from localStorage:', e);
                addMessage("There was an error loading your chat. Please try again later.", 'system', true);
            }
        }
        
        // Clear input and focus
        userInput.value = '';
        userInput.focus();
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
    } catch (error) {
        console.error('Unexpected error in loadChat:', error);
        addMessage("There was an error loading your chat. Please try again later.", 'system', true);
    }
}

// Show rename dialog
function showRenameDialog(chatId, currentTitle) {
    // Create dialog if it doesn't exist
    let dialog = document.querySelector('.rename-dialog');
    
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.classList.add('rename-dialog');
        
        dialog.innerHTML = `
            <div class="rename-dialog-content">
                <div class="rename-dialog-header">Rename Chat</div>
                <input type="text" class="rename-dialog-input" placeholder="Enter new title">
                <div class="rename-dialog-actions">
                    <button class="rename-dialog-btn rename-cancel-btn">Cancel</button>
                    <button class="rename-dialog-btn rename-confirm-btn">Rename</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }
    
    // Set current title in input
    const input = dialog.querySelector('.rename-dialog-input');
    input.value = currentTitle;
    
    // Show dialog
    dialog.classList.add('active');
    
    // Focus input
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
    
    // Handle cancel button
    const cancelBtn = dialog.querySelector('.rename-cancel-btn');
    cancelBtn.onclick = () => {
        dialog.classList.remove('active');
    };
    
    // Handle confirm button
    const confirmBtn = dialog.querySelector('.rename-confirm-btn');
    confirmBtn.onclick = async () => {
        const newTitle = input.value.trim();
        
        if (newTitle && newTitle !== currentTitle) {
            try {
                // Update chat title in Firebase
                await renameChat(chatId, newTitle);
                console.log('Chat renamed successfully:', chatId, newTitle);
                // Note: The chat title will be updated in the sidebar automatically by the real-time listener
            } catch (error) {
                console.error('Error renaming chat:', error);
            }
        }
        
        dialog.classList.remove('active');
    };
    
    // Handle Enter key in input
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmBtn.click();
        }
    };
    
    // Close dialog when clicking outside
    dialog.onclick = (e) => {
        if (e.target === dialog) {
            dialog.classList.remove('active');
        }
    };
}

// Confirm and delete chat
function confirmDeleteChat(chatId) {
    // Create dialog if it doesn't exist
    let dialog = document.querySelector('.delete-dialog');
    
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.classList.add('delete-dialog');
        
        dialog.innerHTML = `
            <div class="delete-dialog-content">
                <div class="delete-dialog-header">Delete Chat</div>
                <div class="delete-dialog-message">Are you sure you want to delete this chat? This action cannot be undone.</div>
                <div class="delete-dialog-actions">
                    <button class="delete-dialog-btn delete-cancel-btn">Cancel</button>
                    <button class="delete-dialog-btn delete-confirm-btn">Delete</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add styles for the delete dialog
        const style = document.createElement('style');
        style.textContent = `
            .delete-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
            }
            
            .delete-dialog.active {
                opacity: 1;
                visibility: visible;
            }
            
            .delete-dialog-content {
                background-color: #222323;
                border-radius: 8px;
                padding: 20px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .delete-dialog-header {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #e74c3c;
            }
            
            .delete-dialog-message {
                margin-bottom: 20px;
                line-height: 1.5;
                color: white;
            }
            
            .delete-dialog-actions {
                display: flex;
                justify-content: flex-end;
            }
            
            .delete-dialog-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                transition: background-color 0.2s;
            }
            
            .delete-cancel-btn {
                background-color: #f1f1f1;
                color: #333;
                margin-right: 10px;
            }
            
            .delete-cancel-btn:hover {
                background-color: #e1e1e1;
            }
            
            .delete-confirm-btn {
                background-color: #e74c3c;
                color: white;
            }
            
            .delete-confirm-btn:hover {
                background-color: #c0392b;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Show dialog
    dialog.classList.add('active');
    
    // Handle cancel button
    const cancelBtn = dialog.querySelector('.delete-cancel-btn');
    cancelBtn.onclick = () => {
        dialog.classList.remove('active');
    };
    
    // Handle confirm button
    const confirmBtn = dialog.querySelector('.delete-confirm-btn');
    confirmBtn.onclick = async () => {
        try {
            // Check if this is the current chat
            const isCurrentChat = (chatId === currentChatId);
            
            // Delete chat from Firebase
            const success = await deleteChat(chatId);
            if (success) {
                console.log('Chat deleted successfully:', chatId);
                // If the deleted chat was the current chat, remove it from localStorage
                if (isCurrentChat) {
                    localStorage.removeItem('currentChatId');
                }
                // Note: The chat will be removed from the sidebar automatically by the real-time listener
                // and if it was the current chat, the listener will load another chat or create a new one
            } else {
                console.error('Failed to delete chat:', chatId);
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
        
        dialog.classList.remove('active');
    };
    
    // Close dialog when clicking outside
    dialog.onclick = (e) => {
        if (e.target === dialog) {
            dialog.classList.remove('active');
        }
    };
}

// Note: deleteUserChat function has been removed as it's now handled by the real-time listener
// when a chat is deleted from Firebase using the deleteChat function