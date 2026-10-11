import { writeFile } from 'node:fs/promises';
import { FEEDS, ORIGINS } from './sources.js';
import { fetchAllFeeds, HOURS } from './rss.js';
import { buildHtml, getMailConfig, sendDigest } from './email.js';

// Fichier généré par "npm run preview" pour vérifier le rendu de l'email sans l'envoyer.
const PREVIEW_FILE = 'preview.html';

// En local, charge les variables du fichier .env s'il existe (absent sur GitHub Actions).
try {
  process.loadEnvFile();
} catch {
  // Pas de .env : on utilise les variables d'environnement telles quelles.
}

const dateFormat =new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

function formatItem(item) {
  return `[${item.origin}] ${item.source} — ${item.title} (${dateFormat.format(item.date)}) — ${item.link}`;
}

// Affiche le récap dans la console, FR puis INTL.
function printRecap(items) {
  console.log(`\n✅ ${items.length} item(s) sur les dernières ${HOURS}h`);

  for (const { origin, emoji, label } of ORIGINS) {
    const sectionItems = items.filter((item) => item.origin === origin);
    console.log(
      `\n${'='.repeat(60)}\n${emoji} ${label.toUpperCase()} — ${sectionItems.length} item(s)\n${'='.repeat(60)}`,
    );

    if (sectionItems.length === 0) {
      console.log('(rien de neuf)');
      continue;
    }
    for (const item of sectionItems) console.log(formatItem(item));
  }
}

async function main() {
  const preview = process.argv.includes('--preview');

  console.log(`📡 El Surf Radar — lecture de ${FEEDS.length} flux…\n`);

  const items = await fetchAllFeeds(FEEDS);
  printRecap(items);
  console.log('');

  if (preview) {
    await writeFile(PREVIEW_FILE, buildHtml(items));
    console.log(`👀 Aperçu de l'email écrit dans ${PREVIEW_FILE} (aucun envoi).`);
    return;
  }

  if (items.length === 0) {
    console.log('📭 Rien de neuf : pas d\'email envoyé.');
    return;
  }

  const config = getMailConfig();
  if (!config) {
    console.log(
      '✉️ Email non configuré (RESEND_API_KEY, EMAIL_FROM ou EMAIL_TO absent) : envoi ignoré.',
    );
    return;
  }

  // L'échec d'envoi est déjà logué : on le signale seulement par le code de sortie.
  const sent = await sendDigest(items, config);
  if (!sent) process.exitCode = 1;
}

main().catch((error) => {
  console.error('❌ Erreur inattendue :', error);
  process.exitCode = 1;
});
