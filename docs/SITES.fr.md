# Couverture des sites

[English](SITES.md) · [Retour au README](../README.fr.md)

Ce que l’extension masque, site par site, et ce qui en a été vérifié.

## Méthode

`npm run verifier` lance Firefox sur un profil jetable, extension installée, et
visite pour chaque site une page de liste puis une fiche produit. Il **relève
chaque montant encore lisible** — ni sous une barre, ni flouté, ni hors écran,
titre de l’onglet compris —, refuse au passage les bandeaux de cookies, puis
bascule l’interrupteur et l’apparence depuis le popup et vérifie que la page
suit. Sur chaque fiche, il actionne le bouton ♥ ; à la fin, il ouvre la liste
d’envies et vérifie que chaque article y est, prix masqués puis visibles à la
demande. `MOBILE=1` rejoue le tout en se présentant comme Firefox pour Android
(agent utilisateur, écran de téléphone, pointeur tactile).

Un site qui répond par une vérification anti-robot est noté comme tel : le
script ne la contourne pas. `VISIBLE=1` ouvre la fenêtre pour la passer
soi-même.

| Symbole        | Sens                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| ✔              | liste et fiche visitées, aucun montant lisible ; pour ♥, l’article ajouté à la liste avec titre, image et prix              |
| ◐ liste ✔      | la page de liste est vérifiée ; la fiche a répondu par une vérification anti-robot ou n’a pas fini de charger en une minute |
| ✘ anti-robot   | balisage non relevé ; les mécanismes génériques s’appliquent, mais leur résultat n’a pas été vu                             |
| générique seul | la règle n’a pas de sélecteur propre : le repérage des montants dans le texte fait tout                                     |

## Boutiques

| Site                | Domaines couverts                    | Prix masqués (bureau)                                | Bouton ♥                      | Site mobile         |
| ------------------- | ------------------------------------ | ---------------------------------------------------- | ----------------------------- | ------------------- |
| **Amazon**          | 23 boutiques                         | ✔ amazon.fr, .com, .co.uk, .de, .es, .it             | ✔ les six                     | ✔ amazon.fr, .com   |
| **AliExpress**      | aliexpress.com                       | ✔                                                    | ✔                             | non vérifié (délai) |
| **Auchan**          | auchan.fr                            | ✔                                                    | ✔                             | ✔                   |
| **Boulanger**       | boulanger.com                        | ✔                                                    | ✔                             | ✔                   |
| **Cdiscount**       | cdiscount.com                        | ✔                                                    | ✔                             | ✔                   |
| **Dealabs**         | dealabs.com                          | ✔                                                    | ✔ (règle `fiche`, 18/11/2026) | ✔                   |
| **Decathlon**       | 11 pays                              | ✔ decathlon.fr                                       | ✔                             | ✔                   |
| **E.Leclerc**       | e.leclerc, leclerc.fr                | ✔                                                    | ✔                             | ✔                   |
| **eBay**            | ebay.fr, ebay.com                    | ✔ les deux                                           | ✔ les deux                    | ✔ ebay.fr           |
| **LDLC**            | ldlc.com                             | ✔                                                    | ✔                             | ✔                   |
| **Rue du Commerce** | rueducommerce.fr                     | ✔                                                    | ✔                             | ✔                   |
| **Zalando**         | zalando.fr                           | ✔ (générique seul)                                   | ✔                             | ✔                   |
| **Fnac**            | fnac.com                             | ✘ anti-robot ; règle tirée de la liste, vue une fois | règle non vérifiée            | ✘ anti-robot        |
| **Darty**           | darty.com                            | ✘ anti-robot ; générique seul                        | ✘                             | ✘                   |
| **Carrefour**       | carrefour.fr                         | ✘ anti-robot ; générique seul                        | ✘                             | ✘                   |
| **ManoMano**        | manomano.fr                          | ✘ anti-robot ; générique seul                        | ✘                             | ✘                   |
| **Google**          | www.google.fr, .com, .be, .ch, … (9) | ◐ recherche et Images, voir ci-dessous               | — pas de fiche produit        | ✘ anti-robot        |

Les autres domaines d’Amazon et de Decathlon partagent le balisage du site
vérifié, sans l’avoir été eux-mêmes.

## Petites annonces et occasion

| Site                     | Domaines couverts                  | Prix masqués (bureau)                    | Bouton ♥                   | Site mobile |
| ------------------------ | ---------------------------------- | ---------------------------------------- | -------------------------- | ----------- |
| **Catawiki**             | catawiki.com                       | ✔                                        | ✔                          | ✔           |
| **Cash Express**         | cashexpress.fr                     | ✔                                        | ✔                          | ✔           |
| **Craigslist**           | craigslist.org (toutes les villes) | ✔ (générique seul)                       | ✔                          | ✔           |
| **Delcampe**             | delcampe.net                       | ✔                                        | ✔                          | ✔           |
| **Easy Cash**            | easycash.fr                        | ✔                                        | ✔                          | ✔           |
| **Facebook Marketplace** | facebook.com, `/marketplace` seul  | ✔ (générique seul), sans compte connecté | ✘ aucune donnée structurée | ◐ liste ✔   |
| **Kleinanzeigen**        | kleinanzeigen.de                   | ✔ (générique seul)                       | ✔                          | ✔           |
| **Marktplaats**          | marktplaats.nl                     | ✔                                        | ✔                          | ✔           |
| **ParuVendu**            | paruvendu.fr                       | ✔ (générique seul)                       | ✔                          | ✔           |
| **Subito**               | subito.it                          | ✔                                        | ✔                          | ✔           |
| **Vinted**               | 12 pays                            | ✔ vinted.fr                              | ✔                          | ✔           |
| **Wallapop**             | wallapop.com                       | ✔                                        | ✔                          | ✔           |
| **Vivastreet**           | vivastreet.com                     | ✔ (générique seul)                       | ✘ pages vues sans fiche    | ✔           |
| **Leboncoin**            | leboncoin.fr                       | ◐ liste ✔ ; fiche : anti-robot           | non vérifié                | ◐ liste ✔   |
| **Discogs**              | discogs.com                        | ◐ liste ✔ ; fiche : délai dépassé        | non vérifié                | ◐ liste ✔   |
| **Reverb**               | reverb.com                         | ◐ liste ✔ ; fiche : délai dépassé        | non vérifié                | ◐ liste ✔   |
| **Vestiaire Collective** | vestiairecollective.com            | ◐ liste ✔ ; fiche : délai dépassé        | non vérifié                | ◐ liste ✔   |
| **Back Market**          | 10 pays                            | ✘ anti-robot ; générique seul            | ✘                          | ✘           |
| **Chrono24**             | 10 pays                            | ✘ anti-robot ; générique seul            | ✘                          | ✘           |
| **Milanuncios**          | milanuncios.com                    | ✘ visite interrompue ; générique seul    | ✘                          | ✘           |

Rakuten n’y est pas : sa place de marché française a fermé le 30 septembre 2026.

## Cas particuliers

**Facebook.** La règle ne vaut que sous `/marketplace` : ailleurs — fil
d’actualité, groupes, messages —, l’extension ne masque rien, même après une
navigation qui change d’adresse sans recharger la page (vérifié dans Firefox :
éteinte sur `/`, allumée sur `/marketplace/paris/`, éteinte de nouveau sur
`/groups/…`).

**Google.** La règle porte sur des **hôtes exacts** (`www.google.fr`…) et non
sur le domaine : `*.google.com` ferait tourner l’extension dans Gmail, Docs ou
Drive. Elle masque les montants de **toute** la page de résultats, pas
seulement du bloc sponsorisé : fiches Shopping, extraits, aperçu IA. La
recherche et Google Images répondent au Firefox piloté par leur page
anti-robot (`/sorry`) ; les scripts de l’extension ont été rejoués sur les
vraies pages dans un autre navigateur (Chromium), réglages simulés : aucun
montant lisible, produits sponsorisés compris. C’est le même code, sur le même
balisage ; ce n’est pas Firefox.

**Le bouton ♥** n’apparaît que sur une page que l’extension reconnaît comme
fiche produit : par ses données structurées (JSON-LD `Product`, microdonnées,
Open Graph), ou, pour les sites qui n’en publient pas, par la règle du site
(`fiche` : Amazon, Dealabs, Fnac, Rue du Commerce, Cash Express). Le prix
retenu est celui de la fiche au moment du clic, pour la variante affichée.

## Ce qui est masqué, partout

- les composants de prix du site, prix barrés compris (« Prix conseillé »,
  « Prix le plus bas sur 30 jours ») ;
- tout montant écrit en clair : « 3 neufs à partir de 12,99 € », « Livraison
  gratuite dès 35 € », « de 10 à 20 EUR », titres des bons plans… ;
- les prix **éclatés** en morceaux (« 34 » « €99 ») ;
- le **titre de l’onglet** : « Robot X60 999€ chez Boulanger » devient « Robot
  X60 ••• chez Boulanger », et retrouve son prix quand on suspend le masquage.

**Restent visibles, volontairement** : les remises en pourcentage (« -50 % »),
les notes, les nombres d’avis et les stocks. Un nombre sans devise n’est jamais
pris pour un prix : les bornes d’un curseur « Prix (en €) : 4 – 1549 » (LDLC)
restent lisibles.
