import { logger } from './logger.js';

export class AppError extends Error {
  constructor(status, code, message, champs) {
    super(message);
    this.status = status;
    this.code = code;
    this.champs = champs;
  }
}

export const badRequest = (code, message, champs) => new AppError(400, code, message, champs);
export const unauthorized = (message = 'Veuillez vous connecter.') => new AppError(401, 'NON_AUTHENTIFIE', message);
export const forbidden = (code = 'INTERDIT', message = "Vous n'avez pas accès à cette ressource.") => new AppError(403, code, message);
export const notFound = (message = 'Ressource introuvable.') => new AppError(404, 'INTROUVABLE', message);
export const conflict = (code, message) => new AppError(409, code, message);

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'ROUTE_INCONNUE', message: 'Route inconnue.' } });
}

// Express 5 forwards rejected promises from async handlers here, so routes can just throw.
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.champs && { champs: err.champs }) } });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: { code: 'DOUBLON', message: 'Cet élément existe déjà.' } });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ error: { code: 'ID_INVALIDE', message: 'Identifiant invalide.' } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'JSON_INVALIDE', message: 'Corps de requête JSON invalide.' } });
  }
  (req.log || logger).error({ err }, 'unhandled_error');
  res.status(500).json({ error: { code: 'ERREUR_SERVEUR', message: 'Une erreur inattendue est survenue. Réessayez dans un instant.' } });
}
