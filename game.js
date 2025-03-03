const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiDisplay = document.getElementById('ui');
const leaderboardDisplay = document.getElementById('leaderboard');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ws = new WebSocket(`wss://${window.location.host}`);
let playerName = prompt("Enter your name:") || `Player${Math.floor(Math.random() * 1000)}`;
let score = 0;
let gameOver = false;

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'leaderboard') {
        leaderboardDisplay.innerHTML = 'Leaderboard<br>' + data.scores.map(s => `${s.name}: ${s.score}`).join('<br>');
    }
};

let plane = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: canvas.width / 10,
    height: canvas.height / 20,
    color: 'white'
};
let paragliders = [];
let missiles = [];
let stars = [];
let missileType = 'standard'; // 'standard' or 'america'
let spawnRate = 1; // Increases with score

function spawnParaglider() {
    paragliders.push({
        x: Math.random() * (canvas.width - plane.width),
        y: -plane.height,
        width: plane.width,
        height: plane.height,
        velocityY: 1 + score * 0.05, // Increases with score
        color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    });
}

function drawPlane(obj) {
    ctx.beginPath();
    ctx.moveTo(obj.x + obj.width / 2, obj.y);
    ctx.lineTo(obj.x, obj.y - obj.height / 2);
    ctx.lineTo(obj.x, obj.y + obj.height / 2);
    ctx.closePath();
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawMissile(m) {
    ctx.beginPath();
    ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
}

function drawStar(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        const outerX = Math.cos(angle) * s.radius;
        const outerY = Math.sin(angle) * s.radius;
        ctx.lineTo(outerX, outerY);
        const innerAngle = angle + Math.PI / 6;
        const innerX = Math.cos(innerAngle) * s.radius * 0.5;
        const innerY = Math.sin(innerAngle) * s.radius * 0.5;
        ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

function update() {
    if (gameOver) return;

    survivalTime += 1 / 60;
    if (Math.random() < spawnRate * 0.01) spawnParaglider();
    spawnRate = 1 + score / 10; // More gliders with score

    // Paragliders
    paragliders.forEach(p => {
        p.y += p.velocityY;
        if (p.y > canvas.height) paragliders.splice(paragliders.indexOf(p), 1);
    });

    // Missiles
    missiles.forEach(m => {
        m.y -= 5;
        paragliders.forEach(p => {
            if (
                m.x > p.x - p.width / 2 && m.x < p.x + p.width / 2 &&
                m.y > p.y - p.height / 2 && m.y < p.y + p.height / 2
            ) {
                score += missileType === 'america' ? 2 : 1;
                stars.push({ x: p.x, y: p.y, radius: 20, angle: 0, life: 30 });
                paragliders.splice(paragliders.indexOf(p), 1);
                if (missileType === 'standard') missiles.splice(missiles.indexOf(m), 1);
            }
        });
        if (m.y < 0) missiles.splice(missiles.indexOf(m), 1);
    });

    // Stars
    stars.forEach(s => {
        s.angle += 0.1;
        s.life--;
        if (s.life <= 0) stars.splice(stars.indexOf(s), 1);
    });

    // Upgrade to America at 10 points
    if (score >= 10 && missileType === 'standard') missileType = 'america';

    uiDisplay.textContent = `Score: ${score} | Missiles: ${missileType.charAt(0).toUpperCase() + missileType.slice(1)}`;

    // Collision with plane
    paragliders.forEach(p => {
        if (
            plane.x + plane.width / 2 > p.x - p.width / 2 &&
            plane.x - plane.width / 2 < p.x + p.width / 2 &&
            plane.y + plane.height / 2 > p.y - p.height / 2 &&
            plane.y - plane.height / 2 < p.y + p.height / 2
        ) {
            gameOver = true;
            ws.send(JSON.stringify({ type: 'score', name: playerName, score }));
            alert(`Game Over! Score: ${score}`);
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlane(plane);
    paragliders.forEach(drawPlane);
    missiles.forEach(drawMissile);
    stars.forEach(drawStar);
}

function gameLoop() {
    update();
    draw();
    if (!gameOver) requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', (e) => {
    if (!gameOver) {
        const missile = { x: plane.x, y: plane.y - plane.height / 2 };
        missiles.push(missile);
        if (missileType === 'america') {
            missiles.push({ x: plane.x - 20, y: plane.y - plane.height / 2 });
            missiles.push({ x: plane.x + 20, y: plane.y - plane.height / 2 });
        }
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    plane.x = touch.clientX - plane.width / 2;
    plane.y = touch.clientY - plane.height / 2;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    plane.x = touch.clientX - plane.width / 2;
    plane.y = touch.clientY - plane.height / 2;
});

spawnParaglider();
gameLoop();