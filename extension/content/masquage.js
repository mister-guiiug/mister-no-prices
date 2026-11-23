/**
 * Applique les règles à la page : la feuille du site, puis trois mécanismes
 * génériques, valables partout.
 *
 * 1. La feuille du site, tirée de sa règle (regles.js) par le moteur
 *    (moteur.js), posée dès document_start : les composants de prix connus sont
 *    couverts avant le premier affichage.
 * 2. Les montants écrits en clair (« 3 neufs à partir de 12,99 € ») sont
 *    recouverts par l'API CSS Custom Highlight : une plage par montant, peinte
 *    par ::highlight(sans-prix). Aucune balise ajoutée, aucun nœud texte
 *    découpé — plusieurs de ces sites rendent leurs pages avec React ou Vue, qui
 *    gardent la main sur leurs nœuds texte : les envelopper dans un <span>
 *    casserait leurs mises à jour.
 * 3. Un prix éclaté en morceaux (« 34 » « €99 », « 12 » « , » « 99 » « € »)
 *    échappe à la recherche nœud par nœud. Quand un nœud n'est qu'un morceau, on
 *    remonte à l'ancêtre proche dont le texte entier est un montant, et on le
 *    marque d'un attribut que la feuille couvre. Un attribut ne déplace aucun
 *    nœud.
 * 4. Le titre de l'onglet perd ses montants (« Robot 999€ chez … »).
 *
 * Le script suit aussi les réglages (actif, pause minutée, sites éteints,
 * apparence) et les applique en direct ; il donne à l'arrière-plan le nombre de
 * prix masqués, que l'icône affiche.
 * Une règle limitée à des `chemins` (Facebook : /marketplace) n'agit que là :
 * ailleurs, le script éteint le masquage dès document_start et ne lit pas le
 * texte ; il suit les changements d'adresse sans rechargement.
 */
(() => {
  "use strict";

  const { DEFAUTS, lire, suivre, masquageEnCours } = globalThis.SansPrixReglages;
  const { contientChiffre, trouverMontants, masquerMontants, estFragment } = globalThis.SansPrixDetection;
  const { ATTRIBUT_ECLATE, trouverRegle, couvreChemin, construireFeuille } = globalThis.SansPrixMoteur;

  const NOM = "sans-prix";
  const IGNORES = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TEXTAREA", "TITLE"]);
  // Au-delà, l'ancêtre n'est plus un prix mais une ligne, voire une carte.
  const LONGUEUR_MAX_ECLATE = 30;
  const NIVEAUX_MAX_ECLATE = 3;

  let reglages = { ...DEFAUTS };

  // --- 1. La feuille du site ----------------------------------------------

  // La règle du catalogue EMBARQUÉ, lue sans attendre : la feuille est posée
  // avant le premier affichage. Celle du catalogue distant, s'il est plus
  // récent, la remplace quelques millisecondes plus tard (adopterCatalogue).
  let regle = trouverRegle(location.hostname, globalThis.SansPrixRegles);
  const feuille = document.createElement("style");
  feuille.setAttribute("data-sans-prix", "");
  feuille.textContent = construireFeuille(regle?.masquer ?? []);

  /** La page est-elle dans le périmètre de la règle (ses `chemins`) ? */
  let ici = couvreChemin(regle, location.pathname);
  const actifIci = () => ici && masquageEnCours(reglages, regle?.id);

  // Accrochée à <html> plutôt qu'à <head> : une application qui remplace son
  // <head> ne l'emporte pas. Si elle disparaît quand même, on la remet.
  function poserFeuille() {
    if (feuille.isConnected) return;
    const racine = document.documentElement;
    if (racine) racine.append(feuille);
  }
  poserFeuille();

  // --- 2. Les montants dans le texte ----------------------------------------

  const surlignage = new Highlight();
  /** @type {WeakMap<Text, Range[]>} plages posées sur chaque nœud, pour les retirer */
  const plagesParNoeud = new WeakMap();
  /** @type {Set<Range>} toutes les plages, pour purger celles des nœuds retirés */
  const plages = new Set();

  function oublier(noeud) {
    const anciennes = plagesParNoeud.get(noeud);
    if (!anciennes) return;
    for (const plage of anciennes) {
      surlignage.delete(plage);
      plages.delete(plage);
    }
    plagesParNoeud.delete(noeud);
  }

  // --- 3. Les prix éclatés ----------------------------------------------------

  const chiffres = (texte) => texte.replace(/\D/g, "");

  /**
   * Depuis un morceau (« 34 », « €99 », « , »), remonte au premier ancêtre
   * proche qui forme un montant ET apporte d'autres chiffres que le morceau
   * (« 34€99 »), et le marque. Comparer les chiffres, et non le texte, laisse
   * « Prix : 12,99 € » tranquille : le libellé n'ajoute aucun chiffre, et le
   * montant est déjà couvert par le repérage dans le texte.
   *
   * Tous les morceaux remontent, complets ou non : l'ordre d'arrivée des nœuds
   * ne compte pas (« €99 » inséré après « 34 » marque le même parent).
   */
  function marquerEclate(noeud) {
    const morceau = chiffres(noeud.data);
    let courant = noeud.parentElement;
    for (let niveau = 0; niveau < NIVEAUX_MAX_ECLATE && courant; niveau += 1) {
      if (courant === document.body || courant === document.documentElement) return;
      const texte = courant.textContent.trim();
      if (texte.length > LONGUEUR_MAX_ECLATE) return;
      if (chiffres(texte) !== morceau && trouverMontants(texte).length > 0) {
        courant.setAttribute(ATTRIBUT_ECLATE, "");
        return;
      }
      courant = courant.parentElement;
    }
  }

  function traiterTexte(noeud) {
    oublier(noeud);
    // Hors du périmètre, rien à masquer : inutile de lire chaque texte d'un fil
    // d'actualité. Le texte sera parcouru en entier si la page y entre.
    if (!ici) return;
    const texte = noeud.data;
    if (!contientChiffre(texte) && !estFragment(texte)) return;
    const parent = noeud.parentElement;
    if (!parent || IGNORES.has(parent.nodeName)) return;

    if (estFragment(texte)) marquerEclate(noeud);

    const nouvelles = [];
    for (const { debut, fin } of trouverMontants(texte)) {
      const plage = document.createRange();
      plage.setStart(noeud, debut);
      plage.setEnd(noeud, fin);
      surlignage.add(plage);
      plages.add(plage);
      nouvelles.push(plage);
    }
    if (nouvelles.length > 0) plagesParNoeud.set(noeud, nouvelles);
  }

  function parcourir(racine) {
    if (racine.nodeType === Node.TEXT_NODE) {
      traiterTexte(racine);
      return;
    }
    if (racine.nodeType !== Node.ELEMENT_NODE) return;
    if (IGNORES.has(racine.nodeName)) return;
    const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
    for (let noeud = marcheur.nextNode(); noeud; noeud = marcheur.nextNode()) {
      traiterTexte(noeud);
    }
  }

  // Une plage sur un nœud retiré ne se peint plus, mais le retient en mémoire :
  // sur une page à défilement infini, on purge de temps en temps.
  let purgePrevue = false;
  function prevoirPurge() {
    if (purgePrevue) return;
    purgePrevue = true;
    setTimeout(() => {
      purgePrevue = false;
      for (const plage of plages) {
        if (plage.startContainer.isConnected) continue;
        surlignage.delete(plage);
        plages.delete(plage);
      }
    }, 10_000);
  }

  // --- 4. Le titre de l'onglet ------------------------------------------------

  let titreEcrit = null; // le titre tel que nous l'avons posé
  let titreDeLaPage = ""; // le titre tel que la page l'a voulu

  function majTitre() {
    const courant = document.title;
    if (courant !== titreEcrit) titreDeLaPage = courant;
    const voulu = actifIci() ? masquerMontants(titreDeLaPage) : titreDeLaPage;
    titreEcrit = voulu;
    if (courant !== voulu) document.title = voulu;
  }

  // --- Suivi de la page -------------------------------------------------------

  // Les rappels d'un MutationObserver passent avant le rendu suivant : un montant
  // inséré par la page est couvert avant d'avoir été peint.
  const observateur = new MutationObserver((mutations) => {
    let retraits = false;
    let titre = false;
    for (const mutation of mutations) {
      const cible = mutation.target;
      if (mutation.type === "attributes") {
        poserAttributs();
        continue;
      }
      if (cible.nodeName === "TITLE" || cible.parentNode?.nodeName === "TITLE") titre = true;
      if (mutation.type === "characterData") {
        if (cible.nodeType === Node.TEXT_NODE) traiterTexte(cible);
        continue;
      }
      for (const ajout of mutation.addedNodes) {
        if (ajout.nodeName === "TITLE") titre = true;
        parcourir(ajout);
      }
      if (mutation.removedNodes.length > 0) retraits = true;
    }
    poserFeuille();
    if (titre) majTitre();
    if (retraits) prevoirPurge();
    prevoirCompte();
  });
  // Les attributs de réglage sur <html> aussi : une application qui hydrate sa
  // page (Decathlon, en Vue) réécrit ceux de <html> et efface les nôtres. Le
  // masquage tiendrait — la feuille échoue fermée —, mais le flou ou la pause
  // choisis seraient perdus.
  observateur.observe(document, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-sans-prix", "data-sans-prix-style"],
  });

  if (document.documentElement) parcourir(document.documentElement);
  // Filet : l'analyseur HTML peut compléter un nœud texte déjà inséré sans le
  // signaler. Un dernier passage complet, une fois le document construit.
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      poserFeuille();
      parcourir(document.body ?? document.documentElement);
      majTitre();
    },
    { once: true },
  );

  // --- Réglages ---------------------------------------------------------------

  let reglagesLus = false;

  /** Pose les attributs de réglage sur <html>, s'ils n'y sont pas déjà. */
  function poserAttributs() {
    const racine = document.documentElement;
    if (!racine) return;
    if (!reglagesLus) {
      // Avant la lecture des réglages : masqué dans le périmètre (la feuille
      // échoue fermée tant que rien ne dit « off »), éteint en dehors.
      const off = racine.getAttribute("data-sans-prix") === "off";
      if (ici && off) racine.removeAttribute("data-sans-prix");
      else if (!ici && !off) racine.setAttribute("data-sans-prix", "off");
      return;
    }
    const voulus = {
      "data-sans-prix": actifIci() ? "on" : "off",
      "data-sans-prix-style": reglages.style,
    };
    // Comparer avant d'écrire : réécrire la même valeur notifierait encore
    // l'observateur, qui rappellerait cette fonction, sans fin.
    for (const [nom, valeur] of Object.entries(voulus)) {
      if (racine.getAttribute(nom) !== valeur) racine.setAttribute(nom, valeur);
    }
  }

  // La pause se lève d'elle-même : à son terme, on réapplique.
  let finDePause = null;

  function appliquer(nouveaux) {
    reglages = nouveaux;
    reglagesLus = true;
    clearTimeout(finDePause);
    const reste = reglages.pauseJusqua - Date.now();
    if (reste > 0) finDePause = setTimeout(() => majEtat(), reste + 50);
    const racine = document.documentElement;
    if (!racine) {
      document.addEventListener("DOMContentLoaded", () => appliquer(nouveaux), { once: true });
      return;
    }
    majEtat();
  }

  /** Attributs, surlignage et titre, d'après les réglages et le périmètre. */
  function majEtat() {
    poserAttributs();
    // Échoue fermé, comme la feuille : masqué tant que les réglages ne sont pas
    // lus — dans le périmètre.
    if (reglagesLus ? actifIci() : ici) CSS.highlights.set(NOM, surlignage);
    else CSS.highlights.delete(NOM);
    majTitre();
    prevoirCompte();
  }

  // --- Le compteur de l'icône ---------------------------------------------------

  // Le nombre de prix masqués, pour la pastille de l'onglet : les montants
  // surlignés, les prix éclatés, et les composants de prix de la règle — les
  // plus extérieurs seulement (« .a-price » contient « .a-price-whole »).
  // Compté au plus toutes les deux secondes, et par le cadre principal seul.
  const principal = window.top === window;
  const selecteurDe = (r) => (r?.masquer.length ? `:is(${r.masquer.join(",")})` : null);
  let selecteurSite = selecteurDe(regle);
  let comptePrevu = false;
  let dernierCompte = -1;

  function compter() {
    if (!actifIci() || !reglages.compteur) return 0;
    let n = surlignage.size + document.querySelectorAll(`[${ATTRIBUT_ECLATE}]`).length;
    if (selecteurSite) {
      try {
        for (const e of document.querySelectorAll(selecteurSite)) {
          if (!e.parentElement?.closest(selecteurSite)) n += 1;
        }
      } catch {
        // Un sélecteur que ce navigateur refuse : on compte sans lui.
      }
    }
    return n;
  }

  function prevoirCompte() {
    if (!principal || comptePrevu || !reglagesLus) return;
    comptePrevu = true;
    setTimeout(() => {
      comptePrevu = false;
      const n = compter();
      if (n === dernierCompte) return;
      dernierCompte = n;
      browser.runtime.sendMessage({ type: "compteur", n }).catch(() => {});
    }, 2_000);
  }

  // Une application (Facebook) change d'adresse sans recharger la page : on
  // regarde le chemin à chaque retour en arrière, et deux fois par seconde.
  function suivreChemin() {
    const dedans = couvreChemin(regle, location.pathname);
    if (dedans === ici) return;
    ici = dedans;
    if (ici) parcourir(document.body ?? document.documentElement);
    majEtat();
  }
  let cheminSuivi = false;
  function suivreLesChemins() {
    if (!regle?.chemins || cheminSuivi) return;
    cheminSuivi = true;
    addEventListener("popstate", suivreChemin);
    setInterval(suivreChemin, 500);
  }
  suivreLesChemins();

  // --- Le catalogue distant ------------------------------------------------------

  // Un catalogue plus récent que l'embarqué (regles/regles.json, lu chaque jour
  // par l'arrière-plan) apporte une règle corrigée — ou la règle d'un site que
  // l'embarqué ne connaît pas. On la prend dès qu'elle est lue, et à chaque
  // nouveau catalogue, sans recharger la page.
  function adopterCatalogue(catalogue) {
    const nouvelle = trouverRegle(location.hostname, catalogue.regles);
    if (JSON.stringify(nouvelle) === JSON.stringify(regle)) return;
    regle = nouvelle;
    feuille.textContent = construireFeuille(regle?.masquer ?? []);
    selecteurSite = selecteurDe(regle);
    suivreLesChemins();
    const dedans = couvreChemin(regle, location.pathname);
    if (dedans && !ici) parcourir(document.body ?? document.documentElement);
    ici = dedans;
    majEtat();
  }
  globalThis.SansPrixCatalogue.lire().then(adopterCatalogue, console.error);
  globalThis.SansPrixCatalogue.suivre(adopterCatalogue);

  majEtat();
  lire().then(appliquer, console.error);
  suivre(appliquer);
})();
