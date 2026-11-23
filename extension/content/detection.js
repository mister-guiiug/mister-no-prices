/**
 * Repère les montants dans un texte : « 12,99 € », « EUR 5 », « $1,299.00 »,
 * « ₹1,23,456 », « ￥1,234 ».
 *
 * Un montant exige une devise. Un nombre seul (« 4,5 sur 5 étoiles », « Plus
 * que 3 ex. ») n'est jamais pris : masquer à tort une note ou un stock gênerait
 * plus qu'un prix oublié ne trahirait.
 *
 * Partagé par le content script (globalThis.SansPrixDetection) et par les tests
 * Node, qui l'exécutent dans un contexte vm.
 */
(() => {
  "use strict";

  // Codes écrits en toutes lettres : « EUR 12,99 » dans les filtres d'amazon.fr,
  // « AED 49.00 » sur amazon.ae.
  const CODES = "EUR|USD|GBP|CHF|CAD|AUD|NZD|JPY|INR|BRL|MXN|SEK|PLN|TRY|AED|SAR|EGP|SGD|ZAR";
  const LETTRE = "\\p{L}";

  // Groupes séparés par un point, une virgule ou une apostrophe : de longueur
  // libre, l'Inde groupe par deux (« 1,23,456 »). Séparés par une espace : trois
  // chiffres exactement, sinon « Lot de 3 12,99 € » avalerait la quantité.
  const NOMBRE = "\\d+(?:[.,'’]\\d+|\\s\\d{3}(?!\\d))*";

  const DEVISE_AVANT =
    `(?:(?<!${LETTRE})(?:US|CA|AU|NZ|HK|MX|[ACRS])\\$` + `|[€$£¥￥₹₩₺₽₱]` + `|(?<!${LETTRE})(?:${CODES})(?!${LETTRE}))`;

  const DEVISE_APRES = `(?:[€$£¥￥₹₺₽円]|(?:zł|kr|TL|${CODES})(?!${LETTRE}))`;

  const MONTANT = new RegExp(`${DEVISE_AVANT}\\s?${NOMBRE}|${NOMBRE}\\s?${DEVISE_APRES}`, "gu");

  const CHIFFRE = /\d/;

  /** Vrai si le texte peut contenir un montant : filtre rapide avant la regex. */
  function contientChiffre(texte) {
    return CHIFFRE.test(texte);
  }

  /** Positions [debut, fin[ de chaque montant du texte, dans l'ordre. */
  function trouverMontants(texte) {
    const montants = [];
    for (const m of texte.matchAll(MONTANT)) {
      montants.push({ debut: m.index, fin: m.index + m[0].length });
    }
    return montants;
  }

  /** Le texte, chaque montant remplacé (le titre de l'onglet, par exemple). */
  function masquerMontants(texte, remplacement = "•••") {
    return texte.replace(MONTANT, remplacement);
  }

  // Un morceau de prix éclaté : quelques chiffres, séparateurs ou symboles de
  // devise, rien d'autre (« 34 », « €99 », « , », « € »). Les codes en lettres
  // n'en font pas partie : « EUR » seul est un mot.
  const FRAGMENT = /^[\d\s.,'’€$£¥￥₹₩₺₽₱-]{1,8}$/;
  const SIGNE = /[\d€$£¥￥₹₩₺₽₱]/;

  /** Vrai si le texte ressemble à un morceau de prix plutôt qu'à une phrase. */
  function estFragment(texte) {
    const t = texte.trim();
    return FRAGMENT.test(t) && SIGNE.test(t);
  }

  globalThis.SansPrixDetection = Object.freeze({
    contientChiffre,
    trouverMontants,
    masquerMontants,
    estFragment,
  });
})();
