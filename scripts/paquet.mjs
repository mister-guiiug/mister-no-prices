#!/usr/bin/env node
/**
 * Le paquet de déploiement : tout ce qu'il faut pour installer l'extension sans
 * passer par addons.mozilla.org ni par ce dépôt — et, avec les clés d'API, la
 * soumission de la version au catalogue d'addons.mozilla.org.
 *
 *   web-ext-artifacts/mister-no-prices-<version>/
 *   ├── mister-no-prices-<version>.zip   l'extension, non signée
 *   ├── mister-no-prices-<version>.xpi   la même, signée par Mozilla (si clés)
 *   ├── INSTALLER.md                    les façons d'installer, pas à pas
 *   ├── policies.json                   imposer l'extension sur un poste
 *   ├── updates.json                    ce que Firefox lit pour se mettre à
 *   │                                   jour seul (avec le .xpi seulement)
 *   └── SHA256SUMS                      empreintes des deux extensions
 *
 * Signature : Firefox n'installe durablement qu'une extension signée. Avec
 * WEB_EXT_API_KEY et WEB_EXT_API_SECRET (clés d'API d'addons.mozilla.org) —
 * dans l'environnement, ou dans un fichier `.env` à la racine, que git ignore —,
 * le script SOUMET la version au catalogue public (canal « listed »), avec la
 * fiche de `amo/fiche.json`. Mozilla ne la signe qu'une fois approuvée : le
 * script attend ATTENTE_MINUTES (15 par défaut), puis, si la version est encore
 * en relecture, s'arrête sans paquet — et le dit. Relancé plus tard, il la
 * retrouve sur AMO au lieu de la soumettre à nouveau, et télécharge le fichier
 * signé si elle est publiée. Sans les clés, le paquet sort sans `.xpi`, et le
 * dit. EXIGER_SIGNATURE=1 transforme ce manque en échec.
 *
 * Dans un workflow, il écrit `signe=oui|non` dans GITHUB_OUTPUT.
 *
 * Mozilla n'accepte qu'une fois un numéro de version, tous canaux confondus.
 * Monter la version d'abord (manifeste et package.json, que les tests gardent
 * alignés). NE PAS lancer ce script sur un poste où le `.env` porte les clés,
 * sauf pour publier : il soumettrait la version.
 *
 * C'est ce script que joue publication.yml à chaque version nouvelle sur main.
 */
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import webExt from "web-ext";
import { API, client, estDebitLimite, etatDe } from "./amo.mjs";
import { manifesteDeMiseAJour, nomXpi } from "./mises-a-jour.mjs";

const racine = path.resolve(import.meta.dirname, "..");
const source = path.join(racine, "extension");

// Les clés d'API, sur le poste : un `.env` ignoré par git. Une variable déjà
// présente dans l'environnement (la CI) l'emporte sur le fichier.
try {
  process.loadEnvFile(path.join(racine, ".env"));
} catch (erreur) {
  if (erreur.code !== "ENOENT") throw erreur;
}
const lireJson = async (fichier) => JSON.parse(await readFile(fichier, "utf8"));
/** Une sortie du pas de workflow, si le script tourne dans un workflow. */
const sortie = async (cle, valeur) => {
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `${cle}=${valeur}
`,
    );
};

const manifeste = await lireJson(path.join(source, "manifest.json"));
const { version: versionPaquet } = await lireJson(path.join(racine, "package.json"));
const { version } = manifeste;
const id = manifeste.browser_specific_settings.gecko.id;
if (versionPaquet !== version) {
  throw new Error(`package.json (${versionPaquet}) et manifest.json (${version}) divergent`);
}

const nom = `mister-no-prices-${version}`;
const dossier = path.join(racine, "web-ext-artifacts", nom);
await rm(dossier, { recursive: true, force: true });
await mkdir(dossier, { recursive: true });

const empreinte = async (fichier) =>
  createHash("sha256")
    .update(await readFile(path.join(dossier, fichier)))
    .digest("hex");

// 1. L'extension non signée.
await webExt.cmd.build(
  {
    sourceDir: source,
    artifactsDir: dossier,
    filename: `${nom}.zip`,
    overwriteDest: true,
  },
  { shouldExitProgram: false },
);
const extensions = [`${nom}.zip`];

// 2. La même, signée par Mozilla une fois publiée sur son catalogue, si les
//    clés sont là. Déjà soumise (un passage précédent) : on ne la soumet pas
//    à nouveau, on regarde où en est sa relecture.
const { WEB_EXT_API_KEY: apiKey, WEB_EXT_API_SECRET: apiSecret } = process.env;
if (apiKey && apiSecret) {
  const amo = client({ cle: apiKey, secret: apiSecret });
  let enLigne = await amo.version(id, version);
  if (enLigne) {
    console.log(`${version} est déjà sur addons.mozilla.org (canal ${enLigne.channel}) : pas de nouvelle soumission.`);
  } else {
    const telechargement = path.join(dossier, ".signature");
    try {
      await webExt.cmd.sign(
        {
          sourceDir: source,
          artifactsDir: telechargement,
          apiKey,
          apiSecret,
          channel: "listed",
          amoBaseUrl: API,
          amoMetadata: path.join(racine, "amo", "fiche.json"),
          // L'attente est faite ci-dessous, avec un délai qui ne fait pas échouer.
          approvalTimeout: 0,
        },
        { shouldExitProgram: false },
      );
    } catch (erreur) {
      // AMO LIMITE LE DÉBIT DES SOUMISSIONS (429), parfois pour des heures :
      // relevé le 23/11/2026, « Expected available in 40287 seconds ». Ce
      // n'est pas un échec de la version : le passage s'arrête en vert, et le
      // passage planifié suivant de publication.yml reprend — il retrouve la
      // version sur AMO si elle y est arrivée, la soumet sinon. Repris de
      // mister-no-noise, qui le faisait déjà.
      if (estDebitLimite(erreur)) {
        console.log(
          `::notice::addons.mozilla.org limite le débit des soumissions : reprise au prochain passage. (${String(erreur?.message ?? erreur).slice(0, 200)})`,
        );
        await sortie("signe", "non");
        await rm(dossier, { recursive: true, force: true });
        process.exit(0);
      }
      throw erreur;
    }
    await rm(telechargement, { recursive: true, force: true });
  }
  const minutes = Number(process.env.ATTENTE_MINUTES ?? 15);
  enLigne = await amo.attendre(id, version, { delai: minutes * 60_000 });
  if (!enLigne) throw new Error(`${version} introuvable sur addons.mozilla.org après la soumission`);
  if (enLigne.channel !== "listed") {
    throw new Error(
      `${version} a été signée hors catalogue (canal ${enLigne.channel}) : monter la version pour la publier`,
    );
  }
  const etat = etatDe(enLigne);
  if (etat === "refusee") {
    throw new Error(
      `${version} a été refusée par addons.mozilla.org : lire le motif dans le tableau de bord du développeur`,
    );
  }
  if (etat === "en-relecture") {
    console.log(
      `::notice::${version} est soumise à addons.mozilla.org et attend sa relecture : pas de paquet ni de release pour l'instant. Le prochain passage reprendra.`,
    );
    await sortie("signe", "non");
    await rm(dossier, { recursive: true, force: true });
    process.exit(0);
  }
  await amo.telecharger(enLigne, path.join(dossier, nomXpi(version)));
  extensions.push(nomXpi(version));
} else if (process.env.EXIGER_SIGNATURE) {
  throw new Error("EXIGER_SIGNATURE : WEB_EXT_API_KEY et WEB_EXT_API_SECRET manquent");
} else {
  console.warn(
    "Sans clés d'API Mozilla : paquet SANS .xpi signé (installation durable impossible hors Developer Edition).",
  );
}

// 3. Le guide et la stratégie, à la version et à l'identifiant du manifeste.
const remplir = (texte) => texte.replaceAll("{{version}}", version).replaceAll("{{id}}", id);
const annexes = ["INSTALLER.md", "policies.json"];
for (const fichier of annexes) {
  const modele = await readFile(path.join(racine, "deploiement", fichier), "utf8");
  await writeFile(path.join(dossier, fichier), remplir(modele));
}
JSON.parse(await readFile(path.join(dossier, "policies.json"), "utf8"));

// 4. Le manifeste de mise à jour, qui n'a de sens qu'avec le fichier signé.
if (extensions.includes(nomXpi(version))) {
  const misesAJour = manifesteDeMiseAJour(manifeste, await empreinte(nomXpi(version)));
  await writeFile(path.join(dossier, "updates.json"), `${JSON.stringify(misesAJour, null, 2)}\n`);
  annexes.push("updates.json");
}

// 5. Les empreintes, au format de `sha256sum -c`.
const empreintes = [];
for (const fichier of extensions) empreintes.push(`${await empreinte(fichier)}  ${fichier}\n`);
await writeFile(path.join(dossier, "SHA256SUMS"), empreintes.join(""));

console.log(`\nPaquet ${nom} : ${path.relative(racine, dossier)}`);
for (const fichier of [...extensions, ...annexes, "SHA256SUMS"]) console.log(`  ${fichier}`);
await sortie("signe", extensions.includes(nomXpi(version)) ? "oui" : "non");
