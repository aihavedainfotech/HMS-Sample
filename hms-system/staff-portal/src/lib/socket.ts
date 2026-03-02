import { io } from 'socket.io-client';

// WebSocket disabled - Render free tier doesn't support WebSocket well
// Using HTTP polling instead for real-time features
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace(/\/api\s*$/, '');

const socket = io(SOCKET_URL, {
  transports: ['polling'], // Disable websocket, use polling only
  autoConnect: false, // Don't connect automatically
  reconnection: false, // Disable reconnection to stop timeout errors
});

// Export a mock socket that won't try to connect
export default socket;
