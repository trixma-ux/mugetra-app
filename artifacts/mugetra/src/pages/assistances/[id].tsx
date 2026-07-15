import { useRoute, useLocation } from "wouter";
import { useGetAssistance, getGetAssistanceQueryKey, useValiderAssistance, getListAssistancesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileDown, CheckCircle, XCircle, Clock, ChevronRight } from "lucide-react";
import { formatFCFA, formatDate, formatDateTime } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const TYPE_LABELS: Record<string, string> = {
  deces_membre: "Décès d'un membre actif", deces_conjoint: "Décès du conjoint(e)",
  deces_enfant: "Décès d'un enfant", deces_parent: "Décès d'un parent",
  deces_beau_parent: "Décès d'un beau-parent", deces_mort_ne: "Mort-né",
  mariage: "Mariage", retraite: "Retraite", retraite_complementaire: "Retraite complémentaire",
  pret_sante: "Prêt santé", licenciement: "Licenciement",
};

const WORKFLOW = [
  { key: "en_attente", label: "Déposée" },
  { key: "commission_affaires_sociales", label: "Com. Aff. Sociales" },
  { key: "commission_prets", label: "Com. des Prêts" },
  { key: "tresorerie", label: "Trésorerie" },
  { key: "bureau", label: "Bureau" },
  { key: "approuvee", label: "Approuvée" },
];

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; class: string }> = {
    en_attente: { label: "En attente", class: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    commission_affaires_sociales: { label: "Com. Affaires Sociales", class: "bg-blue-100 text-blue-800 border-blue-200" },
    commission_prets: { label: "Com. des Prêts", class: "bg-purple-100 text-purple-800 border-purple-200" },
    tresorerie: { label: "Trésorerie", class: "bg-orange-100 text-orange-800 border-orange-200" },
    bureau: { label: "Bureau", class: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    approuvee: { label: "Approuvée", class: "bg-green-100 text-green-800 border-green-200" },
    rejetee: { label: "Rejetée", class: "bg-red-100 text-red-800 border-red-200" },
    payee: { label: "Payée", class: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  };
  const s = map[statut] ?? { label: statut, class: "bg-gray-100 text-gray-700 border-gray-200" };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.class}`}>{s.label}</span>;
}

export default function AssistanceDetail() {
  const [, params] = useRoute("/assistances/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [validating, setValidating] = useState<"approuver" | "rejeter" | null>(null);

  const { data: assistance, isLoading } = useGetAssistance(id, { query: { enabled: !!id, queryKey: getGetAssistanceQueryKey(id) } });
  const validerMutation = useValiderAssistance();

  const handlePdf = () => {
    const token = localStorage.getItem("mugetra_token");
    window.open(`/api/pdf/assistances/${id}?token=${token}`, "_blank");
  };

  const handleValider = (decision: "approuver" | "rejeter") => {
    setValidating(decision);
    validerMutation.mutate({ id, data: { decision, commentaire: "" } as any }, {
      onSuccess: () => {
        toast({ title: decision === "approuver" ? "✓ Demande approuvée" : "✗ Demande rejetée", description: "Le statut a été mis à jour." });
        queryClient.invalidateQueries({ queryKey: getGetAssistanceQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListAssistancesQueryKey({}) });
        setValidating(null);
      },
      onError: () => {
        toast({ title: "Erreur", description: "Impossible de valider. Vérifiez vos droits.", variant: "destructive" });
        setValidating(null);
      },
    });
  };

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="grid md:grid-cols-3 gap-6">
        <Skeleton className="h-60 md:col-span-2" /><Skeleton className="h-60" />
      </div>
    </div>
  );
  if (!assistance) return <div className="p-8 text-center text-muted-foreground">Assistance introuvable.</div>;

  const isFinal = assistance.statut === "approuvee" || assistance.statut === "rejetee" || assistance.statut === "payee";
  const currentIdx = WORKFLOW.findIndex(s => s.key === assistance.statut);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setLocation("/assistances")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {TYPE_LABELS[assistance.type] ?? assistance.type}
            </h1>
            <p className="text-muted-foreground text-sm">
              Réf. ASS-{String(id).padStart(4, "0")} — {formatDate(assistance.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatutBadge statut={assistance.statut} />
          <Button variant="outline" size="sm" onClick={handlePdf} className="gap-2">
            <FileDown className="h-4 w-4" /> Télécharger PDF
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-5">
          {/* Member info */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Demandeur</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {(assistance.membrePrenom?.[0] ?? "") + (assistance.membreNom?.[0] ?? "")}
                </div>
                <div>
                  <p className="font-semibold">{assistance.membrePrenom} {assistance.membreNom}</p>
                  <p className="text-xs text-muted-foreground font-mono">{assistance.membreMatricule}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assistance details */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Détails de la demande</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs mb-0.5">Type d'assistance</dt>
                  <dd className="font-medium">{TYPE_LABELS[assistance.type] ?? assistance.type}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs mb-0.5">Date de l'événement</dt>
                  <dd className="font-medium">{formatDate(assistance.dateEvenement)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs mb-0.5">Montant demandé</dt>
                  <dd className="font-semibold text-base">{formatFCFA(assistance.montantDemande)}</dd>
                </div>
                {assistance.montantApprouve != null && (
                  <div>
                    <dt className="text-muted-foreground text-xs mb-0.5">Montant approuvé</dt>
                    <dd className="font-semibold text-base text-green-600">{formatFCFA(assistance.montantApprouve)}</dd>
                  </div>
                )}
                {assistance.nomDefunt && (
                  <div>
                    <dt className="text-muted-foreground text-xs mb-0.5">Bénéficiaire</dt>
                    <dd className="font-medium">{assistance.nomDefunt}</dd>
                  </div>
                )}
                {assistance.lienParente && (
                  <div>
                    <dt className="text-muted-foreground text-xs mb-0.5">Lien de parenté</dt>
                    <dd className="font-medium capitalize">{assistance.lienParente.replace(/_/g, " ")}</dd>
                  </div>
                )}
              </dl>
              {assistance.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm leading-relaxed">{assistance.notes}</p>
                </div>
              )}
              {assistance.motifRejet && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-0.5">Motif de rejet</p>
                      <p className="text-sm text-red-700">{assistance.motifRejet}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validation history */}
          {(assistance as any).validations?.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Historique des validations</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(assistance as any).validations.map((v: any) => (
                    <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                      {v.decision === "approuver"
                        ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {v.decision === "approuver" ? "Approuvé" : "Rejeté"} — Étape: {v.etape?.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDate(v.dateValidation)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Par {v.validePar}</p>
                        {v.motif && <p className="text-xs italic text-muted-foreground mt-1">"{v.motif}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {!isFinal && (
            <div className="flex gap-3">
              <Button
                variant="destructive" className="gap-2"
                onClick={() => handleValider("rejeter")}
                disabled={!!validating}
              >
                <XCircle className="h-4 w-4" />
                {validating === "rejeter" ? "Traitement..." : "Rejeter"}
              </Button>
              <Button
                className="gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => handleValider("approuver")}
                disabled={!!validating}
              >
                <CheckCircle className="h-4 w-4" />
                {validating === "approuver" ? "Traitement..." : "Approuver"}
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Workflow stepper */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Avancement</CardTitle></CardHeader>
            <CardContent>
              {assistance.statut === "rejetee" ? (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-semibold text-red-700">Demande rejetée</span>
                </div>
              ) : assistance.statut === "payee" ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-700">Demande payée</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {WORKFLOW.map((step, i) => {
                    const done = i < currentIdx;
                    const active = i === currentIdx;
                    return (
                      <div key={step.key} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 ${
                          done ? "bg-primary border-primary" :
                          active ? "border-primary bg-primary/10" :
                          "border-muted-foreground/30 bg-transparent"
                        }`}>
                          {done && <CheckCircle className="h-3 w-3 text-white" />}
                          {active && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className={`text-xs ${active ? "font-bold text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick info */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Informations</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créée le</span>
                <span className="font-medium">{formatDate(assistance.createdAt)}</span>
              </div>
              {assistance.datePaiement && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date paiement</span>
                  <span className="font-medium">{formatDate(assistance.datePaiement)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
