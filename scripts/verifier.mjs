#!/usr/bin/env node
/**
 * Vérifie l'extension sur les vrais sites, dans le Firefox installé sur le poste.
 *
 *   npm run verifier                              # tous les sites, sans fenêtre
 *   SITES=amazon.fr,cdiscount.com npm run verifier
 *   VISIBLE=1 npm run verifier                    # avec la fenêtre
 *   FIREFOX="C:/…/firefox.exe" npm run verifier
 *   MOBILE=1 npm run verifier                     # en Firefox pour Android
 *
 * Pour chaque site, une page de liste puis une fiche produit. Sur chacune, il
 * relève les montants encore LISIBLES — ni sous une barre, ni floutés, ni hors
 * écran —, y compris dans le titre de l'onglet. Ces sites changent leur
 * balisage sans prévenir : c'est ce relevé qui le dira. Il essaie enfin le popup
 * (interrupteur, apparence) et laisse des captures dans captures/.
 *
 * Sur chaque fiche, il attend le bouton ♥ « Ma liste » et l'actionne ; à la
 * fin, il ouvre la page de la liste d'envies et vérifie que les articles y sont,
 * prix masqués, puis visibles à la demande.
 *
 * MOBILE=1 se présente comme Firefox pour Android (agent utilisateur, écran de
 * téléphone, pointeur « coarse ») : les boutiques servent alors leur site
 * mobile, au balisage souvent différent. Ce n'est pas un téléphone — les API
 * propres à Android ne sont pas en jeu —, mais c'est le balisage qu'il recevra.
 *
 * Un site qui répond par une vérification anti-robot est noté « non vérifié » :
 * le script ne la contourne pas. VISIBLE=1 permet de la passer soi-même.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";
import { PAGES } from "./pages.mjs";

const RACINE = resolve(import.meta.dirname, "..");
const MOBILE = process.env.MOBILE === "1";
const AGENT_ANDROID = "Mozilla/5.0 (Android 15; Mobile; rv:146.0) Gecko/146.0 Firefox/146.0";
const EXTENSION = resolve(RACINE, "extension");
const CAPTURES = resolve(RACINE, MOBILE ? "captures/mobile" : "captures");

const SITES = process.env.SITES ? process.env.SITES.split(",") : Object.keys(PAGES);

const ID_EXTENSION = JSON.parse(readFileSync(resolve(EXTENSION, "manifest.json"), "utf8")).browser_specific_settings
  .gecko.id;
const DETECTION = readFileSync(resolve(EXTENSION, "content/detection.js"), "utf8");

function trouverFirefox() {
  const candidats = [
    process.env.FIREFOX,
    "C:/Program Files/Mozilla Firefox/firefox.exe",
    "C:/Program Files (x86)/Mozilla Firefox/firefox.exe",
    "/Applications/Firefox.app/Contents/MacOS/firefox",
    "/usr/bin/firefox",
    "/snap/bin/firefox",
  ].filter(Boolean);
  const trouve = candidats.find((chemin) => existsSync(chemin));
  if (!trouve) throw new Error("Firefox introuvable : indiquer son chemin dans FIREFOX.");
  return trouve;
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/** Le site a répondu par une vérification anti-robot : on s'arrête là pour lui. */
class Bloque extends Error {}

async function preparer(page, url) {
  try {
    await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  } catch (erreur) {
    // Un site qui ne répond pas ne doit pas emporter la vérification des autres.
    if (erreur.name === "TimeoutError") throw new Bloque(`délai dépassé sur ${url}`);
    throw erreur;
  }
  const robot = await page.evaluate(
    () =>
      Boolean(
        document.querySelector(
          'form[action*="validateCaptcha"], #captchacharacters, iframe[src*="captcha-delivery"], #challenge-form, iframe[src*="challenges.cloudflare"], #px-captcha',
        ),
      ) ||
      /robot|captcha|just a moment|un instant|access denied|accès refusé|pardon our interruption/i.test(
        document.title,
      ) ||
      // L'interstitiel d'Amazon : un seul bouton « Continuer vos achats ».
      /continuer vos achats|continue shopping|continua con gli acquisti/i.test(
        document.body?.innerText.slice(0, 2000) ?? "",
      ) ||
      // Milanuncios : « ¡Ups! Algo se detuvo », visite interrompue.
      /algo se detuvo/i.test(document.body?.innerText.slice(0, 500) ?? "") ||
      // La page /sorry de Google : « trafic inhabituel », avec un captcha.
      location.pathname.startsWith("/sorry/"),
  );
  if (robot) throw new Bloque(`vérification anti-robot sur ${url}`);

  // Laisse aux carrousels, aux blocs différés et au bandeau des cookies le
  // temps d'arriver ; le bandeau est refusé à chaque étape, il vient tard.
  await refuserCookies(page);
  await attendre(1_500);
  await refuserCookies(page);
  await page.evaluate(() => window.scrollTo(0, (document.body?.scrollHeight ?? 0) / 2));
  await attendre(1_500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await refuserCookies(page);
  await attendre(1_000);
}

/** Bandeau des cookies : on refuse ce qui n'est pas nécessaire. */
async function refuserCookies(page) {
  await page.evaluate(() => {
    const REFUS =
      /^(tout\s+)?refuser( tout)?$|^refuser les cookies( optionnels| non essentiels)?$|^continuer sans accepter$|^uniquement les essentiels$|^reject all$|^rifiuta( tutto)?$|^alle ablehnen$|^ablehnen$|^rechazar( todo| todas)?$|^alles weigeren$|^weigeren$|^decline/i;
    const bouton =
      document.querySelector(
        "#sp-cc-rejectall-link, #didomi-notice-disagree-button, .didomi-continue-without-agreeing",
      ) ??
      [...document.querySelectorAll("button, a, [role=button], span")].find(
        (b) => REFUS.test(b.textContent.trim()) && b.getClientRects().length > 0,
      );
    bouton?.click();
  });
}

/** Relève, dans la page, les montants qu'un œil lirait encore. */
async function releverMontantsVisibles(page) {
  await page.evaluate(DETECTION);
  return page.evaluate(() => {
    const { trouverMontants } = globalThis.SansPrixDetection;
    const surlignage = CSS.highlights.get("sans-prix");
    const plages = surlignage ? [...surlignage] : [];
    const largeurPage = document.documentElement.scrollWidth;

    const floute = (element) => {
      for (let e = element; e; e = e.parentElement) {
        if (getComputedStyle(e).filter.includes("blur")) return true;
      }
      return false;
    };
    // Le texte réservé aux lecteurs d'écran (.a-offscreen, .sr-only…) est rogné
    // à un pixel par `clip` ou `clip-path` : il ne se lit pas à l'écran.
    const rogne = (element) => {
      for (let e = element, n = 0; e && n < 4; e = e.parentElement, n += 1) {
        const s = getComputedStyle(e);
        if (s.clip !== "auto" || s.clipPath !== "none") return true;
      }
      return false;
    };
    const lisible = (element) => {
      const style = getComputedStyle(element);
      if (style.visibility !== "visible" || style.color === "rgba(0, 0, 0, 0)") return false;
      return !floute(element) && !rogne(element);
    };
    const aLEcran = (rects) =>
      [...rects].some((r) => r.width > 1 && r.height > 1 && r.right > 0 && r.left < largeurPage);
    const chemin = (element) => {
      const parts = [];
      for (let e = element; e && parts.length < 4; e = e.parentElement) {
        const classes = [...e.classList].slice(0, 2).join(".");
        parts.unshift(e.tagName.toLowerCase() + (e.id ? `#${e.id}` : "") + (classes ? `.${classes}` : ""));
      }
      return parts.join(" > ");
    };

    // Un morceau de prix : des chiffres ou une devise, mais pas une remise « -21 % ».
    const EST_MORCEAU = /^(?!\s*-?\d+\s*%\s*$).*[\d€$£¥￥₹]/s;
    const restes = [];

    // 0. Le titre de l'onglet.
    for (const { debut, fin } of trouverMontants(document.title)) {
      restes.push({ texte: document.title.slice(debut, fin), ou: "titre de l'onglet" });
    }

    // 1. Montants d'un seul tenant dans un nœud texte : le repérage doit les couvrir.
    const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let total = 0;
    for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
      const parent = n.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(parent.nodeName)) continue;
      for (const { debut, fin } of trouverMontants(n.data)) {
        total += 1;
        const couvert = plages.some((p) => p.startContainer === n && p.startOffset <= debut && p.endOffset >= fin);
        if (couvert || !lisible(parent)) continue;
        const r = document.createRange();
        r.setStart(n, debut);
        r.setEnd(n, fin);
        if (!aLEcran(r.getClientRects())) continue;
        restes.push({ texte: n.data.slice(debut, fin), ou: chemin(parent) });
      }
    }

    // 2. Montants éclatés sur plusieurs nœuds (« 34 » « €99 ») : la regex ne les
    //    voit pas nœud par nœud. On cherche les petits éléments dont le texte
    //    entier est un montant sans qu'aucun de leurs nœuds visibles n'en porte un
    //    entier, puis on regarde si un morceau chiffré reste lisible ; le libellé
    //    « Conseillé : », lui, peut l'être.
    const textes = (e) => {
      const liste = [];
      const m = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
      for (let t = m.nextNode(); t; t = m.nextNode()) liste.push(t);
      return liste;
    };
    const signales = new Set();
    for (const e of document.body.querySelectorAll("span, div, td, a, b, strong, p, sup, sub")) {
      const texte = e.textContent.trim();
      if (texte.length === 0 || texte.length > 30 || e.children.length === 0) continue;
      if (trouverMontants(texte).length === 0) continue;
      const noeuds = textes(e).filter((t) => !rogne(t.parentElement));
      if (noeuds.some((t) => trouverMontants(t.data).length > 0 && !/^\s*[€$£]/.test(t.data))) {
        continue;
      }
      // Un nœud dont les montants sont tous surlignés est déjà couvert : « $25.00 »
      // commence par sa devise, mais le repérage dans le texte l'a pris.
      const surligne = (t) => {
        const montants = trouverMontants(t.data);
        return (
          montants.length > 0 &&
          montants.every(({ debut, fin }) =>
            plages.some((p) => p.startContainer === t && p.startOffset <= debut && p.endOffset >= fin),
          )
        );
      };
      // Un badge de remise « 10 » « % » en deux nœuds reste visible, volontairement.
      const remise = (t) => {
        for (let e = t.parentElement, n = 0; e && n < 2; e = e.parentElement, n += 1) {
          if (/^\s*-?\s*\d+([.,]\d+)?\s*%\s*$/.test(e.textContent)) return true;
        }
        return false;
      };
      const lisibles = noeuds.filter(
        (t) =>
          EST_MORCEAU.test(t.data) &&
          !surligne(t) &&
          !remise(t) &&
          lisible(t.parentElement) &&
          aLEcran(t.parentElement.getClientRects()),
      );
      // Un morceau remonte par chacun de ses ancêtres : on ne le signale qu'une fois.
      if (lisibles.length === 0 || lisibles.some((t) => signales.has(t))) continue;
      for (const t of lisibles) signales.add(t);
      restes.push({
        texte,
        ou: chemin(e),
        eclate: true,
        lisibles: lisibles.map((t) => `« ${t.data.trim()} » dans ${chemin(t.parentElement)}`),
      });
    }

    return {
      feuille: Boolean(document.querySelector("style[data-sans-prix]")),
      surlignage: Boolean(surlignage),
      plages: plages.length,
      eclates: document.querySelectorAll("[data-sans-prix-eclate]").length,
      montantsTexte: total,
      restes,
    };
  });
}

/**
 * Ouvre le popup dans un onglet. WebDriver BiDi refuse de naviguer vers une
 * adresse moz-extension:// ; on passe par la fenêtre de Firefox elle-même, ce
 * que MOZ_REMOTE_ALLOW_SYSTEM_ACCESS autorise sur ce profil jetable.
 */
async function ouvrirPageExtension(navigateur, chemin) {
  const dejaOuvertes = new Set(await navigateur.pages());
  const { result: arbre } = await navigateur.connection.send("browsingContext.getTree", {
    "moz:scope": "chrome",
  });
  const fenetre = arbre.contexts.find((c) => c.url === "chrome://browser/content/browser.xhtml");
  if (!fenetre) throw new Error("Fenêtre de Firefox introuvable.");
  const { result } = await navigateur.connection.send("script.evaluate", {
    target: { context: fenetre.context },
    awaitPromise: false,
    expression: `gBrowser.selectedTab = gBrowser.addTab(
      WebExtensionPolicy.getByID(${JSON.stringify(ID_EXTENSION)}).getURL(${JSON.stringify(chemin)}),
      { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() },
    ), true`,
  });
  // Une exception dans la fenêtre revient comme une RÉPONSE, pas comme une erreur.
  if (result.type === "exception") {
    throw new Error(`Ouverture de ${chemin} refusée : ${result.exceptionDetails?.text}`);
  }
  for (let essai = 0; essai < 60; essai += 1) {
    await attendre(250);
    const nouvelle = (await navigateur.pages()).find((p) => !dejaOuvertes.has(p));
    if (nouvelle) {
      await attendre(500);
      return nouvelle;
    }
  }
  throw new Error(`${chemin} ne s'est pas ouvert.`);
}

/**
 * Le bouton ♥ de la fiche : attendu quelques secondes (les données structurées
 * arrivent parfois tard), puis actionné. Rend null s'il n'est pas venu.
 */
async function essayerEnvie(page) {
  for (let essai = 0; essai < 16; essai += 1) {
    const etat = await page.evaluate(() => {
      const bouton = document.querySelector("sans-prix-envie")?.shadowRoot?.querySelector("button");
      return bouton ? bouton.getAttribute("aria-pressed") : null;
    });
    if (etat === "true") return true;
    if (etat === "false") {
      await page.evaluate(() => document.querySelector("sans-prix-envie").shadowRoot.querySelector("button").click());
      await attendre(800);
      continue;
    }
    await attendre(500);
  }
  return false;
}

async function etatPage(page) {
  return page.evaluate(() => ({
    actif: document.documentElement.getAttribute("data-sans-prix"),
    style: document.documentElement.getAttribute("data-sans-prix-style"),
    surlignage: CSS.highlights.has("sans-prix"),
    titre: document.title.slice(0, 60),
  }));
}

/**
 * Visite les pages d'un site ; rend [nom, verdict] pour chacune. Soit une liste
 * et la fiche qu'on y trouve, soit des adresses fixes (`urls`), pour un site
 * sans fiche produit comme un moteur de recherche.
 */
/** Les sites dont la fiche a été ajoutée à la liste d'envies. */
const envies = [];

async function verifierSite(page, site) {
  const pages = PAGES[site];
  if (!pages) throw new Error(`Site inconnu : ${site} (connus : ${Object.keys(PAGES).join(", ")})`);
  const verdicts = [];
  let aVisiter;
  if (pages.urls) {
    aVisiter = Object.entries(pages.urls);
  } else {
    await preparer(page, pages.liste);
    const lienFiche = await page.evaluate(
      (selecteurs) => selecteurs.map((s) => document.querySelector(s)?.href).find(Boolean) ?? null,
      [pages.fiche].flat(),
    );
    aVisiter = [
      ["liste", pages.liste],
      ["fiche", lienFiche],
    ];
  }

  for (const [genre, url] of aVisiter) {
    const nom = `${site}-${genre}`;
    if (!url) {
      console.log(`\n${nom} — aucun lien de fiche trouvé (${pages.fiche})`);
      verdicts.push([nom, "✘"]);
      continue;
    }
    if (pages.urls || genre === "fiche") await preparer(page, url);
    const releve = await releverMontantsVisibles(page);
    await page.screenshot({ path: resolve(CAPTURES, `${nom}.png`) });
    console.log(
      `\n${nom} — feuille du site ${releve.feuille ? "posée" : "ABSENTE"}, ` +
        `surlignage ${releve.surlignage ? "posé" : "ABSENT"}, ${releve.plages} plage(s), ` +
        `${releve.eclates} prix éclaté(s) marqué(s), ${releve.montantsTexte} montant(s) dans le texte`,
    );
    if (genre === "fiche") console.log(`  ${url}`);
    if (releve.restes.length === 0) console.log("  ✔ aucun montant lisible");
    for (const r of releve.restes.slice(0, 25)) {
      console.log(`  ✘ « ${r.texte} »${r.eclate ? " (éclaté)" : ""}  ←  ${r.ou}`);
      for (const l of r.lisibles ?? []) console.log(`      lisible : ${l}`);
    }
    if (releve.restes.length > 25) console.log(`  … et ${releve.restes.length - 25} autres`);
    const ok = releve.feuille && releve.surlignage && releve.restes.length === 0;
    verdicts.push([nom, ok ? "✔" : "✘"]);
    if (genre === "fiche" && pages.envies !== false) {
      const envie = await essayerEnvie(page);
      console.log(envie ? "  ♥ ajouté à la liste d'envies" : "  ✘ pas de bouton ♥ « Ma liste »");
      verdicts.push([`${nom} ♥`, envie ? "✔" : "✘"]);
      if (envie) envies.push(site);
    }
  }
  return verdicts;
}

mkdirSync(CAPTURES, { recursive: true });
const navigateur = await puppeteer.launch({
  browser: "firefox",
  executablePath: trouverFirefox(),
  headless: !process.env.VISIBLE,
  defaultViewport: MOBILE ? { width: 412, height: 915 } : { width: 1366, height: 900 },
  env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: "1" },
  extraPrefsFirefox: {
    "intl.accept_languages": "fr-FR, fr",
    // Pointeur « coarse » : la mise en page au doigt du popup et de la liste.
    ...(MOBILE ? { "general.useragent.override": AGENT_ANDROID, "ui.primaryPointerCapabilities": 1 } : {}),
  },
});

const bilan = [];
let popupOk = false;
try {
  await navigateur.installExtension(EXTENSION);
  // Un onglet par site : une page restée coincée sur une vérification anti-robot
  // ferait sinon dépasser le délai à tous les sites suivants. On garde le
  // dernier onglet vérifié pour l'essai du popup.
  let page = null;
  for (const site of SITES) {
    const onglet = await navigateur.newPage();
    try {
      bilan.push(...(await verifierSite(onglet, site)));
      await page?.close();
      page = onglet;
    } catch (erreur) {
      if (!(erreur instanceof Bloque)) throw erreur;
      console.log(`\n${site} — NON VÉRIFIÉ : ${erreur.message} (non contournée)`);
      bilan.push([site, "non vérifié"]);
      await onglet.close().catch(() => {});
    }
  }
  page ??= await navigateur.newPage();

  // Le popup, ouvert comme une page : l'interrupteur et l'apparence agissent en
  // direct sur la dernière page visitée.
  const popup = await ouvrirPageExtension(navigateur, "popup/popup.html");
  await (await popup.$("main")).screenshot({ path: resolve(CAPTURES, "popup.png") });
  console.log(`\npopup — « ${await popup.$eval("#sites", (e) => e.textContent)} »`);
  await page.bringToFront();
  const depart = await etatPage(page);
  console.log("  au départ   ", depart);
  await popup.click('input[name="style"][value="flou"]');
  await attendre(500);
  console.log("  flou        ", await etatPage(page));
  await page.screenshot({ path: resolve(CAPTURES, "flou.png") });
  await popup.click("#actif");
  await attendre(500);
  const pause = await etatPage(page);
  console.log("  en pause    ", pause);
  await page.screenshot({ path: resolve(CAPTURES, "pause.png") });
  // « au départ » doit porter les attributs : une page qui les efface (Decathlon) les
  // perdait, et avec eux le flou ou la pause choisis.
  popupOk = depart.actif === "on" && pause.actif === "off" && !pause.surlignage;
  bilan.push(["popup", popupOk ? "✔" : "✘"]);
  // Remet les réglages par défaut (le profil est jetable, mais autant finir propre).
  await popup.click("#actif");
  await popup.click('input[name="style"][value="barre"]');

  // La liste d'envies : chaque fiche ajoutée y est, prix masqués à l'ouverture.
  const liste = await ouvrirPageExtension(navigateur, "liste/liste.html");
  const lireListe = () =>
    liste.evaluate(() => ({
      articles: [...document.querySelectorAll(".article")].map((li) => ({
        titre: li.querySelector(".titre").textContent.slice(0, 50),
        site: li.querySelector(".meta").textContent,
        prix: li.querySelector(".prix").classList.contains("masque") ? "masqué" : li.querySelector(".prix").textContent,
        image: Boolean(li.querySelector("img.vignette")),
      })),
      total: document.getElementById("total").hidden ? null : document.getElementById("total").textContent,
    }));
  const fermee = await lireListe();
  await (await liste.$("main")).screenshot({ path: resolve(CAPTURES, "liste.png") });
  await liste.click("#prix");
  await attendre(300);
  const ouverte = await lireListe();
  await (await liste.$("main")).screenshot({ path: resolve(CAPTURES, "liste-prix.png") });
  console.log(`\nliste d'envies — ${fermee.articles.length} article(s), ${ouverte.total ?? "pas de total"}`);
  for (const [i, a] of ouverte.articles.entries()) {
    console.log(`  ${a.prix.padEnd(12)} ${a.image ? "🖼" : " "} ${a.site.padEnd(22)} ${a.titre}`);
    if (fermee.articles[i].prix !== "masqué") console.log("    ✘ prix lisible à l'ouverture");
  }
  const listeOk =
    fermee.articles.length === envies.length &&
    fermee.articles.every((a) => a.prix === "masqué") &&
    fermee.total === null &&
    ouverte.articles.every((a) => a.prix !== "masqué");
  bilan.push(["liste d'envies", listeOk ? "✔" : "✘"]);

  console.log("\nBilan");
  for (const [nom, verdict] of bilan) console.log(`  ${verdict.padEnd(12)} ${nom}`);
  console.log(`\nCaptures : ${CAPTURES}`);
} finally {
  await navigateur.close();
}
process.exitCode = bilan.every(([, verdict]) => verdict === "✔") ? 0 : 1;
