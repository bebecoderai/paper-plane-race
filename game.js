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
    width: canvas.width / 10,
    height: canvas.height / 20,
    velocityX: 0,
    velocityY: 0,
    maxSpeed: 4, // Reduced from 5
    gravity: 0.1,
    lift: -0.2, // For gliding effect
    color: 'white',
    depth: 10
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
        y: Math.random() * (canvas.height - canvas.height / 20) + canvas.height / 40,
        width: canvas.width / 20,
        height: canvas.height / 40,
        velocityX: -1.5 - Math.random() * 0.5, // Slower chase
        velocityY: 0,
        maxSpeed: 2,
        color: colors[pursuers.length % colors.length],
        depth: 5
    });
}

function drawPlane(planeData) {
    ctx.save();
    ctx.translate(planeData.x, planeData.y);
    // Tilt based on velocity for realism
    const tilt = Math.atan2(planeData.velocityY, planeData.velocityX) * 0.2;
    ctx.rotate(tilt);

    // Main body
    ctx.beginPath();
    ctx.moveTo(planeData.width / 2, 0);
    ctx.lineTo(-planeData.width / 2, -planeData.height / 2);
    ctx.lineTo(-planeData.width / 2, planeData.height / 2);
    ctx.closePath();
    ctx.fillStyle = planeData.color;
    ctx.fill();

    // 3D wing effect
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-planeData.width / 4, -planeData.height / 2 - planeData.depth);
    ctx.lineTo(-planeData.width / 2, -planeData.height / 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-planeData.width / 4, planeData.height / 2 + planeData.depth);
    ctx.lineTo(-planeData.width / 2, planeData.height / 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
    ctx.fill();

    ctx.restore();
}

function drawJoystick() {
    if (joystick.active) {
        ctx.beginPath();
        ctx.arc(joystick.startX, joystick.startY, 50, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(joystick.x, joystick.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }
}

function update() {
    if (gameOver) return;

    survivalTime += 1 / 60;
    timerDisplay.textContent = `Time: ${Math.floor(survivalTime)}`;

    // Player motion (natural glide)
    plane.velocityY += plane.gravity; // Gravity pulls down
    if (!joystick.active) plane.velocityY += plane.lift * 0.5; // Gentle lift when not controlled
    plane.x += plane.velocityX;
    plane.y += plane.velocityY;

    // Boundaries
    plane.x = Math.max(0, Math.min(canvas.width - plane.width, plane.x));
    plane.y = Math.max(0, Math.min(canvas.height - plane.height, plane.y));

    // Pursuer motion
    pursuers.forEach(p => {
        const dx = plane.x - p.x;
        const dy = plane.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const chaseAngle = Math.atan2(dy, dx);
        p.velocityX += Math.cos(chaseAngle) * 0.05; // Gradual acceleration
        p.velocityY += Math.sin(chaseAngle) * 0.05 + plane.gravity * 0.5; // Pursuers glide too
        p.velocityX = Math.max(-p.maxSpeed, Math.min(p.maxSpeed, p.velocityX));
        p.velocityY = Math.max(-p.maxSpeed, Math.min(p.maxSpeed, p.velocityY));
        p.x += p.velocityX;
        p.y += p.velocityY;

        // Collision check
        if (
            plane.x + plane.width / 2 > p.x - p.width / 2 &&
            plane.x - plane.width / 2 < p.x + p.width / 2 &&
            plane.y + plane.height / 2 > p.y - p.height / 2 &&
            plane.y - plane.height / 2 < p.y + p.height / 2
        ) {
            gameOver = true;
            alert(`Game Over! Survived for ${Math.floor(survivalTime)} seconds.`);
        }
    });

    // Spawn pursuer every 10 seconds
    if (survivalTime - lastSpawnTime >= 10) {
        spawnPursuer();
        lastSpawnTime = survivalTime;
    }

    if (ws.readyState === WebSocket.OPEN && playerId) {
        ws.send(JSON.stringify({ type: 'position', id: playerId, x: plane.x, y: plane.y }));
    }

    if (joystick.active) {
        const angle = Math.atan2(joystick.dy, joystick.dx);
        const magnitude = Math.min(Math.sqrt(joystick.dx * joystick.dx + joystick.dy * joystick.dy), 50);
        plane.velocityX = Math.cos(angle) * (magnitude / 10) * plane.maxSpeed;
        plane.velocityY = Math.sin(angle) * (magnitude / 10) * plane.maxSpeed;
    } else {
        plane.velocityX *= 0.98; // Slower friction
        plane.velocityY *= 0.98;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlane(plane);
    pursuers.forEach(p => drawPlane(p));
    for (let id in otherPlanes) if (id !== playerId) drawPlane({ x: otherPlanes[id].x, y: otherPlanes[id].y, width: plane.width, height: plane.height, velocityX: 0, velocityY: 0, color: 'gray', depth: plane.depth });
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
});

spawnPursuer();
gameLoop();