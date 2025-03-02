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
    width: canvas.width / 5, // 1/5 of screen width
    height: canvas.height / 10, // Proportional height
    angle: 0, // For circular motion
    radius: 50, // Radius of circular path
    speed: 0.05, // Angular speed
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
        y: Math.random() * (canvas.height - canvas.height / 10) + canvas.height / 20,
        width: canvas.width / 10, // Half player size
        height: canvas.height / 20,
        angle: 0,
        radius: 40 + Math.random() * 20, // Variable radius
        speed: 0.03 + Math.random() * 0.02, // Variable speed
        color: colors[pursuers.length % colors.length]
    });
}

function drawPlane(planeData) {
    ctx.save();
    ctx.translate(planeData.x, planeData.y);
    ctx.rotate(planeData.angle);
    ctx.beginPath();
    ctx.moveTo(planeData.width / 2, 0);
    ctx.lineTo(-planeData.width / 2, -planeData.height / 2);
    ctx.lineTo(-planeData.width / 2, planeData.height / 2);
    ctx.closePath();
    ctx.fillStyle = planeData.color;
    ctx.fill();
    ctx.restore();
}

function drawJoystick() {
    if (joystick.active) {
        ctx.beginPath();
        ctx.arc(joystick.startX, joystick.startY, 50, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // White on black
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

    // Player circular motion
    plane.angle += plane.speed;
    if (joystick.active) {
        const angle = Math.atan2(joystick.dy, joystick.dx);
        const magnitude = Math.min(Math.sqrt(joystick.dx * joystick.dx + joystick.dy * joystick.dy), 50);
        const moveX = Math.cos(angle) * (magnitude / 10) * 5;
        const moveY = Math.sin(angle) * (magnitude / 10) * 5;
        plane.x += moveX;
        plane.y += moveY;
        plane.x = Math.max(plane.width / 2, Math.min(canvas.width - plane.width / 2, plane.x));
        plane.y = Math.max(plane.height / 2, Math.min(canvas.height - plane.height / 2, plane.y));
    }
    const centerX = plane.x - Math.cos(plane.angle) * plane.radius;
    const centerY = plane.y - Math.sin(plane.angle) * plane.radius;

    // Pursuer motion
    pursuers.forEach(p => {
        p.angle += p.speed;
        const dx = plane.x - p.x;
        const dy = plane.y - p.y;
        const chaseAngle = Math.atan2(dy, dx);
        p.x += Math.cos(chaseAngle) * 2 + Math.cos(p.angle) * p.radius * 0.05; // Chase + circle
        p.y += Math.sin(chaseAngle) * 2 + Math.sin(p.angle) * p.radius * 0.05;
        
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

    // Spawn pursuer every 30 seconds
    if (survivalTime - lastSpawnTime >= 30) {
        spawnPursuer();
        lastSpawnTime = survivalTime;
    }

    if (ws.readyState === WebSocket.OPEN && playerId) {
        ws.send(JSON.stringify({ type: 'position', id: playerId, x: centerX, y: centerY }));
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = plane.x - Math.cos(plane.angle) * plane.radius;
    const centerY = plane.y - Math.sin(plane.angle) * plane.radius;
    drawPlane({ x: centerX, y: centerY, width: plane.width, height: plane.height, angle: plane.angle, color: plane.color });
    pursuers.forEach(p => drawPlane(p));
    for (let id in otherPlanes) if (id !== playerId) drawPlane({ x: otherPlanes[id].x, y: otherPlanes[id].y, width: plane.width, height: plane.height, angle: 0, color: 'gray' });
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