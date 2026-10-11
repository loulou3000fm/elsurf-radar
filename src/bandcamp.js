import { parse } from 'node-html-parser';

// Délai entre deux labels, pour rester poli avec Bandcamp (ms).
const DELAY_MS = 800;

// Délai max par page avant abandon (ms).
const TIMEOUT_MS = 20_000;

const HEADERS = {
  // User-Agent de navigateur : Bandcamp bloque les clients trop "robots".
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Normalise les espaces d'un texte extrait du HTML (null si vide).
function clean(text) {
  return text?.replace(/\s+/g, ' ').trim() || null;
}

// Rend une URL de sortie absolue et sans paramètres de suivi (?label=…&tab=music).
function toAbsoluteUrl(href, labelUrl) {
  const url = new URL(href, labelUrl);
  url.search = '';
  url.hash = '';
  return url.href;
}

// URL de la pochette à partir de l'identifiant d'image Bandcamp.
function artUrl(artId) {
  return artId ? `https://f4.bcbits.com/img/a${artId}_2.jpg` : null;
}

// Extrait la discographie de la page /music d'un label.
// Bandcamp rend les 16 premières sorties en <li> dans <ol id="music-grid">, et
// fournit les suivantes en JSON dans l'attribut data-client-items de cette liste.
// L'identifiant d'une sortie est de la forme "album-123456" ou "track-123456".
function extractReleases(html, label) {
  const grid = parse(html).querySelector('#music-grid');
  if (!grid) return [];

  const releases = [];

  for (const li of grid.querySelectorAll('li[data-item-id]')) {
    const href = li.querySelector('a')?.getAttribute('href');
    if (!href) continue;

    const img = li.querySelector('img');
    // Les images hors écran sont chargées en différé : la vraie URL est dans data-original.
    const image = img?.getAttribute('data-original') ?? img?.getAttribute('src');

    const titleNode = li.querySelector('.title');
    const artistNode = titleNode?.querySelector('.artist-override');
    const artist = clean(artistNode?.text);
    artistNode?.remove();

    releases.push({
      id: li.getAttribute('data-item-id'),
      title: clean(titleNode?.text) ?? '(sans titre)',
      artist,
      link: toAbsoluteUrl(href, label.url),
      image: image?.startsWith('http') ? image : null,
    });
  }

  const clientItems = JSON.parse(grid.getAttribute('data-client-items') || '[]');
  for (const item of clientItems) {
    if (!item.page_url) continue;
    releases.push({
      id: `${item.type}-${item.id}`,
      title: clean(item.title) ?? '(sans titre)',
      artist: clean(item.artist),
      link: toAbsoluteUrl(item.page_url, label.url),
      image: artUrl(item.art_id),
    });
  }

  // Dédoublonnage par identifiant, au cas où une sortie figure dans les deux listes.
  return [...new Map(releases.map((release) => [release.id, release])).values()];
}

// Télécharge la discographie d'un label. Lève une erreur si la page est inexploitable.
async function fetchLabelReleases(label) {
  // /music force l'onglet discographie (certains labels ouvrent sur le merch).
  const response = await fetch(new URL('/music', label.url), {
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const releases = extractReleases(await response.text(), label);
  // Zéro sortie = page inattendue (blocage, refonte…) : on ne touche surtout pas à la mémoire.
  if (releases.length === 0) throw new Error('aucune sortie trouvée dans la page');
  return releases;
}

/**
 * Lit la discographie de chaque label Bandcamp et renvoie les sorties jamais vues.
 *
 * Au premier passage sur un label (absent de seen), toutes ses sorties sont
 * mémorisées et aucune n'est remontée : les nouveautés ne sont détectées qu'ensuite.
 * Un label en erreur est signalé et sa mémoire reste inchangée.
 *
 * @param {{ name: string, url: string, origin?: 'FR' | 'INTL' }[]} labels
 * @param {Record<string, string[]>} seen identifiants déjà vus, par URL de label
 * @returns {Promise<{ releases: { source: string, origin: string, type: 'bandcamp',
 *   title: string, artist: string | null, link: string, image: string | null }[],
 *   updatedSeen: Record<string, string[]> }>}
 */
export async function fetchBandcampReleases(labels, seen) {
  const releases = [];
  const updatedSeen = { ...seen };

  for (const [index, label] of labels.entries()) {
    if (index > 0) await sleep(DELAY_MS);

    try {
      const current = await fetchLabelReleases(label);
      const known = seen[label.url];

      if (!known) {
        console.log(`🆕 Bandcamp, premier passage : ${label.name} — ${current.length} sortie(s) mémorisée(s)`);
      } else {
        const knownIds = new Set(known);
        for (const release of current) {
          if (knownIds.has(release.id)) continue;
          releases.push({
            source: label.name,
            origin: label.origin ?? 'INTL',
            type: 'bandcamp',
            title: release.title,
            artist: release.artist,
            link: release.link,
            image: release.image,
          });
        }
      }

      // On ajoute aux identifiants connus sans jamais en retirer : une sortie
      // momentanément absente de la page ne doit pas réapparaître comme nouvelle.
      updatedSeen[label.url] = [...new Set([...(known ?? []), ...current.map((release) => release.id)])];
    } catch (error) {
      console.warn(`⚠️ Bandcamp KO : ${label.name} (${label.url}) — ${error.message}`);
    }
  }

  return { releases, updatedSeen };
}
