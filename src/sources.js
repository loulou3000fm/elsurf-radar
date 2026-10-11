// Origines possibles d'une source, dans l'ordre d'affichage du récap.
export const ORIGINS = [
  { origin: 'FR', emoji: '🇫🇷', label: 'Francophone' },
  { origin: 'INTL', emoji: '🌍', label: 'International' },
];

// Sources RSS du radar.
// origin : 'FR' (francophone) ou 'INTL' (international).
//
// ⚠️ Certaines URL de flux sont à confirmer (pour les sites WordPress, le flux
// est en général l'URL du site + "/feed/"). Un flux qui échoue n'est pas
// bloquant : il est signalé dans les logs et le script continue avec les autres.
export const FEEDS = [
  // --- Francophones ---
  { name: 'Gonzaï', url: 'https://gonzai.com/feed/', origin: 'FR' },
  { name: 'Mowno', url: 'https://www.mowno.com/feed/', origin: 'FR' },
  { name: 'Les Oreilles Curieuses', url: 'https://lesoreillescurieuses.com/feed/', origin: 'FR' },
  { name: 'Le Canal Auditif', url: 'https://lecanalauditif.ca/feed/', origin: 'FR' },
  {
    name: 'Another Whisky for Mister Bukowski',
    url: 'https://anotherwhiskyformisterbukowski.com/feed/',
    origin: 'FR',
  },
  // /news/feed/ est le flux des commentaires de la page News (vide) : on prend le flux du site.
  { name: 'Howlin Banana Records', url: 'https://www.howlinbananarecords.com/feed/', origin: 'FR' },

  // --- Internationaux ---
  { name: 'Brooklyn Vegan', url: 'https://www.brooklynvegan.com/feed/', origin: 'INTL' },
  { name: 'Bandcamp Daily', url: 'https://daily.bandcamp.com/feed', origin: 'INTL' },
  {
    name: 'Pitchfork Album Reviews',
    url: 'https://pitchfork.com/feed/feed-album-reviews/rss',
    origin: 'INTL',
  },
  {
    name: 'NPR New Music Friday / All Songs',
    url: 'https://feeds.npr.org/510019/podcast.xml',
    origin: 'INTL',
  },
];

// Labels suivis sur Bandcamp. Bandcamp n'a pas de flux RSS par label : on lit la
// page du label et on détecte les nouvelles sorties par comparaison avec seen.json.
// Un champ origin ('FR' ou 'INTL') peut être ajouté par label ; 'INTL' par défaut.
export const BANDCAMP_LABELS = [
  { name: '10k', url: 'https://10kglobal.bandcamp.com/' },
  { name: 'Un je ne sais quoi', url: 'https://unjenesaisquoi.bandcamp.com/' },
  { name: 'Catapulte', url: 'https://catapulterecords.bandcamp.com/' },
  { name: 'Reverse Tapes', url: 'https://reversetapes.bandcamp.com/' },
  { name: 'Howlin Banana', url: 'https://howlinbananarecords.bandcamp.com/' },
  { name: 'Born Bad', url: 'https://bornbadrecords.bandcamp.com/' },
  { name: 'Escho', url: 'https://escho.bandcamp.com/' },
  { name: 'PLZ Make It Ruins', url: 'https://plzmakeitruins.bandcamp.com/' },
  { name: 'Leaving Records', url: 'https://leavingrecords.bandcamp.com/' },
  { name: 'Jakarta Records', url: 'https://jakartarecords-label.bandcamp.com/' },
  { name: 'Big Crown', url: 'https://bigcrownrecords.bandcamp.com/' },
  { name: 'Habibi Funk', url: 'https://habibifunkrecords.bandcamp.com/' },
  { name: 'Mello Music Group', url: 'https://mellomusicgroup.bandcamp.com/' },
  { name: 'Touching Bass', url: 'https://touching-bass.bandcamp.com/' },
  { name: 'AD 93', url: 'https://ad93.bandcamp.com/' },
  { name: 'Scenic Route', url: 'https://scenicroute.bandcamp.com/' },
  { name: 'Numéro Group', url: 'https://numerogroup.bandcamp.com/' },
  { name: 'Noa', url: 'https://noarecords.bandcamp.com/' },
];
