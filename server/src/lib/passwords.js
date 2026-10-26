import bcrypt from 'bcryptjs';
import { config } from '../config.js';

const COST = config.isTest ? 4 : 12;

export const hashPassword = (plain) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
