# Site coverage

[Français](SITES.fr.md) · [Back to the README](../README.md)

What the extension hides, site by site, and what has been verified.

## Method

`npm run verifier` starts Firefox on a throwaway profile with the extension
installed, and visits a listing page then a product page for each site. It
**reports every amount still readable** — not under a bar, not blurred, not
off-screen, tab title included — dismisses cookie banners by refusing them,
then flips the switch and the look from the popup and checks that the page
follows. On each product page it clicks the ♥ button; at the end it opens the
wish list and checks that every item is there, prices hidden, then shown on
request. `MOBILE=1` replays everything posing as Firefox for Android (user
agent, phone screen, touch pointer).

A site that answers with an anti-bot check is reported as such: the script
never bypasses it. `VISIBLE=1` opens the window so you can pass the check
yourself.

| Symbol       | Meaning                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| ✔            | listing and product page visited, no readable amount; for ♥, the item added to the list with title, picture and price    |
| ◐ listing ✔  | the listing page is verified; the product page answered with an anti-bot check or did not finish loading within a minute |
| ✘ anti-bot   | markup not inspected; the generic mechanisms apply, but their result was not seen                                        |
| generic only | the rule has no site-specific selector: amount detection in the text does all the work                                   |

## Stores

| Site                | Domains covered                      | Prices hidden (desktop)                            | ♥ button                     | Mobile site            |
| ------------------- | ------------------------------------ | -------------------------------------------------- | ---------------------------- | ---------------------- |
| **Amazon**          | 23 stores                            | ✔ amazon.fr, .com, .co.uk, .de, .es, .it           | ✔ all six                    | ✔ amazon.fr, .com      |
| **AliExpress**      | aliexpress.com                       | ✔                                                  | ✔                            | not verified (timeout) |
| **Auchan**          | auchan.fr                            | ✔                                                  | ✔                            | ✔                      |
| **Boulanger**       | boulanger.com                        | ✔                                                  | ✔                            | ✔                      |
| **Cdiscount**       | cdiscount.com                        | ✔                                                  | ✔                            | ✔                      |
| **Dealabs**         | dealabs.com                          | ✔                                                  | ✔ (`fiche` rule, 2026-11-18) | ✔                      |
| **Decathlon**       | 11 countries                         | ✔ decathlon.fr                                     | ✔                            | ✔                      |
| **E.Leclerc**       | e.leclerc, leclerc.fr                | ✔                                                  | ✔                            | ✔                      |
| **eBay**            | ebay.fr, ebay.com                    | ✔ both                                             | ✔ both                       | ✔ ebay.fr              |
| **LDLC**            | ldlc.com                             | ✔                                                  | ✔                            | ✔                      |
| **Rue du Commerce** | rueducommerce.fr                     | ✔                                                  | ✔                            | ✔                      |
| **Zalando**         | zalando.fr                           | ✔ (generic only)                                   | ✔                            | ✔                      |
| **Fnac**            | fnac.com                             | ✘ anti-bot; rule taken from the listing, seen once | rule not verified            | ✘ anti-bot             |
| **Darty**           | darty.com                            | ✘ anti-bot; generic only                           | ✘                            | ✘                      |
| **Carrefour**       | carrefour.fr                         | ✘ anti-bot; generic only                           | ✘                            | ✘                      |
| **ManoMano**        | manomano.fr                          | ✘ anti-bot; generic only                           | ✘                            | ✘                      |
| **Google**          | www.google.fr, .com, .be, .ch, … (9) | ◐ search and Images, see below                     | — no product page            | ✘ anti-bot             |

The other Amazon and Decathlon domains share the markup of the verified site
without having been verified themselves.

## Classifieds and second-hand

| Site                     | Domains covered                   | Prices hidden (desktop)             | ♥ button                          | Mobile site |
| ------------------------ | --------------------------------- | ----------------------------------- | --------------------------------- | ----------- |
| **Catawiki**             | catawiki.com                      | ✔                                   | ✔                                 | ✔           |
| **Cash Express**         | cashexpress.fr                    | ✔                                   | ✔                                 | ✔           |
| **Craigslist**           | craigslist.org (every city)       | ✔ (generic only)                    | ✔                                 | ✔           |
| **Delcampe**             | delcampe.net                      | ✔                                   | ✔                                 | ✔           |
| **Easy Cash**            | easycash.fr                       | ✔                                   | ✔                                 | ✔           |
| **Facebook Marketplace** | facebook.com, `/marketplace` only | ✔ (generic only), logged out        | ✘ no structured data              | ◐ listing ✔ |
| **Kleinanzeigen**        | kleinanzeigen.de                  | ✔ (generic only)                    | ✔                                 | ✔           |
| **Marktplaats**          | marktplaats.nl                    | ✔                                   | ✔                                 | ✔           |
| **ParuVendu**            | paruvendu.fr                      | ✔ (generic only)                    | ✔                                 | ✔           |
| **Subito**               | subito.it                         | ✔                                   | ✔                                 | ✔           |
| **Vinted**               | 12 countries                      | ✔ vinted.fr                         | ✔                                 | ✔           |
| **Wallapop**             | wallapop.com                      | ✔                                   | ✔                                 | ✔           |
| **Vivastreet**           | vivastreet.com                    | ✔ (generic only)                    | ✘ pages seen without product data | ✔           |
| **Leboncoin**            | leboncoin.fr                      | ◐ listing ✔; product page: anti-bot | not verified                      | ◐ listing ✔ |
| **Discogs**              | discogs.com                       | ◐ listing ✔; product page: timeout  | not verified                      | ◐ listing ✔ |
| **Reverb**               | reverb.com                        | ◐ listing ✔; product page: timeout  | not verified                      | ◐ listing ✔ |
| **Vestiaire Collective** | vestiairecollective.com           | ◐ listing ✔; product page: timeout  | not verified                      | ◐ listing ✔ |
| **Back Market**          | 10 countries                      | ✘ anti-bot; generic only            | ✘                                 | ✘           |
| **Chrono24**             | 10 countries                      | ✘ anti-bot; generic only            | ✘                                 | ✘           |
| **Milanuncios**          | milanuncios.com                   | ✘ visit interrupted; generic only   | ✘                                 | ✘           |

Rakuten is not listed: its French marketplace closed on 30 September 2026.

## Special cases

**Facebook.** The rule only applies under `/marketplace`: elsewhere — news
feed, groups, messages — the extension hides nothing, even after a navigation
that changes the address without reloading the page (verified in Firefox: off
on `/`, on at `/marketplace/paris/`, off again on `/groups/…`).

**Google.** The rule targets **exact hosts** (`www.google.fr`…) rather than the
domain: `*.google.com` would run the extension inside Gmail, Docs or Drive. It
hides amounts across the **whole** results page, not just the sponsored block:
Shopping cards, snippets, AI overview. Search and Google Images answer the
automated Firefox with their anti-bot page (`/sorry`); the extension’s scripts
were replayed on the real pages in another browser (Chromium) with simulated
settings: no readable amount, sponsored products included. Same code, same
markup — but not Firefox.

**The ♥ button** only appears on a page the extension recognises as a product
page: through its structured data (JSON-LD `Product`, microdata, Open Graph)
or, for sites that publish none, through the site rule (`fiche`: Amazon,
Dealabs, Fnac, Rue du Commerce, Cash Express). The price kept is the one on the
page at click time, for the variant displayed.

## What is hidden, everywhere

- the site’s price components, struck-through prices included (“RRP”, “lowest
  price in 30 days”);
- any amount written in plain text: “3 new from €12.99”, “free delivery over
  £35”, “from 10 to 20 EUR”, deal titles…;
- prices **split** into pieces (“34” “€99”);
- the **tab title**: “Robot X60 €999 at Boulanger” becomes “Robot X60 ••• at
  Boulanger”, and gets its price back when masking pauses.

**Left visible, on purpose**: percentage discounts (“-50 %”), ratings, review
counts and stock levels. A number without a currency is never taken for a
price: the bounds of a “Price (€): 4 – 1549” slider (LDLC) stay readable.
