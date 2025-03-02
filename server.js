const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

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

console.log('Server running on ws://localhost:8080');