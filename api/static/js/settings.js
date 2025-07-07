// Settings functionality

// DOM Elements
const settingsContainer = document.getElementById('settings-container');
const closeSettingsBtn = document.getElementById('close-settings');
const userInfoBtn = document.querySelector('.user-info');
const settingsTabs = document.querySelectorAll('.settings-tabs .tab');
const tabContents = document.querySelectorAll('.tab-content');
const themeOptions = document.querySelectorAll('.theme-option');
const voiceOptions = document.querySelectorAll('.voice-option');
const languageSelector = document.getElementById('language-selector');
const exportChatsBtn = document.getElementById('export-chats');
const deleteAllChatsBtn = document.getElementById('delete-all-chats');
const deleteAccountBtn = document.getElementById('delete-account');

// Initialize settings
document.addEventListener('DOMContentLoaded', () => {
    initializeSettings();
    initVoices();
});

// Initialize settings functionality
function initializeSettings() {
    // Open settings when user info is clicked
    if (userInfoBtn) {
        userInfoBtn.addEventListener('click', openSettings);
    }
    
    // Close settings when close button is clicked
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettings);
    }
    
    // Tab switching
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Theme selection
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.getAttribute('data-theme');
            setTheme(theme);
            
            // Update active state
            themeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
    
    // Voice selection
    voiceOptions.forEach(option => {
        option.addEventListener('click', () => {
            const voice = option.getAttribute('data-voice');
            setVoice(voice);
            
            // Update active state
            voiceOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            // Play a sample of the selected voice
            previewVoice(voice);
        });
    });
    
    // Language selection
    if (languageSelector) {
        languageSelector.addEventListener('change', () => {
            const language = languageSelector.value;
            setLanguage(language);
        });
    }
    
    // Data management buttons
    if (exportChatsBtn) {
        exportChatsBtn.addEventListener('click', exportChats);
    }
    
    if (deleteAllChatsBtn) {
        deleteAllChatsBtn.addEventListener('click', confirmDeleteAllChats);
    }
    
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', confirmDeleteAccount);
    }
    
    // Load user profile data
    loadUserProfile();
    
    // Load saved voice preference
    loadSavedVoice();
}

// Open settings panel
function openSettings() {
    if (settingsContainer) {
        settingsContainer.classList.add('open');
        loadUserProfile(); // Refresh profile data when opening
    }
}

// Close settings panel
function closeSettings() {
    if (settingsContainer) {
        settingsContainer.classList.remove('open');
    }
}

// Switch between tabs
function switchTab(tabId) {
    // Update tab active states
    settingsTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update content visibility
    tabContents.forEach(content => {
        if (content.id === `${tabId}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Set theme and save preference
function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
    
    localStorage.setItem('theme', theme);
}

// Function to set the voice
function setVoice(voiceId) {
    localStorage.setItem('selectedVoice', voiceId);
    console.log('Voice set to:', voiceId);
    
    // Update UI to show active voice
    document.querySelectorAll('.voice-option').forEach(option => {
        option.classList.remove('active');
    });
    
    const selectedOption = document.querySelector(`.voice-option[data-voice="${voiceId}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }
    
    // Preview the selected voice
    previewVoice(voiceId);
}

// Function to preview the selected voice
function previewVoice(voiceId) {
    const previewText = "Hello, I'm your AI assistant.";
    const utterance = new SpeechSynthesisUtterance(previewText);
    
    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    
    // Set voice based on selection with more specific matching
    if (voices.length > 0) {
        // Create an array of voice options with specific preferences
        const maleVoices = voices.filter(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Mark') || v.name.includes('Daniel') || v.name.includes('Thomas') || v.name.includes('James'));
        const femaleVoices = voices.filter(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Emily') || v.name.includes('Sophia') || v.name.includes('Victoria') || v.name.includes('Karen'));
        
        // Sort voices to prioritize specific names
        maleVoices.sort((a, b) => {
            // Prioritize exact name matches
            const aExact = voiceId === 'male-1' ? a.name.includes('Daniel') : 
                         voiceId === 'male-2' ? a.name.includes('Thomas') : 
                         voiceId === 'male-3' ? a.name.includes('James') : false;
            const bExact = voiceId === 'male-1' ? b.name.includes('Daniel') : 
                         voiceId === 'male-2' ? b.name.includes('Thomas') : 
                         voiceId === 'male-3' ? b.name.includes('James') : false;
            return bExact - aExact;
        });
        
        femaleVoices.sort((a, b) => {
            // Prioritize exact name matches
            const aExact = voiceId === 'female-1' ? a.name.includes('Samantha') : 
                         voiceId === 'female-2' ? a.name.includes('Emily') : 
                         voiceId === 'female-3' ? a.name.includes('Sophia') : false;
            const bExact = voiceId === 'female-1' ? b.name.includes('Samantha') : 
                         voiceId === 'female-2' ? b.name.includes('Emily') : 
                         voiceId === 'female-3' ? b.name.includes('Sophia') : false;
            return bExact - aExact;
        });
        
        // Select voice based on ID
        switch(voiceId) {
            case 'male-1': // Daniel
                utterance.voice = maleVoices[0] || voices.find(v => v.name.includes('Male'));
                break;
            case 'male-2': // Thomas
                utterance.voice = maleVoices.length > 1 ? maleVoices[1] : maleVoices[0] || voices.find(v => v.name.includes('Male'));
                break;
            case 'male-3': // James
                utterance.voice = maleVoices.length > 2 ? maleVoices[2] : maleVoices[0] || voices.find(v => v.name.includes('Male'));
                break;
            case 'female-1': // Samantha
                utterance.voice = femaleVoices[0] || voices.find(v => v.name.includes('Female'));
                break;
            case 'female-2': // Emily
                utterance.voice = femaleVoices.length > 1 ? femaleVoices[1] : femaleVoices[0] || voices.find(v => v.name.includes('Female'));
                break;
            case 'female-3': // Sophia
                utterance.voice = femaleVoices.length > 2 ? femaleVoices[2] : femaleVoices[0] || voices.find(v => v.name.includes('Female'));
                break;
            default:
                // Default to a female voice
                utterance.voice = voices.find(v => v.name.includes('Female'));
        }
        
        // Log the selected voice for debugging
        console.log('Selected voice:', utterance.voice ? utterance.voice.name : 'Default voice');
    }
    
    // Speak the preview
    window.speechSynthesis.cancel(); // Cancel any ongoing speech first
    window.speechSynthesis.speak(utterance);
}

// Load saved voice preference
function loadSavedVoice() {
    const savedVoice = localStorage.getItem('selectedVoice') || 'female-2'; // Default to Emily
    const voiceOption = document.querySelector(`[data-voice="${savedVoice}"]`);
    
    if (voiceOption) {
        voiceOptions.forEach(opt => opt.classList.remove('active'));
        voiceOption.classList.add('active');
    }
}

// Set language
function setLanguage(language) {
    // Save preference for future implementation
    localStorage.setItem('language', language);
    console.log(`Language set to: ${language}`);
    // In a real app, this would trigger language file loading
}

// Load user profile data
function loadUserProfile() {
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileType = document.getElementById('profile-type');
    
    firebase.auth().onAuthStateChanged(user => {
        if (user && profileName && profileEmail) {
            profileName.textContent = user.displayName || 'Not set';
            profileEmail.textContent = user.email || 'Not available';
            profileType.textContent = 'Standard';
        }
    });
}

// Export chats functionality
async function exportChats() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('You must be logged in to export chats');
            return;
        }
        
        // Get all user chats
        const chats = await getUserChats(user.uid);
        
        // For each chat, get its messages
        const fullChats = await Promise.all(chats.map(async (chat) => {
            const messages = await getChatMessages(chat.id);
            return {
                ...chat,
                messages
            };
        }));
        
        // Convert to JSON and create download
        const dataStr = JSON.stringify(fullChats, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `numAI_chats_${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
    } catch (error) {
        console.error('Error exporting chats:', error);
        alert('Failed to export chats. Please try again.');
    }
}

// Confirm delete all chats
function confirmDeleteAllChats() {
    if (confirm('Are you sure you want to delete all your chats? This action cannot be undone.')) {
        deleteAllChats();
    }
}

// Delete all chats
async function deleteAllChats() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('You must be logged in to delete chats');
            return;
        }
        
        // Get all user chats
        const chatsSnapshot = await firebase.firestore().collection('chats')
            .where('userId', '==', user.uid)
            .get();
        
        // Delete each chat
        const batch = firebase.firestore().batch();
        chatsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        // Clear current chat and localStorage
        localStorage.removeItem('currentChatId');
        currentChatId = null;
        
        // Create a new chat
        await createNewChatSession();
        
        alert('All chats have been deleted');
        
    } catch (error) {
        console.error('Error deleting all chats:', error);
        alert('Failed to delete chats. Please try again.');
    }
}

// Confirm delete account
function confirmDeleteAccount() {
    if (confirm('Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.')) {
        deleteAccount();
    }
}

// Delete account
async function deleteAccount() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('You must be logged in to delete your account');
            return;
        }
        
        // First delete all user data
        await deleteAllChats();
        
        // Then delete the user account
        await user.delete();
        
        // Redirect to login page
        window.location.href = '/login';
        
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account. You may need to re-authenticate. ' + error.message);
    }
}

// Apply saved preferences on load
function applySavedPreferences() {
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    
    // Update theme selector UI
    themeOptions.forEach(option => {
        if (option.getAttribute('data-theme') === savedTheme) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // Apply saved language
    const savedLanguage = localStorage.getItem('language') || 'en';
    if (languageSelector) {
        languageSelector.value = savedLanguage;
    }
    
    // Apply saved voice preference
    loadSavedVoice();
}

// Initialize speech synthesis voices
function initVoices() {
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = function() {
                window.speechSynthesis.getVoices();
            };
        }
    }
}

// Apply saved preferences on page load
document.addEventListener('DOMContentLoaded', applySavedPreferences);