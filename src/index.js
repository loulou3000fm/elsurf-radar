import { writeFile } from 'node:fs/promises';
import { BANDCAMP_LABELS, FEEDS, ORIGINS } from './sources.js';
import { fetchAllFeeds, HOURS } from './rss.js';
import { fetchBandcampReleases } from './bandcamp.js';
import { loadSeen, saveSeen } from './seen.js';
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

// Affiche les nouvelles sorties Bandcamp dans la console.
function printBandcamp(releases) {
  console.log(
    `\n${'='.repeat(60)}\n🎵 BANDCAMP — ${releases.length} nouvelle(s) sortie(s)\n${'='.repeat(60)}`,
  );

  if (releases.length === 0) {
    console.log('(rien de neuf)');
    return;
  }
  for (const release of releases) {
    const name = release.artist ? `${release.artist} — ${release.title}` : release.title;
    console.log(`[${release.origin}] ${release.source} — ${name} — ${release.link}`);
  }
}

async function main() {
  const preview = process.argv.includes('--preview');

  console.log(`📡 El Surf Radar — lecture de ${FEEDS.length} flux…\n`);

  const items = await fetchAllFeeds(FEEDS);
  printRecap(items);

  console.log(`\n🎵 Bandcamp — lecture de ${BANDCAMP_LABELS.length} labels…\n`);

  const seen = await loadSeen();
  const { releases, updatedSeen } = await fetchBandcampReleases(BANDCAMP_LABELS, seen);
  printBandcamp(releases);
  console.log('');

  if (preview) {
    // En aperçu on ne mémorise rien, pour ne pas "consommer" les nouveautés du prochain vrai passage.
    await writeFile(PREVIEW_FILE, buildHtml(items, releases));
    console.log(`👀 Aperçu de l'email écrit dans ${PREVIEW_FILE} (aucun envoi).`);
    return;
  }

  if (items.length === 0 && releases.length === 0) {
    await saveSeen(updatedSeen);
    console.log('📭 Rien de neuf : pas d\'email envoyé.');
    return;
  }

  const config = getMailConfig();
  if (!config) {
    await saveSeen(updatedSeen);
    console.log(
      '✉️ Email non configuré (RESEND_API_KEY, EMAIL_FROM ou EMAIL_TO absent) : envoi ignoré.',
    );
    return;
  }

  // L'échec d'envoi est déjà logué : on le signale seulement par le code de sortie.
  const sent = await sendDigest(items, releases, config);
  if (!sent) {
    // Mémoire non sauvegardée : les sorties Bandcamp seront retentées au prochain passage.
    process.exitCode = 1;
    return;
  }
  await saveSeen(updatedSeen);
}

main().catch((error) => {
  console.error('❌ Erreur inattendue :', error);
  process.exitCode = 1;
});
