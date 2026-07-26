import type { Server } from 'socket.io';

// El servidor Socket.IO se inyecta una vez inicializado (evita import circular).
let io: Server | null = null;

export function setIo(server: Server): void {
  io = server;
}

export function emitTo(room: string, event: string, data: unknown): void {
  io?.to(room).emit(event, data);
}

// Salas estándar
export const room = {
  user: (id: number) => `user:${id}`,
  trip: (id: number) => `trip:${id}`,
  driversOnline: 'drivers:online',
  admins: 'admins',
};
