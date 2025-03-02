const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// Serve static files (index.html, game.js)
app.use(express.static(path.join(__dirname)));

// Start HTTP server
const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// WebSocket server
const wss = new WebSocket.Server({ server });
let players = {};

wss.on('connection', (ws) => {
    console.log('Player connected');
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        players[data.playerId] = data;
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    });
    ws.on('close', () => console.log('Player disconnected'));
});