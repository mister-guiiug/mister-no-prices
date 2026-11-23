/**
 * Reconnaître une fiche produit et en tirer ce que la liste d'envies retient :
 * titre, image, prix, adresse.
 *
 * Quatre sources, de la plus sûre à la plus vague, champ par champ :
 *   1. la règle du site (`fiche` dans regles.js), pour qui ne publie rien de
 *      structuré — Amazon ;
 *   2. les données structurées JSON-LD (`@type: Product`), que la plupart des
 *      boutiques publient pour les moteurs de recherche ;
 *   3. les microdonnées (`itemtype=…schema.org/Product`) ;
 *   4. Open Graph, seulement si la page se déclare produit (`og:type`) ou porte
 *      un prix (`product:price:amount`) : toute page a un `og:title`.
 *
 * Une page n'est une fiche que si l'une de ces sources la désigne comme telle et
 * donne un titre. Le prix est facultatif : la liste le montrera au parent s'il
 * existe.
 *
 * Fonctions pures sur un `document` : testables hors navigateur.
 */
(
  () => {
    "use strict";

    const SYMBOLES = Object.freeze({ "€": "EUR", "£": "GBP", $: "USD", "¥": "JPY", "₹": "INR", "₺": "TRY", zł: "PLN" });

    // Les entités HTML qu'un JSON-LD laisse parfois dans ses chaînes (« &amp; »).
    const ENTITES = Object.freeze({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " });
    const decoder = (s) =>
      s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entite, nom) => {
        if (nom[0] === "#") {
          const code = nom[1].toLowerCase() === "x" ? parseInt(nom.slice(2), 16) : Number(nom.slice(1));
          return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entite;
        }
        return ENTITES[nom.toLowerCase()] ?? entite;
      });
    // Les espaces de largeur nulle qu’Amazon laisse au bout de certains titres tombent.
    const texte = (valeur) =>
      typeof valeur === "string"
        ? decoder(valeur)
            .replace(/[\u200b-\u200f\u2060\ufeff]/g, "")
            .replace(/\s+/g, " ")
            .trim()
        : "";

    /** « 1 234,56 € », « $1,234.56 », « 34€99 » → 1234.56 ; null si rien de lisible. */
    function lireMontant(brut) {
      if (typeof brut === "number") return Number.isFinite(brut) ? brut : null;
      const s = texte(String(brut ?? "")).replace(/[\s  '’]/g, "");
      const chiffres = s.match(/\d[\d.,]*/);
      if (!chiffres) return null;
      let n = chiffres[0].replace(/[.,]$/, "");
      // Le dernier séparateur suivi d'un ou deux chiffres est la décimale ; les
      // autres groupent les milliers.
      const decimale = n.match(/[.,](\d{1,2})$/);
      if (decimale) n = `${n.slice(0, -decimale[0].length).replace(/[.,]/g, "")}.${decimale[1]}`;
      else n = n.replace(/[.,]/g, "");
      // « 34€99 » : l'euro tient lieu de virgule.
      const eclate = s.match(/^(\d+)€(\d{2})$/);
      if (eclate) n = `${eclate[1]}.${eclate[2]}`;
      const valeur = Number(n);
      return Number.isFinite(valeur) ? valeur : null;
    }

    function lireDevise(brut) {
      const s = texte(String(brut ?? ""));
      if (/^[A-Z]{3}$/.test(s)) return s;
      for (const [symbole, code] of Object.entries(SYMBOLES)) if (s.includes(symbole)) return code;
      // « EUR72.56 » (Amazon.com qui convertit) : le code est collé au montant.
      const code = s.match(/(?<![A-Z])(EUR|USD|GBP|CHF|CAD|PLN|SEK|JPY)(?![A-Z])/);
      return code ? code[1] : null;
    }

    function absolue(url, base) {
      // Une adresse vide se résoudrait en celle de la page.
      if (typeof url !== "string" || !url.trim()) return null;
      try {
        const u = new URL(String(url), base);
        return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
      } catch {
        return null;
      }
    }

    // --- Les sources ---------------------------------------------------------

    /**
     * Les sélecteurs d'une règle visent souvent plusieurs gabarits (bureau et
     * mobile) : on prend le premier élément qui porte vraiment quelque chose — un
     * `.a-offscreen` vide précède parfois le bon.
     */
    function depuisRegle(doc, fiche) {
      if (!fiche?.titre) return null;
      const premier = (selecteur, lire) => {
        if (!selecteur) return "";
        for (const e of doc.querySelectorAll(selecteur)) {
          const valeur = texte(lire(e));
          if (valeur) return valeur;
        }
        return "";
      };
      const titre = premier(fiche.titre, (e) => e.textContent);
      if (!titre) return null;
      const prixTexte = premier(fiche.prix, (e) => (/\d/.test(e.textContent) ? e.textContent : ""));
      const image = premier(
        fiche.image,
        (e) => e.getAttribute("data-old-hires") || e.currentSrc || e.getAttribute("src") || e.getAttribute("content"),
      );
      return {
        titre,
        image: image || null,
        prix: prixTexte ? lireMontant(prixTexte) : null,
        devise: prixTexte ? lireDevise(prixTexte) : null,
      };
    }

    /** Tous les objets JSON-LD de la page, @graph et tableaux dépliés. */
    function objetsJsonLd(doc) {
      const objets = [];
      const deplier = (valeur) => {
        if (Array.isArray(valeur)) valeur.forEach(deplier);
        else if (valeur && typeof valeur === "object") {
          objets.push(valeur);
          if (valeur["@graph"]) deplier(valeur["@graph"]);
        }
      };
      for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          deplier(JSON.parse(script.textContent));
        } catch {
          // Un bloc mal formé ne doit pas empêcher de lire les autres.
        }
      }
      return objets;
    }

    // « Product », « schema:Product », « https://schema.org/Product », « product » (Cdiscount).
    // Avec les sous-types de Product que publient les annonces : un véhicule
    // (ParuVendu : `Vehicle`), un objet unique, un modèle.
    const PRODUITS = ["product", "productgroup", "individualproduct", "productmodel", "vehicle", "car", "motorcycle"];
    const estDuType = (objet, ...types) =>
      [objet["@type"]].flat().some((t) =>
        types.includes(
          String(t)
            .replace(/^.*[/#:]/, "")
            .toLowerCase(),
        ),
      );

    /** Un objet Product (ou ProductGroup) → titre, image, prix. */
    function lireProduitJsonLd(produit) {
      const image = [produit.image].flat()[0];
      // offers : une offre, une liste, ou un agrégat (prix le plus bas).
      const offres = [produit.offers].flat().filter((o) => o && typeof o === "object");
      const offre = offres.find((o) => o.price ?? o.lowPrice ?? o.priceSpecification) ?? offres[0];
      const spec = [offre?.priceSpecification].flat()[0];
      const prix = offre?.price ?? offre?.lowPrice ?? spec?.price ?? null;
      return {
        titre: texte(produit.name),
        image: typeof image === "string" ? image : (image?.url ?? image?.contentUrl ?? null),
        prix: prix == null || prix === "" ? null : lireMontant(prix),
        devise: lireDevise(offre?.priceCurrency ?? spec?.priceCurrency),
      };
    }

    /**
     * Une page peut porter un ProductGroup (le modèle, sans prix) suivi de ses
     * Product (les déclinaisons, avec prix) — Decathlon, Zalando : on prend chaque
     * champ là où il est.
     */
    function depuisJsonLd(doc) {
      const produits = objetsJsonLd(doc)
        .filter((o) => estDuType(o, ...PRODUITS))
        .flatMap((o) => [o, ...[o.hasVariant ?? []].flat().filter((v) => v && typeof v === "object")])
        .map(lireProduitJsonLd);
      if (produits.length === 0) return null;
      const champ = (nom) => produits.map((p) => p[nom]).find((v) => v != null && v !== "") ?? null;
      const avecPrix = produits.find((p) => p.prix != null);
      return {
        titre: champ("titre"),
        image: champ("image"),
        prix: avecPrix?.prix ?? null,
        devise: avecPrix?.devise ?? null,
      };
    }

    function depuisMicrodonnees(doc) {
      const portee = doc.querySelector('[itemscope][itemtype*="schema.org/Product"]');
      if (!portee) return null;
      const prop = (nom) => portee.querySelector(`[itemprop="${nom}"]`);
      const valeur = (e) =>
        e?.getAttribute("content") || e?.getAttribute("src") || e?.getAttribute("href") || e?.textContent || null;
      const prix = valeur(prop("price")) ?? valeur(prop("lowPrice"));
      return {
        titre: texte(valeur(prop("name"))),
        image: valeur(prop("image")),
        prix: prix == null ? null : lireMontant(prix),
        devise: lireDevise(valeur(prop("priceCurrency")) ?? prix),
      };
    }

    function depuisOpenGraph(doc) {
      const meta = (...noms) => {
        for (const nom of noms) {
          const e = doc.querySelector(`meta[property="${nom}"], meta[name="${nom}"]`);
          if (e?.content) return e.content;
        }
        return null;
      };
      const prix = meta("product:price:amount", "og:price:amount");
      if (!/product/i.test(meta("og:type") ?? "") && prix == null) return null;
      return {
        titre: texte(meta("og:title")),
        image: meta("og:image", "og:image:secure_url"),
        prix: prix == null ? null : lireMontant(prix),
        devise: lireDevise(meta("product:price:currency", "og:price:currency")),
      };
    }

    /** L'adresse qui identifie le produit : la canonique du site, sinon sans requête. */
    function adresseProduit(doc) {
      const ici = new URL(doc.URL);
      const canonique = absolue(doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "", doc.URL);
      // Une canonique vers un autre site (agrégateur, page d'accueil) ne vaut rien.
      if (
        canonique &&
        new URL(canonique).hostname.split(".").slice(-2).join(".") === ici.hostname.split(".").slice(-2).join(".")
      ) {
        if (new URL(canonique).pathname.length > 1) return canonique;
      }
      return `${ici.origin}${ici.pathname}`;
    }

    /**
     * La fiche produit de la page, ou null.
     * @param {Document} doc
     * @param {{titre?: string, prix?: string, image?: string}} [fiche] sélecteurs de la règle du site
     * @returns {{url: string, titre: string, image: string|null, prix: number|null, devise: string|null} | null}
     */
    function extraireProduit(doc, fiche) {
      const sources = [
        depuisRegle(doc, fiche),
        depuisJsonLd(doc),
        depuisMicrodonnees(doc),
        depuisOpenGraph(doc),
      ].filter(Boolean);
      const champ = (nom) => sources.map((s) => s[nom]).find((v) => v != null && v !== "") ?? null;
      const titre = champ("titre");
      if (!titre) return null;
      // Le prix et sa devise viennent de la même source : ne pas marier un prix
      // en dollars du JSON-LD avec l'euro d'Open Graph.
      const avecPrix = sources.find((s) => s.prix != null);
      return {
        url: adresseProduit(doc),
        titre: titre.slice(0, 300),
        image: absolue(champ("image") ?? "", doc.URL),
        prix: avecPrix?.prix ?? null,
        devise: avecPrix ? (avecPrix.devise ?? sources.map((s) => s.devise).find(Boolean) ?? null) : null,
      };
    }

    globalThis.SansPrixProduit = Object.freeze({ extraireProduit, lireMontant, lireDevise });
  }
)();
