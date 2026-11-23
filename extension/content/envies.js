/**
 * Le bouton ♥ « Ma liste » des fiches produit.
 *
 * L'enfant parcourt la boutique sans voir les prix ; ce qui lui plaît, il le
 * marque d'un clic. Le parent retrouve la liste — avec les prix — depuis le
 * popup. Le bouton n'affiche jamais de prix.
 *
 * Le bouton vit dans un shadow DOM, accroché à <html> : la feuille du site ne
 * l'atteint pas, et une application qui réécrit son <body> ne l'emporte pas.
 * Seulement dans le cadre principal, seulement sur une page que
 * content/produit.js reconnaît comme fiche. Les boutiques qui changent de page
 * sans recharger (AliExpress, Zalando…) sont suivies par l'adresse.
 */
(() => {
  "use strict";

  if (window.top !== window) return;

  const Reglages = globalThis.SansPrixReglages;
  const Envies = globalThis.SansPrixEnvies;
  const { extraireProduit } = globalThis.SansPrixProduit;
  const { trouverRegle, couvreChemin } = globalThis.SansPrixMoteur;
  // La règle du catalogue embarqué, puis celle du catalogue distant s'il est
  // plus récent : un site ajouté par le catalogue n'a pas de règle embarquée.
  let regle = trouverRegle(location.hostname, globalThis.SansPrixRegles);
  const adopter = (catalogue) => {
    regle = trouverRegle(location.hostname, catalogue.regles);
  };
  globalThis.SansPrixCatalogue.lire().then(adopter, console.error);
  globalThis.SansPrixCatalogue.suivre(adopter);

  const t = (cle) => browser.i18n.getMessage(cle);
  // Les données structurées arrivent parfois après le premier rendu : quelques
  // essais par adresse, une seconde d'écart.
  const ESSAIS_MAX = 10;

  let reglages = { envies: true };
  let produit = null;
  let dansLaListe = false;
  let adresseVue = null;
  let essais = 0;

  // --- Le bouton -------------------------------------------------------------

  const hote = document.createElement("sans-prix-envie");
  // Le sens de lecture est celui de la langue de l'extension (l'arabe se lit de
  // droite à gauche), pas celui de la boutique.
  hote.dir = browser.i18n.getMessage("@@bidi_dir") || "ltr";
  // Propriétés posées par le CSSOM, que la CSP d'une page n'interdit pas ; en
  // `important`, pour qu'une règle du site visant tout élément ne les écrase pas.
  for (const [propriete, valeur] of Object.entries({
    all: "initial",
    position: "fixed",
    "inset-inline-end": "16px",
    "inset-block-end": "calc(16px + env(safe-area-inset-bottom, 0px))",
    "z-index": "2147483647",
    display: "block",
  })) {
    hote.style.setProperty(propriete, valeur, "important");
  }
  const ombre = hote.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    button {
      display: inline-flex;
      align-items: center;
      gap: 0.45em;
      min-height: 44px;
      padding: 0 1.1em;
      border: 2px solid #fff;
      border-radius: 999px;
      background: #7048e8;
      color: #fff;
      font: 600 15px/1 system-ui, sans-serif;
      box-shadow: 0 2px 10px rgb(0 0 0 / 0.3);
      cursor: pointer;
    }
    button[aria-pressed="true"] { background: #c2255c; }
    button:focus-visible { outline: 3px solid #fab005; outline-offset: 2px; }
    svg { width: 1.2em; height: 1.2em; flex: none; }
    path { fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linejoin: round; }
    button[aria-pressed="true"] path { fill: currentColor; }
    @media print { button { display: none; } }
  `;
  const bouton = document.createElement("button");
  bouton.type = "button";
  const SVG = "http://www.w3.org/2000/svg";
  const coeur = document.createElementNS(SVG, "svg");
  coeur.setAttribute("viewBox", "0 0 24 24");
  coeur.setAttribute("aria-hidden", "true");
  const trace = document.createElementNS(SVG, "path");
  trace.setAttribute(
    "d",
    "M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z",
  );
  coeur.append(trace);
  const libelle = document.createElement("span");
  bouton.append(coeur, libelle);
  // Annonce l'ajout aux lecteurs d'écran ; le libellé du bouton seul ne suffit
  // pas, il ne change qu'à la relecture.
  const annonce = document.createElement("span");
  annonce.setAttribute("role", "status");
  annonce.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)";
  ombre.append(style, bouton, annonce);

  function peindre() {
    bouton.setAttribute("aria-pressed", String(dansLaListe));
    libelle.textContent = t(dansLaListe ? "envieDansLaListe" : "envieAjouter");
    bouton.title = t(dansLaListe ? "envieRetirerTitre" : "envieAjouterTitre");
  }

  bouton.addEventListener("click", async () => {
    // Relue au clic : le prix a pu arriver depuis, ou la variante changer.
    produit = extraireProduit(document, regle.fiche) ?? produit;
    if (!produit) return;
    if (dansLaListe) {
      await Envies.retirer(produit.url);
      annonce.textContent = t("envieRetiree");
    } else {
      await Envies.ajouter({ ...produit, site: regle.nom });
      annonce.textContent = t("envieAjoutee");
    }
  });

  // --- Quand le montrer ------------------------------------------------------

  async function montrer() {
    if (!reglages.envies || !produit) {
      hote.remove();
      return;
    }
    dansLaListe = await Envies.contient(produit.url);
    peindre();
    if (!hote.isConnected) document.documentElement?.append(hote);
  }

  function surveiller() {
    if (location.href !== adresseVue) {
      adresseVue = location.href;
      essais = 0;
      produit = null;
      hote.remove();
    }
    // Hors des `chemins` de la règle (Facebook hors Marketplace), pas de bouton.
    if (!regle || !couvreChemin(regle, location.pathname)) return;
    if (!produit && essais < ESSAIS_MAX) {
      essais += 1;
      produit = extraireProduit(document, regle.fiche);
      if (produit) montrer().catch(console.error);
    } else if (produit && reglages.envies && !hote.isConnected) {
      // Une application qui a retiré le bouton en réécrivant la page.
      document.documentElement?.append(hote);
    }
  }

  Reglages.lire().then((r) => {
    reglages = r;
    surveiller();
    setInterval(surveiller, 1_000);
  }, console.error);
  Reglages.suivre((r) => {
    reglages = r;
    montrer().catch(console.error);
  });
  Envies.suivre(() => montrer().catch(console.error));
})();
