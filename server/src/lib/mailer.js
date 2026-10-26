import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { logger } from './logger.js';

const transport = config.isTest
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, secure: false });

// Lets tests read the links that would have been emailed.
export const testOutbox = [];

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout({ titre, texte, bouton, lien }) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F6F7F9;font-family:Segoe UI,Arial,sans-serif;color:#14171C">
<div style="max-width:520px;margin:32px auto;background:#fff;border:1px solid #E3E6EB;border-radius:12px;padding:32px">
<div style="font-weight:700;font-size:18px;margin-bottom:24px"><span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:6px;background:#2547D0;color:#fff;margin-right:8px">C</span>CampusHub</div>
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(titre)}</h1>
<p style="font-size:15px;line-height:1.6;color:#3D4450;margin:0 0 24px">${escapeHtml(texte)}</p>
${bouton ? `<a href="${lien}" style="display:inline-block;background:#2547D0;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:6px">${escapeHtml(bouton)}</a>
<p style="font-size:13px;color:#5B6370;margin:24px 0 0">Ou copiez ce lien : ${lien}</p>` : ''}
</div></body></html>`;
}

export async function sendMail({ to, sujet, titre, texte, bouton, lien }) {
  const message = { from: config.mailFrom, to, subject: sujet, text: `${texte}${lien ? `\n\n${lien}` : ''}`, html: layout({ titre, texte, bouton, lien }) };
  if (config.isTest) testOutbox.push({ to, sujet, lien });
  try {
    await transport.sendMail(message);
    return true;
  } catch (err) {
    logger.error({ err: err.message, to }, 'mail_failed');
    return false;
  }
}
