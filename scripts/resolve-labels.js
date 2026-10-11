// Résout une liste de noms de labels en identifiants MusicBrainz (MBID).
// Script ponctuel : à relancer (npm run resolve-labels) quand on ajoute des labels.
// Produit labels-resolved.json et labels-resolved.md à la racine, à relire et valider.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Noms des labels à résoudre.
const LABELS = [
  'Numéro Group',
  'Big Crown',
  'Sub Pop',
  'Stones Throw',
  'Leaving Records',
  'Reverse Tapes',
  'Un je ne sais quoi',
  'Howlin Banana',
  'Domino',
  'Loma Vista',
  'Warp',
  'Lex Records',
  'Fashionably Early',
  'Escho',
  'Blue Note',
  'Full Time Hobby',
  'Noa',
  'Soul Jazz',
  'Habibi Funk',
  'PLZ Make It Ruins',
  'Jagjaguwar',
  '4AD',
  "You've Changed",
  'Catapulte',
  'GRAiN PWRD',
  'Mello Music Group',
  'Believe UK',
  'Preference',
  'Impulse!',
  'Touching Bass',
  'AD 93',
  'Break All',
  'Sounds of Crenshaw',
  'Scenic Route',
  'Epitaph',
  'Born Bad',
  '10k',
];

const API_URL = 'https://musicbrainz.org/ws/2/label/';
const HEADERS = {
  // Obligatoire : MusicBrainz bloque les requêtes sans User-Agent identifiable.
  'User-Agent': 'ElSurfRadar/1.0 ( https://github.com/loulou3000fm/elsurf-radar )',
  Accept: 'application/json',
};

// Limite de débit MusicBrainz : 1 requête par seconde, on garde une marge.
const DELAY_MS = 1100;
// Nombre de candidats conservés par label.
const MAX_CANDIDATES = 3;
// Score minimal du meilleur candidat pour être considéré fiable.
const MIN_SCORE = 90;
// Écart de score en dessous duquel un 2e candidat est jugé "proche" du premier.
const CLOSE_SCORE_GAP = 5;
// Un nom d'un seul mot de cette longueur ou moins est jugé trop générique.
const GENERIC_MAX_LENGTH = 3;

const CONFIDENCE_OK = 'OK';
const CONFIDENCE_CHECK = '⚠️ à vérifier';

const JSON_FILE = fileURLToPath(new URL('../labels-resolved.json', import.meta.url));
const MD_FILE = fileURLToPath(new URL('../labels-resolved.md', import.meta.url));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Garantit au moins DELAY_MS entre deux requêtes, quel que soit l'appelant.
let lastRequestAt = 0;
async function throttle() {
  const wait = lastRequestAt + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

// Lance une recherche de labels et renvoie les candidats normalisés.
async function searchLabels(query) {
  const url = `${API_URL}?query=${encodeURIComponent(query)}&fmt=json&limit=${MAX_CANDIDATES}`;

  await throttle();
  let response = await fetch(url, { headers: HEADERS });
  if (response.status === 503) {
    // Throttle côté MusicBrainz : on patiente et on retente une fois.
    await sleep(DELAY_MS * 2);
    await throttle();
    response = await fetch(url, { headers: HEADERS });
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const { labels = [] } = await response.json();
  return labels.slice(0, MAX_CANDIDATES).map((label) => ({
    name: label.name,
    mbid: label.id,
    country: label.country ?? null,
    type: label.type ?? null,
    disambiguation: label.disambiguation ?? '',
    score: label.score ?? 0,
  }));
}

// Échappe les caractères spéciaux de la syntaxe de recherche Lucene.
function escapeLucene(text) {
  return text.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, '\\$&');
}

// Simplifie un nom pour le comparer : sans accents, casse, ponctuation ni mots creux.
function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|records?|recordings?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Évalue la confiance dans le meilleur candidat et liste les raisons de douter.
function assess(input, candidates, usedLooseSearch) {
  const reasons = [];
  const [best, second] = candidates;

  if (!best) {
    reasons.push('aucun résultat');
  } else {
    if (best.score < MIN_SCORE) reasons.push(`score faible (${best.score})`);
    if (normalizeName(best.name) !== normalizeName(input)) reasons.push('nom différent du nom cherché');
    if (second && best.score - second.score <= CLOSE_SCORE_GAP) reasons.push('plusieurs candidats proches');
    if (!/\s/.test(input.trim()) && input.trim().length <= GENERIC_MAX_LENGTH) {
      reasons.push('nom très court / générique');
    }
    if (usedLooseSearch) reasons.push('trouvé par recherche élargie');
  }

  return { confidence: reasons.length === 0 ? CONFIDENCE_OK : CONFIDENCE_CHECK, reasons };
}

// Résout un label. Ne lève jamais : une erreur réseau est notée dans le résultat.
async function resolveLabel(input) {
  try {
    let candidates = await searchLabels(`label:"${input.replace(/["\\]/g, '\\$&')}"`);
    let usedLooseSearch = false;

    if (candidates.length === 0) {
      // Aucun résultat : on retente une fois avec une recherche plus lâche.
      candidates = await searchLabels(escapeLucene(input));
      usedLooseSearch = true;
    }

    const best = candidates[0] ?? null;
    return {
      input,
      best: best && {
        name: best.name,
        mbid: best.mbid,
        country: best.country,
        disambiguation: best.disambiguation,
        score: best.score,
      },
      candidates,
      ...assess(input, candidates, usedLooseSearch),
    };
  } catch (error) {
    console.warn(`⚠️ Erreur pour "${input}" : ${error.message}`);
    return {
      input,
      best: null,
      candidates: [],
      confidence: CONFIDENCE_CHECK,
      reasons: [`erreur : ${error.message}`],
    };
  }
}

// Affiche le tableau récapitulatif dans la console.
function printTable(results) {
  const rows = results.map((result) => [
    result.input,
    result.best?.name ?? '—',
    result.best?.mbid ?? '—',
    result.best?.country ?? '—',
    result.confidence,
  ]);
  const header = ['Nom cherché', 'Meilleur match', 'MBID', 'Pays', 'Confiance'];
  const widths = header.map((title, column) =>
    Math.max(title.length, ...rows.map((row) => row[column].length)),
  );
  const formatRow = (row) => row.map((cell, column) => cell.padEnd(widths[column])).join(' | ');

  console.log(formatRow(header));
  console.log(widths.map((width) => '-'.repeat(width)).join('-|-'));
  for (const row of rows) console.log(formatRow(row));
}

// Échappe une valeur pour une cellule de tableau Markdown.
const cell = (value) => String(value ?? '—').replace(/\|/g, '\\|') || '—';

const mbidLink = (mbid) => (mbid ? `[\`${mbid}\`](https://musicbrainz.org/label/${mbid})` : '—');

// Construit le rapport Markdown : tableau complet, puis détail des labels à vérifier.
function buildMarkdown(results) {
  const toCheck = results.filter((result) => result.confidence !== CONFIDENCE_OK);
  const lines = [
    '# Labels résolus (MusicBrainz)',
    '',
    `${results.length} labels — ${results.length - toCheck.length} OK, ${toCheck.length} à vérifier.`,
    '',
    '| Nom cherché | Match | MBID | Pays | Confiance |',
    '| --- | --- | --- | --- | --- |',
    ...results.map(
      (result) =>
        `| ${cell(result.input)} | ${cell(result.best?.name)} | ${mbidLink(result.best?.mbid)} | ${cell(result.best?.country)} | ${result.confidence} |`,
    ),
  ];

  if (toCheck.length > 0) {
    lines.push('', '## À vérifier');
    for (const result of toCheck) {
      lines.push('', `### ${result.input}`, '', `Raison(s) : ${result.reasons.join(', ')}.`);
      if (result.candidates.length === 0) continue;

      lines.push('', 'Candidats :', '');
      for (const candidate of result.candidates) {
        const details = [candidate.country, candidate.type, candidate.disambiguation]
          .filter(Boolean)
          .join(', ');
        lines.push(
          `- **${candidate.name}** — score ${candidate.score}${details ? ` — ${details}` : ''} — ${mbidLink(candidate.mbid)}`,
        );
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const seconds = Math.round((LABELS.length * DELAY_MS) / 1000);
  console.log(`🔎 Résolution de ${LABELS.length} labels sur MusicBrainz (environ ${seconds} s)…\n`);

  const results = [];
  for (const [index, input] of LABELS.entries()) {
    const result = await resolveLabel(input);
    results.push(result);
    console.log(
      `[${index + 1}/${LABELS.length}] ${input} → ${result.best?.name ?? 'aucun résultat'} (${result.confidence})`,
    );
  }

  console.log('');
  printTable(results);

  // Le fichier JSON suit le format { input, best, candidates, confidence } (+ reasons).
  await writeFile(JSON_FILE, `${JSON.stringify(results, null, 2)}\n`);
  await writeFile(MD_FILE, buildMarkdown(results));

  const toCheck = results.filter((result) => result.confidence !== CONFIDENCE_OK).length;
  console.log(`\n✅ ${results.length - toCheck} label(s) OK, ${toCheck} à vérifier.`);
  console.log('📄 Résultats écrits dans labels-resolved.json et labels-resolved.md');
}

main().catch((error) => {
  console.error('❌ Erreur inattendue :', error);
  process.exitCode = 1;
});
