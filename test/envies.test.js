import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";

const lire = (chemin) => readFileSync(new URL(`../extension/${chemin}`, import.meta.url), "utf8");

/** Un `browser` minimal : storage.local et storage.sync en mémoire, écouteurs notés. */
function fauxNavigateur({ android = false } = {}) {
  const zones = { local: {}, sync: {} };
  const ecouteurs = { stockage: [], commandes: [] };
  const zone = (nom) => ({
    async get(defauts) {
      const valeurs = typeof defauts === "object" && defauts ? { ...defauts } : {};
      return { ...valeurs, ...structuredClone(zones[nom]) };
    },
    async set(valeurs) {
      Object.assign(zones[nom], structuredClone(valeurs));
    },
    async remove(cle) {
      delete zones[nom][cle];
    },
  });
  const evenement = () => ({ addListener() {} });
  const browser = {
    storage: {
      local: zone("local"),
      sync: zone("sync"),
      onChanged: { addListener: (f) => ecouteurs.stockage.push(f) },
    },
    i18n: { getMessage: (cle) => cle },
    action: {
      setBadgeText: async () => {},
      setBadgeBackgroundColor: async () => {},
      setTitle: async () => {},
    },
    permissions: { contains: async () => true, onAdded: evenement(), onRemoved: evenement() },
    runtime: {
      onStartup: evenement(),
      onInstalled: evenement(),
      onMessage: evenement(),
      getManifest: () => ({ version: "1.5.0" }),
      getURL: (chemin) => `moz-extension://test/${chemin}`,
    },
    alarms: { create() {}, onAlarm: evenement() },
    tabs: { create: async () => ({}) },
  };
  // Firefox pour Android n'a pas l'API des raccourcis clavier.
  if (!android) browser.commands = { onCommand: { addListener: (f) => ecouteurs.commandes.push(f) } };
  return { browser, zones, ecouteurs };
}

function charger(fichiers, navigateur) {
  const contexte = vm.createContext({ browser: navigateur.browser, console, crypto, TextEncoder });
  for (const f of fichiers) vm.runInContext(lire(f), contexte, { filename: f });
  return contexte;
}

const produit = vm.createContext({});
vm.runInContext(lire("content/produit.js"), produit);
const { lireMontant, lireDevise } = produit.SansPrixProduit;

describe("lireMontant", () => {
  const cas = [
    ["11,99€", 11.99],
    ["1 234,56 €", 1234.56],
    ["$1,234.56", 1234.56],
    ["EUR72.56", 72.56],
    ["34€99", 34.99],
    ["1.234", 1234],
    ["149", 149],
    [99.99, 99.99],
    // Le composant prix d'Amazon mobile : texte d'accessibilité, puis morceaux.
    ["26,06 €€2606", 26.06],
    ["", null],
    ["Gratuit", null],
  ];
  for (const [brut, attendu] of cas) {
    it(`${JSON.stringify(brut)} → ${attendu}`, () => assert.equal(lireMontant(brut), attendu));
  }
});

describe("lireDevise", () => {
  const cas = [
    ["EUR", "EUR"],
    ["12,99 €", "EUR"],
    ["£5.00", "GBP"],
    ["EUR72.56", "EUR"],
    ["CHF 12.–", "CHF"],
    ["12", null],
  ];
  for (const [brut, attendu] of cas) {
    it(`${JSON.stringify(brut)} → ${attendu}`, () => assert.equal(lireDevise(brut), attendu));
  }
});

describe("extraireProduit — données structurées", () => {
  // Un document réduit à ses blocs JSON-LD : ni microdonnées, ni Open Graph,
  // ni canonique.
  const ctx = vm.createContext({ URL });
  vm.runInContext(lire("content/produit.js"), ctx);
  const document = (...blocs) => ({
    URL: "https://www.exemple.fr/annonce/123?ref=liste",
    querySelectorAll: (s) => (s.includes("ld+json") ? blocs.map((b) => ({ textContent: JSON.stringify(b) })) : []),
    querySelector: () => null,
  });
  const extraire = (...blocs) => ctx.SansPrixProduit.extraireProduit(document(...blocs));

  it("lit un Product", () => {
    const p = extraire({ "@type": "Product", name: "Vélo 20 pouces", offers: { price: "45", priceCurrency: "EUR" } });
    assert.equal(p.titre, "Vélo 20 pouces");
    assert.equal(p.prix, 45);
    assert.equal(p.devise, "EUR");
    assert.equal(p.url, "https://www.exemple.fr/annonce/123");
  });

  // ParuVendu : une voiture d'occasion est un `Vehicle`, sous-type de Product.
  it("lit un Vehicle, sous-type de Product", () => {
    const p = extraire(
      { "@type": "BreadcrumbList", itemListElement: [] },
      { "@type": "Vehicle", name: "FORD Fiesta ST", offers: { "@type": "Offer", price: "9480", priceCurrency: "EUR" } },
    );
    assert.equal(p.titre, "FORD Fiesta ST");
    assert.equal(p.prix, 9480);
  });

  it("ne voit pas de fiche dans une page sans produit", () => {
    assert.equal(
      extraire({ "@type": "BreadcrumbList", itemListElement: [] }, { "@type": "WebSite", name: "Annonces" }),
      null,
    );
  });
});

describe("extraireProduit — règle du site", () => {
  const ctx = vm.createContext({ URL });
  vm.runInContext(lire("content/produit.js"), ctx);
  vm.runInContext(lire("regles.js"), ctx);
  const regle = (id) => ctx.SansPrixRegles.find((r) => r.id === id);

  // Dealabs ne se dit pas produit (JSON-LD DiscussionForumPosting, og:type
  // website) : sans règle, pas de bouton ♥ sur un bon plan (signalé le 18/11).
  it("lit un bon plan Dealabs : titre, prix du bon plan (pas des voisins), image", () => {
    const { fiche } = regle("dealabs");
    const elements = {
      [fiche.titre]: [{ textContent: " Blender portable Ninja Blast - 530ml " }],
      [fiche.prix]: [{ textContent: "27,19€" }],
      [fiche.image]: [
        {
          getAttribute: (a) =>
            a === "content" ? "https://static-pepper.dealabs.com/threads/raw/97SsJ/3460425_1/re/1024x1024/qt/60" : null,
        },
      ],
    };
    const doc = {
      URL: "https://www.dealabs.com/bons-plans/blender-portable-ninja-blast-3460425",
      querySelectorAll: (s) => elements[s] ?? [],
      querySelector: () => null,
    };
    const p = ctx.SansPrixProduit.extraireProduit(doc, fiche);
    assert.equal(p.titre, "Blender portable Ninja Blast - 530ml");
    assert.equal(p.prix, 27.19);
    assert.equal(p.devise, "EUR");
    assert.match(p.image, /^https:\/\/static-pepper\.dealabs\.com\/threads\//);
    // Le prix est cherché dans le bon plan affiché, pas dans toute la page.
    assert.match(fiche.prix, /^\[id\^="thread_details_"\] /);
  });
});

describe("la liste d'envies", () => {
  const nouvelle = () => {
    const navigateur = fauxNavigateur();
    return { ...navigateur, Envies: charger(["commun/envies.js"], navigateur).SansPrixEnvies };
  };

  it("ajoute en tête, sans doublon d'adresse", async () => {
    const { Envies } = nouvelle();
    await Envies.ajouter({ url: "https://a/1", titre: "Un" });
    await Envies.ajouter({ url: "https://a/2", titre: "Deux", prix: 12.5, devise: "EUR" });
    const liste = await Envies.lire();
    assert.deepEqual(
      liste.map((a) => a.url),
      ["https://a/2", "https://a/1"],
    );
    assert.equal(liste[0].prix, 12.5);
    assert.ok(await Envies.contient("https://a/1"));
  });

  // Le parent a pu ranger la liste et nommer l'enfant : un nouveau ♥ sur la
  // même fiche met le titre et le prix à jour, sans défaire ce travail.
  it("met à jour sur place un article déjà présent, prénom et rang compris", async () => {
    const { Envies } = nouvelle();
    await Envies.ajouter({ url: "https://a/1", titre: "Un" });
    await Envies.ajouter({ url: "https://a/2", titre: "Deux" });
    await Envies.modifier("https://a/1", { pour: "  Léa " });
    await Envies.ajouter({ url: "https://a/1", titre: "Un, revu", prix: 9 });
    const liste = await Envies.lire();
    assert.deepEqual(
      liste.map((a) => [a.url, a.titre, a.pour ?? null]),
      [
        ["https://a/2", "Deux", null],
        ["https://a/1", "Un, revu", "Léa"],
      ],
    );
    assert.equal(liste[1].prix, 9);
  });

  it("retire un prénom vide, et range d'un cran sans sortir de la liste", async () => {
    const { Envies } = nouvelle();
    for (const n of [1, 2, 3]) await Envies.ajouter({ url: `https://a/${n}`, titre: `${n}` });
    await Envies.modifier("https://a/2", { pour: "Tom" });
    await Envies.modifier("https://a/2", { pour: "  " });
    assert.equal((await Envies.lire()).find((a) => a.url === "https://a/2").pour, undefined);
    await Envies.deplacer("https://a/1", -1);
    await Envies.deplacer("https://a/3", -1);
    assert.deepEqual(
      (await Envies.lire()).map((a) => a.url),
      ["https://a/3", "https://a/1", "https://a/2"],
    );
  });

  it("retire, vide, et ignore une entrée abîmée", async () => {
    const { Envies, zones } = nouvelle();
    await Envies.ajouter({ url: "https://a/1", titre: "Un" });
    await Envies.ajouter({ url: "https://a/2", titre: "Deux" });
    await Envies.retirer("https://a/1");
    assert.deepEqual(
      (await Envies.lire()).map((a) => a.url),
      ["https://a/2"],
    );
    zones.local.envies.push({ titre: "sans adresse" }, null);
    assert.equal((await Envies.lire()).length, 1);
    await Envies.vider();
    assert.equal((await Envies.lire()).length, 0);
  });

  it(`ne garde que les ${200} derniers`, async () => {
    const { Envies } = nouvelle();
    for (let i = 0; i < Envies.MAX + 5; i += 1) await Envies.ajouter({ url: `https://a/${i}`, titre: `${i}` });
    const liste = await Envies.lire();
    assert.equal(liste.length, Envies.MAX);
    assert.equal(liste[0].url, `https://a/${Envies.MAX + 4}`);
  });
});

describe("l'arrière-plan", () => {
  const FICHIERS = [
    "commun/reglages.js",
    "regles.js",
    "commun/catalogue.js",
    "content/moteur.js",
    "commun/acces.js",
    "commun/code.js",
    "background.js",
  ];
  // Deux écouteurs de stockage : les réglages, et le catalogue des règles.
  const ECOUTEURS_STOCKAGE = 2;

  // Firefox pour Android n'a pas `browser.commands` : y toucher sans garde levait
  // une erreur qui empêchait le reste du script — pastille, suivi des réglages —
  // de s'enregistrer.
  it("démarre sous Firefox pour Android, sans API des raccourcis", () => {
    const navigateur = fauxNavigateur({ android: true });
    charger(FICHIERS, navigateur);
    assert.equal(navigateur.ecouteurs.stockage.length, ECOUTEURS_STOCKAGE);
  });

  it("écoute le raccourci là où il existe", () => {
    const navigateur = fauxNavigateur();
    charger(FICHIERS, navigateur);
    assert.equal(navigateur.ecouteurs.commandes.length, 1);
    assert.equal(navigateur.ecouteurs.stockage.length, ECOUTEURS_STOCKAGE);
  });
});

describe("les réglages", () => {
  const reglages = () => charger(["commun/reglages.js"], fauxNavigateur()).SansPrixReglages;

  it("montrent le bouton ♥ par défaut, et le cachent sur demande", async () => {
    const R = reglages();
    assert.equal((await R.lire()).envies, true);
    await R.ecrire({ envies: false });
    assert.equal((await R.lire()).envies, false);
  });

  it("masquent par défaut, compteur allumé, aucun site éteint", async () => {
    const r = await reglages().lire();
    assert.equal(r.actif, true);
    assert.equal(r.compteur, true);
    assert.equal(r.pauseJusqua, 0);
    assert.equal(r.sitesEteints.length, 0);
  });

  it("ne masquent pas pendant une pause, et de nouveau après", () => {
    const R = reglages();
    const r = R.normaliser({ actif: true, pauseJusqua: Date.now() + 60_000 });
    assert.equal(R.masquageEnCours(r), false);
    assert.equal(R.masquageEnCours(r, null, Date.now() + 61_000), true);
  });

  it("ne masquent pas sur un site éteint, et partout ailleurs si", () => {
    const R = reglages();
    const r = R.normaliser({ sitesEteints: ["facebook", 42] });
    assert.equal(r.sitesEteints.length, 1);
    assert.equal(R.masquageEnCours(r, "facebook"), false);
    assert.equal(R.masquageEnCours(r, "vinted"), true);
    assert.equal(R.masquageEnCours(r), true);
  });

  // Une valeur aberrante ne doit pas suspendre le masquage pour des années.
  it("ignorent une pause de plus d'une journée, ou illisible", () => {
    const R = reglages();
    assert.equal(R.normaliser({ pauseJusqua: Date.now() + 2 * R.PAUSE_MAX }).pauseJusqua, 0);
    assert.equal(R.normaliser({ pauseJusqua: "demain" }).pauseJusqua, 0);
    assert.equal(R.normaliser({ style: "cadeau" }).style, "cadeau");
    assert.equal(R.normaliser({ style: "rien" }).style, "barre");
  });
});

describe("le code parent", () => {
  const nouveau = () => {
    const navigateur = fauxNavigateur();
    return { ...navigateur, Code: charger(["commun/code.js"], navigateur).SansPrixCode };
  };

  it("laisse tout passer tant qu'il n'est pas défini", async () => {
    const { Code } = nouveau();
    assert.equal(await Code.estDefini(), false);
    assert.equal(await Code.verifier(""), true);
  });

  it("vérifie le bon code, refuse les autres, et ne garde rien en clair", async () => {
    const { Code, zones } = nouveau();
    await Code.definir("2468");
    assert.equal(await Code.estDefini(), true);
    assert.equal(await Code.verifier("2468"), true);
    assert.equal(await Code.verifier("1357"), false);
    assert.equal(await Code.verifier(""), false);
    assert.doesNotMatch(JSON.stringify(zones.local), /2468/);
    await Code.retirer();
    assert.equal(await Code.estDefini(), false);
  });

  it("refuse un code de moins de 4 chiffres, de plus de 8, ou avec des lettres", async () => {
    const { Code } = nouveau();
    for (const mauvais of ["123", "123456789", "12a4", ""]) {
      await assert.rejects(Code.definir(mauvais));
    }
  });
});

describe("les traductions", () => {
  it("le français et l'anglais ont les mêmes clés", () => {
    const cles = (langue) => Object.keys(JSON.parse(lire(`_locales/${langue}/messages.json`))).sort();
    assert.deepEqual(cles("en"), cles("fr"));
  });
});
