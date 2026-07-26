import { io, type Socket } from 'socket.io-client';
import { API_URL, getToken } from './api';

let socket: Socket | null = null;

/** Devuelve (creando si hace falta) el socket autenticado. */
export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = io(API_URL || window.location.origin, {
      path: '/socket.io',
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  } else {
    socket.auth = { token: getToken() };
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
