const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

// HTML routes
app.get('/arena', (req, res) => res.sendFile(path.join(__dirname, 'public', 'arena.html')));
app.get('/controller', (req, res) => res.sendFile(path.join(__dirname, 'public', 'controller.html')));

const WORLD_WIDTH = 2500;
const WORLD_HEIGHT = 2000;
const INSECT_SPEED = 6;
const ROTATION_SPEED = 0.08;
const BULLET_SPEED = 18;

// Initial state
let state = {
    players: {
        1: { id: null, type: 'sprinkhaan', r: 35, x: 500, y: 1000, angle: 0, hp: 100, maxHp: 100, cooldown: 0, score: 0, inputs: { up: false, down: false, left: false, right: false, shoot: false } },
        2: { id: null, type: 'mier', r: 35, x: 2000, y: 1000, angle: Math.PI, hp: 100, maxHp: 100, cooldown: 0, score: 0, inputs: { up: false, down: false, left: false, right: false, shoot: false } }
    },
    bullets: [],
    world: { width: WORLD_WIDTH, height: WORLD_HEIGHT }
};

io.on('connection', (socket) => {
    socket.emit('init', { id: socket.id, state });

    socket.on('join', (role) => {
        if (state.players[role]) {
            state.players[role].id = socket.id;
            // Revive their character with full HP
            state.players[role].hp = state.players[role].maxHp;
            
            // Re-center on spawn
            if (role == 1) { state.players[role].x = 500; state.players[role].y = 1000; state.players[role].angle = 0; }
            if (role == 2) { state.players[role].x = 2000; state.players[role].y = 1000; state.players[role].angle = Math.PI; }
            
            console.log(`Player ${role} joined from ${socket.id}`);
            io.emit('state', state); // Immediate broadcast
        }
    });

    socket.on('input', (data) => {
        let pId = null;
        if (state.players[1].id === socket.id) pId = 1;
        if (state.players[2].id === socket.id) pId = 2;
        
        if (pId) {
            state.players[pId].inputs[data.type] = data.value;
        }
    });

    socket.on('disconnect', () => {
        if (state.players[1].id === socket.id) { state.players[1].id = null; state.players[1].inputs = {}; }
        if (state.players[2].id === socket.id) { state.players[2].id = null; state.players[2].inputs = {}; }
    });
});

setInterval(() => {
    // Game Loop
    for (let pId of [1, 2]) {
        let p = state.players[pId];
        if (!p.id || p.hp <= 0) continue; // Skip if offline or dead

        if (p.inputs.left) p.angle -= ROTATION_SPEED;
        if (p.inputs.right) p.angle += ROTATION_SPEED;
        
        if (p.inputs.up) {
            p.x += Math.cos(p.angle) * INSECT_SPEED;
            p.y += Math.sin(p.angle) * INSECT_SPEED;
        }
        if (p.inputs.down) {
            p.x -= Math.cos(p.angle) * INSECT_SPEED * 0.5;
            p.y -= Math.sin(p.angle) * INSECT_SPEED * 0.5;
        }

        // Clamp to world boundaries
        p.x = Math.max(p.r, Math.min(WORLD_WIDTH - p.r, p.x));
        p.y = Math.max(p.r, Math.min(WORLD_HEIGHT - p.r, p.y));

        if (p.cooldown > 0) p.cooldown--;
        if (p.inputs.shoot && p.cooldown <= 0) {
            state.bullets.push({
                x: p.x + Math.cos(p.angle) * (p.r + 10),
                y: p.y + Math.sin(p.angle) * (p.r + 10),
                dx: Math.cos(p.angle) * BULLET_SPEED,
                dy: Math.sin(p.angle) * BULLET_SPEED,
                owner: pId,
                life: 150
            });
            p.cooldown = 15; // Attack speed
        }
    }

    // Bullets logic
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        let b = state.bullets[i];
        b.x += b.dx;
        b.y += b.dy;
        b.life--;

        let hit = false;
        // Check collision with players
        for (let pId of [1, 2]) {
            if (pId == b.owner) continue;
            let p = state.players[pId];
            if (!p.id || p.hp <= 0) continue;

            let dist = Math.hypot(p.x - b.x, p.y - b.y);
            if (dist < p.r + 5) {
                p.hp -= 15;
                hit = true;
                
                // If killed
                if (p.hp <= 0) {
                    state.players[b.owner].score += 1;
                    
                    // Auto revive after 3 seconds
                    setTimeout(() => {
                        let deadPlayer = state.players[pId];
                        if(deadPlayer) {
                            deadPlayer.hp = deadPlayer.maxHp;
                            if (pId == 1) { deadPlayer.x = 500; deadPlayer.y = 1000; deadPlayer.angle = 0; }
                            if (pId == 2) { deadPlayer.x = 2000; deadPlayer.y = 1000; deadPlayer.angle = Math.PI; }
                        }
                    }, 3000);
                }
                break;
            }
        }

        if (hit || b.life <= 0 || b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT) {
            state.bullets.splice(i, 1);
        }
    }

    io.emit('state', state);
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
