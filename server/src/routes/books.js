import { Router } from 'express';
import { body, matchedData, param, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { Book, ETATS } from '../models/Book.js';
import { Category } from '../models/Category.js';
import { publicUserFields } from '../models/User.js';
import { requireAuth } from '../lib/auth.js';
import { validate } from '../lib/validate.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import { bookPhotosUpload, publicUrl, removeUpload } from '../lib/upload.js';
import { suggestPrice } from '../lib/pricing.js';
import { config } from '../config.js';
import { searchFilter } from '../lib/text.js';

export const booksRouter = Router();

const MAX_YEAR = () => new Date().getFullYear() + 1;
const SORTS = { recent: { datePublication: -1 }, prix_asc: { prix: 1, datePublication: -1 }, prix_desc: { prix: -1, datePublication: -1 } };

const populateBook = (q) => q.populate('vendeur', publicUserFields).populate('categorie', 'nom');

const isOwner = (book, user) => String(book.vendeur?._id ?? book.vendeur) === String(user._id);

async function loadOwned(req) {
  const book = await Book.findById(req.params.id);
  if (!book) throw notFound('Annonce introuvable.');
  if (!isOwner(book, req.user) && req.user.role !== 'ADMIN') throw forbidden('PAS_PROPRIETAIRE', 'Seul le vendeur peut modifier cette annonce.');
  return book;
}

async function priceFor(fields) {
  if (!fields.prixNeuf || !fields.anneeEdition || !fields.etat) return null;
  return suggestPrice(fields);
}

const suggestionLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, skip: () => config.isTest });

booksRouter.get(
  '/prix-conseille',
  suggestionLimiter,
  validate(
    query('matiere').optional().trim().isLength({ max: 60 }),
    query('etat').isIn(ETATS).withMessage('État inconnu.'),
    query('anneeEdition').isInt({ min: 1950, max: MAX_YEAR() }).withMessage('Année invalide.').toInt(),
    query('prixNeuf').isFloat({ gt: 0, max: 2000 }).withMessage('Prix neuf invalide.').toFloat(),
  ),
  async (req, res) => {
    res.json(await suggestPrice(matchedData(req, { locations: ['query'] })));
  },
);

booksRouter.get(
  '/',
  requireAuth(),
  validate(
    query('q').optional().trim().isLength({ max: 100 }),
    query('categorie').optional().isMongoId(),
    query('etat').optional().customSanitizer((v) => (Array.isArray(v) ? v : String(v).split(','))).custom((arr) => arr.every((e) => ETATS.includes(e))),
    query('prixMax').optional().isFloat({ min: 0 }).toFloat(),
    query('vendeur').optional().custom((v) => v === 'moi' || mongoose.isValidObjectId(v)),
    query('tri').optional().isIn(Object.keys(SORTS)),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ),
  async (req, res) => {
    // Express 5 re-parses req.query on every access, so sanitized values only exist in matchedData.
    const { q, categorie, etat, prixMax, vendeur, tri, page = 1, limit = 24 } = matchedData(req, { locations: ['query'] });
    const mine = vendeur === 'moi' || vendeur === String(req.user._id);
    const filter = {};
    if (mine) filter.vendeur = req.user._id;
    else {
      filter.statut = 'DISPONIBLE';
      if (vendeur) filter.vendeur = vendeur;
    }
    if (categorie) filter.categorie = categorie;
    if (etat?.length) filter.etat = { $in: etat };
    if (prixMax !== undefined) filter.prix = { $lte: prixMax };
    if (q) Object.assign(filter, searchFilter('recherche', q));

    const sort = SORTS[tri || 'recent'];
    const [annonces, total] = await Promise.all([
      populateBook(Book.find(filter).sort(sort).skip((page - 1) * limit).limit(limit)).lean(),
      Book.countDocuments(filter),
    ]);
    res.json({ annonces, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  },
);

booksRouter.get('/:id', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const book = await populateBook(Book.findById(req.params.id)).lean();
  const owner = book && isOwner(book, req.user);
  if (!book || (book.statut === 'MASQUEE' && !owner && req.user.role !== 'ADMIN')) throw notFound('Annonce introuvable.');
  if (!owner) await Book.updateOne({ _id: book._id }, { $inc: { vues: 1 } });
  res.json({ annonce: book });
});

const bookFields = (optional) => {
  const f = (name) => (optional ? body(name).optional() : body(name));
  return [
    f('titre').trim().isLength({ min: 3, max: 120 }).withMessage('Titre de 3 à 120 caractères.'),
    f('categorie')
      .isMongoId()
      .withMessage('Choisissez une catégorie.')
      .bail()
      .custom(async (id) => {
        if (!(await Category.exists({ _id: id }))) throw new Error('Catégorie inconnue.');
      }),
    f('matiere').trim().isLength({ min: 2, max: 60 }).withMessage('Indiquez la matière.'),
    f('etat').isIn(ETATS).withMessage("Choisissez l'état du livre."),
    f('prix').isFloat({ min: 0, max: 2000 }).withMessage('Prix entre 0 et 2000 DT.').toFloat(),
    body('auteur').optional().trim().isLength({ max: 80 }),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('1000 caractères maximum.'),
    body('anneeEdition').optional({ values: 'falsy' }).isInt({ min: 1950, max: MAX_YEAR() }).withMessage('Année invalide.').toInt(),
    body('prixNeuf').optional({ values: 'falsy' }).isFloat({ gt: 0, max: 2000 }).withMessage('Prix neuf invalide.').toFloat(),
  ];
};

const EDITABLE = ['titre', 'auteur', 'categorie', 'matiere', 'etat', 'anneeEdition', 'prixNeuf', 'prix', 'description'];

booksRouter.post('/', requireAuth(), bookPhotosUpload.array('photos', 5), validate(...bookFields(false)), async (req, res) => {
  const data = Object.fromEntries(EDITABLE.filter((k) => req.body[k] !== undefined && req.body[k] !== '').map((k) => [k, req.body[k]]));
  const book = await Book.create({
    ...data,
    vendeur: req.user._id,
    prixConseille: await priceFor(data),
    photos: (req.files || []).map((file, ordre) => ({ url: publicUrl(file), ordre })),
  });
  res.status(201).json({ annonce: await populateBook(Book.findById(book._id)).lean() });
});

booksRouter.patch(
  '/:id',
  requireAuth(),
  bookPhotosUpload.array('photos', 5),
  validate(param('id').isMongoId(), ...bookFields(true), body('conserver').optional().customSanitizer((v) => (Array.isArray(v) ? v : JSON.parse(v || '[]')))),
  async (req, res) => {
    const book = await loadOwned(req);
    if (book.statut === 'MASQUEE') throw conflict('ANNONCE_MASQUEE', 'Cette annonce a été masquée par la modération.');
    for (const key of EDITABLE) if (req.body[key] !== undefined) book[key] = req.body[key] === '' ? undefined : req.body[key];

    const removed = [];
    if (req.body.conserver || req.files?.length) {
      const keep = req.body.conserver ? book.photos.filter((p) => req.body.conserver.includes(p.url)) : book.photos;
      removed.push(...book.photos.filter((p) => !keep.includes(p)).map((p) => p.url));
      const added = (req.files || []).map((file) => ({ url: publicUrl(file) }));
      if (keep.length + added.length > 5) throw badRequest('VALIDATION', 'Certains champs sont invalides.', { photos: '5 photos maximum.' });
      book.photos = [...keep, ...added].map((p, ordre) => ({ url: p.url, ordre }));
    }
    book.prixConseille = await priceFor(book);
    await book.save();
    await Promise.all(removed.map(removeUpload));
    res.json({ annonce: await populateBook(Book.findById(book._id)).lean() });
  },
);

booksRouter.post('/:id/statut', requireAuth(), validate(param('id').isMongoId(), body('statut').isIn(['DISPONIBLE', 'VENDUE'])), async (req, res) => {
  const book = await loadOwned(req);
  if (book.statut === 'MASQUEE') throw conflict('ANNONCE_MASQUEE', 'Cette annonce a été masquée par la modération.');
  book.statut = req.body.statut;
  await book.save();
  res.json({ annonce: await populateBook(Book.findById(book._id)).lean() });
});

booksRouter.delete('/:id', requireAuth(), validate(param('id').isMongoId()), async (req, res) => {
  const book = await loadOwned(req);
  await book.deleteOne();
  await Promise.all(book.photos.map((p) => removeUpload(p.url)));
  res.status(204).end();
});

// Multer has already written files by the time validation or ownership checks fail.
booksRouter.use(async (err, req, res, next) => {
  await Promise.all((req.files || []).map((f) => removeUpload(publicUrl(f))));
  next(err);
});
