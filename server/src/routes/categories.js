import { Router } from 'express';
import { Category } from '../models/Category.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (req, res) => {
  res.json({ categories: await Category.find().sort({ nom: 1 }).lean() });
});
