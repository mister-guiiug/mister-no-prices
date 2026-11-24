// ESLint (configuration plate, ESLint 10). La même forme dans mister-no-prices
// et mister-no-noise : le code de l'extension en scripts classiques du
// navigateur, les scripts et les tests en modules Node. Seule `PROPRES` change
// d'un dépôt à l'autre.
import globals from "globals";

/** Rien que l'extension partage entre ses scripts hors des API du navigateur. */
const PROPRES = {};

/**
 * Les scripts qui pilotent un navigateur : le corps de leurs `evaluate(() => …)`
 * s'exécute dans la page, d'où les globales du navigateur en plus de Node.
 */
const PILOTES = ["scripts/verifier.mjs", "scripts/verifier-mise-a-jour.mjs"];

const REGLES = {
  "no-undef": "error",
  "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
};

export default [
  { ignores: ["node_modules/", "web-ext-artifacts/", "_agent/"] },
  {
    files: ["extension/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser, ...globals.webextensions, ...PROPRES },
    },
    rules: {
      ...REGLES,
      // Une page d'extension n'écrit jamais de HTML à partir d'une chaîne.
      "no-restricted-properties": [
        "error",
        { property: "innerHTML", message: "textContent ou les API du DOM, jamais innerHTML." },
        { property: "outerHTML", message: "textContent ou les API du DOM, jamais outerHTML." },
      ],
    },
  },
  {
    files: ["scripts/**/*.mjs", "test/**/*.{js,mjs,cjs}", "*.{js,mjs,cjs}"],
    languageOptions: { ecmaVersion: "latest", globals: globals.node },
    rules: REGLES,
  },
  {
    files: PILOTES,
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
