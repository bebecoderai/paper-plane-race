const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timerDisplay = document.getElementById('timer');

// Set canvas to full screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ws = new WebSocket(`wss://${window.location.host}`);
let playerId;
let otherPlanes = {};
let gameOver = false;
let survivalTime = 0;
let lastSpawnTime = 0;

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'id') {
        playerId = data.id;
    } else if (data.type === 'position') {
        otherPlanes[data.id] = { x: data.x, y: data.y };
    }
};

let plane = {
    x: canvas.width / 4,
    y: canvas.height / 2,
    width: 20,
    height: 10,
    velocityX: 0,
    velocityY: 0,
    speed: 5,
    color: 'white'
};
let pursuers = [];
let joystick = {
    active: false,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0
};

function spawnPursuer() {
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];
    pursuers.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - 50) + 25,
        width: 20,
        height: 10,
        speed: 2 + Math.random() * 1, // Slightly variable speed
        color: colors[pursuers.length % colors.length]
    });
}

function drawPlane(planeData) {
    ctx.beginPath();
    ctx.moveTo(planeData.x + planeData.width, planeData.y);
    ctx.lineTo(planeData.x, planeData.y - planeData.height / 2);
    ctx.lineTo(planeData.x, planeData.y + planeData.height / 2);
    ctx.closePath();
    ctx.fillStyle = planeData.color;
    ctx.fill();
}

function drawJoystick() {
    if (joystick.active) {
        ctx.beginPath();
        ctx.arc(joystick.startX, joystick.startY, 50, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(joystick.x, joystick.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
    }
}

function update() {
    if (gameOver) return;

    survivalTime += 1 / 60; // Assuming 60 FPS
    timerDisplay.textContent = `Time: ${Math.floor(survivalTime)}`;

    // Player movement
    plane.x += plane.velocityX;
    plane.y += plane.velocityY;
    if (plane.x < 0) plane.x = 0;
    if (plane.x > canvas.width - plane.width) plane.x = canvas.width - plane.width;
    if (plane.y < 0) plane.y = 0;
    if (plane.y > canvas.height - plane.height) plane.y = canvas.height - plane.height;

    // Pursuer movement
    pursuers.forEach(p => {
        const dx = plane.x - p.x;
        const dy = plane.y - p.y;
        const angle = Math.atan2(dy, dx);
        p.x += Math.cos(angle) * p.speed;
        p.y += Math.sin(angle) * p.speed;

        // Collision check
        if (
            plane.x + plane.width > p.x &&
            plane.x < p.x + p.width &&
            plane.y + plane.height > p.y &&
            plane.y - plane.height / 2 < p.y + p.height
        ) {
            gameOver = true;
            alert(`Game Over! Survived for ${Math.floor(survivalTime)} seconds.`);
        }
    });

    // Spawn new pursuer every 30 seconds
    if (survivalTime - lastSpawnTime >= 30) {
        spawnPursuer();
        lastSpawnTime = survivalTime;
    }

    if (ws.readyState === WebSocket.OPEN && playerId) {
        ws.send(JSON.stringify({ type: 'position', id: playerId, x: plane.x, y: plane.y }));
    }

    if (joystick.active) {
        const angle = Math.atan2(joystick.dy, joystick.dx);
        const magnitude = Math.min(Math.sqrt(joystick.dx * joystick.dx + joystick.dy * joystick.dy), 50);
        plane.velocityX = Math.cos(angle) * (magnitude / 10) * plane.speed;
        plane.velocityY = Math.sin(angle) * (magnitude / 10) * plane.speed;
    } else {
        plane.velocityX *= 0.9; // Friction
        plane.velocityY *= 0.9;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlane(plane);
    pursuers.forEach(p => drawPlane(p));
    for (let id in otherPlanes) if (id !== playerId) drawPlane({ x: otherPlanes[id].x, y: otherPlanes[id].y });
    drawJoystick();
}

function gameLoop() {
    update();
    draw();
    if (!gameOver) requestAnimationFrame(gameLoop);
}

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    joystick.active = true;
    joystick.startX = touch.clientX;
    joystick.startY = touch.clientY;
    joystick.x = joystick.startX;
    joystick.y = joystick.startY;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    joystick.x = touch.clientX;
    joystick.y = touch.clientY;
    joystick.dx = joystick.x - joystick.startX;
    joystick.dy = joystick.y - joystick.startY;
    const touchDistance = Math.sqrt(joystick.dx * joystick.dx + joystick.dy * joystick.dy);
    if (touchDistance > 50) {
        const angle = Math.atan2(joystick.dy, joystick.dx);
        joystick.x = joystick.startX + Math.cos(angle) * 50;
        joystick.y = joystick.startY + Math.sin(angle) * 50;
        joystick.dx = joystick.x - joystick.startX;
        joystick.dy = joystick.y - joystick.startY;
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    joystick.active = false;
    plane.velocityX = 0;
    plane.velocityY = 0;
});

spawnPursuer(); // Start with one pursuer
gameLoop();