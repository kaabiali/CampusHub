import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { uploadsRoot } from './lib/upload.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { booksRouter } from './routes/books.js';
import { categoriesRouter } from './routes/categories.js';
import { reportsRouter } from './routes/reports.js';
import { reservationsRouter, ridesRouter } from './routes/rides.js';
import { groupsRouter } from './routes/groups.js';
import { clubsRouter } from './routes/clubs.js';
import { eventsRouter } from './routes/events.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 'loopback');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/health' || req.url.startsWith('/uploads/') },
      serializers: { req: (req) => ({ method: req.method, url: req.url }), res: (res) => ({ statusCode: res.statusCode }) },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  // Group PDFs are members-only and served by GET /api/groupes/:id/documents/:did instead.
  app.use('/uploads/documents', notFoundHandler);
  app.use('/uploads', express.static(uploadsRoot, { maxAge: '7d', fallthrough: false }));

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/utilisateurs', usersRouter);
  app.use('/api/annonces', booksRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/signalements', reportsRouter);
  app.use('/api/trajets', ridesRouter);
  app.use('/api/reservations', reservationsRouter);
  app.use('/api/groupes', groupsRouter);
  app.use('/api/clubs', clubsRouter);
  app.use('/api/evenements', eventsRouter);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}
