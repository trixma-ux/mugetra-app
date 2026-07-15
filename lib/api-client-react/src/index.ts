import { useQuery, useMutation, type UseQueryOptions, type UseMutationOptions } from "@tanstack/react-query";

/* ============================================================================
 * Ce paquet a été RECONSTRUIT À LA MAIN.
 * ----------------------------------------------------------------------------
 * Le paquet original `@workspace/api-client-react` (généré par Orval à partir
 * d'une spec OpenAPI absente de l'archive fournie) n'a pas pu être reproduit
 * automatiquement. Ce fichier ré-implémente uniquement les hooks qui sont
 * effectivement importés par les pages existantes de `artifacts/mugetra`,
 * avec la même signature d'usage (mêmes noms, mêmes options `{ query: {...} }`).
 *
 * Pour les NOUVEAUX modules ajoutés (prêts, projets, élections, AG, bureau,
 * comptabilité, sports, documents, communication...), les pages front créées
 * dans ce lot utilisent directement `apiFetch` + `useQuery`/`useMutation` de
 * `@tanstack/react-query`, sans passer par ce paquet, pour rester simples et
 * ne pas avoir à régénérer un client à chaque nouvelle route.
 * ========================================================================== */

let getToken: () => string | null | undefined = () => null;
let baseUrl = "";

export function setAuthTokenGetter(fn: () => string | null | undefined) {
  getToken = fn;
}

/** Nécessaire pour l'app mobile (Expo), qui ne peut pas utiliser des chemins relatifs comme le web. */
export function setBaseUrl(url: string) {
  baseUrl = url.replace(/\/$/, "");
}

export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${baseUrl}/api${path}`, { ...init, headers, credentials: "include" });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const data = await res.json();
      message = data?.error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

type QueryOpts<T> = { query?: Partial<UseQueryOptions<T>> };
type MutOpts<T, V> = Partial<UseMutationOptions<T, Error, V>>;

export type MembreStatut = "actif" | "defaillant" | "radie" | "demissionnaire" | "decede" | "honneur";

// ─────────────────────────── AUTH ───────────────────────────

export function getGetCurrentUserQueryKey() {
  return ["/auth/me"] as const;
}
export function useGetCurrentUser(opts?: QueryOpts<any>) {
  return useQuery({
    queryKey: getGetCurrentUserQueryKey(),
    queryFn: () => apiFetch("/auth/me"),
    ...opts?.query,
  });
}
export function useLogout(opts?: MutOpts<any, void>) {
  return useMutation({
    mutationFn: () => apiFetch("/auth/logout", { method: "POST" }),
    ...opts,
  });
}
export function useLogin(opts?: MutOpts<any, { data: { email?: string; identifiant?: string; motDePasse: string } }>) {
  return useMutation({
    mutationFn: (vars: any) => apiFetch("/auth/login", { method: "POST", body: JSON.stringify(vars.data ?? vars) }),
    ...opts,
  });
}

// ─────────────────────────── MEMBRES ───────────────────────────

export function getListMembresQueryKey(params?: Record<string, any>) {
  return ["/membres", params ?? {}] as const;
}
export function useListMembres(params?: Record<string, any>, opts?: QueryOpts<any>) {
  const qs = params ? `?${new URLSearchParams(params as any).toString()}` : "";
  return useQuery({
    queryKey: getListMembresQueryKey(params),
    queryFn: () => apiFetch(`/membres${qs}`),
    ...opts?.query,
  });
}
export function getGetMembreQueryKey(id?: number | string) {
  return ["/membres", id] as const;
}
export function useGetMembre(id?: number | string, opts?: QueryOpts<any>) {
  return useQuery({
    queryKey: getGetMembreQueryKey(id),
    queryFn: () => apiFetch(`/membres/${id}`),
    enabled: id != null,
    ...opts?.query,
  });
}
export function useCreateMembre(opts?: MutOpts<any, any>) {
  return useMutation({
    mutationFn: (body: any) => apiFetch("/membres", { method: "POST", body: JSON.stringify(body) }),
    ...opts,
  });
}

// ─────────────────────────── COTISATIONS ───────────────────────────

export function getListCotisationsQueryKey(params?: Record<string, any>) {
  return ["/cotisations", params ?? {}] as const;
}
export function useListCotisations(params?: Record<string, any>, opts?: QueryOpts<any>) {
  const qs = params ? `?${new URLSearchParams(params as any).toString()}` : "";
  return useQuery({
    queryKey: getListCotisationsQueryKey(params),
    queryFn: () => apiFetch(`/cotisations${qs}`),
    ...opts?.query,
  });
}
export function getGetCotisationsResumeQueryKey(membreId?: number | string) {
  return ["/cotisations/resume", membreId] as const;
}
export function useGetCotisationsResume(membreId?: number | string, opts?: QueryOpts<any>) {
  return useQuery({
    queryKey: getGetCotisationsResumeQueryKey(membreId),
    queryFn: () => apiFetch(`/cotisations/resume/${membreId}`),
    enabled: membreId != null,
    ...opts?.query,
  });
}
export function getGetCotisationsMensuellesQueryKey() {
  return ["/dashboard/cotisations-mensuelles"] as const;
}
export function useGetCotisationsMensuelles(opts?: QueryOpts<any>) {
  return useQuery({
    queryKey: getGetCotisationsMensuellesQueryKey(),
    queryFn: () => apiFetch("/dashboard/cotisations-mensuelles"),
    ...opts?.query,
  });
}

// ─────────────────────────── ASSISTANCES ───────────────────────────

export function getListAssistancesQueryKey(params?: Record<string, any>) {
  return ["/assistances", params ?? {}] as const;
}
export function useListAssistances(params?: Record<string, any>, opts?: QueryOpts<any>) {
  const qs = params ? `?${new URLSearchParams(params as any).toString()}` : "";
  return useQuery({
    queryKey: getListAssistancesQueryKey(params),
    queryFn: () => apiFetch(`/assistances${qs}`),
    ...opts?.query,
  });
}
export function getGetAssistanceQueryKey(id?: number | string) {
  return ["/assistances", id] as const;
}
export function useGetAssistance(id?: number | string, opts?: QueryOpts<any>) {
  return useQuery({
    queryKey: getGetAssistanceQueryKey(id),
    queryFn: () => apiFetch(`/assistances/${id}`),
    enabled: id != null,
    ...opts?.query,
  });
}
export function useCreateAssistance(opts?: MutOpts<any, any>) {
  return useMutation({
    mutationFn: (body: any) => apiFetch("/assistances", { method: "POST", body: JSON.stringify(body) }),
    ...opts,
  });
}
export function useValiderAssistance(opts?: MutOpts<any, { id: number | string; data: any }>) {
  return useMutation({
    mutationFn: ({ id, data }: any) => apiFetch(`/assistances/${id}/valider`, { method: "POST", body: JSON.stringify(data) }),
    ...opts,
  });
}

// ─────────────────────────── ANNONCES ───────────────────────────

export function getListAnnoncesQueryKey() {
  return ["/annonces"] as const;
}
export function useListAnnonces(opts?: QueryOpts<any>) {
  return useQuery({
    queryKey: getListAnnoncesQueryKey(),
    queryFn: () => apiFetch("/annonces"),
    ...opts?.query,
  });
}

// ─────────────────────────── PARAMÈTRES ───────────────────────────

export function getGetParametresQueryKey() {
  return ["/parametres"] as const;
}
export function useGetParametres(opts?: QueryOpts<any>) {
  return useQuery({
    queryKey: getGetParametresQueryKey(),
    queryFn: () => apiFetch("/parametres"),
    ...opts?.query,
  });
}

// ─────────────────────────── DASHBOARD ───────────────────────────

export function getGetDashboardStatsQueryKey() {
  return ["/dashboard/stats"] as const;
}
export function useGetDashboardStats(opts?: QueryOpts<any>) {
  return useQuery({
    queryKey: getGetDashboardStatsQueryKey(),
    queryFn: () => apiFetch("/dashboard/stats"),
    ...opts?.query,
  });
}
export function getGetTresorerieResumeQueryKey() {
  return ["/dashboard/tresorerie"] as const;
}
export function useGetTresorerieResume(opts?: QueryOpts<any>) {
  return useQuery({
    queryKey: getGetTresorerieResumeQueryKey(),
    queryFn: () => apiFetch("/dashboard/tresorerie"),
    ...opts?.query,
  });
}
export function getGetActiviteRecenteQueryKey() {
  return ["/dashboard/activite"] as const;
}
export function useGetActiviteRecente(opts?: QueryOpts<any>) {
  return useQuery({
    queryKey: getGetActiviteRecenteQueryKey(),
    queryFn: () => apiFetch("/dashboard/activite"),
    ...opts?.query,
  });
}
