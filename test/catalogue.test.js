import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";
import { jsonDuCatalogue } from "../scripts/catalogue.mjs";

const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), "utf8");

/** regles.js et catalogue.js, avec un storage.local en mémoire et un fetch au choix. */
function charger({ reponse = null } = {}) {
  const local = {};
  const browser = {
    storage: {
      local: {
        get: async (cle) => (cle in local ? { [cle]: structuredClone(local[cle]) } : {}),
        set: async (valeurs) => Object.assign(local, structuredClone(valeurs)),
        remove: async (cle) => delete local[cle],
      },
      onChanged: { addListener() {} },
    },
  };
  const fetch = async () => {
    if (reponse instanceof Error) throw reponse;
    return {
      ok: reponse?.ok ?? true,
      status: reponse?.status ?? 200,
      json: async () => structuredClone(reponse?.corps),
    };
  };
  const contexte = vm.createContext({ browser, fetch, console });
  for (const f of ["extension/regles.js", "extension/commun/catalogue.js"]) vm.runInContext(lire(f), contexte);
  return { C: contexte.SansPrixCatalogue, local };
}

const embarque = () => JSON.parse(jsonDuCatalogue());
const avecRevision = (revision, retouche = (c) => c) => retouche({ ...embarque(), revision });

describe("le catalogue des règles", () => {
  it("regles/regles.json est la copie à jour de regles.js (npm run catalogue)", () => {
    assert.equal(lire("regles/regles.json"), jsonDuCatalogue());
  });

  it("le catalogue embarqué passe sa propre validation", () => {
    const { C } = charger();
    const valide = C.valider(embarque());
    assert.equal(valide.regles.length, C.EMBARQUE.regles.length);
    assert.equal(valide.revision, C.EMBARQUE.revision);
  });

  it("compare les révisions par date puis par rang, en nombres", () => {
    const { C } = charger();
    assert.equal(C.comparerRevisions("2026-11-17.2", "2026-11-17.10"), -1);
    assert.equal(C.comparerRevisions("2026-11-18.1", "2026-11-17.9"), 1);
    assert.equal(C.comparerRevisions("2026-11-17.1", "2026-11-17.1"), 0);
    assert.throws(() => C.comparerRevisions("hier", "2026-11-17.1"));
  });

  it("garde le plus récent, et l'embarqué à révision égale", () => {
    const { C } = charger();
    const plusRecent = C.valider(avecRevision("2099-01-01.1"));
    assert.equal(C.choisir(C.EMBARQUE, plusRecent), plusRecent);
    const egal = C.valider(avecRevision(C.EMBARQUE.revision));
    assert.equal(C.choisir(C.EMBARQUE, egal), C.EMBARQUE);
  });
});

describe("la validation d'un catalogue distant", () => {
  const { C } = charger();
  const avecRegle = (regle) => avecRevision("2099-01-01.1", (c) => ({ ...c, regles: [...c.regles, regle] }));
  const regle = (champs) => ({
    id: "exemple",
    nom: "Exemple",
    domaines: ["exemple.fr"],
    masquer: [".prix"],
    ...champs,
  });

  it("accepte une règle nouvelle bien formée", () => {
    const c = C.valider(avecRegle(regle({ chemins: ["/boutique"], fiche: { titre: "h1", prix: ".prix" } })));
    const ajoutee = c.regles.at(-1);
    assert.equal(ajoutee.id, "exemple");
    assert.deepEqual([...ajoutee.chemins], ["/boutique"]);
  });

  // Un sélecteur est recopié dans une feuille `:is(…) { … }` : il ne doit pas
  // pouvoir en sortir, ni masquer toute la page en fermant le `:is(`.
  const refuses = [
    ".prix) , body (",
    ".prix { color: red }",
    ".prix;",
    "/* .prix */",
    '[data-x="a"',
    ".a\\62",
    " .prix",
    "",
  ];
  for (const s of refuses) {
    it(`refuse le sélecteur « ${s} »`, () => {
      assert.throws(() => C.valider(avecRegle(regle({ masquer: [s] }))));
    });
  }

  it("accepte les sélecteurs réels : combinateur, guillemets, :not(), attributs", () => {
    for (const s of [".a > .b", '[aria-label^="L\'ancien prix"]', 'a:not([href*="/x/"])', '[class*="price"]']) {
      assert.ok(C.selecteurSur(s), s);
    }
  });

  const defauts = [
    ["un id en double", (c) => ({ ...c, regles: [...c.regles, regle({ id: "amazon", domaines: ["autre.fr"] })] })],
    ["un domaine déjà couvert", (c) => ({ ...c, regles: [...c.regles, regle({ domaines: ["amazon.fr"] })] })],
    ["un domaine en www.", (c) => ({ ...c, regles: [...c.regles, regle({ domaines: ["www.exemple.fr"] })] })],
    ["un chemin relatif", (c) => ({ ...c, regles: [...c.regles, regle({ chemins: ["boutique"] })] })],
    ["une fiche sans titre", (c) => ({ ...c, regles: [...c.regles, regle({ fiche: { prix: ".p" } })] })],
    ["un format inconnu", (c) => ({ ...c, format: 2 })],
    ["une révision illisible", (c) => ({ ...c, revision: "demain" })],
    ["une liste vide", (c) => ({ ...c, regles: [] })],
  ];
  for (const [nom, abimer] of defauts) {
    it(`rejette le catalogue entier pour ${nom}`, () => {
      assert.throws(() => C.valider(abimer(avecRevision("2099-01-01.1"))));
    });
  }
});

describe("le cache et le téléchargement", () => {
  it("adopte un catalogue distant plus récent, et le lit ensuite", async () => {
    const corps = avecRevision("2099-01-01.1");
    const { C, local } = charger({ reponse: { corps } });
    assert.deepEqual({ ...(await C.telecharger()) }, { statut: "adopte", revision: "2099-01-01.1" });
    assert.equal(local.catalogue.revision, "2099-01-01.1");
    const lu = await C.lire();
    assert.equal(lu.revision, "2099-01-01.1");
    assert.equal(lu.source, "cache");
  });

  it("garde l'embarqué face à un catalogue distant plus ancien ou égal", async () => {
    const { C, local } = charger({ reponse: { corps: avecRevision("2020-01-01.1") } });
    assert.equal((await C.telecharger()).statut, "inchange");
    assert.equal(local.catalogue, undefined);
    assert.equal((await C.lire()).source, "embarque");
  });

  it("rejette un catalogue distant invalide, et garde le précédent", async () => {
    const abime = avecRevision("2099-01-01.1", (c) => ({
      ...c,
      regles: [{ id: "x", nom: "X", domaines: ["x.fr"], masquer: ["a){}"] }],
    }));
    const { C, local } = charger({ reponse: { corps: abime } });
    const resultat = await C.telecharger();
    assert.equal(resultat.statut, "rejete");
    assert.match(resultat.erreur, /sélecteur refusé/);
    assert.equal(local.catalogue, undefined);
  });

  it("dit injoignable sur une erreur réseau ou HTTP, sans lever", async () => {
    assert.equal((await charger({ reponse: new Error("hors ligne") }).C.telecharger()).statut, "injoignable");
    assert.equal((await charger({ reponse: { ok: false, status: 404 } }).C.telecharger()).statut, "injoignable");
  });

  it("ignore un cache abîmé ou d'un autre format, et l'oublie sur demande", async () => {
    const { C, local } = charger();
    local.catalogue = { format: 9, revision: "2099-01-01.1", regles: [] };
    assert.equal((await C.lire()).source, "embarque");
    await C.oublier();
    assert.equal(local.catalogue, undefined);
  });
});

describe("le manifeste et le catalogue", () => {
  const manifeste = JSON.parse(lire("extension/manifest.json"));

  // Les sites qu'un catalogue distant ajoute se demandent un par un : il faut
  // que la permission optionnelle les couvre, et pouvoir y enregistrer les scripts.
  it("déclare la permission optionnelle et `scripting`", () => {
    assert.deepEqual(manifeste.optional_host_permissions, ["*://*/*"]);
    assert.ok(manifeste.permissions.includes("scripting"));
  });

  it("charge le catalogue après les règles, avant le masquage et le bouton ♥", () => {
    const js = manifeste.content_scripts[0].js;
    assert.ok(js.indexOf("regles.js") < js.indexOf("commun/catalogue.js"));
    assert.ok(js.indexOf("commun/catalogue.js") < js.indexOf("content/masquage.js"));
    assert.ok(js.indexOf("commun/catalogue.js") < js.indexOf("content/envies.js"));
  });
});
