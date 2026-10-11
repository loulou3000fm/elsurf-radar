import Parser from 'rss-parser';

// Fenêtre de fraîcheur : on ne garde que les items publiés dans les HOURS dernières heures.
export const HOURS = 48;

// Longueur max de la description (en caractères).
const DESCRIPTION_MAX = 300;

// Délai max par flux avant abandon (ms).
const TIMEOUT_MS = 15_000;

const HEADERS = {
  // Certains sites refusent les requêtes sans User-Agent "navigateur".
  'User-Agent': 'Mozilla/5.0 (compatible; elsurf-radar/0.1; +https://github.com/loulou3000fm/elsurf-radar)',
  Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
};

const parser = new Parser({
  customFields: {
    // Champs Media RSS, non exposés par défaut par rss-parser.
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
});

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
  laquo: '«',
  raquo: '»',
};

// Décode les entités HTML numériques et les entités nommées les plus courantes.
function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

// Retire les balises HTML et normalise les espaces.
function stripHtml(html) {
  const text = String(html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

// Tronque à ~max caractères, en coupant de préférence sur un espace.
function truncate(text, max = DESCRIPTION_MAX) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

// Récupère l'attribut url d'un champ Media RSS (objet ou tableau, attributs sous "$").
function mediaUrl(field) {
  const node = Array.isArray(field) ? field[0] : field;
  return node?.$?.url ?? null;
}

// Cherche une image pour l'item : enclosure, iTunes, Media RSS, puis 1re <img> du contenu.
function extractImage(item) {
  const { enclosure } = item;
  if (enclosure?.url && (!enclosure.type || enclosure.type.startsWith('image/'))) {
    return enclosure.url;
  }

  const fromHtml = /<img[^>]+src=["']([^"']+)["']/i.exec(
    item['content:encoded'] ?? item.content ?? '',
  )?.[1];

  return (
    item.itunes?.image ??
    mediaUrl(item.mediaContent) ??
    mediaUrl(item.mediaThumbnail) ??
    (fromHtml ? decodeEntities(fromHtml) : null)
  );
}

// Convertit un item brut rss-parser en item normalisé (ou null s'il est inexploitable).
function normalizeItem(item, feed) {
  const date = new Date(item.isoDate ?? item.pubDate ?? NaN);
  const link = item.link?.trim();
  // Sans date valide on ne peut pas filtrer, sans lien on ne peut pas dédoublonner.
  if (!link || Number.isNaN(date.getTime())) return null;

  return {
    source: feed.name,
    origin: feed.origin,
    title: stripHtml(item.title) || '(sans titre)',
    link,
    date,
    description: truncate(
      stripHtml(item.contentSnippet ?? item.summary ?? item.content ?? item['content:encoded']),
    ),
    image: extractImage(item),
  };
}

// Lit un flux et renvoie ses items normalisés. Ne lève jamais : un flux KO renvoie [].
async function fetchFeed(feed) {
  try {
    // Téléchargement via fetch natif plutôt que parser.parseURL : le client HTTP
    // de rss-parser se fait servir une page HTML par certains sites (Bandcamp Daily).
    const response = await fetch(feed.url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = await parser.parseString(await response.text());
    return (parsed.items ?? []).map((item) => normalizeItem(item, feed)).filter(Boolean);
  } catch (error) {
    console.warn(`⚠️ Flux KO : ${feed.name} (${feed.url}) — ${String(error.message).replace(/\s+/g, ' ')}`);
    return [];
  }
}

/**
 * Lit tous les flux en parallèle et renvoie les items des HOURS dernières heures,
 * dédoublonnés par lien et triés du plus récent au plus ancien.
 *
 * @param {{ name: string, url: string, origin: 'FR' | 'INTL' }[]} feeds
 * @returns {Promise<{ source: string, origin: string, title: string, link: string,
 *   date: Date, description: string, image: string | null }[]>}
 */
export async function fetchAllFeeds(feeds) {
  const results = await Promise.all(feeds.map(fetchFeed));
  const since = Date.now() - HOURS * 60 * 60 * 1000;

  // Dédoublonnage par lien (on garde la première occurrence).
  const byLink = new Map();
  for (const item of results.flat()) {
    if (item.date.getTime() < since) continue;
    if (!byLink.has(item.link)) byLink.set(item.link, item);
  }

  return [...byLink.values()].sort((a, b) => b.date - a.date);
}
