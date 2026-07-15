import { useGetCurrentUser, useGetMembre, useListAssistances, getGetCurrentUserQueryKey, getGetMembreQueryKey, getListAssistancesQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import {
  FileText, Download, LogOut, AlertCircle, CheckCircle,
  Clock, User, FileDown, Receipt, Plus, Shield
} from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  deces_membre: "Décès membre", deces_conjoint: "Décès conjoint",
  deces_enfant: "Décès enfant", deces_parent: "Décès parent",
  deces_beau_parent: "Décès beau-parent", deces_mort_ne: "Mort-né",
  mariage: "Mariage", retraite: "Retraite",
  retraite_complementaire: "Retraite complémentaire",
  pret_sante: "Prêt santé", licenciement: "Licenciement",
};

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  en_attente:   { label: "En attente",   color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   icon: <Clock className="h-3.5 w-3.5" /> },
  commission_affaires_sociales: { label: "Com. Affaires Sociales", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: <Shield className="h-3.5 w-3.5" /> },
  commission_prets: { label: "Com. des Prêts", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: <Shield className="h-3.5 w-3.5" /> },
  tresorerie:   { label: "Trésorerie",   color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: <Receipt className="h-3.5 w-3.5" /> },
  bureau:       { label: "Bureau",       color: "text-slate-700",  bg: "bg-slate-50 border-slate-200",   icon: <Shield className="h-3.5 w-3.5" /> },
  approuvee:    { label: "Approuvée",    color: "text-green-700",  bg: "bg-green-50 border-green-200",   icon: <CheckCircle className="h-3.5 w-3.5" /> },
  rejetee:      { label: "Rejetée",      color: "text-red-700",    bg: "bg-red-50 border-red-200",       icon: <AlertCircle className="h-3.5 w-3.5" /> },
  payee:        { label: "Payée ✓",      color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200",icon: <CheckCircle className="h-3.5 w-3.5" /> },
};

function StatutBadge({ statut }: { statut: string }) {
  const cfg = STATUT_CONFIG[statut] ?? { label: statut.replace(/_/g, " "), color: "text-gray-700", bg: "bg-gray-50 border-gray-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function MembreBadge({ statut }: { statut: string }) {
  const colors: Record<string, string> = {
    actif: "bg-green-100 text-green-800 border-green-200",
    defaillant: "bg-red-100 text-red-800 border-red-200",
    honneur: "bg-yellow-100 text-yellow-800 border-yellow-200",
    radie: "bg-gray-100 text-gray-700 border-gray-200",
    demissionnaire: "bg-orange-100 text-orange-800 border-orange-200",
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[statut] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {statut}
    </span>
  );
}

export default function MutualistePortal() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: userLoading } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });
  const membreId = user?.membreId ?? 0;

  const { data: membre, isLoading: membreLoading } = useGetMembre(membreId, {
    query: { enabled: !!membreId, queryKey: getGetMembreQueryKey(membreId) }
  });
  const { data: assistances } = useListAssistances({ membreId: membreId || undefined } as any, {
    query: { enabled: !!membreId, queryKey: getListAssistancesQueryKey({ membreId: membreId || undefined } as any) }
  });

  const isLoading = userLoading || membreLoading;

  const getToken = () => localStorage.getItem("mugetra_token") ?? "";

  const handleFicheAdhesion = () => {
    window.open(`/api/pdf/membres/${membreId}/fiche-adhesion?token=${getToken()}`, "_blank");
  };

  const handleDemandeAssistancePdf = (assistanceId: number) => {
    window.open(`/api/pdf/assistances/${assistanceId}?token=${getToken()}`, "_blank");
  };

  const handleBonDecaissement = (assistanceId: number) => {
    window.open(`/api/pdf/assistances/${assistanceId}/bon-decaissement?token=${getToken()}`, "_blank");
  };

  const handleLogout = () => {
    localStorage.removeItem("mugetra_token");
    setLocation("/login");
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#f0faf4] p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );

  if (!user?.membreId) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0faf4]">
      <div className="text-center space-y-4 p-8 bg-white rounded-2xl shadow-sm border max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Accès non autorisé</h2>
        <p className="text-gray-500 text-sm">Votre compte n'est pas associé à un profil mutualiste.</p>
        <Button className="w-full" onClick={handleLogout}>Retour à la connexion</Button>
      </div>
    </div>
  );

  const assistancesList = assistances?.data ?? [];
  const initials = (membre?.prenom?.[0] ?? "") + (membre?.nom?.[0] ?? "");

  return (
    <div className="min-h-screen bg-[#f0faf4]">
      {/* Topbar */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-mugetra.png" alt="MUGETRA" className="h-8 object-contain" />
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-[#1a5c3a] leading-none">MUGETRA-NPG.CI</p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">Espace mutualiste</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#1a5c3a] flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className="text-sm font-medium text-gray-700">{user?.prenom} {user?.nom}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Déconnexion</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* Hero card */}
        <div className="rounded-2xl overflow-hidden shadow-md relative" style={{ background: "linear-gradient(135deg, #1a5c3a 0%, #236b48 60%, #2e7d54 100%)" }}>
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #fff 0%, transparent 60%)" }} />
          <div className="relative p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-xs mb-0.5">Bienvenue dans votre espace</p>
                <h1 className="text-white text-xl font-bold truncate">{membre?.prenom} {membre?.nom}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="text-white/90 text-sm font-mono bg-white/10 px-2 py-0.5 rounded">{membre?.matricule}</span>
                  {membre?.statut && <MembreBadge statut={membre.statut} />}
                </div>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-white/60 text-xs">Adhésion</p>
                <p className="text-white font-semibold text-sm">{formatDate(membre?.dateAdhesion)}</p>
                <p className="text-white/60 text-xs mt-2">Cotisation mensuelle</p>
                <p className="text-white font-semibold text-sm">7 500 FCFA</p>
              </div>
            </div>
          </div>
          {/* Gold bar */}
          <div className="h-1 bg-[#c9a227]" />
        </div>

        {/* Cotisation info — montant uniquement, pas les totaux */}
        <div className="bg-white rounded-xl p-4 shadow-sm border flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[#1a5c3a]/10 flex items-center justify-center shrink-0">
            <CheckCircle className="h-5 w-5 text-[#1a5c3a]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Cotisation mensuelle</p>
            <p className="text-xs text-gray-500">Vous cotisez <strong>7 500 FCFA</strong> par mois. Vos cotisations sont gérées par l'administration MUGETRA.</p>
          </div>
        </div>

        {/* Document officiel — fiche d'adhésion uniquement */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-gray-50/50">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#1a5c3a]" /> Document officiel
            </h2>
          </div>
          <div className="p-4">
            <button
              onClick={handleFicheAdhesion}
              className="w-full sm:w-auto flex items-center gap-4 p-4 rounded-lg border border-[#1a5c3a]/20 hover:border-[#1a5c3a] hover:bg-[#f0faf4] transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#1a5c3a]/10 flex items-center justify-center shrink-0 group-hover:bg-[#1a5c3a]/20 transition-colors">
                <FileText className="h-5 w-5 text-[#1a5c3a]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-800">Fiche d'adhésion</p>
                <p className="text-xs text-gray-400">Document officiel MUGETRA-NPG.CI • PDF</p>
              </div>
              <Download className="h-4 w-4 text-gray-400 group-hover:text-[#1a5c3a] transition-colors" />
            </button>
          </div>
        </div>

        {/* Demandes d'assistance */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#1a5c3a]" /> Mes demandes d'assistance
            </h2>
            <button
              onClick={() => setLocation("/mutualiste/nouvelle-demande")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#1a5c3a] text-white hover:bg-[#164d31] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Nouvelle demande
            </button>
          </div>

          {assistancesList.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Aucune demande d'assistance</p>
              <p className="text-xs text-gray-400 mt-1">Vos demandes apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y">
              {assistancesList.map((a: any) => {
                const canBon = a.statut === "approuvee" || a.statut === "payee";
                return (
                  <div key={a.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">
                            {TYPE_LABELS[a.type] ?? a.type}
                          </p>
                          <StatutBadge statut={a.statut} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(a.createdAt)}</p>
                      </div>
                    </div>

                    {/* Boutons PDF contextuels */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => handleDemandeAssistancePdf(a.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-600 hover:border-[#1a5c3a] hover:text-[#1a5c3a] hover:bg-[#f0faf4] transition-all"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        Demande PDF
                      </button>

                      {canBon && (
                        <button
                          onClick={() => handleBonDecaissement(a.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-[#c9a227]/50 text-[#c9a227] hover:bg-[#c9a227]/10 hover:border-[#c9a227] transition-all"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          Bon de décaissement
                        </button>
                      )}

                      {!canBon && a.statut !== "rejetee" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 rounded-md bg-gray-50 border border-dashed border-gray-200">
                          <Clock className="h-3 w-3" />
                          Bon disponible après approbation
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mon profil */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-gray-50/50">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <User className="h-4 w-4 text-[#1a5c3a]" /> Mon profil
            </h2>
          </div>
          <div className="p-4 grid sm:grid-cols-2 gap-x-8">
            {[
              ["Email", membre?.email],
              ["Téléphone", membre?.telephone],
              ["Poste", membre?.poste],
              ["Département", membre?.departement],
              ["Date de naissance", membre?.dateNaissance ? formatDate(membre.dateNaissance) : null],
              ["Situation familiale", membre?.situationFamiliale],
              ["Type d'adhésion", membre?.typeAdhesion?.replace(/_/g, " ")],
              ["Date d'adhésion", membre?.dateAdhesion ? formatDate(membre.dateAdhesion) : null],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs font-semibold text-gray-700 text-right max-w-[55%] truncate">{value as string}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 pb-4">
          MUGETRA-NPG.CI — Votre espace mutualiste sécurisé
        </p>
      </div>
    </div>
  );
}
