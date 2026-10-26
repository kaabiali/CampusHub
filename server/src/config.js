const env = process.env;

const isProd = env.NODE_ENV === 'production';

if (isProd && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be set to at least 32 characters in production');
}

export const config = {
  isProd,
  isTest: env.NODE_ENV === 'test',
  port: Number(env.PORT) || 4000,
  mongoUrl: env.MONGO_URL || 'mongodb://localhost:27017/campushub?replicaSet=rs0',
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-not-for-production',
  clientUrl: env.CLIENT_URL || 'http://localhost:5173',
  mlUrl: env.ML_URL || 'http://localhost:5001',
  smtpHost: env.SMTP_HOST || 'localhost',
  smtpPort: Number(env.SMTP_PORT) || 1025,
  mailFrom: env.MAIL_FROM || 'CampusHub <no-reply@campus.tn>',
  emailDomain: (env.EMAIL_DOMAIN || 'campus.tn').toLowerCase(),
  uploadDir: new URL('../uploads/', import.meta.url),
};
