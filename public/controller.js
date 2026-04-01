const socket = io();

// Parse URL params
const urlParams = new URLSearchParams(window.location.search);
const playerRole = parseInt(urlParams.get('p')) || 1; // Default to P1

// Set theme
document.body.classList.add(`theme-p${playerRole}`);

// Join the game as this player
socket.emit('join', playerRole);

const controls = {
    btnLeft: 'left',
    btnRight: 'right',
    btnUp: 'down', // Up onscreen moves backward? Wait. Left/right rotate. Up moves backward, down moves forward.
    // In screenshot: Up arrow is forward, down arrow is backward.
    // Let's match the physical arrows
    btnDown: 'down',
    btnShoot: 'shoot'
};
// Fixing the IDs based on visual logic:
// Actually, in screenshot:
// [ ▼ ] [ ▲ ]
// Let's assume ▲ means forward (up), ▼ means backward (down).
const mapBtnToInput = {
    'btnLeft': 'left',
    'btnRight': 'right',
    'btnUp': 'up',    // Forward
    'btnDown': 'down',// Backward
    'btnShoot': 'shoot'
};

function handlePress(btnId, isPressed) {
    const inputType = mapBtnToInput[btnId];
    if (inputType) {
        socket.emit('input', { type: inputType, value: isPressed });
    }
}

// Add touch/mouse listeners
Object.keys(mapBtnToInput).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    // Touch events for mobile
    el.addEventListener('touchstart', (e) => {
        e.preventDefault(); // prevent scrolling/zooming
        handlePress(id, true);
        el.style.transform = 'translateY(6px)';
        el.style.boxShadow = '0 0 0 rgba(0,0,0,0.4), 0 4px 6px rgba(0,0,0,0.3)';
    });
    
    el.addEventListener('touchend', (e) => {
        e.preventDefault();
        handlePress(id, false);
        el.style.transform = '';
        el.style.boxShadow = '';
    });
    
    el.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        handlePress(id, false);
        el.style.transform = '';
        el.style.boxShadow = '';
    });

    // Mouse events for desktop testing
    el.addEventListener('mousedown', () => { handlePress(id, true); });
    el.addEventListener('mouseup', () => { handlePress(id, false); });
    el.addEventListener('mouseleave', () => { handlePress(id, false); });
});
