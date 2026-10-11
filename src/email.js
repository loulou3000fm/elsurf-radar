import { Resend } from 'resend';
import { ORIGINS } from './sources.js';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'full',
  timeZone: 'Europe/Paris',
});

// Échappe un texte pour l'insérer dans du HTML (contenu ou attribut).
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Lit la config d'envoi dans les variables d'environnement (null si incomplète).
export function getMailConfig(env = process.env) {
  const { RESEND_API_KEY: apiKey, EMAIL_FROM: from, EMAIL_TO: to } = env;
  if (!apiKey || !from || !to) return null;
  return { apiKey, from, to };
}

export function buildSubject(items, now = new Date()) {
  return `El Surf Radar — ${items.length} nouveauté(s) · ${dayFormat.format(now)}`;
}

// Regroupe les items par origine, dans l'ordre d'affichage, sans les sections vides.
function groupByOrigin(items) {
  return ORIGINS.map((section) => ({
    ...section,
    items: items.filter((item) => item.origin === section.origin),
  })).filter((section) => section.items.length > 0);
}

// Version texte brut du récap (pour les clients mail sans HTML).
export function buildText(items) {
  const sections = groupByOrigin(items).map(({ label, items: sectionItems }) => {
    const lines = sectionItems.map((item) =>
      [
        `• ${item.title}`,
        `  ${item.source} — ${dateFormat.format(item.date)}`,
        item.description && `  ${item.description}`,
        `  ${item.link}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
    return `${label.toUpperCase()} (${sectionItems.length})\n\n${lines.join('\n\n')}`;
  });
  return sections.join('\n\n----------\n\n');
}

function renderItem(item) {
  const image = item.image
    ? `<td width="96" valign="top" style="padding:0 16px 0 0;">
          <a href="${escapeHtml(item.link)}"><img src="${escapeHtml(item.image)}" width="96" alt="" style="display:block;width:96px;height:auto;border-radius:4px;border:0;"></a>
        </td>`
    : '';
  const description = item.description
    ? `<div style="margin-top:6px;font-size:14px;line-height:1.45;color:#444444;">${escapeHtml(item.description)}</div>`
    : '';

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        ${image}
        <td valign="top">
          <a href="${escapeHtml(item.link)}" style="font-size:16px;line-height:1.3;font-weight:bold;color:#111111;text-decoration:none;">${escapeHtml(item.title)}</a>
          <div style="margin-top:4px;font-size:12px;color:#888888;">${escapeHtml(item.source)} · ${dateFormat.format(item.date)}</div>
          ${description}
        </td>
      </tr>
    </table>`;
}

// Version HTML du récap : mise en page en tableaux et styles en ligne, pour les clients mail.
export function buildHtml(items, now = new Date()) {
  const sections = groupByOrigin(items)
    .map(
      ({ label, items: sectionItems }) => `
    <h2 style="margin:32px 0 16px;padding-bottom:8px;border-bottom:2px solid #111111;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#111111;">${escapeHtml(label)} · ${sectionItems.length}</h2>
    ${sectionItems.map(renderItem).join('\n    ')}`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>El Surf Radar</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f2;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:8px;font-family:Helvetica,Arial,sans-serif;">
          <tr>
            <td style="padding:28px 24px;">
              <h1 style="margin:0;font-size:24px;color:#111111;">El Surf Radar</h1>
              <div style="margin-top:4px;font-size:13px;color:#888888;">${escapeHtml(dayFormat.format(now))} · ${items.length} nouveauté(s)</div>
              ${sections}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Envoie le récap par email via l'API Resend.
 * Ne lève jamais : renvoie true si l'email est parti, false sinon (erreur loguée).
 *
 * @param {object[]} items items normalisés renvoyés par fetchAllFeeds
 * @param {NonNullable<ReturnType<typeof getMailConfig>>} config
 * @returns {Promise<boolean>}
 */
export async function sendDigest(items, config) {
  try {
    const resend = new Resend(config.apiKey);
    // Le SDK ne lève pas sur une erreur d'API : il la renvoie dans "error".
    const { data, error } = await resend.emails.send({
      from: config.from,
      to: config.to,
      subject: buildSubject(items),
      html: buildHtml(items),
      text: buildText(items),
    });
    if (error) throw new Error(`${error.name ?? 'erreur'} — ${error.message}`);

    console.log(`✉️ Récap envoyé à ${config.to} (id Resend : ${data?.id})`);
    return true;
  } catch (error) {
    console.error(`❌ Échec de l'envoi de l'email : ${error.message}`);
    return false;
  }
}
