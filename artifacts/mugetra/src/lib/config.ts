/**
 * Configuration de l'URL de l'API.
 *
 * - En développement, laisser VITE_API_URL vide : les appels `/api/...` passent
 *   par le proxy Vite (voir vite.config.ts) vers l'api-server local.
 * - En production (GitHub Pages, Vercel...), définir VITE_API_URL au moment du
 *   build avec l'URL publique de l'api-server, par ex. `https://api.mugetra.ci`
 *   (un suffixe `/api` éventuel est accepté et retiré automatiquement).
 */
const rawApiUrl = String(import.meta.env.VITE_API_URL ?? "").trim();

/** Origine de l'api-server, sans `/` final ni suffixe `/api` ("" = même origine). */
export const API_ORIGIN = rawApiUrl.replace(/\/+$/, "").replace(/\/api$/, "");

/** Vrai si un serveur API est utilisable : URL configurée, ou dev avec proxy. */
export const API_CONFIGURED = API_ORIGIN !== "" || import.meta.env.DEV;

/** URL absolue d'un chemin d'API, ex. apiUrl("/membres") → `${API_ORIGIN}/api/membres`. */
export function apiUrl(path: string): string {
  return `${API_ORIGIN}/api${path.startsWith("/") ? path : `/${path}`}`;
}

/** Chemin d'un fichier du dossier public/, préfixé par le base path (ex. /mugetra-app/). */
export function publicAsset(file: string): string {
  return `${import.meta.env.BASE_URL}${file.replace(/^\/+/, "")}`;
}

export const API_NOT_CONFIGURED_MESSAGE =
  "Aucun serveur API n'est configuré pour cette version en ligne : la connexion et les données ne sont pas disponibles.";
export const API_UNREACHABLE_MESSAGE =
  "Le serveur MUGETRA est injoignable pour le moment. Vérifiez votre connexion ou réessayez plus tard.";

function isApiRequest(url: string): boolean {
  if (url.startsWith("/api/") || url === "/api") return true;
  return API_ORIGIN !== "" && url.startsWith(`${API_ORIGIN}/api`);
}

/**
 * Enveloppe window.fetch pour les appels d'API :
 * - réécrit les chemins relatifs `/api/...` vers API_ORIGIN ;
 * - si aucune API n'est configurée, échoue immédiatement avec un message clair ;
 * - transforme les erreurs réseau ("Failed to fetch") en message lisible.
 */
export function installApiFetch(): void {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (!isApiRequest(url)) return nativeFetch(input, init);
    if (!API_CONFIGURED) throw new Error(API_NOT_CONFIGURED_MESSAGE);
    const target = url.startsWith("/api") && typeof input === "string" ? `${API_ORIGIN}${url}` : input;
    try {
      return await nativeFetch(target, init);
    } catch (err) {
      if (err instanceof TypeError) throw new Error(API_UNREACHABLE_MESSAGE);
      throw err;
    }
  };
}

export type ApiStatus = "ok" | "not-configured" | "unreachable";

export async function checkApiStatus(): Promise<ApiStatus> {
  if (!API_CONFIGURED) return "not-configured";
  try {
    const res = await fetch(apiUrl("/healthz"));
    if (!res.ok) return "unreachable";
    const data = await res.json().catch(() => null);
    return data?.status === "ok" ? "ok" : "unreachable";
  } catch {
    return "unreachable";
  }
}
