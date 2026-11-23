/**
 * Ce que la publication demande à addons.mozilla.org (API v5), au-delà de ce
 * que fait `web-ext sign` : savoir si une version y est déjà, où en est sa
 * relecture, et télécharger le fichier signé une fois la version publiée.
 *
 * Une version du canal « listed » n'est signée qu'une fois approuvée : souvent
 * en quelques minutes, parfois après une relecture humaine de plusieurs jours.
 * La publication soumet, attend un peu, puis s'arrête sans release si la
 * version est encore en relecture ; ses passages suivants (planifiés) la
 * retrouvent ici et finissent le travail.
 *
 * https://addons-server.readthedocs.io/en/latest/topics/api/addons.html
 */
import { createHmac, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

export const API = "https://addons.mozilla.org/api/v5/";
const AGENT = "mister-no-prices-publication";

const base64url = (valeur) => Buffer.from(JSON.stringify(valeur)).toString("base64url");

/** Le jeton d'une requête : un JWT HS256 d'une minute, signé par le secret. */
export function jeton(cle, secret, maintenant = Math.floor(Date.now() / 1000)) {
  const corps = `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url({
    iss: cle,
    jti: randomUUID(),
    iat: maintenant,
    exp: maintenant + 60,
  })}`;
  return `${corps}.${createHmac("sha256", secret).update(corps).digest("base64url")}`;
}

/**
 * L'état d'une version d'après sa fiche dans l'API.
 * @returns {"publiee" | "en-relecture" | "refusee"}
 */
export function etatDe(version) {
  const statut = version?.file?.status;
  if (statut === "public") return "publiee";
  if (statut === "disabled") return "refusee";
  return "en-relecture";
}

/** Le délai qu'AMO demande sur un 429 : Retry-After, sinon « available in N seconds », sinon une minute. */
export function delaiDemande(entetes, texte) {
  const apres = Number(entetes.get("retry-after"));
  if (apres > 0) return apres * 1000;
  const n = Number(/available in (\d+) seconds?/.exec(texte)?.[1]);
  return (n > 0 ? n : 60) * 1000;
}

const ESSAIS_429 = 4;

/**
 * AMO a demandé une attente plus longue que ce qu'on accepte de patienter
 * (souvent une demi-heure après quelques envois d'images) : mieux vaut
 * s'arrêter et reprendre au passage suivant.
 */
export class DebitEpuise extends Error {
  constructor(ms, requete) {
    super(`AMO demande d'attendre ${Math.round(ms / 60_000)} min avant ${requete}`);
    this.ms = ms;
  }
}

export function client({
  cle,
  secret,
  fetch = globalThis.fetch,
  dormir = (ms) => new Promise((r) => setTimeout(r, ms)),
  attenteMax = 5 * 60_000,
}) {
  const demander = async (url, attendu = "json", { methode = "GET", corps } = {}, essai = 1) => {
    const enJson = corps !== undefined && !(corps instanceof FormData);
    const reponse = await fetch(url, {
      method: methode,
      headers: {
        Authorization: `JWT ${jeton(cle, secret)}`,
        Accept: "application/json",
        "User-Agent": AGENT,
        ...(enJson ? { "Content-Type": "application/json" } : {}),
      },
      body: enJson ? JSON.stringify(corps) : corps,
    });
    // AMO limite le débit des écritures : attendre ce qu'il demande, puis
    // reprendre la même requête.
    if (reponse.status === 429 && essai < ESSAIS_429) {
      const ms = delaiDemande(reponse.headers, await reponse.text().catch(() => ""));
      if (ms > attenteMax) throw new DebitEpuise(ms, `${methode} ${url}`);
      console.log(`AMO demande d'attendre ${Math.round(ms / 1000)} s (${methode} ${url})`);
      await dormir(ms + 1000);
      return demander(url, attendu, { methode, corps }, essai + 1);
    }
    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => "");
      throw new Error(
        `AMO ${reponse.status} sur ${methode} ${url}${detail.startsWith("{") ? ` : ${detail.slice(0, 500)}` : ""}`,
      );
    }
    if (attendu === "rien") return null;
    if (attendu === "json") {
      const type = reponse.headers.get("content-type") ?? "";
      if (!type.includes("json")) throw new Error(`AMO a répondu ${type || "sans type"} au lieu de JSON sur ${url}`);
      return reponse.json();
    }
    return Buffer.from(await reponse.arrayBuffer());
  };

  return {
    /** La version `numero` de l'extension `id`, tous canaux, ou null. */
    async version(id, numero) {
      let page = new URL(`addons/addon/${encodeURIComponent(id)}/versions/?filter=all_with_unlisted&page_size=50`, API);
      while (page) {
        const { results, next } = await demander(page);
        const trouvee = results.find((v) => v.version === numero);
        if (trouvee) return trouvee;
        page = next ? new URL(next) : null;
      }
      return null;
    },

    /** Attend que la version quitte la relecture, au plus `delai` ms. */
    async attendre(id, numero, { delai, intervalle = 30_000, dormir = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
      const fin = Date.now() + delai;
      for (;;) {
        const version = await this.version(id, numero);
        if (version && etatDe(version) !== "en-relecture") return version;
        if (Date.now() + intervalle > fin) return version;
        await dormir(intervalle);
      }
    },

    /** La fiche telle que l'API la rend (nom, résumé, captures, icône…). */
    async fiche(id) {
      return demander(new URL(`addons/addon/${encodeURIComponent(id)}/`, API));
    },

    /** Modifie des champs de la fiche (JSON) ; `icone` passe en multipart. */
    async modifierFiche(id, champs) {
      const url = new URL(`addons/addon/${encodeURIComponent(id)}/`, API);
      return demander(url, "json", { methode: "PATCH", corps: champs });
    },

    async envoyerIcone(id, image) {
      const formulaire = new FormData();
      formulaire.set("icon", new Blob([image], { type: "image/png" }), "icone-128.png");
      const url = new URL(`addons/addon/${encodeURIComponent(id)}/`, API);
      return demander(url, "json", { methode: "PATCH", corps: formulaire });
    },

    /** Les captures de la fiche, dans leur ordre : `{ id, caption, position, image_url }`. */
    async captures(id) {
      return (await this.fiche(id)).previews ?? [];
    },

    /**
     * Ajoute une capture, puis lui donne sa légende et sa place — l'API refuse
     * les deux à l'envoi. AMO retraite l'image après l'envoi et, ce faisant,
     * efface une légende posée trop tôt (vu le 18/11 : seule a tenu celle
     * posée une minute après) : attendre `traitement` ms, poser la légende,
     * vérifier qu'elle a tenu, sinon recommencer.
     */
    async ajouterCapture(id, { image, nom, legende, position }, { traitement = 60_000, essais = 3 } = {}) {
      const formulaire = new FormData();
      formulaire.set("image", new Blob([image], { type: "image/png" }), nom);
      formulaire.set("position", String(position));
      const url = new URL(`addons/addon/${encodeURIComponent(id)}/previews/`, API);
      const { id: capture } = await demander(url, "json", { methode: "POST", corps: formulaire });
      try {
        for (let essai = 1; ; essai += 1) {
          await dormir(traitement);
          await this.modifierCapture(id, capture, { legende, position });
          await dormir(traitement / 2);
          const enLigne = (await this.captures(id)).find((c) => c.id === capture);
          if (enLigne?.caption?.fr === legende.fr) return enLigne;
          if (essai >= essais) throw new Error(`légende de la capture ${capture} effacée ${essais} fois`);
          console.log(`légende de la capture ${capture} effacée par AMO : nouvel essai`);
        }
      } catch (erreur) {
        // AMO demande d'attendre : la capture reste sans légende, et le
        // passage suivant la reprend (fiche-amo.mjs, `planifier`). Toute autre
        // erreur : la retirer, sans quoi elle serait renvoyée en double.
        if (!(erreur instanceof DebitEpuise)) await this.supprimerCapture(id, capture).catch(() => {});
        throw erreur;
      }
    },

    async modifierCapture(id, capture, { legende, position }) {
      const url = new URL(`addons/addon/${encodeURIComponent(id)}/previews/${capture}/`, API);
      return demander(url, "json", { methode: "PATCH", corps: { caption: legende, position } });
    },

    async supprimerCapture(id, capture) {
      const url = new URL(`addons/addon/${encodeURIComponent(id)}/previews/${capture}/`, API);
      return demander(url, "rien", { methode: "DELETE" });
    },

    /** Télécharge le fichier signé d'une version publiée. */
    async telecharger(version, destination) {
      if (etatDe(version) !== "publiee") throw new Error(`${version.version} n'est pas publiée`);
      await writeFile(destination, await demander(version.file.url, "binaire"));
    },
  };
}

/**
 * L'erreur d'une soumission refusée pour débit limité (429). web-ext la rend
 * sous la forme « Submission failed (2): 429 » suivie du corps de la réponse
 * (« Request was throttled. Expected available in N seconds. ») — relevé le
 * 23/11/2026, N valant plus de onze heures. Ce n'est pas un échec de la
 * version : publication.yml reprend au passage planifié suivant.
 *
 * @param {unknown} erreur
 * @returns {boolean}
 */
export function estDebitLimite(erreur) {
  const texte = `${erreur?.message ?? ""} ${String(erreur ?? "")}`;
  return /\b429\b|throttled|Expected available in/iu.test(texte);
}
