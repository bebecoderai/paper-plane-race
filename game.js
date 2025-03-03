console.log('Game script loaded');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiDisplay = document.getElementById('ui');

if (!canvas || !ctx || !uiDisplay) {
    console.error('Canvas or UI elements not found');
    document.body.innerHTML = 'Error: Game failed to load. Check console.';
    throw new Error('Initialization failed');
}

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let plane = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: canvas.width / 10,
    height: canvas.height / 20,
    color: 'white'
};

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

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlane(plane);
    console.log('Drawing frame');
}

function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', (e) => {
    console.log('Canvas clicked at', e.clientX, e.clientY);
    plane.x = e.clientX - plane.width / 2;
});

console.log('Starting game loop');
gameLoop();