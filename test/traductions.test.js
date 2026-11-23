import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Les quinze langues de l'extension : le dossier de _locales (souligné, à la
 * manière des extensions) et l'étiquette BCP 47 que porte la clé `langue`,
 * qui règle les formats (dates, nombres, listes) de Intl.
 */
export const LANGUES = Object.freeze({
  fr: "fr",
  en: "en",
  es: "es",
  de: "de",
  it: "it",
  pt: "pt",
  nl: "nl",
  pl: "pl",
  zh_CN: "zh-CN",
  ja: "ja",
  ar: "ar",
  ko: "ko",
  tr: "tr",
  hi: "hi",
  ru: "ru",
});

const lire = (dossier) =>
  JSON.parse(readFileSync(new URL(`../extension/_locales/${dossier}/messages.json`, import.meta.url), "utf8"));
const reference = lire("fr");
/** Les $NOMS$ d'un message, en majuscules : les marques ne tiennent pas compte de la casse. */
const marques = (message) => [...message.matchAll(/\$([A-Za-z0-9_]+)\$/g)].map((m) => m[1].toUpperCase()).sort();

describe("les traductions", () => {
  it("le manifeste a le français pour langue par défaut", () => {
    const manifeste = JSON.parse(readFileSync(new URL("../extension/manifest.json", import.meta.url), "utf8"));
    assert.equal(manifeste.default_locale, "fr");
  });

  for (const [dossier, etiquette] of Object.entries(LANGUES)) {
    describe(dossier, () => {
      const present = existsSync(new URL(`../extension/_locales/${dossier}/messages.json`, import.meta.url));
      it("existe", () => assert.ok(present, `_locales/${dossier}/messages.json manque`));
      if (!present) return;
      const messages = lire(dossier);

      it("a exactement les clés du français", () => {
        assert.deepEqual(Object.keys(messages).sort(), Object.keys(reference).sort());
      });

      it(`règle Intl sur « ${etiquette} »`, () => {
        assert.equal(messages.langue.message, etiquette);
        assert.equal(Intl.getCanonicalLocales(etiquette)[0], etiquette);
      });

      // Le nom d'une marque ($RACCOURCI$, $SHORTCUT$…) est libre dans chaque
      // langue : seule compte la valeur qu'elle reçoit ($1, $2…). Chaque marque
      // du message doit être définie dans la même entrée, chaque définition
      // servir, et les valeurs être celles du français.
      it("garde les marques ($NOM$), définies et utilisées, aux mêmes valeurs", () => {
        const contenus = (m) =>
          Object.values(m.placeholders ?? {})
            .map((p) => p.content)
            .sort();
        for (const [cle, ref] of Object.entries(reference)) {
          const tr = messages[cle];
          if (!tr) continue;
          assert.equal(typeof tr.message, "string", cle);
          assert.ok(tr.message.trim().length > 0, `${cle} vide`);
          const definies = Object.keys(tr.placeholders ?? {})
            .map((n) => n.toUpperCase())
            .sort();
          assert.deepEqual([...new Set(marques(tr.message))].sort(), definies, `${cle} : marques et définitions`);
          assert.deepEqual(contenus(tr), contenus(ref), `${cle} : valeurs des marques`);
        }
      });

      it("garde les points des nouveautés, séparés par « | »", () => {
        assert.equal(
          messages.nouveautesPoints.message.split("|").length,
          reference.nouveautesPoints.message.split("|").length,
        );
      });

      // Les limites des boutiques d'extensions : nom court, description d'une ligne.
      it("tient dans les limites du nom et de la description", () => {
        assert.ok(messages.extName.message.length <= 45, `extName : ${messages.extName.message.length}`);
        assert.ok(messages.extShortName.message.length <= 20, `extShortName : ${messages.extShortName.message.length}`);
        assert.ok(
          messages.extDescription.message.length <= 132,
          `extDescription : ${messages.extDescription.message.length}`,
        );
        assert.ok([...messages.badgePause.message].length <= 4, `badgePause : ${messages.badgePause.message}`);
      });
    });
  }
});
