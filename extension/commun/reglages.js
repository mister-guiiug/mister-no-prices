/**
 * Réglages partagés par le content script, le popup et le script d'arrière-plan.
 *
 * Rangés dans storage.sync : ils suivent le compte Firefox d'un appareil à
 * l'autre, et restent locaux si la synchronisation est coupée.
 *
 *   - `actif`        : l'interrupteur général ;
 *   - `pauseJusqua`  : une pause minutée (horodatage en ms), qui se lève seule ;
 *   - `sitesEteints` : les règles (par `id`) où le parent a choisi de voir les
 *                      prix ;
 *   - `style`        : barre grise, flou ou papier cadeau ;
 *   - `envies`       : le bouton ♥ « Ma liste » sur les fiches produit ;
 *   - `compteur`     : le nombre de prix masqués sur l'icône ;
 *   - `catalogueDistant` : relire chaque jour le catalogue des règles sur le
 *                      dépôt (une requête à GitHub, aucune donnée envoyée).
 */
(() => {
  "use strict";

  const STYLES = Object.freeze(["barre", "flou", "cadeau"]);
  const DEFAUTS = Object.freeze({
    actif: true,
    pauseJusqua: 0,
    sitesEteints: Object.freeze([]),
    style: "barre",
    envies: true,
    compteur: true,
    catalogueDistant: true,
  });
  // Une pause ne dépasse pas une journée : une valeur aberrante (horloge
  // déréglée, réglage abîmé) ne doit pas éteindre le masquage pour des années.
  const PAUSE_MAX = 24 * 60 * 60 * 1000;

  function normaliser(brut) {
    const pause = Number(brut.pauseJusqua);
    return {
      // Tout ce qui n'est pas explicitement `false` masque : en cas de doute, on cache.
      actif: brut.actif !== false,
      pauseJusqua: Number.isFinite(pause) && pause > 0 && pause <= Date.now() + PAUSE_MAX ? pause : 0,
      sitesEteints: Array.isArray(brut.sitesEteints) ? brut.sitesEteints.filter((id) => typeof id === "string") : [],
      style: STYLES.includes(brut.style) ? brut.style : DEFAUTS.style,
      envies: brut.envies !== false,
      compteur: brut.compteur !== false,
      catalogueDistant: brut.catalogueDistant !== false,
    };
  }

  /** La pause est-elle en cours ? */
  const enPause = (reglages, maintenant = Date.now()) => reglages.pauseJusqua > maintenant;

  /**
   * Faut-il masquer, ici et maintenant ? L'interrupteur, sans pause en cours,
   * et le site (`idRegle`) n'est pas de ceux que le parent a éteints.
   */
  function masquageEnCours(reglages, idRegle = null, maintenant = Date.now()) {
    if (!reglages.actif || enPause(reglages, maintenant)) return false;
    return !(idRegle && reglages.sitesEteints.includes(idRegle));
  }

  async function lire() {
    return normaliser(await browser.storage.sync.get(DEFAUTS));
  }

  function ecrire(partiel) {
    return browser.storage.sync.set(partiel);
  }

  /** Rappelle `rappel(reglages)` à chaque changement, depuis n'importe quel onglet. */
  function suivre(rappel) {
    browser.storage.onChanged.addListener((changements, zone) => {
      if (zone !== "sync") return;
      if (!Object.keys(DEFAUTS).some((cle) => cle in changements)) return;
      lire().then(rappel, console.error);
    });
  }

  globalThis.SansPrixReglages = Object.freeze({
    STYLES,
    DEFAUTS,
    PAUSE_MAX,
    normaliser,
    enPause,
    masquageEnCours,
    lire,
    ecrire,
    suivre,
  });
})();
