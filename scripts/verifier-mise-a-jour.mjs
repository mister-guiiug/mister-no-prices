#!/usr/bin/env node
/**
 * Rejoue une MISE À JOUR de l'extension et vérifie qu'on peut accorder les accès
 * aux sites qu'elle ajoute.
 *
 *   npm run verifier:mise-a-jour
 *
 * Le piège : Firefox accorde les accès d'une extension à son installation, pas
 * ceux qu'une mise à jour ajoute. Installée en 1.0.0 (Amazon seul) puis mise à
 * jour, l'extension ne tournait pas sur Dealabs : un clic sur l'icône l'y
 * lançait pour la page ouverte, et les prix revenaient à la page suivante.
 *
 * Le script installe la 1.0.0 (tirée de l'historique git), met à jour vers la
 * version du dossier extension/, puis vérifie :
 *   1. que Dealabs n'est pas accessible et que le popup le signale ;
 *   2. qu'un clic sur « Autoriser » accorde l'accès ;
 *   3. que les prix sont masqués sur Dealabs, page après page, clic compris.
 *
 * La boîte de dialogue de Firefox qui confirme l'accord est passée par la
 * préférence `extensions.webextOptionalPermissionPrompts`, sur ce seul profil
 * jetable : c'est le popup qu'on éprouve, pas la boîte.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer-core";

const RACINE = resolve(import.meta.dirname, "..");
const EXTENSION = resolve(RACINE, "extension");
const VERSION_1_0 = "a21f368"; // premier commit : Amazon seul
const ID = JSON.parse(readFileSync(resolve(EXTENSION, "manifest.json"), "utf8")).browser_specific_settings.gecko.id;

const FIREFOX = [
  process.env.FIREFOX,
  "C:/Program Files/Mozilla Firefox/firefox.exe",
  "/Applications/Firefox.app/Contents/MacOS/firefox",
  "/usr/bin/firefox",
].find((chemin) => chemin && existsSync(chemin));
if (!FIREFOX) throw new Error("Firefox introuvable : indiquer son chemin dans FIREFOX.");

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// La 1.0.0, extraite de l'historique dans un dossier temporaire.
const ancienne = mkdtempSync(join(tmpdir(), "sans-prix-1.0-"));
const archive = execFileSync("git", ["archive", VERSION_1_0, "extension"], { cwd: RACINE });
execFileSync("tar", ["-x", "-C", ancienne], { input: archive });
// La 1.0.0 portait l'identifiant `sans-prix@mister-guiiug`, abandonné avant
// toute publication. Sous un autre identifiant, Firefox y verrait une seconde
// extension et non une mise à jour : on lui donne celui d'aujourd'hui.
const manifeste10 = join(ancienne, "extension", "manifest.json");
const ancien = JSON.parse(readFileSync(manifeste10, "utf8"));
ancien.browser_specific_settings.gecko.id = ID;
writeFileSync(manifeste10, JSON.stringify(ancien, null, 2));

const navigateur = await puppeteer.launch({
  browser: "firefox",
  executablePath: FIREFOX,
  headless: !process.env.VISIBLE,
  defaultViewport: { width: 1366, height: 900 },
  env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: "1" },
  extraPrefsFirefox: {
    "intl.accept_languages": "fr-FR, fr",
    "extensions.webextOptionalPermissionPrompts": false,
  },
});

/** Évalue une expression dans la fenêtre de Firefox elle-même. */
async function dansFirefox(expression) {
  const { result: arbre } = await navigateur.connection.send("browsingContext.getTree", {
    "moz:scope": "chrome",
  });
  const fenetre = arbre.contexts.find((c) => c.url === "chrome://browser/content/browser.xhtml");
  const { result } = await navigateur.connection.send("script.evaluate", {
    target: { context: fenetre.context },
    awaitPromise: true,
    expression,
  });
  if (result.type === "exception") throw new Error(result.exceptionDetails?.text);
  return result.result?.value;
}

const accesDealabs = () =>
  dansFirefox(`WebExtensionPolicy.getByID(${JSON.stringify(ID)}).allowedOrigins.matches("https://www.dealabs.com/")`);

async function ouvrirPopup() {
  const deja = new Set(await navigateur.pages());
  await dansFirefox(`(gBrowser.selectedTab = gBrowser.addTab(
    WebExtensionPolicy.getByID(${JSON.stringify(ID)}).getURL("popup/popup.html"),
    { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() },
  ), true)`);
  for (let i = 0; i < 60; i += 1) {
    await attendre(250);
    const page = (await navigateur.pages()).find((p) => !deja.has(p));
    if (page) {
      await attendre(800);
      return page;
    }
  }
  throw new Error("Le popup ne s'est pas ouvert.");
}

/** L'extension a-t-elle agi sur la page, et reste-t-il un montant lisible ? */
async function etatDealabs(page) {
  return page.evaluate(() => {
    const masque = Boolean(document.querySelector("style[data-sans-prix]"));
    const plages = CSS.highlights.get("sans-prix")?.size ?? 0;
    const prix = [...document.querySelectorAll(".thread-price")].filter(
      (e) => getComputedStyle(e).color !== "rgba(0, 0, 0, 0)" && e.getClientRects().length > 0,
    ).length;
    return { masque, plages, prixLisibles: prix };
  });
}

const controles = [];
const controler = (nom, ok, detail = "") => {
  controles.push(ok);
  console.log(`  ${ok ? "✔" : "✘"} ${nom}${detail ? `  (${detail})` : ""}`);
};

try {
  await navigateur.installExtension(join(ancienne, "extension"));
  await navigateur.installExtension(EXTENSION);
  console.log("1.0.0 installée, puis mise à jour vers la version du dossier");

  controler("Dealabs n'est pas accessible après la mise à jour", !(await accesDealabs()));

  const popup = await ouvrirPopup();
  const encart = await popup.$eval("#acces", (e) => ({ visible: !e.hidden, texte: e.textContent.trim() }));
  controler("le popup signale les sites à autoriser", encart.visible, encart.texte.slice(0, 90) + "…");
  mkdirSync(resolve(RACINE, "captures"), { recursive: true });
  await (await popup.$("main")).screenshot({ path: resolve(RACINE, "captures/popup-acces.png") });

  await popup.click("#acces-bouton");
  await attendre(1500);
  controler("un clic sur « Autoriser » accorde l'accès", await accesDealabs());
  const apres = await popup.$eval("#acces", (e) => e.hidden);
  controler("l'encart disparaît une fois l'accès accordé", apres);

  const page = await navigateur.newPage();
  await page.goto("https://www.dealabs.com/", { waitUntil: "load" });
  await attendre(2000);
  let etat = await etatDealabs(page);
  controler("prix masqués sur l'accueil de Dealabs", etat.masque && etat.prixLisibles === 0, JSON.stringify(etat));

  await page.evaluate(() => document.querySelector("a.thread-link, strong.thread-title a")?.click());
  await attendre(5000);
  etat = await etatDealabs(page);
  controler(
    "prix masqués sur la page suivante, ouverte d'un clic",
    etat.masque && etat.prixLisibles === 0,
    `${page.url().slice(0, 60)}… ${JSON.stringify(etat)}`,
  );
} finally {
  await navigateur.close();
  rmSync(ancienne, { recursive: true, force: true });
}
process.exitCode = controles.every(Boolean) ? 0 : 1;
