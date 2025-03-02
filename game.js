const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timerDisplay = document.getElementById('timer');

const ws = new WebSocket(`wss://${window.location.host}`);
let otherPlane = { x: 50, y: 200, color: playerId === '1' ? 'yellow' : 'white' };

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.playerId !== playerId) otherPlane = { x: data.x, y: data.y };
};

let plane = {
    x: 50,
    y: 200,
    width: 30,
    height: 15,
    boostSpeed: 0,
    velocity: 0,
    gravity: 0.1,
    color: playerId === '1' ? 'white' : 'yellow',
    lives: 3 // Start with 3 lives
};
let obstacles = [];
let scrollSpeed = 2;
let gameOver = false;
let distance = 0;
const finishLine = 2000;

function spawnObstacle() {
    const y = Math.random() * (canvas.height - 50);
    obstacles.push({ x: canvas.width, y: y, width: 40, height: 30, hit: false });
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
    });
}

function drawFinishLine() {
    if (distance > finishLine - canvas.width) {
        ctx.fillStyle = 'red';
        ctx.fillRect(finishLine - distance, 0, 10, canvas.height);
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

    // Collision detection and lives
    obstacles.forEach(obstacle => {
        if (
            plane.x + plane.width > obstacle.x &&
            plane.x < obstacle.x + obstacle.width &&
            plane.y + plane.height > obstacle.y &&
            plane.y - plane.height / 2 < obstacle.y + obstacle.height
        ) {
            if (!obstacle.hit) {
                obstacle.hit = true;
                plane.lives -= 1; // Lose a life
                console.log(`Lives left: ${plane.lives}`);
                if (plane.lives <= 0) {
                    gameOver = true;
                    alert('Game Over! No lives left.');
                }
            }
        }
    });

    // Check finish line
    if (distance >= finishLine) {
        gameOver = true;
        alert('You Win! Reached the finish line!');
    }

    if (distance % 60 === 0) spawnObstacle();
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ playerId, x: plane.x, y: plane.y }));
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlane(plane);
    drawPlane(otherPlane, true);
    drawObstacles();
    drawFinishLine();
    // Display lives
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Lives: ${plane.lives}`, 10, 30);
}

function gameLoop() {
    update();
    draw();
    if (!gameOver) requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    console.log(`Key pressed: ${e.key}`);
    if (playerId === '1') {
        if (e.key === 'ArrowUp') plane.velocity = -3;
        if (e.key === 'ArrowDown') plane.velocity = 3;
        if (e.key === 'ArrowRight') plane.boostSpeed = 2;
    } else if (playerId === '2') {
        if (e.key === 'w') plane.velocity = -3;
        if (e.key === 's') plane.velocity = 3;
        if (e.key === 'd') plane.boostSpeed = 2;
    }
});

spawnObstacle();
gameLoop();