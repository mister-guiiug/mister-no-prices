# Maintaining

[Français](MAINTENANCE.fr.md) · [Back to the README](../README.md)

Releasing, deploying, keeping the listing and the rule catalogue up to date:
what you need to know to maintain the extension.

## Manifest and rules

`host_permissions` and `content_scripts[0].matches` are **generated** from
`extension/regles.js`:

```bash
npm run manifeste
node scripts/manifeste.mjs --verifier
```

Do not edit those lists by hand. After adding a site: bump `revision`,
`npm run catalogue`, `npm run manifeste`.

## Releasing a version

Publishing is **automated**: bump `version` in
[`extension/manifest.json`](../extension/manifest.json) and `package.json` (the
tests keep them aligned), merge the pull request — that’s it. A pull request
that does not change the version publishes nothing.

[`publication.yml`](../.github/workflows/publication.yml), on every push to
`main` and every three hours:

1. checks whether release `v<version>` exists; if so, stops;
2. tests, validates (`web-ext lint` with the public listing rules), then
   **submits** the version to addons.mozilla.org (“listed” channel), with the
   listing from [`amo/fiche.json`](../amo/fiche.json) — or, if a previous run
   already submitted it, checks how its review is going;
3. once Mozilla approves the version — often within minutes, sometimes after
   several days of human review — downloads the signed `.xpi` and publishes
   release `v<version>`, tagged on the commit, with the full package. While the
   version is under review the run ends green, without a release; the next
   scheduled run picks it up.

The repository secrets `AMO_API_KEY` and `AMO_API_SECRET` are only passed to the
submitting step; without them the workflow fails rather than publish a release
with nothing installable. Mozilla accepts a version number **once**, across all
channels: if the release fails after signing, re-run the workflow — it finds
the version on AMO and downloads the signed file again, without submitting
anything. A version under review that a newer version supersedes gets no
release: the workflow only publishes the manifest’s version.

**Updates.** A listed version has no `update_url`: Firefox updates it from
addons.mozilla.org. Copies installed from releases up to 1.7.0 declared an
`update_url` pointing to the latest release’s `updates.json`; that is how they
move to the listed version, then to the listing. Every release still carries it.

## Deployment package

`npm run paquet` builds, in `web-ext-artifacts/mister-no-prices-<version>/`,
everything needed to install the extension on a computer without knowing
anything about this repository:

| File                             | Purpose                                                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mister-no-prices-<version>.xpi` | the extension signed by Mozilla — only with API keys                                                                                                           |
| `mister-no-prices-<version>.zip` | the unsigned extension                                                                                                                                         |
| `INSTALLER.md`                   | step-by-step install guide for non-developers (in French)                                                                                                      |
| `policies.json`                  | Firefox enterprise policy that **enforces** the extension on a family computer: installed for every session, cannot be removed or disabled from `about:addons` |
| `updates.json`                   | what copies installed up to 1.7.0 read to update themselves                                                                                                    |
| `SHA256SUMS`                     | checksums, for `sha256sum -c`                                                                                                                                  |

The guide and the policy come from [`deploiement/`](../deploiement/), filled
with the manifest’s version and ID.

> **Warning.** With API keys in `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` — in
> the environment or in a `.env` file at the root, ignored by git —
> `npm run paquet` **submits the version** to addons.mozilla.org: it is the
> publishing step, not a dry run. Without keys, the package comes out without a
> `.xpi`, and says so.

## The addons.mozilla.org listing

The listing is kept in the repository.
[`fiche-amo.yml`](../.github/workflows/fiche-amo.yml) brings it back in line
whenever its sources change on `main`, and daily: AMO only reads the name and
summary from the manifest when the listing is created, and never its icon.

| On the listing        | Comes from                                                                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name, summary         | `extName`, `extDescription` of each extension language the listing supports                                                                                     |
| description, category | [`amo/fiche.json`](../amo/fiche.json), one description per language, in limited Markdown (`**bold**`, `- ` lists, `[text](url)` links): AMO shows HTML verbatim |
| homepage              | the manifest’s `homepage_url`                                                                                                                                   |
| icon                  | `extension/icons/icone-128.png`                                                                                                                                 |
| screenshots           | [`amo/captures.json`](../amo/captures.json) (order, captions in each language) and `amo/captures/` (1280 × 800 PNG)                                             |

- **Languages.** The listing speaks thirteen of the fifteen languages: AMO
  offers neither Arabic nor Hindi for listing text. Spanish, Portuguese and
  English are copied to their regional variants (`es-MX`, `pt-BR`, `en-GB`…),
  otherwise their visitors would see French, the listing’s default language.
  The mapping is `LANGUES_AMO`, in [`scripts/fiche-amo.mjs`](../scripts/fiche-amo.mjs).
- **Only differences are written**, and the log names each differing field
  before writing.
- **Screenshots.** A screenshot is identified by its French caption: re-running
  never duplicates, and a screenshot added by hand is never deleted. AMO wipes a
  caption set right after the image upload: the script waits a minute, sets the
  caption and checks that it stuck.
- **Rate limits.** AMO throttles writes, sometimes for hours. The run then ends
  green and the next one resumes; to go faster, the developer hub form is not
  subject to that limit.
- **Privacy.** The Amazon screenshots have the delivery address blurred: do the
  same for any new screenshot of a site where you have an address.

## The rule catalogue

Installed copies read [`regles/regles.json`](../regles/regles.json) from `main`
daily, and adopt it if it is newer than the one they apply. Fixing a selector or
adding a site is therefore **merging a pull request** that edits `regles.js`,
bumps the revision (`YYYY-MM-DD.n`) and regenerates `regles.json`
(`npm run catalogue`): the fix ships within a day, with no signing and no
extension update. A version only needs bumping when the engine or the
catalogue `format` changes. CI rejects an outdated `regles.json`, and a pull
request that changes the rules without bumping the revision.

- **The bundled catalogue** (`regles.js`) stays the reference and the fallback:
  it applies at `document_start`; the remote rule, if different, replaces it a
  few milliseconds later, without reloading the page.
- **A new site** has no access: the popup and the what’s-new page ask for it
  (optional `*://*/*` permission, granted site by site, never in bulk). Once
  granted, the background script registers the content scripts there
  (`scripting.registerContentScripts`). The manifest must still declare it: it
  joins the permissions of the next version.
- **Validation.** A remote catalogue is only adopted after the same checks as
  the tests (IDs, bare domains, paths, selectors without braces, comments or
  stray parentheses); at the first defect it is rejected entirely and the
  previous one stays.
- **Rolling back**: republish the old content with a higher revision. A
  revision never goes down.
- It is **data**, not code — domain names and CSS selectors: nothing in it is
  executed, as Mozilla’s add-on policies require.

A faulty catalogue would hit every installation at once: validation rejects a
malformed one, not a valid but overly broad selector. Pull request review and
`npm run verifier` guard against that.

## After an update: a “!” on the icon

Firefox grants an extension’s access **at install time**, not the access an
update adds. A version that gains sites does not act on them until the user
says yes. The icon then shows a **“!”** badge; the popup names the sites, and
**“Allow”** grants them all, once and for all. `npm run verifier:mise-a-jour`
replays this case: installs an older version, updates, grants access.

## Checking against the real sites

```bash
npm run verifier                     # every site
SITES=amazon.fr,vinted.fr npm run verifier
MOBILE=1 npm run verifier            # posing as Firefox for Android
VISIBLE=1 npm run verifier           # visible window, to pass an anti-bot check yourself
```

`FIREFOX` points to the executable to start. Screenshots go to `captures/`
(`captures/mobile/` with `MOBILE=1`). To open the popup, the script goes
through Firefox’s own window (`MOZ_REMOTE_ALLOW_SYSTEM_ACCESS`, on the
throwaway profile only): WebDriver BiDi refuses to navigate to a
`moz-extension://` address.

On Android, with the phone connected over USB and USB debugging enabled:

```bash
npx web-ext run --source-dir extension -t firefox-android --android-device <adb device id>
```

Firefox for Android has only been tested by posing as it (`MOBILE=1`); the
phone-specific APIs only through the tests (no `browser.commands`).

## Extension ID and repository name

The ID `mister-no-price@mister-guiiug` was frozen by the first signature:
changing it would make the next version a different extension, without its
settings or wish list. It therefore keeps the name from before the repository
was renamed to `mister-no-prices`.

Version 1.3.0 was published under the old repository name: copies that
installed it read their updates from `github.com/mister-guiiug/mister-no-price/…`,
which GitHub redirects to the new name. **Never create a repository named
`mister-no-price` again**: it would take the redirect’s place, and those copies
would stop updating.

## The logo

[`extension/icons/icone.svg`](../extension/icons/icone.svg): a price tag whose
amount is hidden by a bar — what the extension does — in gift-wrap colours on a
purple background. Readable from 16 to 128 pixels, on light and dark toolbars.
The SVG is used for the toolbar and the pages; the PNGs (`icone-32.png` to
`icone-128.png`) for the add-ons manager and addons.mozilla.org, which requires
a 128 × 128 icon.

## Technical limitations

- A site’s stylesheet is injected in a `<style>` element; a Content Security
  Policy forbidding inline styles would block it. None of the verified sites
  does; text detection does not depend on it.
- The optional `*://*/*` permission looks broad in the manifest; it is never
  requested in bulk, only site by site, for sites in the catalogue.
