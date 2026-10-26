import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { AppError } from './errors.js';

const root = fileURLToPath(config.uploadDir);

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' };

function makeUploader(subdir, mimes, maxBytes, maxFiles) {
  const dir = join(root, subdir);
  mkdirSync(dir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: dir,
      filename: (req, file, cb) => cb(null, randomBytes(16).toString('hex') + EXT[file.mimetype]),
    }),
    limits: { fileSize: maxBytes, files: maxFiles },
    // Browsers send filenames as raw UTF-8; multer's latin1 default would mangle accents.
    defParamCharset: 'utf8',
    fileFilter: (req, file, cb) => {
      if (mimes.includes(file.mimetype)) return cb(null, true);
      cb(new AppError(415, 'TYPE_FICHIER', `Type de fichier non accepté (${mimes.map((m) => EXT[m].slice(1).toUpperCase()).join(', ')}).`));
    },
  });
}

const IMAGES = ['image/jpeg', 'image/png', 'image/webp'];

export const avatarUpload = makeUploader('avatars', IMAGES, 5 * 1024 * 1024, 1);
export const bookPhotosUpload = makeUploader('annonces', IMAGES, 5 * 1024 * 1024, 5);
export const pdfUpload = makeUploader('documents', ['application/pdf'], 20 * 1024 * 1024, 1);

export const publicUrl = (file) => `/uploads/${file.destination.split(/[\\/]/).pop()}/${file.filename}`;
export const uploadsRoot = root;

export async function removeUpload(url) {
  if (!url?.startsWith('/uploads/') || url.includes('..')) return;
  await unlink(join(root, url.slice('/uploads/'.length))).catch(() => {});
}
