const socket = io();

const canvas1 = document.getElementById('canvasP1');
const ctx1 = canvas1.getContext('2d');

const canvas2 = document.getElementById('canvasP2');
const ctx2 = canvas2.getContext('2d');

const hp1 = document.getElementById('hpValue1');
const hp2 = document.getElementById('hpValue2');
const score1 = document.getElementById('score1');
const score2 = document.getElementById('score2');

let gameState = null;

socket.on('state', (state) => {
    gameState = state;
    
    // Update scores and HP text
    if(state.players[1]) {
        hp1.textContent = Math.max(0, state.players[1].hp) + '%';
        score1.textContent = state.players[1].score;
    }
    if(state.players[2]) {
        hp2.textContent = Math.max(0, state.players[2].hp) + '%';
        score2.textContent = state.players[2].score;
    }
});

function drawGrass(ctx, width, height, camX, camY) {
    ctx.fillStyle = '#8DA973';
    ctx.fillRect(camX, camY, width, height);

    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.font = '20px sans-serif';
    
    // Draw some repeating pattern for grass that doesn't move with camera
    // We can just use a seeded pseudo pattern or tile it
    const tileSize = 200;
    const startX = Math.floor(camX / tileSize) * tileSize;
    const startY = Math.floor(camY / tileSize) * tileSize;
    
    for (let x = startX; x < camX + width; x += tileSize) {
        for (let y = startY; y < camY + height; y += tileSize) {
            ctx.fillText('\'', x + 50, y + 50);
            ctx.fillText('"', x + 150, y + 120);
            ctx.fillText('\'', x + 100, y + 180);
        }
    }
}

function renderPlayer(ctx, p) {
    if (p.hp <= 0) return; // invisible if dead

    ctx.save();
    ctx.translate(p.x, p.y);
    // Our math considers angle 0 as facing Right.
    // The emoji faces left (usually, or we can just draw shapes).
    // Let's draw an insect manually for better control vs emoji
    ctx.rotate(p.angle);

    // Draw Emoji
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Emojis often face different directions on different OS. Let's draw shapes instead.
    // Body
    if(p.type === 'sprinkhaan') {
        ctx.fillStyle = '#6EEB4E'; // Bright Green
        ctx.strokeStyle = '#1D6210';
    } else {
        ctx.fillStyle = '#DC0E15'; // Red
        ctx.strokeStyle = '#5E0608';
    }
    ctx.lineWidth = 3;

    // Legs
    ctx.beginPath();
    ctx.moveTo(-10, -20); ctx.lineTo(-20, -35); // top leg L
    ctx.moveTo(-10, 20); ctx.lineTo(-20, 35); // top leg R
    ctx.moveTo(10, -20); ctx.lineTo(15, -40); // bot leg L
    ctx.moveTo(10, 20); ctx.lineTo(15, 40); // bot leg R
    ctx.stroke();

    // Abdomen
    ctx.beginPath();
    ctx.ellipse(-15, 0, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Thorax
    ctx.beginPath();
    ctx.ellipse(5, 0, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    
    // Head
    ctx.beginPath();
    ctx.arc(25, 0, 10, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Eyes
    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(28, -5, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(28, 5, 3, 0, Math.PI*2); ctx.fill();

    ctx.restore();

    // Draw HP Bar
    ctx.save();
    ctx.translate(p.x, p.y - p.r - 20);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-30, 0, 60, 8);
    ctx.fillStyle = p.type === 'sprinkhaan' ? '#1DB935' : '#DC0E15';
    ctx.fillRect(-30, 0, 60 * (Math.max(0, p.hp) / p.maxHp), 8);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(-30, 0, 60, 8);
    ctx.restore();
}

function renderBullet(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = '#FFC900';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFC900';
    ctx.fill();
    ctx.restore();
}

function renderView(ctx, canvasWidth, canvasHeight, focusId) {
    if (!gameState) return;

    const focusPlayer = gameState.players[focusId];
    if (!focusPlayer) return;

    // Calculate Camera bounds
    let camX = focusPlayer.x - canvasWidth / 2;
    let camY = focusPlayer.y - canvasHeight / 2;

    // Clamp camera within world bounds
    camX = Math.max(0, Math.min(gameState.world.width - canvasWidth, camX));
    camY = Math.max(0, Math.min(gameState.world.height - canvasHeight, camY));

    ctx.save();
    // Clear screen
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Translate to camera view
    ctx.translate(-camX, -camY);

    // Draw background
    drawGrass(ctx, canvasWidth, canvasHeight, camX, camY);

    // Draw World Borders
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, gameState.world.width, gameState.world.height);

    // Draw Bullets
    gameState.bullets.forEach(b => renderBullet(ctx, b));

    // Draw Players
    Object.values(gameState.players).forEach(p => renderPlayer(ctx, p));

    ctx.restore();
}

function loop() {
    renderView(ctx1, canvas1.width, canvas1.height, 1);
    renderView(ctx2, canvas2.width, canvas2.height, 2);
    requestAnimationFrame(loop);
}

// Start loop
requestAnimationFrame(loop);
