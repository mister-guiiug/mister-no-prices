/**
 * Les règles par site : la seule chose à écrire pour en ajouter un.
 *
 * Une règle, c'est :
 *   - `id`       : identifiant stable, en minuscules ;
 *   - `nom`      : ce qu'affiche le popup ;
 *   - `domaines` : les domaines couverts, sous-domaines compris (« amazon.fr »
 *                  couvre www.amazon.fr) ;
 *   - `hotes`    : ou des hôtes exacts, quand le domaine entier serait trop
 *                  large (« www.google.fr », sans mail.google.fr ni docs) ;
 *                  le manifeste doit déclarer les uns et les autres, un test le
 *                  vérifie ;
 *   - `chemins`  : facultatif, pour un site dont une seule partie vend — les
 *                  débuts de chemin couverts (« /marketplace » couvre
 *                  /marketplace et /marketplace/item/…, pas /marketplacex).
 *                  Ailleurs sur le site, l'extension ne masque rien, et elle
 *                  suit la navigation d'une application qui change d'adresse
 *                  sans recharger la page ;
 *   - `masquer`  : les sélecteurs CSS des éléments qui ne contiennent QUE des
 *                  prix. Ils sont couverts avant le premier affichage ;
 *   - `fiche`    : facultatif, pour la liste d'envies — les sélecteurs du
 *                  titre, du prix et de l'image d'une fiche produit, quand le
 *                  site ne publie pas de données structurées (JSON-LD,
 *                  microdonnées, Open Graph) que content/produit.js lit seul.
 *                  Un sélecteur peut viser plusieurs gabarits (bureau,
 *                  mobile) : le premier élément non vide l'emporte.
 *
 * Tout le reste est générique et vaut sur chaque site, règle ou non :
 *   - les montants écrits en clair (« dès 35 € ») sont repérés dans le texte ;
 *   - un prix éclaté en morceaux (« 34 » « €99 ») est reconnu à son parent ;
 *   - le titre de l'onglet perd ses montants.
 *
 * `masquer` ne sert donc qu'à deux choses : couvrir un prix avant le premier
 * affichage, et attraper un prix que le générique ne reconnaît pas. Un
 * sélecteur qui désigne aussi autre chose qu'un prix (le rouge `.a-color-price`
 * d'Amazon sert aussi à « Plus que 2 ex. en stock ») n'a rien à faire ici : le
 * repérage dans le texte ne couvre que le montant. Un sélecteur invalide est
 * ignoré sans casser les autres (ils sont réunis dans un `:is()`).
 */
(() => {
  "use strict";

  const REGLES = [
    {
      id: "amazon",
      nom: "Amazon",
      domaines: [
        "amazon.fr",
        "amazon.com",
        "amazon.it",
        "amazon.de",
        "amazon.co.uk",
        "amazon.es",
        "amazon.com.be",
        "amazon.nl",
        "amazon.ie",
        "amazon.se",
        "amazon.pl",
        "amazon.com.tr",
        "amazon.ca",
        "amazon.com.mx",
        "amazon.com.br",
        "amazon.co.jp",
        "amazon.in",
        "amazon.com.au",
        "amazon.sg",
        "amazon.ae",
        "amazon.sa",
        "amazon.eg",
        "amazon.co.za",
      ],
      masquer: [
        // Composant prix (recherche, fiche, listes, panier) et ses morceaux
        ".a-price",
        ".a-price-whole",
        ".a-price-fraction",
        ".a-price-decimal",
        ".a-price-symbol",
        // Prix barré : « Prix conseillé », « Prix le plus bas récent »
        ".a-text-price",
        // Meilleures ventes, nouveautés : classe hachée, préfixe stable
        '[class*="p13n-sc-price"]',
        // Fiche produit, anciennes mises en page encore servies
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        "#priceblock_saleprice",
        "#priceblock_pospromoprice",
        "#price_inside_buybox",
        "#newBuyBoxPrice",
        "#kindle-price",
        "#sns-base-price",
        "#tp_price_block_total_price_ww",
        // Prix sous les variantes (taille, couleur, format)
        ".twisterSwatchPrice",
        // Carrousel des vidéos de la fiche : « € » « 29 » « 99 » en trois morceaux
        ".vse-price-component",
        // Panier
        ".sc-price",
        ".sc-product-price",
        '[id^="sc-subtotal-amount"]',
      ],
      // Aucune donnée structurée sur les fiches. #productTitle et #landingImage
      // au bureau, #title et #main-image sur le site mobile.
      fiche: {
        titre: "#productTitle, #title",
        prix: "#corePrice_feature_div .a-offscreen, .priceToPay .a-offscreen, .reinventPricePriceToPayMargin, #corePrice_mobile_feature_div .a-price",
        image: "#landingImage, #main-image, #imgTagWrapperId img",
      },
    },
    {
      id: "dealabs",
      nom: "Dealabs",
      domaines: ["dealabs.com"],
      // Tout est écrit en clair, titres des bons plans compris : le repérage
      // dans le texte fait l'essentiel. Ces deux-là évitent le clignotement.
      masquer: [".thread-price", ".threadItemCard-price"],
      // Une page de bon plan ne se dit pas produit (JSON-LD
      // DiscussionForumPosting, og:type website) : sans ceci, pas de bouton ♥.
      // Le prix est celui du bon plan, pas ceux des bons plans voisins.
      fiche: {
        titre: "h1.thread-title",
        prix: '[id^="thread_details_"] .thread-price',
        image: 'meta[property="og:image"]',
      },
    },
    {
      id: "decathlon",
      nom: "Decathlon",
      domaines: [
        "decathlon.fr",
        "decathlon.be",
        "decathlon.ch",
        "decathlon.com",
        "decathlon.co.uk",
        "decathlon.de",
        "decathlon.es",
        "decathlon.it",
        "decathlon.nl",
        "decathlon.pl",
        "decathlon.pt",
      ],
      // Le composant prix du système de conception Vitamin : prix, prix barré,
      // remise en euros (« -30 € »), mention « prix le plus bas ».
      masquer: [".vp-price-amount", ".vp-price-barred-amount", ".vp-price-discount", ".vp-price-helper"],
    },
    {
      id: "cdiscount",
      nom: "Cdiscount",
      domaines: ["cdiscount.com"],
      // Classes hachées (styled-components) ; seuls ces noms-là sont stables.
      // Les gros prix « 34 » « €99 » sans classe stable : prix éclatés, génériques.
      masquer: [".price", ".SecondaryPrice-price"],
    },
    {
      id: "fnac",
      nom: "Fnac",
      domaines: ["fnac.com"],
      // Relevés sur la liste ; la fiche répond par une vérification anti-robot
      // à un navigateur piloté, elle compte sur le générique.
      masquer: [
        ".userPrice",
        ".oldPrice",
        ".blocPriceBorder .price",
        ".f-faMpMoreOffers__price",
        ".f-xTimesPaymentsSummary__creditAmount",
      ],
      // Non vérifié (vérification anti-robot) : le gabarit connu de la fiche.
      fiche: {
        titre: "h1.f-productHeader-Title, h1.f-productHeader__title",
        prix: ".f-faPriceBox__price.userPrice, .f-faPriceBox .userPrice",
        image: 'meta[property="og:image"]',
      },
    },
    {
      id: "darty",
      nom: "Darty",
      domaines: ["darty.com"],
      // Vérification anti-robot dès la première page : balisage non relevé.
      masquer: [],
    },
    {
      id: "boulanger",
      nom: "Boulanger",
      domaines: ["boulanger.com"],
      masquer: [
        ".price__amount",
        ".price__crossed",
        ".price__tax",
        ".trends__price",
        ".trends__strike",
        ".collections__item-price",
        ".add-to-cart-price",
        ".installment-card__amount",
        ".product-loyalty-simulation__amount",
        ".card-service__price",
      ],
    },
    {
      id: "ldlc",
      nom: "LDLC",
      domaines: ["ldlc.com"],
      masquer: [
        "div.price",
        ".old-price",
        ".new-price",
        ".price--infos .eco",
        ".payment-option--price",
        ".payment-option--deposit",
      ],
    },
    {
      id: "rueducommerce",
      nom: "Rue du Commerce",
      domaines: ["rueducommerce.fr"],
      // Même groupe que LDLC, même balisage des prix.
      masquer: ["div.price", ".old-price", ".new-price", ".premium__price"],
      // Ni JSON-LD ni og:type sur la fiche.
      fiche: {
        titre: "h1.product__title",
        prix: ".product__price .new-price, .new-price",
        image: 'meta[property="og:image"]',
      },
    },
    {
      id: "leclerc",
      nom: "E.Leclerc",
      // leclerc.fr renvoie vers e.leclerc, le domaine de premier niveau de
      // l'enseigne : les deux sont couverts.
      domaines: ["e.leclerc", "leclerc.fr"],
      // Classes hachées. Les prix « 39 » « € » « , » « 99 » des listes sont
      // éclatés : le générique les reconnaît.
      masquer: [".carousel-item__price"],
    },
    {
      id: "carrefour",
      nom: "Carrefour",
      domaines: ["carrefour.fr"],
      // Vérification anti-robot dès la première page : balisage non relevé.
      masquer: [],
    },
    {
      id: "ebay",
      nom: "eBay",
      domaines: ["ebay.fr", "ebay.com"],
      // Les prix des listes sont écrits en clair dans des classes génériques
      // (`su-styled-text primary bold`) : le repérage dans le texte suffit.
      masquer: [".s-card__price", ".x-price-primary", ".x-price-approx__price"],
    },
    {
      id: "aliexpress",
      nom: "AliExpress",
      domaines: ["aliexpress.com"],
      // Classes hachées, préfixes stables.
      masquer: [
        '[class*="priceBottomItem"]',
        '[class*="price-sale"]',
        '[class*="price-default--current"]',
        '[class*="price--lastOrigin"]',
        '[class*="price--originalText"]',
      ],
    },
    {
      id: "zalando",
      nom: "Zalando",
      domaines: ["zalando.fr"],
      // Classes entièrement hachées : rien de stable à nommer. Les prix sont
      // écrits en clair, le repérage dans le texte les couvre.
      masquer: [],
    },
    {
      id: "auchan",
      nom: "Auchan",
      domaines: ["auchan.fr"],
      masquer: [".product-price", ".product-thumbnail__more-offers .red-txt", ".cartAmount"],
    },
    {
      id: "manomano",
      nom: "ManoMano",
      domaines: ["manomano.fr"],
      // Vérification anti-robot dès la première page : balisage non relevé.
      masquer: [],
    },
    // --- Petites annonces -----------------------------------------------------
    {
      id: "leboncoin",
      nom: "Leboncoin",
      domaines: ["leboncoin.fr"],
      // Vérification anti-robot dès la première page : balisage non relevé.
      masquer: [],
    },
    {
      id: "facebook",
      nom: "Facebook Marketplace",
      domaines: ["facebook.com"],
      // Le reste de Facebook n'a rien à vendre : masquer chaque montant d'une
      // publication ou d'une conversation serait un défaut, pas une protection.
      chemins: ["/marketplace"],
      masquer: [],
    },
    {
      id: "paruvendu",
      nom: "ParuVendu",
      domaines: ["paruvendu.fr"],
      // Classes utilitaires (Tailwind) seulement : le générique couvre les prix,
      // écrits en clair.
      masquer: [],
    },
    {
      id: "vivastreet",
      nom: "Vivastreet",
      domaines: ["vivastreet.com"],
      // Les pages relevées ne portent que des montants en clair : générique
      // seul.
      masquer: [],
    },
    {
      id: "wallapop",
      nom: "Wallapop",
      domaines: ["wallapop.com"],
      // Modules CSS : classes hachées, préfixes stables.
      masquer: ['[class*="RetrievalItemCard__price"]', '[class*="RetrievalItemCard__currentPrice"]'],
    },
    {
      id: "marktplaats",
      nom: "Marktplaats",
      domaines: ["marktplaats.nl"],
      // Modules CSS : classe hachée, préfixe stable. Le bouton « Details »
      // voisin, non.
      masquer: ['[class*="ListingPrice_hz-Listing-price"]'],
    },
    {
      id: "kleinanzeigen",
      nom: "Kleinanzeigen",
      domaines: ["kleinanzeigen.de"],
      // Classes utilitaires (Tailwind) seulement : le générique couvre les prix,
      // écrits en clair.
      masquer: [],
    },
    {
      id: "subito",
      nom: "Subito",
      domaines: ["subito.it"],
      // Modules CSS : classe hachée, préfixe stable.
      masquer: ['[class*="index-module_price__"]'],
    },
    {
      id: "milanuncios",
      nom: "Milanuncios",
      domaines: ["milanuncios.com"],
      // Visite interrompue dès la première page (« Algo se detuvo ») : balisage
      // non relevé.
      masquer: [],
    },
    {
      id: "craigslist",
      nom: "Craigslist",
      domaines: ["craigslist.org"],
      // Prix en clair (« $250 »), histogramme des prix en SVG : générique seul.
      masquer: [],
    },
    // --- Occasion et collection -------------------------------------------------
    {
      id: "vinted",
      nom: "Vinted",
      domaines: [
        "vinted.fr",
        "vinted.be",
        "vinted.lu",
        "vinted.es",
        "vinted.it",
        "vinted.de",
        "vinted.at",
        "vinted.nl",
        "vinted.pt",
        "vinted.pl",
        "vinted.co.uk",
        "vinted.com",
      ],
      // Les attributs de test sont stables, les classes hachées. Le total
      // « frais inclus » est un prix ; sa ligne « incl. », non.
      masquer: ['[data-testid$="--price-text"]', '[data-testid="total-combined-price"]'],
    },
    {
      id: "backmarket",
      nom: "Back Market",
      domaines: [
        "backmarket.fr",
        "backmarket.be",
        "backmarket.de",
        "backmarket.es",
        "backmarket.it",
        "backmarket.nl",
        "backmarket.at",
        "backmarket.pt",
        "backmarket.co.uk",
        "backmarket.com",
      ],
      // Vérification anti-robot sur les fiches ; la liste, vue, n'a laissé aucun
      // montant lisible.
      masquer: [],
    },
    {
      id: "cashexpress",
      nom: "Cash Express",
      domaines: ["cashexpress.fr"],
      // « À partir de » reste lisible : seul le montant est couvert. Sur la
      // fiche, « 399,99 » et « € » sont deux nœuds.
      masquer: [".product-card__price .price", ".price--product-page", ".price__new"],
      // Ni JSON-LD utile (un @graph vide) ni Open Graph sur la fiche.
      fiche: {
        titre: "h1.product__name",
        prix: ".price--product-page .price__new",
        image: 'img[src*="/uploaded/product-"]',
      },
    },
    {
      id: "easycash",
      nom: "Easy Cash",
      domaines: ["easycash.fr"],
      // Les fiches vivent sur bons-plans.easycash.fr, couvert.
      masquer: [".productsheet-block-item--price"],
    },
    {
      id: "reverb",
      nom: "Reverb",
      domaines: ["reverb.com"],
      // Le prix et sa copie pour les lecteurs d'écran.
      masquer: [".rc-price-block__price", ".rc-listing-card__price"],
    },
    {
      id: "discogs",
      nom: "Discogs",
      domaines: ["discogs.com"],
      // Prix du vendeur et prix converti dans la devise du visiteur.
      masquer: ["span.price", ".converted_price"],
    },
    {
      id: "delcampe",
      nom: "Delcampe",
      domaines: ["delcampe.net"],
      masquer: [".item-price"],
    },
    {
      id: "catawiki",
      nom: "Catawiki",
      domaines: ["catawiki.com"],
      // Enchère en cours sur les cartes de lots.
      masquer: [".c-lot-card__price"],
    },
    {
      id: "vestiairecollective",
      nom: "Vestiaire Collective",
      domaines: ["vestiairecollective.com"],
      // Modules CSS : classe hachée, préfixe stable.
      masquer: ['[class*="productCard__text--price"]'],
    },
    {
      id: "chrono24",
      nom: "Chrono24",
      domaines: [
        "chrono24.fr",
        "chrono24.com",
        "chrono24.de",
        "chrono24.it",
        "chrono24.es",
        "chrono24.co.uk",
        "chrono24.ch",
        "chrono24.be",
        "chrono24.nl",
        "chrono24.at",
      ],
      // Vérification anti-robot dès la première page : balisage non relevé.
      masquer: [],
    },
    {
      id: "google",
      nom: "Google",
      // Des hôtes exacts, pas le domaine : *.google.com couvrirait aussi Gmail,
      // Docs ou Drive. www.google.* porte la recherche et Google Images (udm=2).
      hotes: [
        "www.google.fr",
        "www.google.com",
        "www.google.be",
        "www.google.ch",
        "www.google.ca",
        "www.google.co.uk",
        "www.google.de",
        "www.google.es",
        "www.google.it",
      ],
      // Produits sponsorisés (recherche et Images : .pla-unit-container, tuiles
      // « Sponsorisé ») et fiches Shopping : classes hachées, prix écrits en
      // clair, que le repérage dans le texte couvre. Seuls les libellés
      // d'accessibilité des prix sont stables ; ils évitent le clignotement.
      masquer: [
        '[aria-label^="Prix actuel"]',
        '[aria-label^="Le prix actuel"]',
        '[aria-label^="L\'ancien prix"]',
        '[aria-label*="Avant :"]',
      ],
    },
  ];

  // Le format et la révision du catalogue embarqué. MONTER `revision` à chaque
  // changement de règle (AAAA-MM-JJ.n) : c'est elle qui fait adopter le
  // catalogue distant (regles/regles.json, tiré de ce fichier par
  // `npm run catalogue`) par les installations, sans nouvelle version de
  // l'extension. Le `format` ne change qu'avec le moteur.
  globalThis.SansPrixReglesVersion = Object.freeze({ format: 1, revision: "2026-11-18.1" });

  globalThis.SansPrixRegles = Object.freeze(
    REGLES.map((regle) =>
      Object.freeze({
        ...regle,
        domaines: Object.freeze([...(regle.domaines ?? [])]),
        hotes: Object.freeze([...(regle.hotes ?? [])]),
        chemins: regle.chemins ? Object.freeze([...regle.chemins]) : null,
        masquer: Object.freeze([...regle.masquer]),
        fiche: regle.fiche ? Object.freeze({ ...regle.fiche }) : null,
      }),
    ),
  );
})();
