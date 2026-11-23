/**
 * La page de la liste d'envies, pour le parent.
 *
 * Les prix y sont masqués à l'ouverture, comme partout : l'enfant peut ouvrir
 * cette page sans tout dévoiler. « Afficher les prix » les montre, avec le
 * total par devise, le temps de la visite — rien n'est retenu. Le partage
 * reprend ce qui est à l'écran : sans les prix tant qu'ils sont masqués.
 *
 * Chaque article peut porter le prénom de l'enfant (« pour Léa »), se ranger
 * (↑ ↓), et la liste se filtrer par enfant, s'imprimer. Avec un code parent,
 * afficher les prix et tout effacer le demandent.
 */
(() => {
  "use strict";

  const Envies = globalThis.SansPrixEnvies;
  const { exiger } = globalThis.SansPrixCodeUI;
  const t = (cle, ...valeurs) => browser.i18n.getMessage(cle, valeurs);
  const langue = t("langue");

  document.documentElement.lang = langue;
  // Sens de lecture de la langue (« rtl » en arabe), que fournit Firefox.
  document.documentElement.dir = browser.i18n.getMessage("@@bidi_dir") || "ltr";
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }

  const $ = (id) => document.getElementById(id);
  const boutonPrix = $("prix");
  let prixVisibles = false;
  let articles = [];
  // Le filtre par enfant : "" pour tout le monde, SANS_PRENOM pour les articles
  // qui n'en portent pas, sinon un prénom.
  const SANS_PRENOM = "-";
  let filtre = "";
  const visibles = () => (filtre === "" ? articles : articles.filter((a) => (a.pour ?? SANS_PRENOM) === filtre));
  const prenoms = () =>
    [...new Set(articles.map((a) => a.pour).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, langue, { sensitivity: "base" }),
    );

  const formatDate = new Intl.DateTimeFormat(langue, { day: "numeric", month: "short" });

  function formatPrix(prix, devise) {
    if (prix == null) return null;
    try {
      if (devise) return new Intl.NumberFormat(langue, { style: "currency", currency: devise }).format(prix);
    } catch {
      // Un code de devise que le navigateur ne connaît pas : le nombre seul.
    }
    return new Intl.NumberFormat(langue, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(prix);
  }

  /** Un total par devise : on n'additionne pas des euros et des dollars. */
  function totaux(liste) {
    const parDevise = new Map();
    for (const { prix, devise } of liste) {
      if (prix == null) continue;
      parDevise.set(devise ?? "", (parDevise.get(devise ?? "") ?? 0) + prix);
    }
    return [...parDevise].map(([devise, somme]) => formatPrix(somme, devise || null));
  }

  /** Un petit bouton d'action d'un article. */
  function bouton(texte, etiquette, action, desactive = false) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = texte;
    b.setAttribute("aria-label", etiquette);
    b.disabled = desactive;
    b.addEventListener("click", () => action().catch(console.error));
    return b;
  }

  function article(a, rang, nombre) {
    const li = document.createElement("li");
    li.className = "article";

    if (a.image) {
      const img = document.createElement("img");
      img.src = a.image;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.className = "vignette";
      img.addEventListener("error", () => img.replaceWith(vignetteVide()), { once: true });
      li.append(img);
    } else {
      li.append(vignetteVide());
    }

    const infos = document.createElement("div");
    infos.className = "infos";
    const lien = document.createElement("a");
    lien.href = a.url;
    lien.target = "_blank";
    lien.rel = "noopener noreferrer";
    lien.className = "titre";
    lien.textContent = a.titre;
    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = [a.site, a.ajoute ? formatDate.format(a.ajoute) : null].filter(Boolean).join(" · ");
    const prix = document.createElement("p");
    prix.className = "prix";
    const montant = formatPrix(a.prix, a.devise);
    if (!prixVisibles) {
      prix.classList.add("masque");
      prix.textContent = "00,00 €";
      prix.setAttribute("aria-label", t("listePrixMasque"));
    } else {
      prix.textContent = montant ?? t("listePrixInconnu");
      if (!montant) prix.classList.add("inconnu");
    }

    // Le prénom de l'enfant : un champ à l'écran, un texte à l'impression.
    const pour = document.createElement("label");
    pour.className = "pour";
    const champ = document.createElement("input");
    champ.type = "text";
    champ.value = a.pour ?? "";
    champ.maxLength = 40;
    champ.setAttribute("list", "prenoms");
    champ.placeholder = t("listePourExemple");
    champ.addEventListener("change", () => Envies.modifier(a.url, { pour: champ.value }).catch(console.error));
    pour.append(t("listePour"), " ", champ);
    const pourImprime = document.createElement("p");
    pourImprime.className = "pour-imprime";
    pourImprime.textContent = a.pour ? t("listePourImprime", a.pour) : "";
    infos.append(lien, meta, prix, pour, pourImprime);

    const actions = document.createElement("div");
    actions.className = "article-actions";
    // Ranger n'a de sens que sur la liste entière, pas sur une vue filtrée.
    if (filtre === "") {
      actions.append(
        bouton("↑", t("listeMonter", a.titre), () => Envies.deplacer(a.url, -1), rang === 0),
        bouton("↓", t("listeDescendre", a.titre), () => Envies.deplacer(a.url, 1), rang === nombre - 1),
      );
    }
    const retirer = bouton(t("listeRetirer"), t("listeRetirerArticle", a.titre), () => Envies.retirer(a.url));
    retirer.classList.add("retirer");
    actions.append(retirer);

    li.append(infos, actions);
    return li;
  }

  function vignetteVide() {
    const span = document.createElement("span");
    span.className = "vignette vignette-vide";
    span.setAttribute("aria-hidden", "true");
    span.textContent = "♥";
    return span;
  }

  function afficherPrenoms() {
    const noms = prenoms();
    $("prenoms").replaceChildren(...noms.map((nom) => Object.assign(document.createElement("option"), { value: nom })));
    if (filtre !== "" && filtre !== SANS_PRENOM && !noms.includes(filtre)) filtre = "";
    const options = [
      ["", t("listeFiltreTous")],
      ...noms.map((nom) => [nom, nom]),
      [SANS_PRENOM, t("listeFiltreSansPrenom")],
    ];
    $("filtre").replaceChildren(
      ...options.map(([valeur, texte]) =>
        Object.assign(document.createElement("option"), {
          value: valeur,
          textContent: texte,
          selected: valeur === filtre,
        }),
      ),
    );
    $("filtre-ligne").hidden = noms.length === 0;
  }

  function afficher() {
    afficherPrenoms();
    const vus = visibles();
    $("articles").replaceChildren(...vus.map((a, rang) => article(a, rang, vus.length)));
    $("compte").textContent = t(articles.length > 1 ? "listeCompteN" : "listeCompte1", String(articles.length));
    $("vide").hidden = articles.length > 0;
    for (const id of ["prix", "partager", "imprimer", "vider"]) $(id).disabled = articles.length === 0;

    boutonPrix.setAttribute("aria-pressed", String(prixVisibles));
    boutonPrix.textContent = t(prixVisibles ? "listeMasquerPrix" : "listeMontrerPrix");
    const sommes = totaux(vus);
    $("total").hidden = !prixVisibles || sommes.length === 0;
    $("total").textContent = t("listeTotal", sommes.join(" + "));
  }

  function texteAPartager() {
    const lignes = visibles().map((a) => {
      const prix = prixVisibles ? formatPrix(a.prix, a.devise) : null;
      const details = [a.pour ? t("listePourImprime", a.pour) : null, prix, a.site].filter(Boolean).join(", ");
      return `• ${a.titre}${details ? ` (${details})` : ""}\n  ${a.url}`;
    });
    return `${t("listeTitre")}\n\n${lignes.join("\n")}\n`;
  }

  boutonPrix.addEventListener("click", async () => {
    // Montrer les prix demande le code parent ; les cacher, jamais.
    if (!prixVisibles && !(await exiger())) return;
    prixVisibles = !prixVisibles;
    afficher();
  });

  $("filtre").addEventListener("change", () => {
    filtre = $("filtre").value;
    afficher();
  });

  // L'impression reprend l'écran : prix masqués tant qu'on ne les a pas montrés.
  $("imprimer").addEventListener("click", () => window.print());

  $("partager").addEventListener("click", async () => {
    const texte = texteAPartager();
    // Le partage du système (Firefox pour Android) ; sinon le presse-papiers.
    if (navigator.share) {
      try {
        await navigator.share({ title: t("listeTitre"), text: texte });
        return;
      } catch (erreur) {
        if (erreur.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(texte);
      $("message").textContent = t("listeCopiee");
    } catch {
      $("message").textContent = t("listeCopieImpossible");
    }
  });

  $("vider").addEventListener("click", async () => {
    if (!(await exiger())) return;
    if (window.confirm(t("listeViderConfirmer"))) Envies.vider().catch(console.error);
  });

  const recharger = (liste) => {
    articles = liste;
    afficher();
  };
  Envies.lire().then(recharger, console.error);
  Envies.suivre(recharger);
})();
