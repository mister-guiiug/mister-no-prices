# Maintenance

[English](MAINTAINING.md) · [Retour au README](../README.fr.md)

Publier, déployer, tenir la fiche et le catalogue des règles : ce qu’il faut
savoir pour maintenir l’extension.

## Manifeste et règles

Les `host_permissions` et `content_scripts[0].matches` du manifeste sont
**engendrés** depuis `extension/regles.js` :

```bash
npm run manifeste              # réécrit le manifeste
node scripts/manifeste.mjs --verifier   # CI
```

Ne plus les éditer à la main. Après un nouveau site dans les règles : monter
`revision`, `npm run catalogue`, `npm run manifeste`.

## Publier une version

La publication est **automatique** : monter `version` dans
[`extension/manifest.json`](../extension/manifest.json) et `package.json` (les
tests les gardent alignés), fusionner la PR — c’est tout. Une PR qui ne change
pas de version ne publie rien.

[`publication.yml`](../.github/workflows/publication.yml), à chaque poussée sur
`main` et toutes les trois heures :

1. regarde si la release `v<version>` existe ; si oui, s’arrête ;
2. teste, valide (`web-ext lint` avec les règles du catalogue public), puis
   **soumet** la version à addons.mozilla.org (canal « listed »), avec la fiche
   de [`amo/fiche.json`](../amo/fiche.json) — ou, déjà soumise par un passage
   précédent, regarde où en est sa relecture ;
3. une fois la version approuvée par Mozilla — souvent en quelques minutes,
   parfois après plusieurs jours de relecture humaine —, télécharge le `.xpi`
   signé et publie la release `v<version>`, étiquette posée sur le commit, avec
   le paquet complet. Tant que la version est en relecture, le passage s’arrête
   en vert, sans release ; le passage planifié suivant reprend.

Les secrets `AMO_API_KEY` et `AMO_API_SECRET` du dépôt ne sont passés qu’à
l’étape qui soumet ; sans eux, le workflow échoue plutôt que de publier une
release sans fichier installable. Mozilla n’accepte qu’**une fois** un numéro
de version, tous canaux confondus : si la release échoue après la signature,
relancer le workflow — il retrouve la version sur AMO et retélécharge le
fichier signé, sans rien soumettre. Une version en relecture que remplace une
version plus récente n’aura pas de release : le workflow ne publie que la
version du manifeste.

**Mises à jour.** Une version du catalogue n’a pas d’`update_url` : Firefox la
met à jour depuis addons.mozilla.org. Les copies installées depuis les releases
jusqu’à la 1.7.0 déclaraient un `update_url` vers le `updates.json` de la
dernière release ; c’est par lui qu’elles passent à la version du catalogue,
puis au catalogue. Chaque release le porte encore.

## Le paquet de déploiement

`npm run paquet` prépare, dans `web-ext-artifacts/mister-no-prices-<version>/`,
de quoi installer l’extension sur un poste sans rien savoir de ce dépôt :

| Fichier                          | Rôle                                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mister-no-prices-<version>.xpi` | l’extension signée par Mozilla — seulement avec des clés d’API                                                                                                                |
| `mister-no-prices-<version>.zip` | l’extension non signée                                                                                                                                                        |
| `INSTALLER.md`                   | les façons d’installer, pas à pas, pour qui n’est pas développeur                                                                                                             |
| `policies.json`                  | stratégie d’entreprise Firefox qui **impose** l’extension sur un ordinateur familial : installée pour toutes les sessions, ni retirable ni désactivable depuis `about:addons` |
| `updates.json`                   | ce que lisent les copies installées jusqu’à la 1.7.0 pour se mettre à jour                                                                                                    |
| `SHA256SUMS`                     | empreintes, pour `sha256sum -c`                                                                                                                                               |

Le guide et la stratégie viennent de [`deploiement/`](../deploiement/), remplis
à la version et à l’identifiant du manifeste.

> **Attention.** Avec des clés d’API dans `WEB_EXT_API_KEY` et
> `WEB_EXT_API_SECRET` — dans l’environnement ou dans un fichier `.env` à la
> racine, ignoré par git —, `npm run paquet` **soumet la version** au catalogue
> d’addons.mozilla.org : c’est le geste de publication, pas un essai. Sans clés,
> le paquet sort sans `.xpi` et le dit.

## La fiche addons.mozilla.org

La fiche est tenue par le dépôt.
[`fiche-amo.yml`](../.github/workflows/fiche-amo.yml) la remet d’aplomb quand
ses sources changent sur `main`, et chaque jour : AMO ne lit le nom et le
résumé du manifeste qu’à la création de la fiche, et jamais son icône.

| Sur la fiche           | Vient de                                                                                                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nom, résumé            | `extName`, `extDescription` de chaque langue de l’extension que la fiche propose                                                                                            |
| description, catégorie | [`amo/fiche.json`](../amo/fiche.json), une description par langue, en Markdown limité (`**gras**`, listes en `- `, liens `[texte](adresse)`) : AMO affiche le HTML tel quel |
| page d’accueil         | `homepage_url` du manifeste                                                                                                                                                 |
| icône                  | `extension/icons/icone-128.png`                                                                                                                                             |
| captures d’écran       | [`amo/captures.json`](../amo/captures.json) (ordre, légendes dans chaque langue) et `amo/captures/` (PNG de 1280 × 800)                                                     |

- **Langues.** La fiche parle treize des quinze langues : AMO ne propose ni
  l’arabe ni l’hindi pour le texte d’une fiche. L’espagnol, le portugais et
  l’anglais sont recopiés vers leurs variantes régionales (`es-MX`, `pt-BR`,
  `en-GB`…), sans quoi leurs visiteurs verraient le français, langue par défaut
  de la fiche. La correspondance est `LANGUES_AMO`, dans
  [`scripts/fiche-amo.mjs`](../scripts/fiche-amo.mjs).
- **Seuls les écarts sont écrits**, et le journal nomme chaque champ qui
  diffère avant d’écrire.
- **Captures.** Une capture est reconnue par sa légende française : relancer ne
  double rien, et une capture ajoutée à la main n’est jamais supprimée. AMO
  efface une légende posée juste après l’envoi de l’image : le script attend
  une minute, pose la légende et vérifie qu’elle a tenu.
- **Débit.** AMO limite les écritures, parfois pendant des heures. Le passage
  s’arrête alors en vert et le suivant reprend ; pour aller plus vite, le
  formulaire de l’espace développeur n’est pas soumis à cette limite.
- **Vie privée.** Les captures d’Amazon ont l’adresse de livraison floutée : à
  refaire pour toute nouvelle capture d’un site où l’on a une adresse.

## Le catalogue des règles

Les installations relisent chaque jour [`regles/regles.json`](../regles/regles.json)
sur `main`, et l’adoptent s’il est plus récent que celui qu’elles appliquent.
Corriger un sélecteur ou ajouter un site, c’est donc **fusionner une PR** qui
modifie `regles.js`, monte la révision (`AAAA-MM-JJ.n`) et régénère
`regles.json` (`npm run catalogue`) : la correction arrive dans la journée,
sans signature ni mise à jour de l’extension. Une version ne monte que si le
moteur ou le `format` du catalogue changent. La CI refuse un `regles.json` en
retard, et une PR qui change les règles sans monter la révision.

- **Le catalogue embarqué** (`regles.js`) reste la référence et le repli : il
  est appliqué dès `document_start` ; la règle du catalogue distant, si elle
  diffère, la remplace quelques millisecondes plus tard, sans recharger la page.
- **Un site nouveau** n’a pas d’accès : le popup et la page des nouveautés le
  demandent (permission optionnelle `*://*/*`, accordée site par site, jamais
  en bloc). Une fois accordé, l’arrière-plan y enregistre les content scripts
  (`scripting.registerContentScripts`). Le manifeste doit tout de même le
  déclarer : il entrera dans les permissions de la version suivante.
- **Validation.** Un catalogue distant n’est adopté qu’après les mêmes contrôles
  que les tests (identifiants, domaines nus, chemins, sélecteurs sans accolade,
  commentaire ni parenthèse orpheline) ; au premier défaut, il est rejeté en
  entier et le précédent reste.
- **Revenir en arrière** : republier l’ancien contenu avec une révision plus
  haute. Une révision ne redescend jamais.
- Ce sont des **données**, pas du code — des noms de domaine et des sélecteurs
  CSS : rien n’y est exécuté, conformément aux règles des modules de Mozilla.

Un catalogue fautif toucherait toutes les installations à la fois : la
validation en refuse la forme abîmée, pas un sélecteur valide mais trop large.
C’est la relecture de la PR et `npm run verifier` qui le gardent.

## Après une mise à jour : un « ! » sur l’icône

Firefox accorde les accès d’une extension **à son installation**, pas ceux
qu’une mise à jour ajoute. Une version qui gagne des sites n’y agit donc pas
tant qu’on n’a pas dit oui. L’icône porte alors une pastille **« ! »** ; le
popup nomme les sites concernés, et **« Autoriser »** les accorde tous, une
fois pour toutes. `npm run verifier:mise-a-jour` rejoue ce cas : installe une
ancienne version, met à jour, accorde les accès.

## Vérifier sur les vrais sites

```bash
npm run verifier                     # tous les sites
SITES=amazon.fr,vinted.fr npm run verifier
MOBILE=1 npm run verifier            # en se présentant comme Firefox pour Android
VISIBLE=1 npm run verifier           # fenêtre visible, pour passer soi-même un anti-robot
```

`FIREFOX` désigne l’exécutable à lancer. Captures dans `captures/`
(`captures/mobile/` avec `MOBILE=1`). Pour ouvrir le popup, le script passe par
la fenêtre de Firefox elle-même (`MOZ_REMOTE_ALLOW_SYSTEM_ACCESS`, sur le seul
profil jetable) : WebDriver BiDi refuse de naviguer vers une adresse
`moz-extension://`.

Sur Android, téléphone branché en USB et débogage USB activé :

```bash
npx web-ext run --source-dir extension -t firefox-android --android-device <identifiant adb>
```

Firefox pour Android n’a été essayé qu’en se faisant passer pour lui
(`MOBILE=1`) ; les API propres au téléphone ne l’ont été que par les tests
(`browser.commands` absente).

## Identifiant et nom du dépôt

L’identifiant `mister-no-price@mister-guiiug` est figé par la première
signature : le changer ferait de la version suivante une autre extension, sans
ses réglages ni sa liste d’envies. Il garde donc le nom d’avant le renommage du
dépôt en `mister-no-prices`.

La 1.3.0 a été publiée sous l’ancien nom du dépôt : les copies qui l’ont
installée lisent leurs mises à jour à `github.com/mister-guiiug/mister-no-price/…`,
que GitHub redirige vers le nouveau nom. **Ne jamais recréer de dépôt
`mister-no-price`** : il prendrait la place de la redirection, et ces copies ne
se mettraient plus à jour.

## Le logo

[`extension/icons/icone.svg`](../extension/icons/icone.svg) : une étiquette de
prix dont le montant est masqué par une barre — ce que fait l’extension — aux
couleurs du papier cadeau, sur un fond violet. Lisible de 16 à 128 pixels, sur
une barre d’outils claire comme sombre. Le SVG sert à la barre d’outils et aux
pages ; les PNG (`icone-32.png` à `icone-128.png`) au gestionnaire des modules
et à addons.mozilla.org, qui demande une icône de 128 × 128.

## Limites techniques

- La feuille d’un site est posée dans un `<style>` ; une politique de sécurité
  (CSP) qui interdirait les styles en ligne la bloquerait. Aucun des sites
  vérifiés ne le fait ; le repérage dans le texte, lui, n’en dépend pas.
- La permission optionnelle `*://*/*` paraît large à la lecture du manifeste ;
  elle n’est jamais demandée en bloc, seulement site par site, pour les sites
  du catalogue.
