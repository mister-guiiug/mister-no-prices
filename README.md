<p align="center">
  <img src="extension/icons/icone.svg" alt="" width="112">
</p>

<h1 align="center">No Prices</h1>

<p align="center">
  <strong>A Firefox extension that hides prices on online stores, classifieds and second-hand sites,<br>
  so a child can browse gift ideas without ever seeing what things cost.</strong>
</p>

<p align="center">
  <a href="https://github.com/mister-guiiug/mister-no-prices/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/mister-guiiug/mister-no-prices/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/mister-guiiug/mister-no-prices/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/mister-guiiug/mister-no-prices?label=release&color=7c4dff"></a>
  <img alt="Firefox 140+" src="https://img.shields.io/badge/Firefox-140%2B-FF7139?logo=firefoxbrowser&logoColor=white">
  <img alt="Firefox for Android 142+" src="https://img.shields.io/badge/Android-142%2B-FF7139?logo=firefoxbrowser&logoColor=white">
  <img alt="15 languages" src="https://img.shields.io/badge/languages-15-d6336c">
  <img alt="No data collected" src="https://img.shields.io/badge/data%20collected-none-2ea44f">
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/github/license/mister-guiiug/mister-no-prices?color=blue"></a>
</p>

<p align="center">
  <a href="https://addons.mozilla.org/firefox/addon/mister-no-price@mister-guiiug/"><strong>Get it on Firefox Add-ons</strong></a>
  · <a href="https://github.com/mister-guiiug/mister-no-prices/releases/latest">Download the signed .xpi</a>
  · <a href="README.fr.md">Lire en français</a>
  · <a href="https://github.com/mister-guiiug/mister-no-noise">Sister extension: No Noise</a>
</p>

<p align="center"><sub>As featured in <a href="https://lnkd.in/p/eXi7Z3_8">this LinkedIn article</a></sub></p>

<table>
  <tr>
    <td><img src="amo/captures/1-recherche.png" alt="An Amazon search with every price hidden, price filters included"></td>
    <td><img src="amo/captures/2-fiche.png" alt="A product page without prices, with the ♥ My list button"></td>
  </tr>
  <tr>
    <td align="center"><sub>Search results: products stay, prices disappear</sub></td>
    <td align="center"><sub>Product page, with the ♥ “My list” button</sub></td>
  </tr>
  <tr>
    <td><img src="amo/captures/3-reglage.png" alt="The settings popup: switch, pause, look, wish list, parent code"></td>
    <td><img src="amo/captures/4-liste.png" alt="The wish list, parent side, with prices shown on request"></td>
  </tr>
  <tr>
    <td align="center"><sub>Settings, one click away</sub></td>
    <td align="center"><sub>The wish list, parent side</sub></td>
  </tr>
</table>

## Why

The best way to find out what a child would love for Christmas or a birthday is
to let them browse online stores and watch: what they open, what they linger
on, what they point at. But prices are everywhere, and they change the
conversation:

- the child **self-censors** (“that one is too expensive”), or goes for the
  priciest item, assuming it is the best;
- they **compare**: “my brother got an €80 present, I got a €30 one”;
- the **budget**, which is the parents’ business, becomes a topic.

Without prices, a child chooses on what the object *is* — pictures,
description, reviews — and money stays between adults. The same idea helps
anyone who wants to compare products without being anchored by their price.

## Features

- **Hidden before the page is drawn.** Prices are masked from the very first
  paint: nothing flashes while the page loads.
- **37 sites out of the box** — major stores, classifieds and second-hand
  marketplaces, plus Google search results ([full list](#supported-sites)).
- **Three looks**: a translucent grey bar (readable on light and dark sites), a
  blur, or gift wrap.
- **♥ My list**: on a product page, the child marks what they like; the parent
  opens the list — with prices — from the toolbar. Items can carry a first name,
  be reordered, filtered by child, shared and printed.
- **Parent code** (4 to 8 digits): required for anything that *reveals* prices
  — turning masking off, pausing, disabling a site, showing prices in the wish
  list. Turning masking back on never asks for it.
- **Pause** for 5, 15 or 60 minutes, then masking resumes on its own. A
  **per-site switch** and a keyboard shortcut (<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>)
  complete the controls.
- **Counter** on the toolbar icon: how many prices are hidden on the current tab.
- **Site list updated daily**, independently of extension releases: a fix for a
  store that changed its layout ships within a day, without a new version.
- **Fifteen languages**, right-to-left Arabic included, on desktop and Android.

Only percentage discounts (“-50 %”), ratings, review counts and stock levels stay
visible, on purpose: the extension hides amounts, not promotions, and a number
without a currency is never taken for a price.

## Install

Firefox 140 or later on desktop, Firefox for Android 142 or later.

| Method | Lasts | How |
| ------ | ----- | --- |
| **Firefox Add-ons** (recommended) | permanent, auto-updates | open the [extension page](https://addons.mozilla.org/firefox/addon/mister-no-price@mister-guiiug/) → *Add to Firefox* |
| **Signed file from a release** | permanent, auto-updates | open the `.xpi` of the [latest release](https://github.com/mister-guiiug/mister-no-prices/releases/latest) in Firefox |
| **Temporary, from source** | until Firefox restarts | `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on…* → pick `extension/manifest.json` |

After installing, allow the extension in **private windows** if children use
them: `about:addons` → *No Prices* → *Run in Private Windows* → *Allow*.

For a family computer, the deployment package ships a Firefox **enterprise
policy** that installs the extension for every session and prevents removing
or disabling it — see [Maintaining](docs/MAINTAINING.md#deployment-package).

## Supported sites

| Category | Sites |
| -------- | ----- |
| **Stores** | Amazon (23 countries), AliExpress, Auchan, Boulanger, Carrefour, Cdiscount, Darty, Decathlon (11 countries), E.Leclerc, eBay, Fnac, LDLC, ManoMano, Rue du Commerce, Zalando |
| **Deals** | Dealabs |
| **Classifieds** | Craigslist, Facebook Marketplace (`/marketplace` only), Kleinanzeigen, Leboncoin, Marktplaats, Milanuncios, ParuVendu, Subito, Vivastreet, Wallapop |
| **Second-hand** | Back Market, Cash Express, Catawiki, Chrono24, Delcampe, Discogs, Easy Cash, Reverb, Vestiaire Collective, Vinted (12 countries) |
| **Search** | Google (search results and Google Images, 9 country domains) |

Every site is checked by an automated run in a real Firefox. Some answer
automated browsers with an anti-bot page and could only be checked partly: the
[coverage report](docs/SITES.md) details, site by site, what was verified.

## Privacy

**No data is collected.** The manifest declares it
(`data_collection_permissions: none`), and the code has no analytics, no
account and no ads.

- Settings live in Firefox (`storage.sync`, which follows your Firefox account
  if sync is on); the wish list and the parent code stay on the device
  (`storage.local`). The parent code is never stored in clear: only a random
  salt and a SHA-256 hash.
- The extension makes **one network request of its own**: a daily read of the
  site list on GitHub (`raw.githubusercontent.com`), with no cookie and no
  identifier. It can be turned off in the settings.
- The wish list loads item pictures from the stores, without a `Referer`
  header — as visiting the product page would.

The extension only runs on the sites in its list. Sites added later through the
daily update are never granted silently: Firefox asks, site by site.

## How it works

Each site is described by a short **rule** — domains, and the CSS selectors of
its price components — in [`extension/regles.js`](extension/regles.js);
everything else is generic.

```js
{
  id: "decathlon",
  nom: "Decathlon",
  domaines: ["decathlon.fr", "decathlon.be", /* … */],
  masquer: [".vp-price-amount", ".vp-price-barred-amount", /* … */],
}
```

On a page, four mechanisms work together:

1. **A stylesheet built from the rule**, injected at `document_start`, covers the
   known price components before the first paint. It **fails closed**: masking
   holds until the settings say otherwise.
2. **Amounts written in plain text** (“from €12.99”, “free delivery over £35”)
   are detected and painted over with the [CSS Custom Highlight API](https://developer.mozilla.org/docs/Web/API/CSS_Custom_Highlight_API)
   — no element is added, so React and Vue pages keep working.
3. **Split prices** (“34” “€99” in separate elements) are recognised from their
   nearest ancestor.
4. **The tab title** loses its amounts, and gets them back when masking pauses.

A `MutationObserver` follows carousels, infinite scroll and re-rendering pages.
Amounts are recognised in euros, dollars, pounds, yen, rupees, zlotys, crowns,
Turkish lira and ISO codes.

**Rules ship separately from the code.** Installed copies read
[`regles/regles.json`](regles/regles.json) once a day and adopt it if it is
newer, after validating it in full. It contains data only — domains and CSS
selectors — never code. The rules bundled with the extension remain the
fallback, applied instantly at page load.

## Languages

English, French, Spanish, German, Italian, Portuguese, Dutch, Polish,
Simplified Chinese, Japanese, Arabic (right-to-left), Korean, Turkish, Hindi
and Russian. The extension follows Firefox’s language; dates, numbers and
amounts follow it too.

Translations other than French and English have not yet been reviewed by
native speakers. Corrections are welcome: one file per language,
[`extension/_locales/<language>/messages.json`](extension/_locales).

## Contributing

Issues and pull requests are welcome — a store that changed its layout, a
missing site, a translation fix.

**Adding or fixing a site** usually takes a rule of a few lines:

1. Add or edit the rule in [`extension/regles.js`](extension/regles.js), and its
   match patterns in [`extension/manifest.json`](extension/manifest.json)
   (`npm test` rejects any mismatch).
2. Add a listing page and a product page to [`scripts/pages.mjs`](scripts/pages.mjs),
   then run `SITES=<domain> npm run verifier` until no readable amount is left
   and the ♥ button appears on the product page.
3. Bump `revision` at the top of `regles.js`, then run `npm run catalogue` to
   regenerate `regles/regles.json`.

Once merged, the fix reaches every installation within a day.

## Development

Requires Node.js 22 or later.

```bash
npm install
```

```bash
npm start            # Firefox on amazon.fr, extension loaded and reloaded on change
```

```bash
npm test             # amount detection, rules engine, catalogue, translations, packaging
```

```bash
npm run lint         # Mozilla’s web-ext validation, with AMO listing rules
```

```bash
npm run verifier     # the real sites, in a real Firefox (MOBILE=1 to pose as Android)
```

Continuous integration runs the tests, `web-ext lint` (failing on any warning)
and packaging on every pull request; both checks are required to merge into
the protected `main` branch.

```
extension/
├── manifest.json        Manifest V3, Firefox 140+
├── regles.js            one rule per site
├── background.js        shortcut, icon badge, daily rule update, permissions
├── commun/              settings, wish list, parent code, rule catalogue
├── content/             masking engine, amount detection, product pages, ♥ button
├── popup/  liste/  nouveautes/
├── icons/
└── _locales/            15 languages
amo/                     Firefox Add-ons listing: description, screenshots
regles/regles.json       the rule catalogue read daily by installed copies
scripts/                 verification, packaging, listing sync
```

## Releases

Publishing is automated: bump `version` in `extension/manifest.json` and
`package.json`, merge, and the workflow submits the version to Firefox Add-ons.
Once Mozilla approves it, a GitHub release follows with the signed `.xpi`. The
Firefox Add-ons listing — description in thirteen languages, screenshots, icon —
is kept in sync from the repository. Details in [Maintaining](docs/MAINTAINING.md).

## Known limitations

- A price drawn **inside an image** (banner, deal thumbnail) stays visible.
- Ads served from **another domain** in a frame are not covered: the extension
  only asks access to the sites in its list.
- Stores change their markup without notice; a new price component that neither
  the rule nor the generic detection recognises will show until the rule is
  updated.
- The parent code keeps a curious child out, it is not a safe: whoever opens
  `about:addons` can remove the extension — unless it is enforced by the
  enterprise policy.

## License

[MIT](LICENSE). An independent project, neither endorsed by nor affiliated with
the sites it covers.
