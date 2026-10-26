import { Server } from 'socket.io';
import { userFromToken, COOKIE_NAME } from './auth.js';
import { onNotification } from './notify.js';
import { logger } from './logger.js';

let io = null;

export const userRoom = (id) => `user:${id}`;

// Emitting is a no-op when no socket server is attached (tests, scripts).
export function emitToUser(userId, event, payload) {
  io?.to(userRoom(userId)).emit(event, payload);
}

export function disconnectUser(userId) {
  io?.in(userRoom(userId)).disconnectSockets(true);
}

function readCookie(header = '', name) {
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function attachRealtime(httpServer, { onConnection }) {
  io = new Server(httpServer, { serveClient: false, cors: { origin: false } });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || readCookie(socket.handshake.headers.cookie, COOKIE_NAME);
    const user = await userFromToken(token);
    if (!user || user.estBloque || !user.emailVerifie) return next(new Error('NON_AUTHENTIFIE'));
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.user._id));
    onConnection(socket);
  });

  onNotification((n) => emitToUser(n.utilisateur, 'notification:new', n));
  logger.info('realtime_ready');
  return io;
}
