import { io } from 'socket.io-client';

// Connect to backend Socket.IO namespace for appointments (base URL without /api)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SOCKET_URL = API_BASE.replace(/\/api\s*$/, '');

const socket = io(`${SOCKET_URL}/appointments`, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// Connection event handlers
socket.on('connect', () => {
  console.log('Connected to appointments WebSocket server');
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from WebSocket:', reason);
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
});

export default socket;
