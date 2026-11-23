#!/usr/bin/env node
/**
 * Aligne `host_permissions` et `content_scripts[0].matches` du manifeste sur
 * les motifs dérivés des règles (`motifsDuManifeste`).
 *
 *   npm run manifeste                 # réécrit extension/manifest.json
 *   node scripts/manifeste.mjs --verifier   # échoue s'ils divergent
 *
 * Une seule source : extension/regles.js. Le manifeste ne doit plus être
 * édité à la main pour ajouter un site.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const racine = path.resolve(import.meta.dirname, "..");
const cheminManifeste = path.join(racine, "extension", "manifest.json");

function chargerMoteurEtRegles() {
  const contexte = vm.createContext({ browser: {} });
  for (const f of ["regles.js", "content/moteur.js"]) {
    vm.runInContext(readFileSync(path.join(racine, "extension", f), "utf8"), contexte, { filename: f });
  }
  return {
    motifs: contexte.SansPrixMoteur.motifsDuManifeste(contexte.SansPrixRegles),
  };
}

/** Motifs triés, pour un diff stable. */
export function motifsAttendus() {
  return [...new Set(chargerMoteurEtRegles().motifs)].sort();
}

export function appliquerMotifs(manifeste, motifs) {
  const out = structuredClone(manifeste);
  out.host_permissions = motifs;
  if (!out.content_scripts?.[0]) {
    throw new Error("manifeste : content_scripts[0] manquant");
  }
  out.content_scripts[0].matches = motifs;
  return out;
}

function principal() {
  const motifs = motifsAttendus();
  const brut = readFileSync(cheminManifeste, "utf8");
  const manifeste = JSON.parse(brut);
  const suivant = appliquerMotifs(manifeste, motifs);
  const texte = `${JSON.stringify(suivant, null, 2)}\n`;

  if (process.argv[2] === "--verifier") {
    const actuelHost = [...(manifeste.host_permissions || [])].sort();
    const actuelMatches = [...(manifeste.content_scripts?.[0]?.matches || [])].sort();
    const ok =
      JSON.stringify(actuelHost) === JSON.stringify(motifs) && JSON.stringify(actuelMatches) === JSON.stringify(motifs);
    if (!ok) {
      console.error("extension/manifest.json n'est pas aligné sur les règles : npm run manifeste");
      process.exit(1);
    }
    console.log(`Manifeste aligné (${motifs.length} motifs).`);
    return;
  }

  writeFileSync(cheminManifeste, texte);
  console.log(`Manifeste mis à jour : ${motifs.length} motifs.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  principal();
}
