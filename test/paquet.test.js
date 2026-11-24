import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), "utf8");
const manifeste = JSON.parse(lire("extension/manifest.json"));
const remplir = (texte) =>
  texte.replaceAll("{{version}}", manifeste.version).replaceAll("{{id}}", manifeste.browser_specific_settings.gecko.id);

describe("le paquet de déploiement", () => {
  // Le paquet porte le numéro du manifeste ; Mozilla ne signe qu'une fois un
  // numéro. Deux numéros qui divergent finissent par une signature refusée.
  it("package.json et le manifeste portent la même version", () => {
    assert.equal(JSON.parse(lire("package.json")).version, manifeste.version);
  });

  it("policies.json reste du JSON une fois rempli, et vise l'extension", () => {
    const { policies } = JSON.parse(remplir(lire("deploiement/policies.json")));
    const reglage = policies.ExtensionSettings[manifeste.browser_specific_settings.gecko.id];
    assert.equal(reglage.installation_mode, "force_installed");
    assert.match(reglage.install_url, /^file:\/\/\/.+\.xpi$/);
    assert.equal(reglage.private_browsing, true);
  });

  it("le guide ne laisse aucun gabarit non rempli", () => {
    assert.doesNotMatch(remplir(lire("deploiement/INSTALLER.md")), /\{\{/);
  });
});

describe("la publication et les mises à jour", async () => {
  const { depotDe, manifesteDeMiseAJour, nomXpi } = await import("../scripts/mises-a-jour.mjs");
  const EMPREINTE = "a".repeat(64);

  // L'identifiant est figé à la première signature : en changer ferait de la
  // version suivante une autre extension, sans les réglages ni la liste.
  it("l'identifiant est mister-no-price@mister-guiiug", () => {
    assert.equal(manifeste.browser_specific_settings.gecko.id, "mister-no-price@mister-guiiug");
  });

  // Le catalogue d'addons.mozilla.org refuse une version qui porte une
  // update_url : Firefox met à jour une extension du catalogue depuis le
  // catalogue.
  it("n'a pas d'update_url : publiée sur addons.mozilla.org", () => {
    assert.equal(manifeste.browser_specific_settings.gecko.update_url, undefined);
    assert.doesNotMatch(JSON.parse(lire("package.json")).scripts.lint, /--self-hosted/);
  });

  it("le dépôt des releases est homepage_url", () => {
    assert.equal(depotDe(manifeste), "https://github.com/mister-guiiug/mister-no-prices");
  });

  it("updates.json pointe le .xpi de la release de sa version, avec son empreinte", () => {
    const { addons } = manifesteDeMiseAJour(manifeste, EMPREINTE);
    const [maj] = addons[manifeste.browser_specific_settings.gecko.id].updates;
    assert.equal(maj.version, manifeste.version);
    assert.equal(
      maj.update_link,
      `https://github.com/mister-guiiug/mister-no-prices/releases/download/v${manifeste.version}/${nomXpi(manifeste.version)}`,
    );
    assert.equal(maj.update_hash, `sha256:${EMPREINTE}`);
    assert.equal(
      maj.applications.gecko.strict_min_version,
      manifeste.browser_specific_settings.gecko.strict_min_version,
    );
  });

  it("refuse une empreinte invalide et une homepage_url hors GitHub", () => {
    assert.throws(() => manifesteDeMiseAJour(manifeste, "abc"));
    const ailleurs = structuredClone(manifeste);
    ailleurs.homepage_url = "https://exemple.com/";
    assert.throws(() => depotDe(ailleurs));
  });
});

describe("la fiche d'addons.mozilla.org", async () => {
  const fiche = JSON.parse(lire("amo/fiche.json"));
  const { etatDe, jeton } = await import("../scripts/amo.mjs");
  // Les catégories des extensions Firefox dans l'API v5.
  const CATEGORIES = [
    "alerts-updates",
    "appearance",
    "bookmarks",
    "download-management",
    "feeds-news-blogging",
    "games-entertainment",
    "language-support",
    "photos-music-videos",
    "privacy-security",
    "search-tools",
    "shopping",
    "social-communication",
    "tabs",
    "web-development",
    "other",
  ];

  it("a des catégories connues et la licence du dépôt", () => {
    assert.ok(fiche.categories.length >= 1 && fiche.categories.length <= 2);
    for (const c of fiche.categories) assert.ok(CATEGORIES.includes(c), c);
    assert.equal(fiche.version.license, JSON.parse(lire("package.json")).license);
  });

  it("décrit l'extension dans chaque langue de la fiche, avec le dépôt", () => {
    for (const langue of Object.keys(fiche.description)) {
      assert.ok(fiche.description[langue]?.length > 200, langue);
      // Les liens sont lus comme des URL, hôte et chemin comparés à l'égal : une regex
      // d'adresse sans ancre ou une sous-chaîne, CodeQL les lit comme un filtre d'URL
      // contournable (js/regex/missing-regexp-anchor, js/incomplete-url-substring-sanitization).
      const liens = (fiche.description[langue].match(/https:\/\/[^\s)\]]+/g) ?? []).map((lien) => new URL(lien));
      assert.ok(
        liens.some((url) => url.hostname === "github.com" && url.pathname === "/mister-guiiug/mister-no-prices"),
        langue,
      );
    }
  });

  // La fiche ne nomme que des sites que les règles couvrent.
  it("ne cite que des sites des règles", async () => {
    await import("../extension/regles.js");
    const noms = globalThis.SansPrixRegles.map((r) => r.nom);
    const cites = [
      "Amazon",
      "Fnac",
      "Darty",
      "Boulanger",
      "Decathlon",
      "Cdiscount",
      "eBay",
      "AliExpress",
      "Zalando",
      "Leboncoin",
      "Vinted",
      "Back Market",
      "Craigslist",
      "Facebook Marketplace",
      "Reverb",
      "Discogs",
      "Google",
    ];
    for (const nom of cites) assert.ok(noms.includes(nom), nom);
    for (const nom of cites.filter((n) => n !== "Google")) {
      assert.ok(fiche.description.fr.includes(nom) || fiche.description["en-US"].includes(nom), nom);
    }
  });

  it("lit l'état d'une version d'après son fichier", () => {
    assert.equal(etatDe({ file: { status: "public" } }), "publiee");
    assert.equal(etatDe({ file: { status: "disabled" } }), "refusee");
    assert.equal(etatDe({ file: { status: "unreviewed" } }), "en-relecture");
    assert.equal(etatDe({}), "en-relecture");
  });

  it("signe un jeton HS256 d'une minute, au nom de la clé", () => {
    const [entete, corps, signature] = jeton("user:1:2", "secret", 1000).split(".");
    assert.deepEqual(JSON.parse(Buffer.from(entete, "base64url")), { alg: "HS256", typ: "JWT" });
    const { iss, iat, exp, jti } = JSON.parse(Buffer.from(corps, "base64url"));
    assert.deepEqual([iss, iat, exp], ["user:1:2", 1000, 1060]);
    assert.ok(jti);
    assert.match(signature, /^[A-Za-z0-9_-]{43}$/);
  });
});

describe("le client d'addons.mozilla.org", async () => {
  const { client } = await import("../scripts/amo.mjs");
  const json = (corps) => ({
    ok: true,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => corps,
  });

  it("cherche la version sur toutes les pages, tous canaux, avec un jeton", async () => {
    const vues = [];
    const fetch = async (url, { headers }) => {
      vues.push(String(url));
      assert.match(headers.Authorization, /^JWT [\w-]+\.[\w-]+\.[\w-]+$/);
      return String(url).includes("page=2")
        ? json({ results: [{ version: "1.8.0", channel: "listed", file: { status: "public" } }], next: null })
        : json({ results: [{ version: "1.7.0" }], next: "https://addons.mozilla.org/api/v5/x/?page=2" });
    };
    const amo = client({ cle: "k", secret: "s", fetch });
    assert.equal((await amo.version("a@b", "1.8.0")).channel, "listed");
    assert.match(vues[0], /addons\/addon\/a%40b\/versions\/\?filter=all_with_unlisted/);
    assert.equal(await amo.version("a@b", "9.9.9"), null);
  });

  it("attend la fin de la relecture, sans dépasser le délai", async () => {
    let appels = 0;
    const fetch = async () => {
      appels += 1;
      return json({
        results: [{ version: "1.8.0", file: { status: appels < 3 ? "unreviewed" : "public" } }],
        next: null,
      });
    };
    const amo = client({ cle: "k", secret: "s", fetch });
    const dormir = async () => {};
    assert.equal((await amo.attendre("a@b", "1.8.0", { delai: 60_000, intervalle: 1, dormir })).file.status, "public");
    appels = -1_000;
    const encore = await amo.attendre("a@b", "1.8.0", { delai: 0, intervalle: 1, dormir });
    assert.equal(encore.file.status, "unreviewed");
  });

  it("refuse une page qui n'est pas du JSON (vérification anti-robot)", async () => {
    const fetch = async () => ({ ok: true, headers: new Headers({ "content-type": "text/html" }) });
    await assert.rejects(client({ cle: "k", secret: "s", fetch }).version("a@b", "1.8.0"), /au lieu de JSON/);
  });
});

describe("les captures de la fiche", async () => {
  const { chargerCaptures, planifier } = await import("../scripts/fiche-amo.mjs");
  const captures = await chargerCaptures();

  it("sont des PNG de 1280 × 800, légendés dans chaque langue de la fiche et ses variantes, sans doublon", async () => {
    const { languesDeFiche } = await import("../scripts/fiche-amo.mjs");
    assert.ok(captures.length >= 1);
    for (const c of captures) {
      for (const langue of languesDeFiche()) assert.ok(c.legende[langue], `${c.fichier} : ${langue}`);
      assert.equal(c.legende["pt-BR"], c.legende["pt-PT"], c.fichier);
      assert.equal(c.legende["es-MX"], c.legende["es-ES"], c.fichier);
      assert.equal(c.legende["en-GB"], c.legende["en-US"], c.fichier);
    }
    assert.deepEqual(
      captures.map((c) => c.position),
      captures.map((_, i) => i),
    );
  });

  const voulues = [
    { fichier: "a.png", legende: { fr: "A", "en-US": "A en" }, position: 1 },
    { fichier: "b.png", legende: { fr: "B", "en-US": "B en" }, position: 2 },
  ];

  it("ajoute ce qui manque, remet d'aplomb ce qui a bougé, ne touche pas au reste", () => {
    const { ajouter, modifier, etrangeres } = planifier(voulues, [
      { id: 7, caption: { fr: "B", "en-US": "vieux" }, position: 2 },
      { id: 9, caption: { fr: "Faite à la main" }, position: 3 },
    ]);
    assert.deepEqual(
      ajouter.map((c) => c.fichier),
      ["a.png"],
    );
    assert.deepEqual(
      modifier.map((c) => [c.fichier, c.id]),
      [["b.png", 7]],
    );
    assert.deepEqual(
      etrangeres.map((c) => c.id),
      [9],
    );
  });

  it("remet d'aplomb une capture dont une seule langue diffère", () => {
    const enLigne = voulues.map((c, i) => ({ id: i, caption: { ...c.legende }, position: c.position }));
    const voulue = [{ ...voulues[0], legende: { ...voulues[0].legende, ja: "新しい" } }, voulues[1]];
    assert.deepEqual(
      planifier(voulue, enLigne).modifier.map((c) => c.fichier),
      ["a.png"],
    );
  });

  it("ne fait rien quand la fiche est à jour", () => {
    const enLigne = voulues.map((c, i) => ({ id: i, caption: c.legende, position: c.position }));
    assert.deepEqual(planifier(voulues, enLigne), { ajouter: [], modifier: [], etrangeres: [] });
  });
});

describe("l'envoi d'une capture", async () => {
  const { client } = await import("../scripts/amo.mjs");
  const json = (corps) => ({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => corps,
  });
  const legende = { fr: "Une", "en-US": "One" };

  /** Un faux AMO : la légende posée est effacée `effacements` fois par le retraitement de l'image. */
  function faux(effacements) {
    const appels = [];
    let caption = null;
    const fetch = async (url, { method, headers, body }) => {
      appels.push({ url: String(url), method, type: headers["Content-Type"], corps: body });
      if (method === "POST") return json({ id: 42 });
      if (method === "PATCH") {
        caption = effacements-- > 0 ? null : JSON.parse(body).caption;
        return json({ id: 42 });
      }
      return json({ previews: [{ id: 42, caption, position: 3 }] });
    };
    return { appels, fetch };
  }

  it("envoie l'image en multipart, attend son traitement, légende en JSON, vérifie", async () => {
    const { appels, fetch } = faux(0);
    const attentes = [];
    const capture = await client({
      cle: "k",
      secret: "s",
      fetch,
      dormir: async (ms) => attentes.push(ms),
    }).ajouterCapture("a@b", { image: Buffer.from("png"), nom: "1.png", legende, position: 3 });
    assert.deepEqual(
      appels.map((a) => a.method),
      ["POST", "PATCH", "GET"],
    );
    assert.match(appels[0].url, /addons\/addon\/a%40b\/previews\/$/);
    assert.ok(appels[0].corps instanceof FormData);
    assert.equal(appels[0].corps.get("position"), "3");
    assert.match(appels[1].url, /previews\/42\/$/);
    assert.equal(appels[1].type, "application/json");
    assert.deepEqual(JSON.parse(appels[1].corps), { caption: legende, position: 3 });
    assert.deepEqual(attentes, [60_000, 30_000]);
    assert.equal(capture.caption.fr, "Une");
  });

  it("repose la légende qu'AMO a effacée", async () => {
    const { appels, fetch } = faux(1);
    await client({ cle: "k", secret: "s", fetch, dormir: async () => {} }).ajouterCapture("a@b", {
      image: Buffer.from("png"),
      nom: "1.png",
      legende,
      position: 3,
    });
    assert.deepEqual(
      appels.map((a) => a.method),
      ["POST", "PATCH", "GET", "PATCH", "GET"],
    );
  });

  it("abandonne et retire la capture après trois effacements", async () => {
    const { appels, fetch } = faux(10);
    await assert.rejects(
      client({ cle: "k", secret: "s", fetch, dormir: async () => {} }).ajouterCapture("a@b", {
        image: Buffer.from("png"),
        nom: "1.png",
        legende,
        position: 3,
      }),
      /effacée 3 fois/,
    );
    assert.equal(appels.at(-1).method, "DELETE");
  });
});

describe("la fiche tenue par le dépôt", async () => {
  const { ficheVoulue, ecarts, iconeParDefaut } = await import("../scripts/fiche-amo.mjs");
  const voulue = await ficheVoulue();

  it("couvre chaque langue de l'extension, et chaque langue de la fiche a sa description", async () => {
    const { LANGUES_AMO } = await import("../scripts/fiche-amo.mjs");
    const { readdirSync } = await import("node:fs");
    const dossiers = readdirSync(new URL("../extension/_locales/", import.meta.url));
    assert.deepEqual(Object.keys(LANGUES_AMO).sort(), dossiers.sort());
    const premieres = Object.values(LANGUES_AMO)
      .filter((c) => c.length > 0)
      .map((c) => c[0]);
    assert.deepEqual(Object.keys(JSON.parse(lire("amo/fiche.json")).description).sort(), premieres.sort());
    // AMO ne propose ni l'arabe ni l'hindi pour le texte d'une fiche.
    assert.deepEqual([LANGUES_AMO.ar, LANGUES_AMO.hi], [[], []]);
    assert.equal(voulue.name.ja, "価格非表示");
    assert.equal(voulue.description["pt-BR"], voulue.description["pt-PT"]);
    assert.equal(voulue.summary["es-MX"], voulue.summary["es-ES"]);
  });

  it("prend le nom et le résumé des messages français et anglais, la page d'accueil du manifeste", () => {
    assert.equal(voulue.name.fr, "Sans prix");
    assert.equal(voulue.name["en-US"], "No Prices");
    assert.ok(voulue.summary.fr.length > 20);
    assert.equal(voulue.homepage.fr, manifeste.homepage_url);
  });

  it("ne modifie que ce qui diffère, page d'accueil lue sous ses liens sortants", () => {
    const enLigne = {
      ...structuredClone(voulue),
      homepage: {
        url: { fr: "https://github.com/mister-guiiug/mister-no-price", "en-US": voulue.homepage["en-US"] },
        outgoing: {},
      },
      summary: { fr: "Ancien résumé", "en-US": voulue.summary["en-US"] },
    };
    assert.deepEqual(Object.keys(ecarts(voulue, enLigne)).sort(), ["homepage", "summary"]);
    const aJour = { ...structuredClone(voulue), homepage: { url: voulue.homepage, outgoing: {} } };
    assert.deepEqual(ecarts(voulue, aJour), {});
  });

  it("reconnaît l'icône par défaut", () => {
    assert.ok(iconeParDefaut({ icon_url: "https://addons.mozilla.org/static-server/img/addon-icons/default-64.png" }));
    assert.ok(
      !iconeParDefaut({ icon_url: "https://addons.mozilla.org/user-media/addon_icons/3/123-64.png?modified=1" }),
    );
  });
});

describe("le débit limité d'addons.mozilla.org", async () => {
  const { client, delaiDemande } = await import("../scripts/amo.mjs");
  const json = (corps, status = 200) => ({
    ok: status < 400,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => corps,
    text: async () => JSON.stringify(corps),
  });

  it("lit le délai demandé", () => {
    assert.equal(delaiDemande(new Headers({ "retry-after": "12" }), ""), 12_000);
    assert.equal(
      delaiDemande(new Headers(), '{"detail":"Request was throttled. Expected available in 59 seconds."}'),
      59_000,
    );
    assert.equal(delaiDemande(new Headers(), ""), 60_000);
  });

  it("attend puis reprend la requête sur un 429", async () => {
    const attentes = [];
    let n = 0;
    const fetch = async () => (++n === 1 ? json({ detail: "Expected available in 3 seconds." }, 429) : json({ id: 5 }));
    const amo = client({ cle: "k", secret: "s", fetch, dormir: async (ms) => attentes.push(ms) });
    assert.deepEqual(await amo.modifierCapture("a@b", 5, { legende: { fr: "x" }, position: 1 }), { id: 5 });
    assert.deepEqual(attentes, [4_000]);
  });

  it("s'arrête plutôt que de patienter une demi-heure", async () => {
    const { DebitEpuise } = await import("../scripts/amo.mjs");
    const fetch = async () => json({ detail: "Expected available in 1894 seconds." }, 429);
    const amo = client({ cle: "k", secret: "s", fetch, dormir: async () => assert.fail("ne doit pas attendre") });
    await assert.rejects(amo.modifierCapture("a@b", 5, { legende: { fr: "x" }, position: 1 }), DebitEpuise);
  });

  it("retire la capture envoyée si sa légende échoue", async () => {
    const methodes = [];
    const fetch = async (url, { method }) => {
      methodes.push(method);
      if (method === "POST") return json({ id: 8 });
      if (method === "PATCH") return json({ detail: "non" }, 400);
      return { ok: true, status: 204, headers: new Headers(), text: async () => "" };
    };
    const amo = client({ cle: "k", secret: "s", fetch, dormir: async () => {} });
    await assert.rejects(
      amo.ajouterCapture("a@b", { image: Buffer.from("x"), nom: "a.png", legende: { fr: "a" }, position: 1 }),
      /AMO 400/,
    );
    assert.deepEqual(methodes, ["POST", "PATCH", "DELETE"]);
  });
});

describe("la reprise d'une fiche à moitié faite", async () => {
  const { planifier, texteDe, ecarts, ficheVoulue } = await import("../scripts/fiche-amo.mjs");
  const voulues = [
    { fichier: "a.png", legende: { fr: "A", "en-US": "A en" }, position: 0 },
    { fichier: "b.png", legende: { fr: "B", "en-US": "B en" }, position: 1 },
    { fichier: "c.png", legende: { fr: "C", "en-US": "C en" }, position: 2 },
  ];

  it("reprend l'unique capture sans légende pour la première manquante", () => {
    const { ajouter, modifier, etrangeres } = planifier(voulues, [
      { id: 1, caption: { fr: "A", "en-US": "A en" }, position: 0 },
      { id: 2, caption: null, position: 1 },
    ]);
    assert.deepEqual(
      modifier.map((c) => [c.fichier, c.id, c.reprise]),
      [["b.png", 2, true]],
    );
    assert.deepEqual(
      ajouter.map((c) => c.fichier),
      ["c.png"],
    );
    assert.deepEqual(etrangeres, []);
  });

  it("ne reprend rien quand plusieurs captures sont sans légende", () => {
    const { ajouter, modifier, etrangeres } = planifier(voulues, [
      { id: 2, caption: null, position: 0 },
      { id: 3, caption: { fr: null }, position: 1 },
    ]);
    assert.deepEqual(modifier, []);
    assert.equal(ajouter.length, 3);
    assert.deepEqual(
      etrangeres.map((c) => c.id),
      [2, 3],
    );
  });

  it("compare la description sans les liens enveloppés ni les balises", () => {
    const source = "Ligne.\n\n<b>Titre</b>\nCode : https://github.com/mister-guiiug/mister-no-prices";
    const rendue =
      'Ligne.\r\n\r\n<b>Titre</b>\r\nCode : <a href="https://outgoing.prod.mozaws.net/v1/0a1b2c/https%3A//github.com/mister-guiiug/mister-no-prices" rel="nofollow">https://github.com/mister-guiiug/mister-no-prices</a>';
    assert.equal(texteDe(rendue), texteDe(source));
  });

  it("ne réécrit pas une description rendue avec ses liens enveloppés", async () => {
    const voulue = await ficheVoulue();
    const enveloppe = (t) =>
      t.replace(
        /https:\/\/github\.com\/[\w/-]+/g,
        (u) => `<a href="https://outgoing.prod.mozaws.net/v1/abc123/${encodeURIComponent(u)}">${u}</a>`,
      );
    const enLigne = {
      ...structuredClone(voulue),
      description: Object.fromEntries(Object.entries(voulue.description).map(([l, t]) => [l, enveloppe(t)])),
      homepage: { url: voulue.homepage, outgoing: {} },
    };
    assert.deepEqual(ecarts(voulue, enLigne), {});
  });
});

describe("la comparaison de la description, quelle que soit sa mise en forme", async () => {
  const { texteDe, apercu } = await import("../scripts/fiche-amo.mjs");
  const source = "Sans prix masque les prix.\n\n<b>Vie privée</b>\nL'extension, « ♥ ».";

  it("ignore les <br>, les entités et les balises échappées", () => {
    for (const rendue of [
      "Sans prix masque les prix.<br><br><b>Vie privée</b><br>L&#x27;extension, « ♥ ».",
      "Sans prix masque les prix.\r\n\r\n&lt;b&gt;Vie privée&lt;/b&gt;\r\nL&#39;extension,&nbsp;« ♥ ».",
      "<p>Sans prix masque les prix.</p><p><strong>Vie privée</strong><br/>L'extension, « ♥ ».</p>",
    ]) {
      assert.equal(texteDe(rendue), texteDe(source), rendue);
    }
  });

  it("dit où un champ diffère", () => {
    const message = apercu(
      "summary",
      { fr: "Masque les prix des boutiques" },
      { summary: { fr: "Masque les prix sur Amazon" } },
    );
    assert.match(message, /^fr, caractère 16 : « sur Amazon » au lieu de « des boutiques »$/);
  });
});

describe("la description de la fiche, en Markdown", async () => {
  const fiche = JSON.parse(lire("amo/fiche.json"));
  const { texteDe } = await import("../scripts/fiche-amo.mjs");

  // AMO n'interprète pas le HTML dans une description : il l'affiche tel quel
  // (« <b>Ce qu'elle fait</b> » sur la fiche, le 18/11). Il accepte un Markdown
  // limité : **gras**, listes en « - », liens [texte](adresse).
  it("n'a aucune balise HTML, et met titres en gras et points en liste", () => {
    for (const [langue, texte] of Object.entries(fiche.description)) {
      assert.doesNotMatch(texte, /<\/?[a-z][^>]*>/i, langue);
      assert.match(texte, /^\*\*[^*]+\*\*$/m, `${langue} : un titre en gras`);
      assert.match(texte, /\n\n- /, `${langue} : une liste précédée d'une ligne vide`);
      assert.doesNotMatch(texte, /•/, `${langue} : des tirets, pas des puces`);
    }
  });

  it("compare le Markdown source à son rendu HTML", () => {
    const source = "Intro.\n\n**Titre**\n\n- un\n- deux\n\nCode : [github.com/x/y](https://github.com/x/y)";
    const rendu =
      '<p>Intro.</p><p><strong>Titre</strong></p><ul><li>un</li><li>deux</li></ul><p>Code : <a href="https://outgoing.prod.mozaws.net/v1/ab12/https%3A//github.com/x/y">github.com/x/y</a></p>';
    assert.equal(texteDe(rendu), texteDe(source));
    assert.equal(texteDe(source), "Intro. Titre un deux Code : github.com/x/y");
  });
});

describe("le débit limité d'addons.mozilla.org à la soumission", async () => {
  const { estDebitLimite } = await import("../scripts/amo.mjs");

  it("reconnaît l'erreur relevée le 23/11/2026, et le 429 seul", () => {
    const relevee = new Error(
      'Submission failed (2): 429\n{\n  "detail": "Request was throttled. Expected available in 40287 seconds."\n}',
    );
    assert.equal(estDebitLimite(relevee), true);
    assert.equal(estDebitLimite(new Error("Submission failed (2): 429")), true);
  });

  it("laisse échouer tout le reste", () => {
    assert.equal(estDebitLimite(new Error("Submission failed (1): 400")), false);
    assert.equal(
      estDebitLimite(new Error("AMO 404 sur GET https://addons.mozilla.org/api/v5/addons/addon/x/versions/6750429/")),
      false,
    );
    assert.equal(estDebitLimite(new Error("getaddrinfo ENOTFOUND addons.mozilla.org")), false);
    assert.equal(estDebitLimite(undefined), false);
  });
});
