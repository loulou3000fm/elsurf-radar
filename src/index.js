import { FEEDS } from './sources.js';
import { fetchAllFeeds, HOURS } from './rss.js';

// Libellés des sections du récap, dans l'ordre d'affichage.
const SECTIONS = [
  { origin: 'FR', label: '🇫🇷 FRANCOPHONE' },
  { origin: 'INTL', label: '🌍 INTERNATIONAL' },
];

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

function formatItem(item) {
  return `[${item.origin}] ${item.source} — ${item.title} (${dateFormat.format(item.date)}) — ${item.link}`;
}

async function main() {
  console.log(`📡 El Surf Radar — lecture de ${FEEDS.length} flux…\n`);

  const items = await fetchAllFeeds(FEEDS);

  console.log(`\n✅ ${items.length} item(s) sur les dernières ${HOURS}h`);

  for (const { origin, label } of SECTIONS) {
    const sectionItems = items.filter((item) => item.origin === origin);
    console.log(`\n${'='.repeat(60)}\n${label} — ${sectionItems.length} item(s)\n${'='.repeat(60)}`);

    if (sectionItems.length === 0) {
      console.log('(rien de neuf)');
      continue;
    }
    for (const item of sectionItems) console.log(formatItem(item));
  }
}

main().catch((error) => {
  console.error('❌ Erreur inattendue :', error);
  process.exitCode = 1;
});
