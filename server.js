const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname)));
const server = app.listen(port, () => console.log(`Server running on port ${port}`));

const wss = new WebSocket.Server({ server });
let scores = [];

wss.on('connection', (ws) => {
    console.log('Player connected');
    ws.send(JSON.stringify({ type: 'leaderboard', scores }));
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'score') {
            scores.push({ name: data.name, score: data.score });
            scores.sort((a, b) => b.score - a.score);
            scores = scores.slice(0, 5); // Top 5
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'leaderboard', scores }));
                }
            });
        }
    });
    ws.on('close', () => console.log('Player disconnected'));
});