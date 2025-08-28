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

// Google Sheets configuration (PUBLIC SHEET - no authentication needed)
const GOOGLE_SHEET_ID = 'YOUR_SHEET_ID_HERE'; // Replace with your actual sheet ID
const GOOGLE_FORM_ID = 'YOUR_FORM_ID_HERE';   // Replace with your actual form ID

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
    loadDataFromPublicSheet();
    populateTeamSelect();
    renderTeamGrid();
    renderHistory();
    updateCurrentHolder();
    
    // Refresh data every 30 seconds
    setInterval(loadDataFromPublicSheet, 30000);
}

// Load data from public Google Sheet (no authentication needed)
async function loadDataFromPublicSheet() {
    try {
        // Load current holder from public sheet
        const holderResponse = await fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&tq=SELECT%20A%20WHERE%20A1%20IS%20NOT%20NULL%20LIMIT%201`);
        const holderText = await holderResponse.text();
        const holderData = JSON.parse(holderText.substring(47).slice(0, -2));
        
        if (holderData.table && holderData.table.rows && holderData.table.rows.length > 0) {
            currentHolder = holderData.table.rows[0].c[0].v || null;
        }
        
        // Load handover history from public sheet
        const historyResponse = await fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&tq=SELECT%20A,B,C,D%20WHERE%20A2%20IS%20NOT%20NULL%20ORDER%20BY%20C%20DESC%20LIMIT%2050`);
        const historyText = await historyResponse.text();
        const historyData = JSON.parse(historyText.substring(47).slice(0, -2));
        
        if (historyData.table && historyData.table.rows) {
            handoverHistory = historyData.table.rows.map(row => ({
                person: row.c[0] ? row.c[0].v : '',
                action: row.c[1] ? row.c[1].v : '',
                timestamp: row.c[2] ? row.c[2].v : '',
                from: row.c[3] ? row.c[3].v : ''
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

// Submit handover data via Google Form (no authentication needed)
async function submitHandoverViaForm(newHolder, previousHolder) {
    try {
        const formData = new FormData();
        formData.append('entry.1234567890', newHolder); // Replace with actual form field ID
        formData.append('entry.0987654321', 'Received Phone'); // Replace with actual form field ID
        formData.append('entry.1122334455', new Date().toISOString()); // Replace with actual form field ID
        formData.append('entry.5566778899', previousHolder || 'No one'); // Replace with actual form field ID
        
        await fetch(`https://docs.google.com/forms/d/${GOOGLE_FORM_ID}/formResponse`, {
            method: 'POST',
            body: formData,
            mode: 'no-cors' // Important for Google Forms
        });
        
        // Also save to local storage as backup
        saveDataToLocalStorage();
        
    } catch (error) {
        console.error('Error submitting to form:', error);
        showNotification('Error submitting to form. Data saved locally as backup.', 'error');
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
    
    // Submit data via Google Form (no authentication needed)
    submitHandoverViaForm(newHolder, previousHolder);
    
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
        saveDataToLocalStorage();
        showNotification('History entry deleted!', 'success');
    }
}

// Clear all history
function clearAllHistory() {
    if (confirm('Are you sure you want to clear all handover history? This action cannot be undone.')) {
        handoverHistory = [];
        renderHistory();
        saveDataToLocalStorage();
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
