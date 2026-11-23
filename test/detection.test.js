import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";

// detection.js est un script classique (pas un module) : on l'exécute tel que
// le content script le charge, dans un contexte isolé.
const source = readFileSync(new URL("../extension/content/detection.js", import.meta.url), "utf8");
const contexte = vm.createContext({});
vm.runInContext(source, contexte);
const { trouverMontants, masquerMontants, estFragment } = contexte.SansPrixDetection;

/** Les montants trouvés, sous forme de texte (tableau du domaine courant). */
const montants = (texte) => Array.from(trouverMontants(texte), ({ debut, fin }) => texte.slice(debut, fin));

const NBSP = " "; // espace insécable, celle d'amazon.fr avant €
const NNBSP = " "; // espace fine insécable, séparateur des milliers

describe("trouverMontants — prend", () => {
  const cas = [
    [`12,99${NBSP}€`, [`12,99${NBSP}€`]],
    [`3 neufs à partir de 12,99${NBSP}€`, [`12,99${NBSP}€`]],
    [`1${NNBSP}234,56${NBSP}€`, [`1${NNBSP}234,56${NBSP}€`]],
    ["1.234,56 €", ["1.234,56 €"]],
    ["12€", ["12€"]],
    ["EUR 12,99", ["EUR 12,99"]],
    ["20 à 50 EUR", ["50 EUR"]],
    ["$1,299.00", ["$1,299.00"]],
    ["US$12.50", ["US$12.50"]],
    ["£5.99 delivery", ["£5.99"]],
    ["₹1,23,456.00", ["₹1,23,456.00"]],
    ["￥1,234", ["￥1,234"]],
    ["1,234円", ["1,234円"]],
    ["R$ 89,90", ["R$ 89,90"]],
    ["AED 49.00", ["AED 49.00"]],
    ["CHF 5.–", ["CHF 5"]],
    ["123,45 TL", ["123,45 TL"]],
    ["99,99 zł", ["99,99 zł"]],
    ["199 kr", ["199 kr"]],
    ["12,99 € – 25,99 €", ["12,99 €", "25,99 €"]],
    ["(0,35 €/100 g)", ["0,35 €"]],
    ["Livraison GRATUITE dès 35 € d'achat", ["35 €"]],
    ["Sous-total (2 articles) : 45,98 €", ["45,98 €"]],
  ];
  for (const [texte, attendu] of cas) {
    it(JSON.stringify(texte), () => assert.deepEqual(montants(texte), attendu));
  }
});

describe("trouverMontants — laisse", () => {
  const cas = [
    "4,5 sur 5 étoiles",
    "12 345 évaluations",
    "Plus que 3 exemplaire(s) en stock.",
    "Économisez 25 %",
    "Livraison GRATUITE",
    "Modèle B08N5WRWNW",
    "EUROPE 12",
    "12 krabbor",
    "Prix en $",
    "Lot de 3",
  ];
  for (const texte of cas) {
    it(JSON.stringify(texte), () => assert.deepEqual(montants(texte), []));
  }
});

describe("trouverMontants — n'avale pas le nombre d'à côté", () => {
  it("la quantité devant le prix", () => {
    assert.deepEqual(montants("Lot de 3 12,99 €"), ["12,99 €"]);
  });
  it("le prix entier, pas ses trois premiers chiffres", () => {
    assert.deepEqual(montants("$1234.56"), ["$1234.56"]);
  });
});

describe("masquerMontants — le titre de l'onglet", () => {
  it("remplace chaque montant", () => {
    assert.equal(
      masquerMontants("DREAME X60 Pro Ultra 999€ chez Boulanger | Dealabs"),
      "DREAME X60 Pro Ultra ••• chez Boulanger | Dealabs",
    );
  });
  it("laisse un titre sans montant tel quel", () => {
    assert.equal(masquerMontants("Casque audio - Cdiscount"), "Casque audio - Cdiscount");
  });
});

describe("estFragment — morceau d'un prix éclaté", () => {
  for (const texte of ["34", "€99", "€", " 99 ", "1 299"]) {
    it(`${JSON.stringify(texte)} en est un`, () => assert.equal(estFragment(texte), true));
  }
  for (const texte of ["", " ", ",", "Prix", "EUR", "4,5 sur 5", "Quantité : 1", "123456789"]) {
    it(`${JSON.stringify(texte)} n'en est pas un`, () => assert.equal(estFragment(texte), false));
  }
});
