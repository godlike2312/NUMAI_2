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
const messagesContainer = document.querySelector('.messages-container');
const inputContainer = document.querySelector('.input-container');

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

// Offline indicator element
const offlineIndicator = document.createElement('div');
offlineIndicator.className = 'offline-indicator';
offlineIndicator.textContent = 'You are currently offline';
offlineIndicator.style.display = 'none';
document.body.appendChild(offlineIndicator);

// Check if user is online
function checkOnlineStatus() {
    if (navigator.onLine) {
        document.body.classList.remove('offline');
        offlineIndicator.style.display = 'none';
        
        // If we're back online and have a currentChatId, try to reload the chat
        if (currentChatId && currentUser) {
            console.log('Back online, attempting to reload chat:', currentChatId);
            loadChat(currentChatId);
        }
    } else {
        document.body.classList.add('offline');
        offlineIndicator.style.display = 'block';
    }
}

// Add event listeners for online/offline status
window.addEventListener('online', checkOnlineStatus);
window.addEventListener('offline', checkOnlineStatus);

// Check online status on page load
checkOnlineStatus();

// Mobile viewport height adjustment for virtual keyboard
function adjustViewportForMobile() {
    // Only apply these adjustments on mobile devices
    if (window.innerWidth <= 768) {
        // Set initial viewport height as a CSS variable
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Update on resize
        window.addEventListener('resize', () => {
            // Update the viewport height variable
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        });
        
        // Handle input focus (keyboard appears)
        if (userInput) {
            userInput.addEventListener('focus', () => {
                // Add a small delay to allow the keyboard to fully appear
                setTimeout(() => {
                    // Scroll to the input field
                    userInput.scrollIntoView({ behavior: 'smooth' });
                    
                    // Ensure messages container has enough bottom padding
                    if (messagesContainer) {
                        messagesContainer.style.paddingBottom = '150px';
                    }
                }, 300);
            });
            
            // Handle input blur (keyboard disappears)
            userInput.addEventListener('blur', () => {
                // Reset padding when keyboard is hidden
                if (messagesContainer) {
                    messagesContainer.style.paddingBottom = '100px';
                }
            });
        }
    }
}

// Call the function on page load
document.addEventListener('DOMContentLoaded', adjustViewportForMobile);

// Initialize chat history array to store all messages
let chatHistory = [
    { 
        role: 'system', 
        content: 'You are NumAI, a helpful assistant. When a user says only \'hello\', respond with just \'Hello! How can I help you today?\' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples.'
    }
];

// Toast notification function
function showToast(message, duration = 3000) {
    // Check if a toast container already exists
    let toastContainer = document.querySelector('.toast-container');
    
    // Create toast container if it doesn't exist
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove the toast after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
            // Remove container if empty
            if (toastContainer.children.length === 0) {
                document.body.removeChild(toastContainer);
            }
        }, 300);
    }, duration);
}

// Model selection variables
let availableModels = {};
let currentModel = 'deepseek/deepseek-chat-v3-0324:free'; // Default model with full ID

// Function to fetch available models
async function fetchAvailableModels() {
    try {
        const response = await fetch('/api/models');
        if (!response.ok) {
            throw new Error('Failed to fetch models');
        }
        
        const data = await response.json();
        availableModels = data.models;
        
        // Load preferred model from localStorage if available
        const preferredModel = localStorage.getItem('preferred_model');
        if (preferredModel && availableModels[preferredModel]) {
            currentModel = preferredModel;
            console.log('Using preferred model from localStorage:', currentModel);
        } else {
            currentModel = data.default_model;
            console.log('Using default model:', currentModel);
        }
        
        // Debug: Check if the model exists in the available models
        if (availableModels[currentModel]) {
            console.log('Model found in available models:', availableModels[currentModel]);
        } else {
            console.warn('Current model not found in available models:', currentModel);
            // Try to find a matching model by ID
            for (const [key, model] of Object.entries(availableModels)) {
                if (model.id === currentModel) {
                    console.log('Found matching model by ID:', key);
                    currentModel = key;
                    break;
                }
            }
        }
        
        // Update UI with model information
        if (availableModels[currentModel]) {
            updateModelIndicator(availableModels[currentModel].display_name);
        } else {
            console.error('Cannot update model indicator: model not found', currentModel);
        }
        
        populateModelSelectors();
        
        return data;
    } catch (error) {
        console.error('Error fetching models:', error);
        return null;
    }
}

// Function to update the model indicator in the UI
function updateModelIndicator(modelName) {
    const modelIndicator = document.getElementById('current-model-indicator');
    if (modelIndicator) {
        modelIndicator.textContent = modelName;
    }
    
    // Also update in settings if open
    const currentModelDisplay = document.getElementById('current-model-display');
    if (currentModelDisplay) {
        currentModelDisplay.textContent = modelName;
    }
}

// Function to populate model selectors in settings and quick switcher
function populateModelSelectors() {
    // Populate settings model selector
    const modelSelector = document.getElementById('model-selector');
    if (modelSelector) {
        modelSelector.innerHTML = '';
        
        Object.entries(availableModels).forEach(([key, model]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = model.display_name;
            if (key === currentModel) {
                option.selected = true;
            }
            modelSelector.appendChild(option);
        });
        
        // Add change event listener
        modelSelector.addEventListener('change', function() {
            const selectedKey = this.value;
            currentModel = selectedKey;
            updateModelIndicator(availableModels[selectedKey].display_name);
            
            // Update model description
            const modelDescription = document.getElementById('model-description');
            if (modelDescription) {
                modelDescription.textContent = availableModels[selectedKey].description;
            }
            
            // Save preference to localStorage
            localStorage.setItem('preferred_model', selectedKey);
        });
        
        // Trigger change event to update description
        modelSelector.dispatchEvent(new Event('change'));
    }
    
    // We're not populating the model switcher here anymore since we're using static HTML structure
    // Instead, we'll just add event listeners to the existing model options
    const modelOptions = document.querySelectorAll('.model-option');
    
    modelOptions.forEach(modelOption => {
        const modelId = modelOption.getAttribute('data-model-id');
        if (modelId === currentModel) {
            modelOption.classList.add('selected');
        }
        
        modelOption.addEventListener('click', () => {
            // Update selected model
            currentModel = modelId;
            const modelName = modelOption.querySelector('.model-option-name').textContent;
            updateModelIndicator(modelName);
            
            // Update UI
            document.querySelectorAll('.model-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            modelOption.classList.add('selected');
            
            // Close the popup
            document.getElementById('model-switcher-popup').style.display = 'none';
            
            // Save preference to localStorage
            localStorage.setItem('preferred_model', modelId);
        });
    });
}

// GSAP Animations
document.addEventListener('DOMContentLoaded', () => {
    // Scroll to the bottom of the chat when page loads
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    // Initial animation for the container
    gsap.to('.container', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.3
    });
    
    // Fetch available models
    fetchAvailableModels();
    
    // Setup model switcher
    const modelSwitchBtn = document.getElementById('model-switch-btn');
    const modelSwitcherPopup = document.getElementById('model-switcher-popup');
    const closeModelSwitcherBtn = document.getElementById('close-model-switcher');
    
    // Debug log to check if elements exist
    console.log('Model Switch Button:', modelSwitchBtn);
    console.log('Model Switcher Popup:', modelSwitcherPopup);
    
    if (modelSwitchBtn && modelSwitcherPopup) {
        // Remove any existing event listeners
        modelSwitchBtn.replaceWith(modelSwitchBtn.cloneNode(true));
        
        // Get the fresh reference
        const freshModelSwitchBtn = document.getElementById('model-switch-btn');
        
        // Add new event listener
        freshModelSwitchBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event from bubbling up
            console.log('Model switch button clicked');
            
            // Toggle the display of the popup with animation
            if (modelSwitcherPopup.style.display === 'block') {
                // Hide with animation
                modelSwitcherPopup.style.opacity = '0';
                modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(10px)';
                console.log('Hiding model switcher popup');
                
                // After animation completes, hide the element
                setTimeout(() => {
                    modelSwitcherPopup.style.display = 'none';
                }, 300); // Match the transition duration in CSS
            } else {
                // Show with animation - first set initial state
                modelSwitcherPopup.style.opacity = '0';
                modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(10px)';
                modelSwitcherPopup.style.display = 'block';
                console.log('Showing model switcher popup');
                
                // Force a reflow to ensure the popup is displayed
                void modelSwitcherPopup.offsetWidth;
                
                // Then animate to visible state
                setTimeout(() => {
                    modelSwitcherPopup.style.opacity = '1';
                    modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(0)';
                }, 10);
            }
        });
    }
    
    if (closeModelSwitcherBtn && modelSwitcherPopup) {
        // Remove any existing event listeners
        closeModelSwitcherBtn.replaceWith(closeModelSwitcherBtn.cloneNode(true));
        
        // Get the fresh reference
        const freshCloseBtn = document.getElementById('close-model-switcher');
        
        // Add new event listener
        freshCloseBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event from bubbling up
            console.log('Close model switcher button clicked');
            
            // Hide with animation
            modelSwitcherPopup.style.opacity = '0';
            modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(10px)';
            
            // After animation completes, hide the element
            setTimeout(() => {
                modelSwitcherPopup.style.display = 'none';
            }, 300); // Match the transition duration in CSS
        });
    }
    
    // Close model switcher when clicking outside
    document.addEventListener('click', (event) => {
        if (modelSwitcherPopup && modelSwitcherPopup.style.display === 'block') {
            // Get fresh reference to the model switch button
            const currentModelSwitchBtn = document.getElementById('model-switch-btn');
            // Check if the click is outside the popup and not on the model switch button
            if (!modelSwitcherPopup.contains(event.target) && event.target !== currentModelSwitchBtn) {
                console.log('Clicked outside, closing popup');
                
                // Hide with animation
                modelSwitcherPopup.style.opacity = '0';
                modelSwitcherPopup.style.transform = 'translateY(10px)';
                
                // After animation completes, hide the element
                setTimeout(() => {
                    modelSwitcherPopup.style.display = 'none';
                }, 300); // Match the transition duration in CSS
            }
        }
    });
    
    // Prevent clicks inside the popup from closing it
    if (modelSwitcherPopup) {
        modelSwitcherPopup.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }
    
    // Add event listeners to model options
const modelOptions = document.querySelectorAll('.model-option');

// Map model names to their logo files
const modelLogoMap = {
    'Milky 3.1': '/static/img/model-logos/milky-3.1.svg',
    'Milky Small': '/static/img/model-logos/milky-small.svg',
    'Milky 3.7': '/static/img/model-logos/milky-3.7.svg',
    'Milky V2': '/static/img/model-logos/milky-v2.svg',
    'MilkyCoder Pro': '/static/img/model-logos/milkycoder-pro.svg',
    'Milky 3.7 sonnet': '/static/img/model-logos/milky-3.7-sonnet.svg',
    'Sonnet Seek': '/static/img/model-logos/sonnet-seek.svg',
    'Milky Fast': '/static/img/model-logos/milky-fast.svg',
    'Milky Edge': '/static/img/model-logos/milky-edge.svg',
    'Milky Fast-7o': '/static/img/model-logos/milky-fast-7o.svg',
    'Milky S2': '/static/img/model-logos/milky-s2-new.svg',
    'Milky 2o': '/static/img/model-logos/milky-2o-new.svg',
    'Milky 8B': '/static/img/model-logos/milky-8b-new.svg',
    'Milky 70B': '/static/img/model-logos/milky-70b-new.svg'
};

// Map model IDs to their names for easier lookup
const modelIdToNameMap = {
    'deepseek/deepseek-chat-v3-0324:free': 'Sonnet Seek',
    'mistralai/mistral-small-3.2-24b-instruct:free': 'Milky Small',
    'mistralai/devstral-small:free': 'Milky 3.7',
    'google/gemma-3n-e4b-it:free': 'Milky V2',
    'agentica-org/deepcoder-14b-preview:free': 'MilkyCoder Pro',
    'deepseek/deepseek-v3-base:free': 'Milky 3.7 sonnet',
    'mistralai/mistral-7b-instruct:free': 'Milky Fast',
    'cohere/command-r-plus': 'Milky S2',
    'cohere/command-r': 'Milky 2o',
    'groq/llama3-8b': 'Milky 8B',
    'groq/llama3-70b': 'Milky 70B'
};

// Debug: Log all model options and their data-model-id attributes
console.log('Available model options:');
modelOptions.forEach(option => {
    console.log(`Model: ${option.querySelector('.model-option-name').textContent}, ID: ${option.getAttribute('data-model-id')}`);
});

// Map models that have animated versions
const animatedLogoMap = {
    'Milky 3.1': '/static/img/model-logos/milky-3.1-animated.svg',
    'Milky 3.7 sonnet': '/static/img/model-logos/milky-3.7-sonnet-animated.svg'
};

// Function to update model icons with SVG logos
function updateModelIcons() {
    // Update icons in the model switcher popup
    modelOptions.forEach(option => {
        const modelName = option.querySelector('.model-option-name').textContent;
        const iconContainer = option.querySelector('.model-option-icon');
        
        if (modelName && iconContainer) {
            // Clear existing content
            iconContainer.innerHTML = '';
            
            // Check if we have a logo for this model
            if (modelLogoMap[modelName]) {
                // Create an image element for the SVG
                const img = document.createElement('img');
                img.src = modelLogoMap[modelName];
                img.alt = `${modelName} logo`;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                
                // Add the image to the icon container
                iconContainer.appendChild(img);
            } else {
                // Fallback to the default icon
                const icon = document.createElement('i');
                icon.className = 'fas fa-robot';
                iconContainer.appendChild(icon);
            }
        }
    });
    
    // Update the current model icon in the switch button
    updateCurrentModelIcon();
}

// Function to update the current model icon in the switch button
function updateCurrentModelIcon() {
    const currentModelIcon = document.getElementById('current-model-icon');
    if (currentModelIcon) {
        // Clear existing content
        currentModelIcon.innerHTML = '';
        
        // Get the current model name from the ID
        const currentModelName = modelIdToNameMap[currentModel] || 'Unknown Model';
        
        // Check if we have a logo for this model
        if (modelLogoMap[currentModelName]) {
            // Create an image element for the SVG
            const img = document.createElement('img');
            img.src = modelLogoMap[currentModelName];
            img.alt = `${currentModelName} logo`;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            
            // Add the image to the icon container
            currentModelIcon.appendChild(img);
        } else {
            // Fallback to the default icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-robot';
            currentModelIcon.appendChild(icon);
        }
    }
}

// Highlight the currently selected model
function updateSelectedModelOption() {
    // Remove selected class from all options
    modelOptions.forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selected class to the current model option
    if (currentModel) {
        const selectedOption = document.querySelector(`.model-option[data-model-id="${currentModel}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
            
            // Check if this model has an animated version
            const modelName = selectedOption.querySelector('.model-option-name').textContent;
            const iconContainer = selectedOption.querySelector('.model-option-icon');
            const img = iconContainer.querySelector('img');
            
            if (img && animatedLogoMap[modelName]) {
                // Switch to the animated version
                img.src = animatedLogoMap[modelName];
            }
        }
    }
}

// Call initially to update icons and highlight the current model
updateModelIcons();
updateSelectedModelOption();

modelOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Get model ID from data attribute
        const modelId = option.getAttribute('data-model-id');
        if (modelId) {
            // Update current model
            currentModel = modelId;
            console.log('Model selected:', modelId);
            
            // Update selected state in UI
            modelOptions.forEach(opt => {
                opt.classList.remove('selected');
                
                // Reset to static logo if it was animated
                const optModelName = opt.querySelector('.model-option-name').textContent;
                const optIconContainer = opt.querySelector('.model-option-icon');
                const optImg = optIconContainer.querySelector('img');
                
                if (optImg && modelLogoMap[optModelName]) {
                    optImg.src = modelLogoMap[optModelName];
                }
            });
            
            option.classList.add('selected');
            
            // Get model name from the option
            const modelName = option.querySelector('.model-option-name').textContent;
            console.log('Selected model name:', modelName);
            
            // Update to animated logo if available
            const iconContainer = option.querySelector('.model-option-icon');
            const img = iconContainer.querySelector('img');
            
            if (img && animatedLogoMap[modelName]) {
                img.src = animatedLogoMap[modelName];
            }
            
            // Update model indicator
            updateModelIndicator(modelName);
            
            // Close the popup with animation
            modelSwitcherPopup.style.opacity = '0';
            modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(10px)';
            
            // After animation completes, hide the element
            setTimeout(() => {
                modelSwitcherPopup.style.display = 'none';
            }, 300); // Match the transition duration in CSS
            
            // Save preference to localStorage
            localStorage.setItem('preferred_model', modelId);
            console.log('Saved model preference to localStorage:', modelId);
            
            // Show feedback to user
            if (typeof showToast === 'function') {
                showToast(`Model switched to ${modelName}`);
            }
            
            // Update the current model icon in the switch button
            updateCurrentModelIcon();
        }
    });
});
    
    // Close model switcher when clicking outside
    document.addEventListener('click', (event) => {
        if (modelSwitcherPopup && 
            modelSwitcherPopup.style.display === 'block' && 
            !modelSwitcherPopup.contains(event.target) && 
            event.target !== modelSwitchBtn) {
            
            // Hide with animation
            modelSwitcherPopup.style.opacity = '0';
            modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(10px)';
            
            // After animation completes, hide the element
            setTimeout(() => {
                modelSwitcherPopup.style.display = 'none';
            }, 300); // Match the transition duration in CSS
        }
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
    
    // After all messages are loaded, scroll to bottom
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

// Function to add a message to the chat
function addMessage(content, type, isOfflineMessage = false, modelId = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    
    // Create a message content container for all message types
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageDiv.appendChild(messageContent);
    
    // Always parse markdown and emojis for assistant messages
    if (type === 'assistant') {
        // Configure marked.js with custom renderer for emoji shortcodes and links
        const renderer = new marked.Renderer();
        const originalText = renderer.text;
        const originalLink = renderer.link;
        
        // Override link renderer to make links open in new tabs
        renderer.link = function(href, title, text) {
            const link = originalLink.call(this, href, title, text);
            return link.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
        };
        
        renderer.text = function(text) {
            // Ensure text is a string before using replace
            if (typeof text !== 'string') {
                return originalText.call(this, text);
            }
            // Replace emoji shortcodes with actual emojis
            const emojiText = text.replace(/:([a-zA-Z0-9_]+):/g, (match, code) => {
                const emojiMap = { 
                    smile: '😊', sad: '😔', grin: '😁', thumbsup: '👍', 
                    rocket: '🚀', star: '⭐', idea: '💡', code: '💻', 
                    warning: '⚠️', check: '✅', heart: '❤️', info: 'ℹ️', 
                    bird: '🐦', robot: '🤖', thinking: '🤔',
                    hammer_and_wrench: '🛠️', iphone: '📱', 
                    construction: '🚧', electric_car: '🚗', brain: '🧠'
                };
                return emojiMap[code] || match;
            });
            return originalText.call(this, emojiText);
        };
        
        // First check if the content contains code blocks
        if (content.includes('```')) {
            // Use our custom parseCodeBlocks function to handle code blocks with proper language classes
            // This ensures code blocks get the proper language class for highlight.js
            messageContent.innerHTML = parseCodeBlocks(content);
        } else {
            // Use marked.js to parse markdown with our custom renderer for content without code blocks
            messageContent.innerHTML = marked.parse(content, { renderer: renderer });
        }
    } else {
        // Regular text message without markdown parsing
        const messagePara = document.createElement('p');
        messagePara.textContent = content;
        messageContent.appendChild(messagePara);
    }
    
    // Add feedback options for assistant messages
    if (type === 'assistant') {
        const feedbackContainer = document.createElement('div');
        feedbackContainer.classList.add('message-feedback');
        
        // Add model watermark to show which model was used
        const modelWatermark = document.createElement('div');
        modelWatermark.classList.add('model-watermark');
        // Use the provided modelId parameter if available, otherwise use currentModel
        const modelIdToUse = modelId || currentModel;
        
        // Ensure we have a valid model name even if availableModels isn't loaded yet
        let modelName = 'Unknown Model';
        if (availableModels && availableModels[modelIdToUse] && availableModels[modelIdToUse].display_name) {
            modelName = availableModels[modelIdToUse].display_name;
        } else if (modelIdToUse) {
            // If availableModels isn't loaded yet, use a formatted version of the ID
            modelName = modelIdToUse.charAt(0).toUpperCase() + modelIdToUse.slice(1).replace(/-/g, ' ');
        }
        
        modelWatermark.textContent = `Model Used: ${modelName}`;
        modelWatermark.setAttribute('data-model-id', modelIdToUse || '');
        // Store the model ID as a data attribute for persistence across page reloads
        feedbackContainer.appendChild(modelWatermark);
        
        // Create feedback buttons container
        const feedbackButtons = document.createElement('div');
        feedbackButtons.classList.add('feedback-buttons');
        
        // Add feedback buttons
        feedbackButtons.innerHTML = `
            <button class="feedback-btn like-btn" title="Like"><i class="fas fa-thumbs-up"></i></button>
            <button class="feedback-btn dislike-btn" title="Dislike"><i class="fas fa-thumbs-down"></i></button>
            <button class="feedback-btn copy-btn" title="Copy"><i class="fas fa-copy"></i></button>
            <button class="feedback-btn speak-btn" title="Speak"><i class="fas fa-volume-up"></i></button>
        `;
        
        // Append feedback buttons to the container
        feedbackContainer.appendChild(feedbackButtons);
        messageDiv.appendChild(feedbackContainer);
        
        // Add event listeners for feedback buttons
        const likeBtn = feedbackButtons.querySelector('.like-btn');
        const dislikeBtn = feedbackButtons.querySelector('.dislike-btn');
        const copyBtn = feedbackButtons.querySelector('.copy-btn');
        const speakBtn = feedbackButtons.querySelector('.speak-btn');
        
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
    
    // Apply syntax highlighting to code blocks if this is an assistant message
    if (type === 'assistant') {
        setTimeout(() => {
            messageDiv.querySelectorAll('pre code').forEach(block => {
                try {
                    hljs.highlightElement(block);
                } catch (e) {
                    console.error('Error applying syntax highlighting:', e);
                }
            });
        }, 0);
    }
    
    return messageDiv;
}

// Function to parse and format code blocks
function parseCodeBlocks(content) {
    let parts = content.split('```');
    let result = '';
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            let textContent = parts[i];
            // Numbered lists
            textContent = textContent.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="list-item"><span class="list-number">$1.</span><span class="list-content">$2</span></div>');
            // Bullet lists
            textContent = textContent.replace(/^[\-\*]\s+(.+)$/gm, '<div class="list-item"><span class="list-bullet">•</span><span class="list-content">$1</span></div>');
            // Inline code
            textContent = textContent.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
            // Emoji shortcodes: replace known, return original shortcode for unknown
            textContent = textContent.replace(/:([a-zA-Z0-9_]+):/g, (m, code) => {
                const emojiMap = { 
                    smile: '😊', 
                    sad: '😔', 
                    grin: '😁', 
                    thumbsup: '👍', 
                    rocket: '🚀', 
                    star: '⭐', 
                    idea: '💡', 
                    code: '💻', 
                    warning: '⚠️', 
                    check: '✅', 
                    heart: '❤️', 
                    info: 'ℹ️', 
                    bird: '🐦', 
                    robot: '🤖', 
                    thinking: '🤔', 
                    hammer_and_wrench: '🛠️', 
                    iphone: '📱', 
                    construction: '🚧', 
                    electric_car: '🚗', 
                    brain: '🧠'
                };
                return emojiMap[code] || m; // Return the original shortcode if not found
            });
            // Bold/italic
            textContent = textContent.replace(/\*\*([\s\S]*?)\*\*/g, '<strong class="highlighted-text">$1</strong>');
            textContent = textContent.replace(/__([\s\S]*?)__/g, '<strong class="highlighted-text">$1</strong>');
            textContent = textContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            // Headers
            textContent = textContent.replace(/###\s+([^\n]+)/g, '<h3 class="content-title" style="margin:1.2rem 0 0.7rem 0;">$1</h3>');
            textContent = textContent.replace(/##\s+([^\n]+)/g, '<h2 class="content-title" style="margin:1.5rem 0 1rem 0;">$1</h2>');
            textContent = textContent.replace(/^#\s+([^\n]+)$/gm, '<h1 class="content-title" style="margin:2rem 0 1.2rem 0;">$1</h1>');
            // Links
            textContent = textContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="message-link">$1</a>');
            // Remove extra <br> after block elements
            textContent = textContent.replace(/(<\/div>|<\/h[1-3]>|<\/p>)<br>/g, '$1');
            // Remove extra <p> after lists
            textContent = textContent.replace(/<p style="margin-bottom: 0.75rem;"><\/p>/g, '');
            // Only preserve single line breaks that are not inside block elements
            // (We avoid replacing \n with <br> inside headers, lists, or code blocks)
            // For now, keep <br> for plain text, but not after block elements
            result += '<div class="text-content">' + textContent.replace(/([^>])\n/g, '$1<br>') + '</div>';
        } else {
            let codeContent = parts[i];
            let language = '';
            const firstLineBreak = codeContent.indexOf('\n');
            if (firstLineBreak > 0) {
                language = codeContent.substring(0, firstLineBreak).trim();
                codeContent = codeContent.substring(firstLineBreak + 1);
            }
            result += '<div class="code-block">';
            result += '<div class="code-header">';
            if (language) {
                result += '<div class="code-language">' + language + '</div>';
            }
            result += '<button class="copy-code-btn" onclick="copyCodeToClipboard(this, event)">Copy</button>';
            result += '</div>';
            const escapedContent = codeContent
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/\\'/g, '&#039;');
            // Add language class for highlight.js
            // Make sure to clean the language name to avoid issues
            let cleanLanguage = '';
            if (language) {
                // Remove any special characters and keep only alphanumeric and hyphens
                cleanLanguage = language.replace(/[^a-zA-Z0-9-]/g, '');
            }
            const languageClass = cleanLanguage ? ` class="language-${cleanLanguage}"` : '';
            result += `<pre><code${languageClass}>${escapedContent}</code></pre>`;
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
        userInput.disabled = true;
        sendButton.disabled = true;
        sendButton.style.display = 'none';
        stopBtn.style.display = 'flex';
        isResponding = true;

        controller = new AbortController();
        const signal = controller.signal;

        chatHistory.push({
            role: 'user',
            content: message
        });

        if (currentChatId && currentUser) {
            const messageData = {
                role: 'user',
                content: message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            saveMessageToChat(currentChatId, messageData);

            const currentChat = chatHistory.find(chat => chat.id === currentChatId);
            if (currentChat && currentChat.title === 'New Chat') {
                let newTitle = message.split(' ').slice(0, 4).join(' ');
                if (message.length > newTitle.length) newTitle += '...';
                renameChat(currentChatId, newTitle).then(success => {
                    if (success) {
                        const chatItem = document.querySelector(`.chat-item[data-id="${currentChatId}"]`);
                        if (chatItem) {
                            const titleElement = chatItem.querySelector('.chat-title');
                            if (titleElement) titleElement.textContent = newTitle;
                        }
                        currentChat.title = newTitle;
                    }
                });
            }
        }

        const loadingIndicator = addLoadingIndicator();

        let headers = { 'Content-Type': 'application/json' };
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
            headers,
            body: JSON.stringify({
                message,
                model: currentModel,
                chatHistory
            }),
            signal
        });

        removeLoadingIndicator(loadingIndicator);

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication error: API key may be missing or invalid');
            } else {
                throw new Error('Failed to get response from API');
            }
        }

        const data = await response.json();
        const content = data.response;
        let formattedContent = '';

        if (content) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'assistant');

            const messageContent = document.createElement('div');
            messageContent.classList.add('message-content');
            messageDiv.appendChild(messageContent);
            chatMessages.appendChild(messageDiv);
            gsap.set(messageDiv, { opacity: 0, y: 20 });
            gsap.to(messageDiv, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
            chatMessages.scrollTop = chatMessages.scrollHeight;

            const renderEmojiMarkdown = (text) => {
                const renderer = new marked.Renderer();
                const originalText = renderer.text;
                const originalLink = renderer.link;
                
                // Override link renderer to make links open in new tabs
                renderer.link = function(href, title, text) {
                    const link = originalLink.call(this, href, title, text);
                    return link.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
                };
                
                // Override text renderer to handle emojis in text content
                renderer.text = function(text) {
                    if (typeof text !== 'string') return originalText.call(this, text);
                    // Process emojis in the text content
                    if (window.replaceEmojis && typeof window.replaceEmojis === 'function') {
                        return originalText.call(this, text);
                    }
                    return originalText.call(this, text);
                };
                
                // First render the markdown
                const renderedMarkdown = marked.parse(text, { renderer });
                
                // Then use the external emoji replacement function for the entire content
                if (window.replaceEmojis && typeof window.replaceEmojis === 'function') {
                    return window.replaceEmojis(renderedMarkdown);
                }
                
                // Fallback if replaceEmojis is not available
                return renderedMarkdown;
            };

            // Store the complete content for use if the response is stopped
            const completeContent = content;
            let isTypingCancelled = false;
            
            // Function to check if typing should be cancelled
            const shouldCancelTyping = () => {
                return !isResponding || isTypingCancelled;
            };
            
            try {
                if (content.includes('```')) {
                    const parts = content.split('```');
                    let processedParts = parts.map(() => '');
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        for (let j = 0; j < part.length; j++) {
                            // Check if typing should be cancelled before each character
                            if (shouldCancelTyping()) {
                                throw new Error('Typing cancelled');
                            }
                            await new Promise(r => setTimeout(r, 1));
                            processedParts[i] += part[j];
                            const currentContent = processedParts.join('```');
                            messageContent.innerHTML = renderEmojiMarkdown(currentContent);
                            // Always scroll to the bottom during typing animation
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                        if (i < parts.length - 1) {
                            if (shouldCancelTyping()) {
                                throw new Error('Typing cancelled');
                            }
                            await new Promise(r => setTimeout(r, 100));
                        }
                    }
                } else {
                    for (let i = 0; i < content.length; i++) {
                        // Check if typing should be cancelled before each character
                        if (shouldCancelTyping()) {
                            throw new Error('Typing cancelled');
                        }
                        await new Promise(r => setTimeout(r, 0.5));
                        formattedContent += content[i];
                        messageContent.innerHTML = renderEmojiMarkdown(formattedContent);
                        // Always scroll to the bottom during typing animation
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                }
            } catch (error) {
                if (error.message === 'Typing cancelled') {
                    console.log('Typing animation cancelled');
                    // Display the full content immediately when cancelled
                    messageContent.innerHTML = renderEmojiMarkdown(completeContent);
                    // Always scroll to the bottom when typing is cancelled
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                } else {
                    throw error; // Re-throw other errors
                }
            }

            chatHistory.push({ role: 'assistant', content });

            if (currentChatId && currentUser) {
                const messageData = {
                    role: 'assistant',
                    content,
                    modelId: currentModel,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                saveMessageToChat(currentChatId, messageData);
            }

            // Add feedback options for the assistant message
            const feedbackContainer = document.createElement('div');
            feedbackContainer.classList.add('message-feedback');
            
            // Add model watermark to show which model was used
            const modelWatermark = document.createElement('div');
            modelWatermark.classList.add('model-watermark');
            // Use the current model
            const modelIdToUse = currentModel;
            
            // Ensure we have a valid model name even if availableModels isn't loaded yet
            let modelName = 'Unknown Model';
            if (availableModels && availableModels[modelIdToUse] && availableModels[modelIdToUse].display_name) {
                modelName = availableModels[modelIdToUse].display_name;
            } else if (modelIdToUse) {
                // If availableModels isn't loaded yet, use a formatted version of the ID
                modelName = modelIdToUse.charAt(0).toUpperCase() + modelIdToUse.slice(1).replace(/-/g, ' ');
            }
            
            modelWatermark.textContent = `Model Used: ${modelName}`;
            modelWatermark.setAttribute('data-model-id', modelIdToUse || '');
            feedbackContainer.appendChild(modelWatermark);
            
            // Create feedback buttons container
            const feedbackButtons = document.createElement('div');
            feedbackButtons.classList.add('feedback-buttons');
            
            // Add feedback buttons
            feedbackButtons.innerHTML = `
                <button class="feedback-btn like-btn" title="Like"><i class="fas fa-thumbs-up"></i></button>
                <button class="feedback-btn dislike-btn" title="Dislike"><i class="fas fa-thumbs-down"></i></button>
                <button class="feedback-btn copy-btn" title="Copy"><i class="fas fa-copy"></i></button>
                <button class="feedback-btn speak-btn" title="Speak"><i class="fas fa-volume-up"></i></button>
            `;
            
            // Append feedback buttons to the container
            feedbackContainer.appendChild(feedbackButtons);
            messageDiv.appendChild(feedbackContainer);
            
            // Add event listeners for feedback buttons
            const likeBtn = feedbackButtons.querySelector('.like-btn');
            const dislikeBtn = feedbackButtons.querySelector('.dislike-btn');
            const copyBtn = feedbackButtons.querySelector('.copy-btn');
            const speakBtn = feedbackButtons.querySelector('.speak-btn');
            
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
        } else if (data.error) {
            addMessage(`Error: ${data.error}`, 'system');
        }

        // Reset UI
        userInput.disabled = false;
        sendButton.disabled = false;
        sendButton.style.display = 'flex';
        stopBtn.style.display = 'none';
        isResponding = false;
        controller = null;
        userInput.focus();

    } catch (error) {
        console.error('Error:', error);
        if (error.name !== 'AbortError') {
            if (error.message.includes('API key')) {
                addMessage('Error: The API key is missing or invalid. Please check the server configuration.', 'system');
            } else if (!(
                error.message.includes('modelIdToNameMap') ||
                error.message.includes('undefined') ||
                error.message.includes('processing the response') ||
                error.message.includes('Cannot read properties') ||
                error.message.includes('is not a function')
            )) {
                addMessage(`An error occurred: ${error.message}`, 'system');
            }
        }

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
            
            // Set isResponding to false to stop the typing animation
            isResponding = false;
            
            // Add a small delay before showing the system message to allow the typing animation to complete
            setTimeout(() => {
                addMessage('Response stopped by You', 'system');
                
                // Reset UI
                userInput.disabled = false;
                sendButton.disabled = false;
                sendButton.style.display = 'flex';
                stopBtn.style.display = 'none';
                controller = null;
                userInput.focus();
            }, 100);
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
        
        // Reset textarea height to default after clearing
        userInput.style.height = 'auto';
        
        // Always scroll to the bottom when sending a message
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
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

// Add word limit to user input (6000 words) and auto-resize functionality
userInput.addEventListener('input', () => {
    const text = userInput.value;
    const wordCount = text.trim().split(/\s+/).length;
    
    // Auto-resize the textarea based on content
    userInput.style.height = 'auto';
    
    // Set a maximum height for very large content
    if (wordCount > 100) {
        userInput.style.height = '10rem';
    } else {
        userInput.style.height = Math.min(userInput.scrollHeight, 180) + 'px';
    }
    
    // Handle word limit
    if (wordCount > 6000) {
        // If over the limit, truncate to 6000 words
        const words = text.trim().split(/\s+/);
        userInput.value = words.slice(0, 6000).join(' ');
        
        // Disable send button and add tooltip
        sendButton.disabled = true;
        sendButton.setAttribute('data-tooltip', 'You exceed word limit 6000');
        
        // Show toast notification
        showToast('Word limit reached (6000 words maximum)', 'warning');
    } else {
        // Re-enable send button if below limit
        sendButton.disabled = false;
        sendButton.removeAttribute('data-tooltip');
    }
});

// Reset textarea height when cleared
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && userInput.value === '') {
        userInput.style.height = 'auto';
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
                    addMessage("Hello! I'm NumAI, How can I help you today?", 'system');
                } else {
                    // Add messages from chat history and rebuild chat history array
                    // Reset chat history array with just the system message
                    chatHistory = [
                        { 
                            role: 'system', 
                            content: 'You are NumAI, a helpful assistant. When a user says only \'hello\', respond with just \'Hello! How can I help you today?\' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples.'
                        }
                    ];
                    
                    messages.forEach(msg => {
                        addMessage(msg.content, msg.role, false, msg.modelId);
                        
                        // Add to chat history array (skip system messages)
                        if (msg.role === 'user' || msg.role === 'assistant') {
                            chatHistory.push({
                                role: msg.role,
                                content: msg.content
                            });
                        }
                    });
                    
                    console.log('Restored chat history:', chatHistory);
                }
                
                // Save chat and messages to localStorage for offline access
                try {
                    localStorage.setItem('currentChatData', JSON.stringify({
                        chat: chat,
                        messages: messages,
                        modelId: currentModel, // Save the current model ID
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
                    
                    // Restore the model ID if it was saved
                    if (parsedData.modelId) {
                        currentModel = parsedData.modelId;
                        console.log('Restored model ID from localStorage:', currentModel);
                    }
                    
                    if (chat && chat.id === chatId) {
                        console.log('Loading chat from localStorage cache');
                        
                        // Add system welcome message if no messages
                        if (!messages || messages.length === 0) {
                            addMessage("Hello! I'm NumAI, How can I help you today?", 'system');
                        } else {
                            // Add messages from cached history and rebuild chat history array
                        // Reset chat history array with just the system message
                        chatHistory = [
                            { 
                                role: 'system', 
                                content: 'You are NumAI, a helpful assistant. When a user says only \'hello\', respond with just \'Hello! How can I help you today?\' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples.'
                            }
                        ];
                        
                        messages.forEach(msg => {
                            addMessage(msg.content, msg.role, false, msg.modelId);
                            
                            // Add to chat history array (skip system messages)
                            if (msg.role === 'user' || msg.role === 'assistant') {
                                chatHistory.push({
                                    role: msg.role,
                                    content: msg.content
                                });
                            }
                        });
                        
                        console.log('Restored chat history from localStorage:', chatHistory);
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
        
        // if (chatMessages) {
        //     chatMessages.scrollTop = chatMessages.scrollHeight;
        // }
    } catch (error) {
        console.error('Unexpected error in loadChat:', error);
        addMessage("There was an error loading your chat. Please try again later.", 'system', true);
    }
    
    // At the end of loadChat, after all messages are rendered:
    // Apply syntax highlighting and ensure we scroll to the bottom of the chat
    // with a short delay to allow DOM to fully update
    setTimeout(() => {
        // Apply syntax highlighting to all code blocks in assistant messages
        document.querySelectorAll('.message.assistant pre code').forEach(block => {
            try {
                console.log('Applying syntax highlighting to code block in loadChat');
                hljs.highlightElement(block);
            } catch (e) {
                console.error('Error applying syntax highlighting in loadChat:', e);
            }
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 200); // Increased timeout to ensure DOM is fully updated
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

