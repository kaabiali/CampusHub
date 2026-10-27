import axios from 'axios';
import { queryClient } from './queryClient';

export class ApiError extends Error {
  constructor(status, code, message, champs) {
    super(message);
    this.status = status;
    this.code = code;
    this.champs = champs || {};
  }
}

export const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      throw new ApiError(0, 'RESEAU', 'Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.');
    }
    const { status, data } = err.response;
    const e = data?.error || {};
    const apiError = new ApiError(status, e.code || 'ERREUR', e.message || 'Une erreur inattendue est survenue.', e.champs);
    if (apiError.code === 'NON_AUTHENTIFIE' || apiError.code === 'COMPTE_BLOQUE') {
      queryClient.setQueryData(['moi'], null);
    }
    if (apiError.code === 'EMAIL_NON_VERIFIE') {
      queryClient.invalidateQueries({ queryKey: ['moi'] });
    }
    throw apiError;
  },
);

export const get = (url, params) => api.get(url, { params }).then((r) => r.data);
export const post = (url, body) => api.post(url, body).then((r) => r.data);
export const patch = (url, body) => api.patch(url, body).then((r) => r.data);
export const del = (url, body) => api.delete(url, body ? { data: body } : undefined).then((r) => r.data);
