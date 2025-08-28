// Team members data
const teamMembers = [
    'Archana Mali',
    'Bhushan Warke',
    'Dhananjay Wagh',
    'Ganesh Nawale',
    'Harshal Pawar',
    'Manish Kanawade',
    'Mayur Sonawane',
    'Namrata Borkar',
    'Pooja Jadhav',
    'Priyanka Rokade',
    'Rachana Mohadikar',
    'Rakhee Patil',
    'Sanket Nikule',
    'Savita Sawant',
    'Shweta Thorat',
    'Suyog Gujarati',
    'Somraj Nawale',
    'Tejas Nimbalkar'
];

// App state
let currentHolder = null;
let handoverHistory = [];

// Google Sheets configuration
const GOOGLE_SHEET_ID = 'YOUR_SHEET_ID_HERE'; // Replace with your actual sheet ID
const GOOGLE_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual API key

// DOM elements
const currentPersonEl = document.getElementById('currentPerson');
const lastUpdatedEl = document.getElementById('lastUpdated');
const personSelectEl = document.getElementById('personSelect');
const handoverBtnEl = document.getElementById('handoverBtn');
const teamGridEl = document.getElementById('teamGrid');
const historyListEl = document.getElementById('historyList');
const clearHistoryBtnEl = document.getElementById('clearHistoryBtn');

// Initialize the app
function initApp() {
    loadDataFromSheet();
    populateTeamSelect();
    renderTeamGrid();
    renderHistory();
    updateCurrentHolder();
    
    // Refresh data every 30 seconds
    setInterval(loadDataFromSheet, 30000);
}

// Load data from Google Sheets
async function loadDataFromSheet() {
    try {
        // Load current holder
        const holderResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Sheet1!A1?key=${GOOGLE_API_KEY}`);
        const holderData = await holderResponse.json();
        
        if (holderData.values && holderData.values[0]) {
            currentHolder = holderData.values[0][0] || null;
        }
        
        // Load handover history
        const historyResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Sheet1!A2:D?key=${GOOGLE_API_KEY}`);
        const historyData = await historyResponse.json();
        
        if (historyData.values) {
            handoverHistory = historyData.values.map(row => ({
                person: row[0],
                action: row[1],
                timestamp: row[2],
                from: row[3]
            }));
        }
        
        // Update UI
        updateCurrentHolder();
        renderTeamGrid();
        renderHistory();
        
    } catch (error) {
        console.error('Error loading data from sheet:', error);
        showNotification('Error loading data. Using local storage as backup.', 'error');
        loadDataFromLocalStorage();
    }
}

// Save data to Google Sheets
async function saveDataToSheet() {
    try {
        // Save current holder
        const holderData = {
            values: [[currentHolder || '']]
        };
        
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Sheet1!A1?valueInputOption=RAW&key=${GOOGLE_API_KEY}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(holderData)
        });
        
        // Save handover history
        const historyData = {
            values: handoverHistory.map(entry => [
                entry.person,
                entry.action,
                entry.timestamp,
                entry.from
            ])
        };
        
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Sheet1!A2?valueInputOption=RAW&key=${GOOGLE_API_KEY}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(historyData)
        });
        
        // Also save to local storage as backup
        saveDataToLocalStorage();
        
    } catch (error) {
        console.error('Error saving to sheet:', error);
        showNotification('Error saving to sheet. Data saved locally as backup.', 'error');
        saveDataToLocalStorage();
    }
}

// Load data from localStorage (backup)
function loadDataFromLocalStorage() {
    const savedHolder = localStorage.getItem('mobilePhoneHolder');
    const savedHistory = localStorage.getItem('handoverHistory');
    
    if (savedHolder) {
        currentHolder = savedHolder;
    }
    
    if (savedHistory) {
        handoverHistory = JSON.parse(savedHistory);
    }
}

// Save data to localStorage (backup)
function saveDataToLocalStorage() {
    localStorage.setItem('mobilePhoneHolder', currentHolder);
    localStorage.setItem('handoverHistory', JSON.stringify(handoverHistory));
}

// Populate the handover select dropdown
function populateTeamSelect() {
    teamMembers.forEach(member => {
        const option = document.createElement('option');
        option.value = member;
        option.textContent = member;
        personSelectEl.appendChild(option);
    });
    
    // Enable/disable handover button based on selection
    personSelectEl.addEventListener('change', () => {
        handoverBtnEl.disabled = !personSelectEl.value;
    });
}

// Render the team grid
function renderTeamGrid() {
    teamGridEl.innerHTML = '';
    
    teamMembers.forEach(member => {
        const memberCard = document.createElement('div');
        memberCard.className = `team-member ${member === currentHolder ? 'has-phone' : ''}`;
        memberCard.innerHTML = `
            <div class="member-name">${member}</div>
            <div class="member-status">${member === currentHolder ? 'Has Phone' : 'Available'}</div>
        `;
        
        // Add click to handover directly
        memberCard.addEventListener('click', () => {
            if (member !== currentHolder) {
                handoverPhone(member);
            }
        });
        
        teamGridEl.appendChild(memberCard);
    });
}

// Update the current holder display
function updateCurrentHolder() {
    if (currentHolder) {
        currentPersonEl.innerHTML = `
            <span class="person-name">${currentHolder}</span>
            <span class="status-badge occupied">Has Phone</span>
        `;
    } else {
        currentPersonEl.innerHTML = `
            <span class="person-name">No one has the phone</span>
            <span class="status-badge available">Available</span>
        `;
    }
    
    // Update last updated time
    const now = new Date();
    lastUpdatedEl.textContent = now.toLocaleString();
}

// Handover the phone to a new person
function handoverPhone(newHolder) {
    const previousHolder = currentHolder;
    currentHolder = newHolder;
    
    // Add to history
    const historyEntry = {
        person: newHolder,
        action: 'Received Phone',
        timestamp: new Date().toISOString(),
        from: previousHolder || 'No one'
    };
    
    handoverHistory.unshift(historyEntry);
    
    // Keep only last 50 entries
    if (handoverHistory.length > 50) {
        handoverHistory = handoverHistory.slice(0, 50);
    }
    
    // Update UI
    updateCurrentHolder();
    renderTeamGrid();
    renderHistory();
    
    // Save data to sheet
    saveDataToSheet();
    
    // Show success message
    showNotification(`Phone handed over to ${newHolder}!`, 'success');
    
    // Reset form
    personSelectEl.value = '';
    handoverBtnEl.disabled = true;
}

// Render handover history
function renderHistory() {
    historyListEl.innerHTML = '';
    
    if (handoverHistory.length === 0) {
        historyListEl.innerHTML = '<p style="text-align: center; color: #666;">No handover history yet</p>';
        return;
    }
    
    handoverHistory.forEach((entry, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const timestamp = new Date(entry.timestamp).toLocaleString();
        
        historyItem.innerHTML = `
            <div class="history-details">
                <div class="history-person">${entry.person}</div>
                <div class="history-time">${timestamp} - From: ${entry.from}</div>
            </div>
            <div class="history-actions">
                <div class="history-action">${entry.action}</div>
                <button class="delete-history-btn" data-index="${index}" title="Delete this entry">×</button>
            </div>
        `;
        
        // Add delete functionality for individual entry
        const deleteBtn = historyItem.querySelector('.delete-history-btn');
        deleteBtn.addEventListener('click', () => {
            deleteHistoryEntry(index);
        });
        
        historyListEl.appendChild(historyItem);
    });
}

// Delete individual history entry
function deleteHistoryEntry(index) {
    if (confirm('Are you sure you want to delete this handover record?')) {
        handoverHistory.splice(index, 1);
        renderHistory();
        saveDataToSheet();
        showNotification('History entry deleted!', 'success');
    }
}

// Clear all history
function clearAllHistory() {
    if (confirm('Are you sure you want to clear all handover history? This action cannot be undone.')) {
        handoverHistory = [];
        renderHistory();
        saveDataToSheet();
        showNotification('All history cleared!', 'success');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#00b894' : type === 'error' ? '#e74c3c' : '#667eea'};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Handle handover button click
handoverBtnEl.addEventListener('click', () => {
    const selectedPerson = personSelectEl.value;
    if (selectedPerson && selectedPerson !== currentHolder) {
        handoverPhone(selectedPerson);
    }
});

// Handle clear history button click
clearHistoryBtnEl.addEventListener('click', clearAllHistory);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Add some fun interactions
document.addEventListener('DOMContentLoaded', () => {
    // Add confetti effect on successful handover
    const originalHandoverPhone = handoverPhone;
    handoverPhone = function(newHolder) {
        originalHandoverPhone.call(this, newHolder);
        
        // Simple confetti effect
        createConfetti();
    };
});

// Simple confetti effect
function createConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            top: -10px;
            left: ${Math.random() * window.innerWidth}px;
            pointer-events: none;
            z-index: 9999;
            border-radius: 50%;
        `;
        
        document.body.appendChild(confetti);
        
        const animation = confetti.animate([
            { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
            { transform: `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
        ], {
            duration: Math.random() * 3000 + 2000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        animation.onfinish = () => {
            document.body.removeChild(confetti);
        };
    }
}
