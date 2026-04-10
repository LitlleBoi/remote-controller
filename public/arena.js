const socket = io();

const canvas1 = document.getElementById('canvasP1');
const ctx1 = canvas1.getContext('2d');

const canvas2 = document.getElementById('canvasP2');
const ctx2 = canvas2.getContext('2d');

const hp1 = document.getElementById('hpValue1');
const hp2 = document.getElementById('hpValue2');
const score1 = document.getElementById('score1');
const score2 = document.getElementById('score2');

// Load Player Images
const sprinkhaanImg = new Image();
sprinkhaanImg.src = 'sprinkhaan.png';

const mierImg = new Image();
mierImg.src = 'mier.png';

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
    const tileSize = 80;
    const startX = Math.floor(camX / tileSize) * tileSize;
    const startY = Math.floor(camY / tileSize) * tileSize;

    for (let x = startX; x < camX + width; x += tileSize) {
        for (let y = startY; y < camY + height; y += tileSize) {
            // Checkerboard pattern for clear movement perception
            const isDark = (Math.abs(x / tileSize) + Math.abs(y / tileSize)) % 2 === 0;
            ctx.fillStyle = isDark ? '#7a9f5a' : '#85ad63'; 
            ctx.fillRect(x, y, tileSize, tileSize);
            
            // Subtle grid lines
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, tileSize, tileSize);
        }
    }
}

function renderPlayer(ctx, p) {
    if (p.hp <= 0) return; // invisible if dead

    ctx.save();
    ctx.translate(p.x, p.y);
    // Draw Image logic
    // Our logic angle 0 = Right, but images usually face UP.
    // So we add Math.PI / 2 (90 degrees) to the rotation.
    ctx.rotate(p.angle + Math.PI / 2);

    const img = p.type === 'sprinkhaan' ? sprinkhaanImg : mierImg;
    
    // Render the image if valid
    const size = 110; 
    ctx.drawImage(img, -size/2, -size/2, size, size);

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

function drawMinimap(ctx, canvasWidth, canvasHeight, camX, camY) {
    if (!gameState || !gameState.world) return;

    const minimapScale = 180 / Math.max(gameState.world.width, gameState.world.height);
    const minimapWidth = gameState.world.width * minimapScale;
    const minimapHeight = gameState.world.height * minimapScale;
    
    // Position minimap at top right of the canvas
    const margin = 20;
    const minX = canvasWidth - minimapWidth - margin;
    const minY = margin;

    ctx.save();
    
    // Minimap background (Radar look)
    ctx.fillStyle = 'rgba(10, 20, 35, 0.85)';
    ctx.fillRect(minX, minY, minimapWidth, minimapHeight);
    
    // Minimap border
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.strokeRect(minX, minY, minimapWidth, minimapHeight);

    // Subtle Minimap grid
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < 4; x++) {
        ctx.moveTo(minX + (minimapWidth * x) / 4, minY);
        ctx.lineTo(minX + (minimapWidth * x) / 4, minY + minimapHeight);
    }
    for (let y = 1; y < 4; y++) {
        ctx.moveTo(minX, minY + (minimapHeight * y) / 4);
        ctx.lineTo(minX + minimapWidth, minY + (minimapHeight * y) / 4);
    }
    ctx.stroke();

    // Camera view rectangle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(
        minX + camX * minimapScale,
        minY + camY * minimapScale,
        canvasWidth * minimapScale,
        canvasHeight * minimapScale
    );

    // Draw Players
    Object.values(gameState.players).forEach(p => {
        if (p.hp <= 0) return;
        
        const dotX = minX + p.x * minimapScale;
        const dotY = minY + p.y * minimapScale;
        
        ctx.fillStyle = p.type === 'sprinkhaan' ? '#6EEB4E' : '#DC0E15';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a strong border around dots
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

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

    // Draw Minimap (after restore so it's statically on screen)
    drawMinimap(ctx, canvasWidth, canvasHeight, camX, camY);
}

function loop() {
    renderView(ctx1, canvas1.width, canvas1.height, 1);
    renderView(ctx2, canvas2.width, canvas2.height, 2);
    requestAnimationFrame(loop);
}

// Start loop
requestAnimationFrame(loop);
