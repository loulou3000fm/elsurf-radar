# elsurf-radar

Radar de veille musicale pour El Surf.

Un script Node.js qui agrège chaque matin les sorties et actus musique publiées
sur une sélection de blogs et médias (francophones et internationaux) via leurs
flux RSS, pour en faire un récap.

## État actuel

- [x] Lecture et agrégation des flux RSS (dernières 48h, dédoublonnées, triées)
- [x] Récap dans le terminal
- [ ] Envoi du récap par email
- [ ] Exécution quotidienne via GitHub Actions

## Utilisation

```bash
npm install
npm start
```

Node.js 20 ou plus récent.

## Configuration

- Sources : [src/sources.js](src/sources.js) — tableau `FEEDS` d'objets `{ name, url, origin }`
  (`origin` vaut `'FR'` ou `'INTL'`).
- Fenêtre de temps : constante `HOURS` dans [src/rss.js](src/rss.js) (48h par défaut).

Un flux en erreur (404, timeout, format invalide) est signalé par un
avertissement et n'interrompt pas le script.
