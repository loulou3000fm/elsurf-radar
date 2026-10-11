# elsurf-radar

Radar de veille musicale pour El Surf.

Un script Node.js qui agrège chaque matin les sorties et actus musique publiées
sur une sélection de blogs et médias (francophones et internationaux) via leurs
flux RSS, et envoie un récap par email.

## Utilisation

```bash
npm install
npm start          # récap dans le terminal + envoi de l'email si configuré
npm run preview    # écrit l'email dans preview.html, sans rien envoyer
```

Node.js 22 ou plus récent.

## Configuration

- Sources : [src/sources.js](src/sources.js) — tableau `FEEDS` d'objets `{ name, url, origin }`
  (`origin` vaut `'FR'` ou `'INTL'`).
- Fenêtre de temps : constante `HOURS` dans [src/rss.js](src/rss.js) (24h par défaut).

Un flux en erreur (404, timeout, format invalide) est signalé par un
avertissement et n'interrompt pas le script.

## Email

L'envoi passe par l'API [Resend](https://resend.com), configurée par variables
d'environnement (voir [.env.example](.env.example)) :

| Variable         | Rôle                                                              |
| ---------------- | ----------------------------------------------------------------- |
| `RESEND_API_KEY` | Clé API Resend                                                    |
| `EMAIL_FROM`     | Expéditeur — `onboarding@resend.dev` tant qu'aucun domaine n'est vérifié |
| `EMAIL_TO`       | Destinataire du récap                                             |

Avec `onboarding@resend.dev`, Resend n'autorise l'envoi que vers l'adresse du
compte Resend ; pour écrire à d'autres destinataires, il faut vérifier un domaine.

En local, copier `.env.example` en `.env` et le remplir. Si l'une des trois
variables manque, le script affiche le récap et n'envoie rien. Aucun email n'est
envoyé non plus s'il n'y a rien de neuf. Un échec d'envoi est logué et le script
se termine avec un code de sortie 1.

## Exécution quotidienne

Le workflow [.github/workflows/radar.yml](.github/workflows/radar.yml) lance le
script tous les jours à 6h UTC, et peut être déclenché à la main depuis l'onglet
Actions. Il lit `RESEND_API_KEY`, `EMAIL_FROM` et `EMAIL_TO` dans les secrets du dépôt
(Settings → Secrets and variables → Actions).
