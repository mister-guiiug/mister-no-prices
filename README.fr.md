<p align="center">
  <img src="extension/icons/icone.svg" alt="" width="112">
</p>

<h1 align="center">Sans prix</h1>

<p align="center">
  <strong>Une extension Firefox qui masque les prix des boutiques en ligne, des petites annonces et de l’occasion,<br>
  pour qu’un enfant parcoure des idées de cadeaux sans jamais voir ce qu’elles coûtent.</strong>
</p>

<p align="center">
  <a href="https://github.com/mister-guiiug/mister-no-prices/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/mister-guiiug/mister-no-prices/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/mister-guiiug/mister-no-prices/releases/latest"><img alt="Dernière version" src="https://img.shields.io/github/v/release/mister-guiiug/mister-no-prices?label=version&color=7c4dff"></a>
  <img alt="Firefox 140+" src="https://img.shields.io/badge/Firefox-140%2B-FF7139?logo=firefoxbrowser&logoColor=white">
  <img alt="Firefox pour Android 142+" src="https://img.shields.io/badge/Android-142%2B-FF7139?logo=firefoxbrowser&logoColor=white">
  <img alt="15 langues" src="https://img.shields.io/badge/langues-15-d6336c">
  <img alt="Aucune donnée collectée" src="https://img.shields.io/badge/donn%C3%A9es%20collect%C3%A9es-aucune-2ea44f">
  <a href="LICENSE"><img alt="Licence MIT" src="https://img.shields.io/github/license/mister-guiiug/mister-no-prices?label=licence&color=blue"></a>
</p>

<p align="center">
  <a href="https://addons.mozilla.org/fr/firefox/addon/mister-no-price@mister-guiiug/"><strong>L’installer depuis Modules Firefox</strong></a>
  · <a href="https://github.com/mister-guiiug/mister-no-prices/releases/latest">Télécharger le .xpi signé</a>
  · <a href="README.md">Read in English</a>
  · <a href="https://github.com/mister-guiiug/mister-no-noise">Extension sœur : Sans bruit</a>
</p>

<p align="center"><sub>On nous cite : <a href="https://lnkd.in/p/eXi7Z3_8">l’article sur LinkedIn</a></sub></p>

<table>
  <tr>
    <td><img src="amo/captures/1-recherche.png" alt="Une recherche sur Amazon, tous les prix masqués, filtres de prix compris"></td>
    <td><img src="amo/captures/2-fiche.png" alt="Une fiche produit sans prix, avec le bouton ♥ Ma liste"></td>
  </tr>
  <tr>
    <td align="center"><sub>Résultats de recherche : les produits restent, les prix disparaissent</sub></td>
    <td align="center"><sub>Fiche produit, avec le bouton ♥ « Ma liste »</sub></td>
  </tr>
  <tr>
    <td><img src="amo/captures/3-reglage.png" alt="Le réglage : interrupteur, pause, apparence, liste d’envies, code parent"></td>
    <td><img src="amo/captures/4-liste.png" alt="La liste d’envies côté parent, prix affichés à la demande"></td>
  </tr>
  <tr>
    <td align="center"><sub>Le réglage, à un clic</sub></td>
    <td align="center"><sub>La liste d’envies, côté parent</sub></td>
  </tr>
</table>

## Pourquoi

À l’approche de Noël ou d’un anniversaire, le plus sûr moyen de savoir ce qui
ferait plaisir à un enfant, c’est de le laisser parcourir les boutiques en
ligne et de le regarder faire : ce qu’il ouvre, ce sur quoi il s’attarde, ce
qu’il montre du doigt. Mais les prix sont partout, et ils changent la
conversation :

- l’enfant **se censure** (« celui-là, c’est trop cher ») ou, à l’inverse, vise
  le plus cher en le croyant le meilleur ;
- il **compare** : « mon frère a eu un cadeau à 80 €, moi à 30 € » ;
- le **budget**, qui est l’affaire des parents, devient un sujet de discussion.

Sans les prix, l’enfant choisit sur ce que l’objet _est_ — photos, description,
avis — et la question du montant reste entre adultes. Le même principe sert à
qui veut comparer des produits sans se laisser guider par leur prix.

## Fonctions

- **Masqué avant l’affichage.** Les prix sont couverts dès le premier rendu :
  rien ne clignote pendant le chargement.
- **37 sites dès l’installation** — grandes boutiques, petites annonces,
  occasion, et les résultats de Google ([liste complète](#sites-couverts)).
- **Trois apparences** : une barre grise translucide (lisible sur un site clair
  comme sombre), un flou, ou du papier cadeau.
- **♥ Ma liste** : sur une fiche produit, l’enfant marque ce qui lui plaît ; le
  parent retrouve la liste — avec les prix — depuis la barre d’outils. Chaque
  article peut porter un prénom ; la liste se range, se filtre par enfant, se
  partage et s’imprime.
- **Code parent** (4 à 8 chiffres) : demandé pour tout ce qui _dévoile_ les prix
  — couper le masquage, le mettre en pause, éteindre un site, afficher les prix
  de la liste d’envies. Rallumer ne le demande jamais.
- **Pause** de 5, 15 ou 60 minutes, puis le masquage revient seul. Un
  **interrupteur par site** et un raccourci clavier
  (<kbd>Alt</kbd>+<kbd>Maj</kbd>+<kbd>P</kbd>) complètent les réglages.
- **Compteur** sur l’icône : le nombre de prix masqués dans l’onglet.
- **Liste des sites mise à jour chaque jour**, indépendamment des versions : la
  correction d’une boutique qui a changé sa mise en page arrive dans la journée,
  sans nouvelle version.
- **Quinze langues**, arabe de droite à gauche compris, sur ordinateur et sur
  Android.

Seules les remises en pourcentage (« -50 % »), les notes, les nombres d’avis et
les stocks restent visibles, volontairement : l’extension masque des montants,
pas les promotions, et un nombre sans devise n’est jamais pris pour un prix.

## Installer

Firefox 140 ou plus récent sur ordinateur, Firefox pour Android 142 ou plus
récent.

| Façon                            | Durée                                 | Comment                                                                                                                           |
| -------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Modules Firefox** (recommandé) | définitive, mises à jour automatiques | ouvrir la [page de l’extension](https://addons.mozilla.org/fr/firefox/addon/mister-no-price@mister-guiiug/) → _Ajouter à Firefox_ |
| **Fichier signé d’une release**  | définitive, mises à jour automatiques | ouvrir le `.xpi` de la [dernière release](https://github.com/mister-guiiug/mister-no-prices/releases/latest) dans Firefox         |
| **Temporaire, depuis le code**   | jusqu’au redémarrage de Firefox       | `about:debugging#/runtime/this-firefox` → _Charger un module complémentaire temporaire…_ → choisir `extension/manifest.json`      |

Une fois installée, autorisez l’extension dans les **fenêtres privées** si les
enfants s’en servent : `about:addons` → _Sans prix_ → _Exécuter dans les
fenêtres privées_ → _Autoriser_.

Pour un ordinateur familial, le paquet de déploiement fournit une **stratégie
d’entreprise** Firefox qui installe l’extension pour toutes les sessions et
empêche de la retirer ou de la désactiver — voir
[Maintenance](docs/MAINTENANCE.fr.md#le-paquet-de-déploiement).

## Sites couverts

| Catégorie            | Sites                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Boutiques**        | Amazon (23 pays), AliExpress, Auchan, Boulanger, Carrefour, Cdiscount, Darty, Decathlon (11 pays), E.Leclerc, eBay, Fnac, LDLC, ManoMano, Rue du Commerce, Zalando |
| **Bons plans**       | Dealabs                                                                                                                                                            |
| **Petites annonces** | Craigslist, Facebook Marketplace (`/marketplace` seulement), Kleinanzeigen, Leboncoin, Marktplaats, Milanuncios, ParuVendu, Subito, Vivastreet, Wallapop           |
| **Occasion**         | Back Market, Cash Express, Catawiki, Chrono24, Delcampe, Discogs, Easy Cash, Reverb, Vestiaire Collective, Vinted (12 pays)                                        |
| **Recherche**        | Google (résultats et Google Images, 9 domaines nationaux)                                                                                                          |

Chaque site est contrôlé par un passage automatique dans un vrai Firefox.
Certains répondent aux navigateurs pilotés par une page anti-robot et n’ont pu
être vérifiés qu’en partie : le [rapport de couverture](docs/SITES.fr.md)
détaille, site par site, ce qui l’a été.

## Confidentialité

**Aucune donnée n’est collectée.** Le manifeste le déclare
(`data_collection_permissions: none`), et le code ne contient ni mesure
d’audience, ni compte, ni publicité.

- Les réglages restent dans Firefox (`storage.sync`, qui suit le compte Firefox
  si la synchronisation est activée) ; la liste d’envies et le code parent
  restent sur l’appareil (`storage.local`). Le code parent n’est jamais
  conservé en clair : seulement un sel tiré au hasard et une empreinte SHA-256.
- L’extension fait **une seule requête réseau de son fait** : la lecture
  quotidienne de la liste des sites sur GitHub (`raw.githubusercontent.com`),
  sans cookie ni identifiant. Elle se désactive dans le réglage.
- La liste d’envies charge les images des articles depuis les boutiques, sans
  en-tête `Referer` — comme le ferait la visite de la fiche.

L’extension ne s’exécute que sur les sites de sa liste. Un site ajouté plus tard
par la mise à jour quotidienne n’est jamais accordé en silence : Firefox le
demande, site par site.

## Comment ça marche

Chaque site est décrit par une **règle** de quelques lignes — ses domaines, et
les sélecteurs CSS de ses composants de prix — dans
[`extension/regles.js`](extension/regles.js) ; tout le reste est générique.

```js
{
  id: "decathlon",
  nom: "Decathlon",
  domaines: ["decathlon.fr", "decathlon.be", /* … */],
  masquer: [".vp-price-amount", ".vp-price-barred-amount", /* … */],
}
```

Sur une page, quatre mécanismes travaillent ensemble :

1. **Une feuille de style tirée de la règle**, posée dès `document_start`,
   couvre les composants de prix connus avant le premier affichage. Elle
   **échoue fermée** : le masquage tient tant que les réglages ne disent pas
   le contraire.
2. **Les montants écrits en clair** (« à partir de 12,99 € », « livraison
   gratuite dès 35 € ») sont repérés et recouverts par l’[API CSS Custom
   Highlight](https://developer.mozilla.org/fr/docs/Web/API/CSS_Custom_Highlight_API)
   — aucun élément n’est ajouté, les pages en React ou Vue continuent de
   fonctionner.
3. **Les prix éclatés** (« 34 » « €99 » dans des éléments séparés) sont
   reconnus par leur ancêtre le plus proche.
4. **Le titre de l’onglet** perd ses montants, et les retrouve quand le
   masquage est suspendu.

Un `MutationObserver` suit les carrousels, le défilement infini et les pages
qui se redessinent. Les montants sont reconnus en euros, dollars, livres, yens,
roupies, zlotys, couronnes, livres turques et codes ISO.

**Les règles sont publiées à part du code.** Les copies installées relisent
chaque jour [`regles/regles.json`](regles/regles.json) et l’adoptent s’il est
plus récent, après l’avoir validé en entier. Il ne contient que des données —
des domaines et des sélecteurs CSS — jamais de code. Les règles embarquées dans
l’extension restent le repli, appliqué dès le chargement de la page.

## Langues

Français, anglais, espagnol, allemand, italien, portugais, néerlandais,
polonais, chinois simplifié, japonais, arabe (de droite à gauche), coréen,
turc, hindi et russe. L’extension suit la langue de Firefox ; les dates, les
nombres et les montants aussi.

Les traductions autres que le français et l’anglais n’ont pas encore été
relues par des locuteurs natifs. Les corrections sont bienvenues : un fichier
par langue, [`extension/_locales/<langue>/messages.json`](extension/_locales).

## Contribuer

Tickets et pull requests sont bienvenus — une boutique qui a changé sa mise en
page, un site qui manque, une traduction à corriger.

**Ajouter ou corriger un site** tient le plus souvent en une règle de quelques
lignes :

1. Écrire ou corriger la règle dans [`extension/regles.js`](extension/regles.js),
   et ses motifs dans [`extension/manifest.json`](extension/manifest.json)
   (`npm test` refuse un écart entre les deux).
2. Ajouter une page de liste et une fiche produit dans
   [`scripts/pages.mjs`](scripts/pages.mjs), puis lancer
   `SITES=<domaine> npm run verifier` jusqu’à n’avoir plus aucun montant
   lisible, et le bouton ♥ sur la fiche.
3. Monter `revision` en tête de `regles.js`, puis `npm run catalogue` pour
   régénérer `regles/regles.json`.

Une fois la PR fusionnée, la correction atteint toutes les installations dans
la journée.

## Développer

Node.js 22 ou plus récent.

```bash
npm install
```

```bash
npm start            # Firefox sur amazon.fr, extension chargée et rechargée à chaque modification
```

```bash
npm test             # repérage des montants, moteur, catalogue, traductions, empaquetage
```

```bash
npm run lint         # validation web-ext de Mozilla, avec les règles du catalogue public
```

```bash
npm run verifier     # les vrais sites, dans un vrai Firefox (MOBILE=1 pour se dire Android)
```

L’intégration continue joue les tests, `web-ext lint` (qui échoue sur le
moindre avertissement) et l’empaquetage sur chaque pull request ; les deux
contrôles sont exigés pour fusionner dans la branche `main`, protégée.

```
extension/
├── manifest.json        Manifest V3, Firefox 140+
├── regles.js            une règle par site
├── background.js        raccourci, pastille, mise à jour quotidienne des règles, accès
├── commun/              réglages, liste d’envies, code parent, catalogue des règles
├── content/             moteur de masquage, repérage des montants, fiches, bouton ♥
├── popup/  liste/  nouveautes/
├── icons/
└── _locales/            15 langues
amo/                     fiche Modules Firefox : description, captures d’écran
regles/regles.json       le catalogue des règles relu chaque jour par les installations
scripts/                 vérification, empaquetage, synchronisation de la fiche
```

## Versions

La publication est automatique : monter `version` dans
`extension/manifest.json` et `package.json`, fusionner, et le workflow soumet la
version à Modules Firefox. Une fois approuvée par Mozilla, une release GitHub
suit, avec le `.xpi` signé. La fiche Modules Firefox — description en treize
langues, captures d’écran, icône — est tenue à jour depuis le dépôt. Le détail
est dans [Maintenance](docs/MAINTENANCE.fr.md).

## Limites connues

- Un prix dessiné **dans une image** (bannière, vignette d’un bon plan) reste
  visible.
- Une publicité servie dans un cadre d’un **autre domaine** n’est pas couverte :
  l’extension ne demande l’accès qu’aux sites de sa liste.
- Les boutiques changent leur balisage sans prévenir ; un nouveau composant de
  prix que ni la règle ni le repérage générique ne reconnaissent restera
  visible jusqu’à la mise à jour de la règle.
- Le code parent arrête un enfant curieux, ce n’est pas un coffre-fort : qui
  ouvre `about:addons` peut retirer l’extension — sauf si elle est imposée par
  la stratégie d’entreprise.

## Licence

[MIT](LICENSE). Projet indépendant, ni approuvé par les sites qu’il couvre ni
lié à eux.
