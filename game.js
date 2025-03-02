const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timerDisplay = document.getElementById('timer');

const ws = new WebSocket(`wss://${window.location.host}`);
let otherPlanes = {};
let finishOrder = [];
let gameOver = false;

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'position') {
        otherPlanes[data.playerName] = { x: data.x, y: data.y };
    } else if (data.type === 'leaderboard') {
        finishOrder = data.finishOrder;
        if (finishOrder.length > 0 && !gameOver) gameOver = true;
    }
};

let plane = {
    x: 50,
    y: 200,
    width: 20,
    height: 10,
    boostSpeed: 0,
    velocity: 0,
    gravity: 0.1,
    color: '#' + Math.floor(Math.random() * 16777215).toString(16)
};
let obstacles = [];
let scrollSpeed = 1.5;
let distance = 0;
const finishLine = 2000;

let joystick = {
    active: false,
    x: 100,
    y: 300,
    startX: 100,
    startY: 300,
    dx: 0,
    dy: 0
};

let particles = [];
let rainDrops = [];

function spawnObstacle() {
    // Staggered spawning for continuous challenge
    const spacing = 150; // Distance between cloud sets
    obstacles.push({ x: canvas.width, y: 20, width: 40, height: 30, hit: false, raining: false }); // Top
    obstacles.push({ x: canvas.width + spacing * 0.5, y: Math.random() * (canvas.height - 100 - 50) + 50, width: 40, height: 30, hit: false, raining: false }); // Middle staggered
    obstacles.push({ x: canvas.width + spacing, y: canvas.height - 50, width: 40, height: 30, hit: false, raining: false }); // Bottom staggered
}

function drawPlane(planeData, isGhost = false) {
    ctx.beginPath();
    ctx.moveTo(planeData.x + planeData.width, planeData.y);
    ctx.lineTo(planeData.x, planeData.y - planeData.height / 2);
    ctx.lineTo(planeData.x, planeData.y + planeData.height / 2);
    ctx.closePath();
    ctx.fillStyle = isGhost ? 'rgba(255, 255, 255, 0.3)' : planeData.color;
    ctx.fill();
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.hit ? 'gray' : 'white';
        ctx.beginPath();
        ctx.arc(obstacle.x + 10, obstacle.y + 15, 15, 0, Math.PI * 2);
        ctx.arc(obstacle.x + 30, obstacle.y + 15, 20, 0, Math.PI * 2);
        ctx.fill();
        if (obstacle.raining) {
            for (let i = 0; i < 5; i++) {
                rainDrops.push({
                    x: obstacle.x + Math.random() * 40,
                    y: obstacle.y + 30,
                    vy: 2 + Math.random() * 2,
                    life: 20
                });
            }
            obstacle.raining = false;
        }
    });
}

function drawFinishLine() {
    if (distance > finishLine - canvas.width) {
        ctx.fillStyle = 'red';
        ctx.fillRect(finishLine - distance, 0, 10, canvas.height);
    }
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

function spawnParticles(x, y) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`
        });
    }
}

function drawParticles() {
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
        else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
    });
}

function drawRainDrops() {
    rainDrops.forEach((drop, i) => {
        drop.y += drop.vy;
        drop.life--;
        if (drop.life <= 0) rainDrops.splice(i, 1);
        else {
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x, drop.y + 5);
            ctx.strokeStyle = 'blue';
            ctx.stroke();
        }
    });
}

function drawLeaderboard() {
    if (gameOver && finishOrder.length > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(200, 100, 400, 200);
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText('Leaderboard', 350, 140);
        finishOrder.forEach((name, i) => {
            ctx.fillText(`${i + 1}. ${name}`, 350, 180 + i * 30);
        });
    }
}

function update() {
    if (gameOver) return;
    plane.velocity += plane.gravity;
    plane.y += plane.velocity;
    if (plane.y < 0) plane.y = 0;
    if (plane.y > canvas.height - plane.height) plane.y = canvas.height - plane.height;
    if (plane.boostSpeed > 0) plane.boostSpeed -= 0.1;
    if (plane.boostSpeed < 0) plane.boostSpeed = 0;
    distance += scrollSpeed + plane.boostSpeed;
    obstacles.forEach(obstacle => obstacle.x -= (scrollSpeed + plane.boostSpeed));
    obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);

    obstacles.forEach(obstacle => {
        if (
            plane.x + plane.width > obstacle.x &&
            plane.x < obstacle.x + obstacle.width &&
            plane.y + plane.height > obstacle.y &&
            plane.y - plane.height / 2 < obstacle.y + obstacle.height
        ) {
            if (!obstacle.hit) {
                obstacle.hit = true;
                obstacle.raining = true;
                plane.x = 50;
                plane.y = 200;
                plane.velocity = 0;
                plane.boostSpeed = 0;
            }
        }
    });

    if (distance >= finishLine && !finishOrder.includes(playerName)) {
        spawnParticles(plane.x, plane.y);
        ws.send(JSON.stringify({ type: 'finish', playerName }));
    }

    if (distance % 20 === 0) spawnObstacle(); // More frequent spawning
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'position', playerName, x: plane.x, y: plane.y }));
    }

    if (joystick.active) {
        const angle = Math.atan2(joystick.dy, joystick.dx);
        const magnitude = Math.min(Math.sqrt(joystick.dx * joystick.dx + joystick.dy * joystick.dy), 50);
        plane.velocity = -Math.sin(angle) * (magnitude / 10);
        plane.boostSpeed = Math.cos(angle) * (magnitude / 25);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlane(plane);
    for (let name in otherPlanes) drawPlane({ x: otherPlanes[name].x, y: otherPlanes[name].y }, true);
    drawObstacles();
    drawFinishLine();
    drawJoystick();
    drawParticles();
    drawRainDrops();
    drawLeaderboard();
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Distance: ${Math.floor(distance)}`, 10, 30);
    timerDisplay.textContent = `Distance: ${Math.floor(distance)}`;
}

function gameLoop() {
    update();
    draw();
    if (!gameOver || finishOrder.length < Object.keys(otherPlanes).length + 1) requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') plane.velocity = -3;
    if (e.key === 'ArrowDown' || e.key === 's') plane.velocity = 3;
    if (e.key === 'ArrowRight' || e.key === 'd') plane.boostSpeed = 2;
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystick.active = true;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    joystick.x = touch.clientX - canvas.offsetLeft;
    joystick.y = touch.clientY - canvas.offsetTop;
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
    plane.velocity = 0;
    plane.boostSpeed = 0;
});

spawnObstacle();
gameLoop();