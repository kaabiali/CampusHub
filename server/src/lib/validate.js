import { validationResult } from 'express-validator';
import { badRequest } from './errors.js';

export function validate(...rules) {
  return [
    ...rules,
    (req, res, next) => {
      const result = validationResult(req);
      if (result.isEmpty()) return next();
      const champs = {};
      for (const e of result.array({ onlyFirstError: true })) champs[e.path] = e.msg;
      next(badRequest('VALIDATION', 'Certains champs sont invalides.', champs));
    },
  ];
}

export const PASSWORD_RULE_MSG = '8 caractères minimum, dont un chiffre.';
export const isStrongPassword = (value) => typeof value === 'string' && value.length >= 8 && value.length <= 128 && /\d/.test(value);
