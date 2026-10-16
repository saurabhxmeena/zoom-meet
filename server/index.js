/**
 * Zoom Meeting Application - Express & Socket.IO Signaling Server
 * Maharaja Agrasen Institute of Technology - Department of Information Technology
 * B.Tech. Seventh Semester - Minor Project
 * 
 * Provides HTTP REST endpoints and Socket.IO signaling rooms for WebRTC mesh communication.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zoom_meet_academic';

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// MongoDB connection
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB at', MONGODB_URI))
  .catch((err) => console.warn('⚠️ MongoDB connection warning (falling back to memory):', err.message));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'MAIT Zoom Meeting Signaling Server',
    stack: 'MERN + Socket.IO + WebRTC',
  });
});

// Socket.IO real-time signaling for WebRTC peer connections
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Map room code -> Set of socket IDs
const rooms = new Map();
const socketUserMap = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Participant joins meeting room
  socket.on('join-room', ({ roomId, userId, displayName, isAudioMuted, isVideoOff }) => {
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);
    socketUserMap.set(socket.id, { roomId, userId, displayName });

    console.log(`[Room ${roomId}] User ${displayName} (${userId}) joined`);

    // Notify other peers in this room
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userId,
      displayName,
      isAudioMuted,
      isVideoOff,
    });

    // Provide the existing participants in the room to the new user
    const otherParticipants = Array.from(rooms.get(roomId))
      .filter((id) => id !== socket.id)
      .map((id) => ({
        socketId: id,
        ...socketUserMap.get(id),
      }));

    socket.emit('existing-participants', otherParticipants);
  });

  // WebRTC Signaling: Offer
  socket.on('signal-offer', ({ targetSocketId, offer, callerDisplayName }) => {
    io.to(targetSocketId).emit('signal-offer', {
      callerSocketId: socket.id,
      offer,
      callerDisplayName,
    });
  });

  // WebRTC Signaling: Answer
  socket.on('signal-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('signal-answer', {
      responderSocketId: socket.id,
      answer,
    });
  });

  // WebRTC Signaling: ICE Candidate
  socket.on('signal-ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('signal-ice-candidate', {
      senderSocketId: socket.id,
      candidate,
    });
  });

  // In-Meeting Text Chat
  socket.on('send-message', ({ roomId, message }) => {
    io.to(roomId).emit('receive-message', message);
  });

  // User Media State (Mute/Unmute/Video On/Off/Screen Share)
  socket.on('media-state-changed', ({ roomId, isAudioMuted, isVideoOff, isScreenSharing }) => {
    socket.to(roomId).emit('peer-media-state-changed', {
      socketId: socket.id,
      isAudioMuted,
      isVideoOff,
      isScreenSharing,
    });
  });

  // Floating Reactions (Confetti, Hand Raise, Emojis)
  socket.on('send-reaction', ({ roomId, reaction }) => {
    io.to(roomId).emit('receive-reaction', reaction);
  });

  // Host Controls: Mute a participant or end meeting
  socket.on('host-end-meeting', ({ roomId }) => {
    io.to(roomId).emit('meeting-ended-by-host');
  });

  socket.on('disconnect', () => {
    const userMeta = socketUserMap.get(socket.id);
    if (userMeta) {
      const { roomId, userId, displayName } = userMeta;
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(socket.id);
        if (rooms.get(roomId).size === 0) {
          rooms.delete(roomId);
        }
      }
      socketUserMap.delete(socket.id);
      console.log(`[Room ${roomId}] User ${displayName} (${userId}) disconnected`);
      socket.to(roomId).emit('user-left', { socketId: socket.id, userId });
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 MAIT Zoom Meeting Express Server running on port ${PORT}`);
  console.log(`📚 Academic Session 2026-2027 | 7th Sem Minor Project`);
  console.log(`🔗 WebRTC Mesh Signaling Ready`);
  console.log(`====================================================`);
});
