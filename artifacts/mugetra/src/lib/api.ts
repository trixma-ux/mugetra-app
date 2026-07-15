import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";

export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("mugetra_token");
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`/api${path}`, { ...init, headers, credentials: "include" });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try { message = (await res.json())?.error ?? message; } catch { /* ignore */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function useApiQuery<T = any>(key: readonly unknown[], path: string, opts?: Partial<UseQueryOptions<T>>) {
  return useQuery({ queryKey: key, queryFn: () => apiFetch<T>(path), ...opts });
}

export function useApiMutation<TResult = any, TVars = any>(
  fn: (vars: TVars) => Promise<TResult>,
  invalidateKeys: readonly unknown[][] = [],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => { for (const k of invalidateKeys) qc.invalidateQueries({ queryKey: k }); },
  });
}

export function post<T = any>(path: string, body?: any) {
  return apiFetch<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
}
export function patch<T = any>(path: string, body?: any) {
  return apiFetch<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined });
}
export function del<T = any>(path: string) {
  return apiFetch<T>(path, { method: "DELETE" });
}
