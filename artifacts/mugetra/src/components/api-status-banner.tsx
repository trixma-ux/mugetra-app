import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  API_NOT_CONFIGURED_MESSAGE,
  API_UNREACHABLE_MESSAGE,
  checkApiStatus,
} from "@/lib/config";

/** Bandeau affiché en haut de l'application quand l'API est absente ou injoignable. */
export function ApiStatusBanner() {
  const { data: status, refetch, isFetching } = useQuery({
    queryKey: ["api-status"],
    queryFn: checkApiStatus,
    staleTime: 60_000,
    refetchInterval: (q) => (q.state.data === "unreachable" ? 30_000 : false),
  });

  if (!status || status === "ok") return null;

  return (
    <div role="alert" className="sticky top-0 z-50 flex items-start gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">
          {status === "not-configured" ? "Mode consultation : serveur non configuré" : "Serveur indisponible"}
        </p>
        <p className="text-amber-800">
          {status === "not-configured" ? API_NOT_CONFIGURED_MESSAGE : API_UNREACHABLE_MESSAGE}
        </p>
      </div>
      {status === "unreachable" && (
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-xs font-medium hover:bg-amber-100"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} /> Réessayer
        </button>
      )}
    </div>
  );
}
