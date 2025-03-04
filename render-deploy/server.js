// Load environment variables from .env file
require('dotenv').config();

const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';
const maxPlayers = parseInt(process.env.MAX_PLAYERS || 50);
const inactiveTimeout = parseInt(process.env.INACTIVE_TIMEOUT || 60000); // 1 minute default

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const server = app.listen(port, () => {
  console.log(`Server running on port ${port} in ${nodeEnv} mode`);
  console.log(`Max players: ${maxPlayers}, Inactive timeout: ${inactiveTimeout}ms`);
  console.log(`Open http://localhost:${port} in your browser to play`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected players
const players = new Map();

// Log active connections periodically
setInterval(() => {
  console.log(`Active players: ${players.size}`);
  console.log(`Player IDs: ${Array.from(players.keys()).join(', ')}`);
}, 30000);

wss.on('connection', (ws, req) => {
  // Check if max players limit is reached
  if (players.size >= maxPlayers) {
    console.log(`Connection rejected: Max players (${maxPlayers}) reached`);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Server is full. Please try again later.'
    }));
    ws.close();
    return;
  }

  // Generate unique ID for player with timestamp to ensure uniqueness
  const playerId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Get client IP for logging
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`Player ${playerId} connected from ${ip}`);
  
  // Store player connection
  players.set(playerId, {
    ws,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    isInPlane: false,
    lastActivity: Date.now()
  });

  // Log current player count
  console.log(`Total players connected: ${players.size}`);

  // Send player their ID and info about other players
  try {
    const otherPlayers = Array.from(players.entries())
      .filter(([id]) => id !== playerId)
      .map(([id, player]) => ({
        id,
        position: player.position,
        rotation: player.rotation,
        isInPlane: player.isInPlane
      }));
      
    ws.send(JSON.stringify({
      type: 'init',
      id: playerId,
      players: otherPlayers
    }));
    
    // Broadcast new player to others
    broadcast({
      type: 'playerJoined',
      id: playerId
    }, playerId);
  } catch (error) {
    console.error('Error during player initialization:', error);
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Update last activity timestamp
      const player = players.get(playerId);
      if (player) {
        player.lastActivity = Date.now();
      }
      
      switch(data.type) {
        case 'update':
          // Update player state
          if (player) {
            player.position = data.position;
            player.rotation = data.rotation;
            player.isInPlane = data.isInPlane;
            
            // Broadcast update to other players
            broadcast({
              type: 'playerUpdate',
              id: playerId,
              position: data.position,
              rotation: data.rotation,
              isInPlane: data.isInPlane
            }, playerId);
          }
          break;
          
        case 'waterBalloon':
          // Broadcast water balloon event
          broadcast({
            type: 'waterBalloon',
            id: playerId,
            position: data.position,
            velocity: data.velocity
          }, playerId);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for player ${playerId}:`, error);
  });

  ws.on('close', () => {
    // Remove player and notify others
    console.log(`Player ${playerId} disconnected`);
    players.delete(playerId);
    console.log(`Total players remaining: ${players.size}`);
    
    broadcast({
      type: 'playerLeft',
      id: playerId
    });
  });
});

// Clean up inactive connections based on INACTIVE_TIMEOUT
const cleanupInterval = Math.min(5 * 60 * 1000, inactiveTimeout * 2); // Run at least every 5 minutes
setInterval(() => {
  const now = Date.now();
  let inactiveCount = 0;
  
  players.forEach((player, id) => {
    // If player has been inactive for more than the configured timeout
    if (now - player.lastActivity > inactiveTimeout) {
      console.log(`Removing inactive player ${id}`);
      
      // Close the connection
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.close();
      }
      
      // Remove from players map
      players.delete(id);
      inactiveCount++;
      
      // Notify other players
      broadcast({
        type: 'playerLeft',
        id: id
      });
    }
  });
  
  if (inactiveCount > 0) {
    console.log(`Cleaned up ${inactiveCount} inactive connections. Total players: ${players.size}`);
  }
}, cleanupInterval);

function broadcast(message, excludeId = null) {
  let sentCount = 0;
  
  players.forEach((player, id) => {
    if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
      try {
        player.ws.send(JSON.stringify(message));
        sentCount++;
      } catch (error) {
        console.error(`Error broadcasting to player ${id}:`, error);
      }
    }
  });
  
  // For debugging large broadcasts
  if (sentCount > 10) {
    console.log(`Broadcast message of type ${message.type} sent to ${sentCount} players`);
  }
} 