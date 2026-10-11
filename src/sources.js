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
