import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Mémoire persistante des sorties déjà vues, à la racine du projet.
// Ce fichier est commité : il doit évoluer à chaque exécution.
const SEEN_FILE = fileURLToPath(new URL('../seen.json', import.meta.url));

// Lit seen.json ({} s'il n'existe pas encore).
export async function loadSeen() {
  try {
    return JSON.parse(await readFile(SEEN_FILE, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

// Écrit seen.json (JSON indenté, pour des diffs git lisibles).
export async function saveSeen(seen) {
  await writeFile(SEEN_FILE, `${JSON.stringify(seen, null, 2)}\n`);
}
