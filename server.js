const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname)));
const server = app.listen(port, () => console.log(`Server running on port ${port}`));

const wss = new WebSocket.Server({ server });
let players = {};
let finishOrder = [];

wss.on('connection', (ws) => {
    console.log('Player connected');
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'position') {
            players[data.playerName] = { x: data.x, y: data.y };
        } else if (data.type === 'finish') {
            if (!finishOrder.includes(data.playerName)) {
                finishOrder.push(data.playerName);
                broadcastLeaderboard();
            }
        }
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'position', playerName: data.playerName, x: data.x, y: data.y }));
            }
        });
    });
    ws.on('close', () => console.log('Player disconnected'));
});

function broadcastLeaderboard() {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'leaderboard', finishOrder }));
        }
    });
}