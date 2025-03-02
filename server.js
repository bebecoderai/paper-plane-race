const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname)));
const server = app.listen(port, () => console.log(`Server running on port ${port}`));

const wss = new WebSocket.Server({ server });
let players = {};

wss.on('connection', (ws) => {
    console.log('Player connected');
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'position') {
            players[data.id] = { x: data.x, y: data.y };
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'position', id: data.id, x: data.x, y: data.y }));
                }
            });
        }
    });
    ws.on('close', () => {
        delete players[ws.id];
        console.log('Player disconnected');
    });
    ws.id = Date.now(); // Unique ID for each connection
    ws.send(JSON.stringify({ type: 'id', id: ws.id }));
});