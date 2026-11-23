#!/usr/bin/env node
/**
 * La fiche addons.mozilla.org, tenue par le dépôt. AMO ne lit le nom et le
 * résumé du manifeste qu'à la création de la fiche, et jamais son icône : ce
 * script les remet d'aplomb, avec la description, la catégorie, la page
 * d'accueil et les captures d'écran.
 *
 *   - nom et résumé : `extName` et `extDescription` de chaque langue de
 *     l'extension que la fiche propose (LANGUES_AMO) ;
 *   - description : amo/fiche.json, une par langue, copiée vers les
 *     variantes régionales ; catégories : amo/fiche.json ;
 *   - page d'accueil : `homepage_url` du manifeste ;
 *   - icône : extension/icons/icone-128.png, envoyée si la fiche montre
 *     l'icône par défaut ;
 *   - captures : amo/captures.json (ordre, légendes) et amo/captures/.
 *
 * Seuls les champs qui diffèrent sont modifiés. Une capture est reconnue par
 * sa légende française : absente, elle est envoyée ; présente, sa place et sa
 * légende anglaise sont remises d'aplomb (pour changer l'image, changer la
 * légende) ; sur la fiche mais pas dans le fichier, elle est signalée, JAMAIS
 * supprimée. Une seule capture sans légende — laissée par un passage arrêté
 * entre l'image et la légende — est reprise pour la première manquante.
 * SUPPRIMER="id,id" en retire nommément.
 *
 * AMO limite le débit des écritures. Une attente courte est patientée ; une
 * longue (souvent une demi-heure après quelques images) arrête le passage en
 * vert : le suivant reprend là où il s'est arrêté.
 *
 * Clés : WEB_EXT_API_KEY, WEB_EXT_API_SECRET. Joué par fiche-amo.yml.
 *
 *   node scripts/fiche-amo.mjs            synchronise
 *   node scripts/fiche-amo.mjs --verifier vérifie seulement les fichiers
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { client, DebitEpuise } from "./amo.mjs";

const racine = path.resolve(import.meta.dirname, "..");
const lireJson = async (...chemin) => JSON.parse(await readFile(path.join(racine, ...chemin), "utf8"));

/**
 * Les captures déclarées, vérifiées : fichiers présents, PNG 1280 × 800, une
 * légende dans chaque langue de la fiche (la première de LANGUES_AMO), copiée
 * ensuite vers les variantes régionales.
 */
export async function chargerCaptures(dossier = path.join(racine, "amo")) {
  const liste = JSON.parse(await readFile(path.join(dossier, "captures.json"), "utf8"));
  if (!Array.isArray(liste) || liste.length === 0) throw new Error("captures.json : une liste non vide");
  const vues = new Set();
  return Promise.all(
    liste.map(async ({ fichier, legende }, rang) => {
      if (!/^[\w-]+\.png$/.test(fichier ?? ""))
        throw new Error(`captures.json[${rang}] : nom de fichier « ${fichier} »`);
      const attendues = languesDeFiche();
      const inconnues = Object.keys(legende ?? {}).filter((l) => !attendues.includes(l));
      if (inconnues.length > 0) throw new Error(`${fichier} : langue(s) inconnue(s) ${inconnues.join(", ")}`);
      for (const langue of attendues) {
        const texte = legende?.[langue];
        if (typeof texte !== "string" || texte.trim().length === 0 || texte.length > 280) {
          throw new Error(`${fichier} : légende ${langue} manquante ou trop longue`);
        }
      }
      if (vues.has(legende.fr)) throw new Error(`${fichier} : légende française en double`);
      vues.add(legende.fr);
      const image = await readFile(path.join(dossier, "captures", fichier));
      // En-tête PNG puis IHDR : largeur et hauteur en octets 16 à 23.
      if (image.subarray(1, 4).toString() !== "PNG") throw new Error(`${fichier} n'est pas un PNG`);
      const [largeur, hauteur] = [image.readUInt32BE(16), image.readUInt32BE(20)];
      if (largeur !== 1280 || hauteur !== 800)
        throw new Error(`${fichier} : ${largeur} × ${hauteur}, 1280 × 800 attendu`);
      return { fichier, legende: etendre(legende), image, position: rang }; // AMO compte à partir de 0
    }),
  );
}

/**
 * Les langues de l'extension (dossiers de _locales) et celles de la fiche
 * addons.mozilla.org qui les reçoivent. La première est celle sous laquelle
 * amo/fiche.json range la description ; les suivantes en reçoivent une copie
 * (variantes régionales), sans quoi leurs visiteurs verraient le français,
 * langue par défaut de la fiche. AMO ne propose ni l'arabe ni l'hindi pour le
 * texte d'une fiche (relevé le 18/11 dans l'espace développeur).
 */
export const LANGUES_AMO = Object.freeze({
  fr: ["fr"],
  en: ["en-US", "en-GB", "en-CA"],
  es: ["es-ES", "es-MX", "es-AR", "es-CL"],
  de: ["de"],
  it: ["it"],
  pt: ["pt-PT", "pt-BR"],
  nl: ["nl"],
  pl: ["pl"],
  zh_CN: ["zh-CN"],
  ja: ["ja"],
  ko: ["ko"],
  tr: ["tr"],
  ru: ["ru"],
  ar: [],
  hi: [],
});

/** Les langues sous lesquelles amo/ range ses textes : la première de chaque entrée de LANGUES_AMO. */
export const languesDeFiche = () =>
  Object.values(LANGUES_AMO)
    .filter((c) => c.length > 0)
    .map((c) => c[0]);

/** Un texte par langue de la fiche, copié vers ses variantes régionales (es-ES → es-MX…). */
export function etendre(textes) {
  const etendu = {};
  for (const codes of Object.values(LANGUES_AMO)) {
    if (codes.length === 0 || textes[codes[0]] === undefined) continue;
    for (const code of codes) etendu[code] = textes[codes[0]];
  }
  return etendu;
}

/** Les champs voulus sur la fiche, tirés du dépôt. */
export async function ficheVoulue() {
  const manifeste = await lireJson("extension", "manifest.json");
  const fiche = await lireJson("amo", "fiche.json");
  const voulue = { name: {}, summary: {}, description: {}, homepage: {}, categories: fiche.categories };
  for (const [dossier, codes] of Object.entries(LANGUES_AMO)) {
    if (codes.length === 0) continue;
    const messages = await lireJson("extension", "_locales", dossier, "messages.json");
    const description = fiche.description[codes[0]];
    if (!description) throw new Error(`amo/fiche.json : description « ${codes[0]} » manquante`);
    for (const code of codes) {
      voulue.name[code] = messages.extName.message;
      voulue.summary[code] = messages.extDescription.message;
      voulue.description[code] = description;
      voulue.homepage[code] = manifeste.homepage_url;
    }
  }
  return voulue;
}

/**
 * Le texte d'une description, pour comparer : l'API la rend avec ses adresses
 * changées en liens enveloppés (`outgoing.prod.mozaws.net/v1/…/<adresse>`) ;
 * on compare le texte, balises ôtées, liens déballés, entités décodées et
 * blancs réduits — l'API peut aussi rendre les retours à la ligne en <br>.
 * Le Markdown de la source (gras, puces, liens) est neutralisé de même : la
 * fiche peut le rendre en HTML.
 */
export function texteDe(html) {
  return (
    String(html ?? "")
      .replace(/https:\/\/outgoing\.prod\.mozaws\.net\/v1\/[0-9a-f]+\/([^"'\s<]+)/g, (_, cible) =>
        decodeURIComponent(cible),
      )
      .replace(/<br\s*\/?>/gi, " ")
      // Le Markdown que la fiche accepte, rendu ou non par l'API : liens, gras,
      // puces en début de ligne.
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*|__/g, "")
      .replace(/^[ \t]*[-*+][ \t]+/gm, "")
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&#([0-9]+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      // Après les entités : une balise que l'API rend échappée (&lt;b&gt;) part aussi.
      .replace(/<[^>]+>/g, " ")
      // Retours à la ligne, <br>, espaces insécables : la mise en forme ne compte pas.
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Une page d'accueil rendue par l'API : `{ url: {fr: …}, outgoing: … }`, ou déjà un objet de langues. */
const urlsDe = (champ) => champ?.url ?? champ ?? {};

/** Les champs de `voulue` que la fiche `enLigne` n'a pas, prêts pour un PATCH. */
export function ecarts(voulue, enLigne) {
  const champs = {};
  for (const cle of ["name", "summary", "description"]) {
    const actuel = enLigne[cle] ?? {};
    if (Object.entries(voulue[cle]).some(([langue, texte]) => texteDe(actuel[langue]) !== texteDe(texte))) {
      champs[cle] = voulue[cle];
    }
  }
  const accueil = urlsDe(enLigne.homepage);
  if (Object.entries(voulue.homepage).some(([langue, url]) => accueil[langue] !== url))
    champs.homepage = voulue.homepage;
  const categories = [enLigne.categories ?? []].flat();
  if ([...categories].sort().join() !== [...voulue.categories].sort().join()) champs.categories = voulue.categories;
  return champs;
}

/** Où un champ diffère, en clair et court (la fiche est publique). */
export function apercu(cle, voulu, enLigne) {
  const actuel = cle === "homepage" ? urlsDe(enLigne.homepage) : enLigne[cle];
  if (cle === "categories") return `${JSON.stringify(actuel)} → ${JSON.stringify(voulu)}`;
  for (const [langue, texte] of Object.entries(voulu)) {
    const a = texteDe(actuel?.[langue]);
    const b = texteDe(texte);
    if (a === b) continue;
    let i = 0;
    while (i < a.length && a[i] === b[i]) i += 1;
    return `${langue}, caractère ${i} : « ${a.slice(i, i + 40)} » au lieu de « ${b.slice(i, i + 40)} »`;
  }
  return "?";
}

/** L'icône montrée par la fiche est-elle celle par défaut ? */
export const iconeParDefaut = (enLigne) => /default/.test(enLigne.icon_url ?? "default");

/**
 * Ce qu'il faut faire pour que la fiche montre `voulues`, d'après ses captures
 * `enLigne`.
 *
 * Une capture SANS légende est celle qu'un passage a envoyée sans pouvoir la
 * légender (AMO a demandé d'attendre entre l'image et la légende) : s'il n'y en
 * a qu'une, elle est reprise pour la première capture manquante — c'est elle
 * que ce passage-là envoyait, les captures partant dans l'ordre — au lieu
 * d'être renvoyée en double.
 */
export function planifier(voulues, enLigne) {
  const parLegende = new Map(enLigne.filter((c) => c.caption?.fr).map((c) => [c.caption.fr, c]));
  const orphelines = enLigne.filter((c) => !c.caption?.fr);
  let aReprendre = orphelines.length === 1 ? orphelines[0] : null;
  const ajouter = [];
  const modifier = [];
  for (const capture of voulues) {
    const existante = parLegende.get(capture.legende.fr);
    if (!existante && aReprendre) {
      modifier.push({ ...capture, id: aReprendre.id, reprise: true });
      aReprendre = null;
    } else if (!existante) ajouter.push(capture);
    else if (
      existante.position !== capture.position ||
      Object.entries(capture.legende).some(([langue, texte]) => existante.caption?.[langue] !== texte)
    ) {
      modifier.push({ ...capture, id: existante.id });
    }
  }
  const voulu = new Set(voulues.map((c) => c.legende.fr));
  const reprises = new Set(modifier.filter((c) => c.reprise).map((c) => c.id));
  const etrangeres = enLigne.filter((c) => !voulu.has(c.caption?.fr) && !reprises.has(c.id));
  return { ajouter, modifier, etrangeres };
}

async function synchroniser(amo, id, captures) {
  const aSupprimer = (process.env.SUPPRIMER ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  for (const capture of aSupprimer) {
    if (!/^\d+$/.test(capture)) throw new Error(`SUPPRIMER : « ${capture} » n'est pas un identifiant de capture`);
    if (!(await amo.captures(id)).some((c) => String(c.id) === capture)) {
      console.log(`::warning::capture ${capture} absente de la fiche : rien à supprimer`);
      continue;
    }
    await amo.supprimerCapture(id, capture);
    console.log(`supprimée : capture ${capture}`);
  }

  const enLigne = await amo.fiche(id);
  const champs = ecarts(await ficheVoulue(), enLigne);
  if (Object.keys(champs).length > 0) {
    // Dit ce qui diffère AVANT d'écrire : une écriture refusée pour le débit
    // ne laisserait sinon aucune trace de la raison.
    for (const [cle, voulu] of Object.entries(champs)) console.log(`écart sur ${cle} : ${apercu(cle, voulu, enLigne)}`);
    await amo.modifierFiche(id, champs);
    console.log(`fiche : ${Object.keys(champs).join(", ")} remis d'aplomb`);
  }
  if (iconeParDefaut(enLigne)) {
    await amo.envoyerIcone(id, await readFile(path.join(racine, "extension", "icons", "icone-128.png")));
    console.log("fiche : icône envoyée");
  }

  const { ajouter, modifier, etrangeres } = planifier(captures, enLigne.previews ?? []);
  for (const c of modifier) {
    await amo.modifierCapture(id, c.id, { legende: c.legende, position: c.position });
    console.log(`capture ${c.reprise ? `${c.id} reprise et légendée` : "remise d'aplomb"} : ${c.fichier}`);
  }
  for (const c of ajouter) {
    await amo.ajouterCapture(id, { image: c.image, nom: c.fichier, legende: c.legende, position: c.position });
    console.log(`capture ajoutée : ${c.fichier}`);
  }
  for (const c of etrangeres) {
    console.log(
      `::warning::capture ${c.id} sur la fiche mais pas dans amo/captures.json (« ${c.caption?.fr ?? "sans légende"} ») : laissée en place`,
    );
  }
  console.log(`Fiche à jour : ${(await amo.captures(id)).length} capture(s).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const captures = await chargerCaptures();
  await ficheVoulue();
  if (process.argv.includes("--verifier")) {
    console.log(`Fiche prête, ${captures.length} captures : ${captures.map((c) => c.fichier).join(", ")}`);
    process.exit(0);
  }
  try {
    process.loadEnvFile(path.join(racine, ".env"));
  } catch (erreur) {
    if (erreur.code !== "ENOENT") throw erreur;
  }
  const { WEB_EXT_API_KEY: cle, WEB_EXT_API_SECRET: secret } = process.env;
  if (!cle || !secret) throw new Error("WEB_EXT_API_KEY et WEB_EXT_API_SECRET manquent");
  const { id } = (await lireJson("extension", "manifest.json")).browser_specific_settings.gecko;
  try {
    await synchroniser(client({ cle, secret }), id, captures);
  } catch (erreur) {
    if (!(erreur instanceof DebitEpuise)) throw erreur;
    console.log(`::notice::${erreur.message} : arrêt, le prochain passage reprendra.`);
  }
}
