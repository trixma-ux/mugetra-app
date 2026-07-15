import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetMembre, getGetMembreQueryKey, useGetCotisationsResume, getGetCotisationsResumeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Phone, Mail, Calendar, Briefcase, Info, FileText, Download, UserCheck, Copy, CheckCircle, RefreshCw, UserX, ShieldCheck, ShieldOff, Eye, EyeOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFCFA, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AccesStatus = { actif: boolean; identifiant: string | null; email: string | null; createdAt: string | null } | null;
type CredInfo = { identifiant: string; motDePasse: string; action: "creation" | "reset" };

export default function MembreDetail() {
  const [, params] = useRoute("/membres/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  const { toast } = useToast();

  const [acces, setAcces] = useState<AccesStatus>(null);
  const [accesLoading, setAccesLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"autoriser" | "reset" | "resilier" | null>(null);
  const [credInfo, setCredInfo] = useState<CredInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmResilier, setConfirmResilier] = useState(false);

  const { data: membre, isLoading } = useGetMembre(id, { query: { enabled: !!id, queryKey: getGetMembreQueryKey(id) } });
  const { data: releve, isLoading: releveLoading } = useGetCotisationsResume(id, { query: { enabled: !!id, queryKey: getGetCotisationsResumeQueryKey(id) } });

  const token = () => localStorage.getItem("mugetra_token");

  const fetchAcces = async () => {
    if (!id) return;
    setAccesLoading(true);
    try {
      const res = await fetch(`/api/membres/${id}/acces`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setAcces(await res.json());
    } catch {}
    finally { setAccesLoading(false); }
  };

  useEffect(() => { fetchAcces(); }, [id]);

  const handleFicheAdhesion = () => window.open(`/api/pdf/membres/${id}/fiche-adhesion?token=${token()}`, "_blank");
  const handleReleve = () => window.open(`/api/pdf/cotisations/${id}?token=${token()}`, "_blank");

  const handleAutoriserAcces = async () => {
    setActionLoading("autoriser");
    try {
      const res = await fetch(`/api/membres/${id}/autoriser-acces`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erreur", description: data.error ?? "Impossible de créer le compte.", variant: "destructive" });
        return;
      }
      setCredInfo({ identifiant: data.identifiant, motDePasse: data.motDePasse, action: "creation" });
      setShowPassword(true);
      toast({ title: "✓ Compte créé", description: `Identifiant : ${data.identifiant}` });
      await fetchAcces();
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally { setActionLoading(null); }
  };

  const handleResetAcces = async () => {
    setActionLoading("reset");
    try {
      const res = await fetch(`/api/membres/${id}/reset-acces`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erreur", description: data.error ?? "Impossible de réinitialiser.", variant: "destructive" });
        return;
      }
      setCredInfo({ identifiant: data.identifiant, motDePasse: data.motDePasse, action: "reset" });
      setShowPassword(true);
      setCopied(false);
      toast({ title: "✓ Mot de passe réinitialisé", description: `Nouveau mot de passe généré pour ${data.identifiant}` });
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally { setActionLoading(null); }
  };

  const handleResilierAcces = async () => {
    setConfirmResilier(false);
    setActionLoading("resilier");
    try {
      const res = await fetch(`/api/membres/${id}/resilier-acces`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Erreur", description: data.error ?? "Impossible de résilier.", variant: "destructive" });
        return;
      }
      setCredInfo(null);
      toast({ title: "✓ Accès portail résilié", description: "Le compte mutualiste a été supprimé." });
      await fetchAcces();
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally { setActionLoading(null); }
  };

  const copyCredentials = () => {
    if (!credInfo) return;
    navigator.clipboard.writeText(`Identifiant : ${credInfo.identifiant}\nMot de passe : ${credInfo.motDePasse}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (!membre) return <div>Membre introuvable.</div>;

  const hasAccount = acces?.actif ?? false;

  return (
    <div className="space-y-6">
      {/* Confirmation résilier */}
      <AlertDialog open={confirmResilier} onOpenChange={setConfirmResilier}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Résilier l'accès portail ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte portail de <strong>{membre.prenom} {membre.nom}</strong> ({membre.matricule}) sera supprimé définitivement.
              Le membre ne pourra plus se connecter au portail mutualiste. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResilierAcces}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Oui, résilier l'accès
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/membres")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{membre.prenom} {membre.nom}</h1>
            <p className="text-muted-foreground font-mono">{membre.matricule}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleFicheAdhesion} className="gap-2">
            <FileText className="h-4 w-4" /> Fiche d'adhésion
          </Button>
          <Button variant="outline" size="sm" onClick={handleReleve} className="gap-2">
            <Download className="h-4 w-4" /> Relevé cotisations
          </Button>
        </div>
      </div>

      {/* Bloc accès portail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            Accès Portail Mutualiste
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accesLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center flex-wrap gap-4">
                {/* Badge statut */}
                {hasAccount ? (
                  <Badge className="gap-1.5 bg-green-600 hover:bg-green-600 text-white px-3 py-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Accès actif
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5 text-muted-foreground px-3 py-1">
                    <ShieldOff className="h-3.5 w-3.5" /> Aucun accès
                  </Badge>
                )}

                {hasAccount && acces?.identifiant && (
                  <span className="text-sm text-muted-foreground">
                    Identifiant : <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">{acces.identifiant}</code>
                  </span>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 ml-auto">
                  {!hasAccount ? (
                    <Button
                      size="sm"
                      className="gap-2"
                      style={{ background: "#1a5c3a" }}
                      onClick={handleAutoriserAcces}
                      disabled={actionLoading === "autoriser"}
                    >
                      <UserCheck className="h-4 w-4" />
                      {actionLoading === "autoriser" ? "Création..." : "Autoriser l'accès portail"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={handleResetAcces}
                        disabled={!!actionLoading}
                      >
                        <RefreshCw className={`h-4 w-4 ${actionLoading === "reset" ? "animate-spin" : ""}`} />
                        {actionLoading === "reset" ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        onClick={() => setConfirmResilier(true)}
                        disabled={!!actionLoading}
                      >
                        <UserX className="h-4 w-4" />
                        Résilier l'accès
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Affichage des identifiants après action */}
              {credInfo && (
                <div className={`rounded-lg border p-4 flex items-start justify-between gap-4 ${credInfo.action === "creation" ? "border-green-200 bg-green-50 dark:bg-green-950/30" : "border-blue-200 bg-blue-50 dark:bg-blue-950/30"}`}>
                  <div className="flex items-start gap-3">
                    {credInfo.action === "creation" ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    )}
                    <div className="space-y-1">
                      <p className={`font-semibold text-sm ${credInfo.action === "creation" ? "text-green-800 dark:text-green-200" : "text-blue-800 dark:text-blue-200"}`}>
                        {credInfo.action === "creation" ? "Compte mutualiste activé" : "Mot de passe réinitialisé"}
                      </p>
                      <p className="text-sm">
                        <strong>Identifiant :</strong>{" "}
                        <code className={`px-1.5 py-0.5 rounded font-mono ${credInfo.action === "creation" ? "bg-green-100 dark:bg-green-900" : "bg-blue-100 dark:bg-blue-900"}`}>
                          {credInfo.identifiant}
                        </code>
                      </p>
                      <p className="text-sm flex items-center gap-2">
                        <strong>Mot de passe :</strong>{" "}
                        <code className={`px-1.5 py-0.5 rounded font-mono tracking-widest ${credInfo.action === "creation" ? "bg-green-100 dark:bg-green-900" : "bg-blue-100 dark:bg-blue-900"}`}>
                          {showPassword ? credInfo.motDePasse : "••••••••"}
                        </code>
                        <button
                          onClick={() => setShowPassword(v => !v)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={showPassword ? "Masquer" : "Afficher"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </p>
                      <p className="text-xs text-muted-foreground">Transmettez ces identifiants au membre. Ils peuvent se connecter avec leur matricule.</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyCredentials}
                    className={`shrink-0 gap-1.5 ${credInfo.action === "creation" ? "border-green-300 text-green-800 hover:bg-green-100" : "border-blue-300 text-blue-800 hover:bg-blue-100"}`}
                  >
                    {copied ? <><CheckCircle className="h-3.5 w-3.5" /> Copié</> : <><Copy className="h-3.5 w-3.5" /> Copier</>}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profil + Cotisations */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Profil</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{membre.telephone || "—"}</span></div>
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{membre.email || "—"}</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground shrink-0" /><span>Adhésion : {formatDate(membre.dateAdhesion)}</span></div>
              <div className="flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground shrink-0" /><span>Statut : <Badge variant="outline">{membre.statut}</Badge></span></div>
              <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground shrink-0" /><span>Poste : {membre.poste || "—"}</span></div>
              <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground shrink-0" /><span>Type : {membre.typeAdhesion?.replace(/_/g, " ")}</span></div>
            </div>
            {membre.departement && (
              <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                Département : <span className="text-foreground font-medium">{membre.departement}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Synthèse Cotisations</CardTitle></CardHeader>
          <CardContent>
            {releveLoading ? <Skeleton className="h-32 w-full" /> : (
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Total payé</span>
                  <span className="font-bold text-green-600">{formatFCFA(releve?.totalPaye)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Arriérés</span>
                  <span className={`font-bold ${(releve?.arrieres ?? 0) > 0 ? "text-destructive" : "text-green-600"}`}>{formatFCFA(releve?.arrieres)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mois réglés</span>
                  <span className="font-bold">{releve?.moisPaies}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
