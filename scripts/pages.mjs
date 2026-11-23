/**
 * Les pages visitées : une liste, et le lien de la première fiche produit qu'on
 * y trouve. Pas dans regles.js : ce sont des données de test, pas l'extension.
 *
 * `fiche` peut être une liste de sélecteurs, essayés dans l'ordre. `envies:
 * false` : la « fiche » du site n'est pas un produit, pas de bouton ♥ attendu.
 */
// Le site mobile d'Amazon n'a pas toujours le conteneur des résultats ; le
// second sélecteur, plus large, attrape aussi les pages promotionnelles.
const LIEN_AMAZON = [
  '[data-component-type="s-search-result"] a[href*="/dp/"]',
  'a[href*="/dp/"]:not([href*="/sspa/"])',
];
export const PAGES = {
  "amazon.fr": { liste: "https://www.amazon.fr/s?k=casque+audio", fiche: LIEN_AMAZON },
  "amazon.com": { liste: "https://www.amazon.com/s?k=headphones", fiche: LIEN_AMAZON },
  "amazon.it": { liste: "https://www.amazon.it/s?k=cuffie", fiche: LIEN_AMAZON },
  "amazon.co.uk": { liste: "https://www.amazon.co.uk/s?k=headphones", fiche: LIEN_AMAZON },
  "amazon.de": { liste: "https://www.amazon.de/s?k=kopfhorer", fiche: LIEN_AMAZON },
  "amazon.es": { liste: "https://www.amazon.es/s?k=auriculares", fiche: LIEN_AMAZON },
  // Un bon plan est une discussion, pas une fiche produit.
  "dealabs.com": { liste: "https://www.dealabs.com/", fiche: 'a[href*="/bons-plans/"]', envies: false },
  "decathlon.fr": { liste: "https://www.decathlon.fr/search?Ntt=velo", fiche: 'a[href*="/p/"]' },
  "cdiscount.com": {
    liste: "https://www.cdiscount.com/search/10/casque+audio.html",
    fiche: 'a[href*="/f-"]',
  },
  "fnac.com": {
    liste: "https://www.fnac.com/SearchResult/ResultList.aspx?Search=casque+audio",
    fiche: "a.Article-title",
  },
  "darty.com": {
    liste: "https://www.darty.com/nav/recherche?text=casque+audio",
    fiche: 'a[href*="/nav/achat/"]',
  },
  "boulanger.com": {
    liste: "https://www.boulanger.com/resultats?tr=casque+audio",
    fiche: 'a[href*="/ref/"]',
  },
  "ldlc.com": { liste: "https://www.ldlc.com/recherche/casque%20audio/", fiche: 'a[href*="/fiche/"]' },
  "rueducommerce.fr": {
    liste: "https://www.rueducommerce.fr/recherche/casque%20audio/",
    fiche: 'a[href*="/p/r"]',
  },
  "e.leclerc": { liste: "https://www.e.leclerc/recherche?q=casque+audio", fiche: 'a[href*="/fp/"]' },
  "carrefour.fr": { liste: "https://www.carrefour.fr/s?q=casque+audio", fiche: 'a[href*="/p/"]' },
  "auchan.fr": { liste: "https://www.auchan.fr/recherche?text=casque+audio", fiche: 'a[href*="/pr-"]' },
  "ebay.fr": {
    liste: "https://www.ebay.fr/sch/i.html?_nkw=casque+audio",
    fiche: 'a[href*="/itm/"]:not([href*="/itm/123456"])',
  },
  "ebay.com": {
    liste: "https://www.ebay.com/sch/i.html?_nkw=headphones",
    fiche: 'a[href*="/itm/"]:not([href*="/itm/123456"])',
  },
  "aliexpress.com": {
    liste: "https://fr.aliexpress.com/w/wholesale-casque-audio.html",
    fiche: 'a[href*="/item/"]',
  },
  "zalando.fr": { liste: "https://www.zalando.fr/catalogue/?q=baskets", fiche: 'article a[href$=".html"]' },
  "manomano.fr": { liste: "https://www.manomano.fr/recherche/perceuse", fiche: 'a[href*="/p/"]' },
  // Petites annonces.
  "leboncoin.fr": { liste: "https://www.leboncoin.fr/recherche?text=velo", fiche: 'a[href*="/ad/"]' },
  "facebook.com": {
    liste: "https://www.facebook.com/marketplace/paris/search?query=velo",
    fiche: 'a[href*="/marketplace/item/"]',
  },
  "paruvendu.fr": { liste: "https://www.paruvendu.fr/voiture-occasion/", fiche: 'a[href*="/a/"][href*="A1K"]' },
  "vivastreet.com": { liste: "https://www.vivastreet.com/", fiche: 'a[href*="/annonces/"]' },
  "wallapop.com": { liste: "https://fr.wallapop.com/search?keywords=velo", fiche: 'a[href*="/item/"]' },
  "marktplaats.nl": { liste: "https://www.marktplaats.nl/q/fiets/", fiche: 'a[href*="/v/"]' },
  "kleinanzeigen.de": { liste: "https://www.kleinanzeigen.de/s-fahrrad/k0", fiche: 'a[href*="/s-anzeige/"]' },
  "subito.it": {
    liste: "https://www.subito.it/annunci-italia/vendita/usato/?q=bicicletta",
    fiche: 'a[href*="/biciclette/"][href$=".htm"]',
  },
  "milanuncios.com": { liste: "https://www.milanuncios.com/anuncios/?s=bicicleta", fiche: 'a[href$=".htm"]' },
  // Paris n'a presque rien : New York, en anglais.
  "craigslist.org": {
    liste: "https://www.craigslist.org/search/area/newyork?cat=sss&query=bike",
    fiche: 'a[href*="/view/d/"]',
  },
  // Occasion et collection.
  "vinted.fr": { liste: "https://www.vinted.fr/catalog?search_text=velo", fiche: 'a[href*="/items/"]' },
  "backmarket.fr": { liste: "https://www.backmarket.fr/fr-fr/search?q=iphone", fiche: 'a[href*="/p/"]' },
  "cashexpress.fr": { liste: "https://www.cashexpress.fr/", fiche: '.product-card a[href*="/p-"], a.product-card' },
  // Les fiches vivent sur un sous-domaine, couvert par la règle.
  "easycash.fr": {
    liste: "https://www.easycash.fr/",
    fiche: 'a[href*="bons-plans.easycash.fr/"]:has(.productsheet-block-item--price)',
  },
  "reverb.com": { liste: "https://reverb.com/fr/marketplace?query=guitare", fiche: 'a[href*="/item/"]' },
  "discogs.com": { liste: "https://www.discogs.com/fr/sell/list?q=beatles", fiche: 'a[href*="/sell/item/"]' },
  "delcampe.net": {
    liste: "https://www.delcampe.net/fr/collections/search?term=timbre",
    fiche: 'a[href*="/collections/"][href$=".html"]',
  },
  "catawiki.com": { liste: "https://www.catawiki.com/fr/s?q=montre", fiche: 'a[href*="/l/"]' },
  "vestiairecollective.com": {
    liste: "https://fr.vestiairecollective.com/search/?q=sac",
    fiche: 'a[href$=".shtml"]',
  },
  "chrono24.fr": { liste: "https://www.chrono24.fr/search/index.htm?query=rolex", fiche: 'a[href*="--id"]' },
  // Pas de fiche produit : la recherche (produits sponsorisés) et Google Images.
  "google.fr": {
    urls: {
      recherche: "https://www.google.fr/search?q=casque+audio+bluetooth&hl=fr",
      images: "https://www.google.fr/search?q=casque+audio+bluetooth&udm=2&hl=fr",
    },
  },
};
