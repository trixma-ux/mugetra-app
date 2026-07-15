import { useState } from "react";
import { useApiQuery, useApiMutation, post, patch } from "@/lib/api";
import { MembreSelect } from "@/components/membre-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatFCFA, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const STATUT_LABELS: Record<string, string> = {
  commission_prets: "Commission Prêts", bureau: "Bureau Exécutif", direction_generale: "Direction Générale",
  accorde: "Accordé", rejete: "Rejeté", solde: "Soldé", en_retard: "En retard",
};

export default function PretsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState({ membreId: "", motif: "", montantDemande: "", dureeMois: "20" });

  const list = useApiQuery<any[]>(["/prets"], "/prets");
  const detail = useApiQuery<any>(["/prets", detailId], `/prets/${detailId}`, { enabled: detailId != null });

  const creer = useApiMutation(
    () => post("/prets", { membreId: Number(form.membreId), motif: form.motif, montantDemande: Number(form.montantDemande), dureeMois: Number(form.dureeMois) }),
    [["/prets"]],
  );
  const valider = useApiMutation(
    (vars: { id: number; decision: "approuver" | "rejeter" }) => post(`/prets/${vars.id}/valider`, { decision: vars.decision }),
    [["/prets"], ["/prets", detailId]],
  );
  const marquerPaye = useApiMutation(
    (vars: { pretId: number; echeanceId: number }) => patch(`/prets/${vars.pretId}/echeances/${vars.echeanceId}`, { paye: true }),
    [["/prets", detailId]],
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prêts</h1>
          <p className="text-muted-foreground">Prêts sans intérêt aux membres actifs — plafond 500 000 FCFA, remboursable en 20 mois maximum avec différé de 3 mois (Art. 57 R.I.).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="button-nouveau-pret">Nouvelle demande</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle demande de prêt</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Membre</Label>
                <MembreSelect value={form.membreId} onChange={(v) => setForm({ ...form, membreId: v })} />
              </div>
              <div>
                <Label>Motif</Label>
                <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Montant demandé (max 500 000 F)</Label>
                  <Input type="number" value={form.montantDemande} onChange={(e) => setForm({ ...form, montantDemande: e.target.value })} />
                </div>
                <div>
                  <Label>Durée (mois, max 20)</Label>
                  <Input type="number" value={form.dureeMois} onChange={(e) => setForm({ ...form, dureeMois: e.target.value })} />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!form.membreId || !form.montantDemande || creer.isPending}
                onClick={() => creer.mutate(undefined as any, {
                  onSuccess: () => { setOpen(false); setForm({ membreId: "", motif: "", montantDemande: "", dureeMois: "20" }); toast({ title: "Demande de prêt enregistrée" }); },
                  onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
                })}
              >
                Soumettre
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Liste des prêts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead><TableHead>Montant demandé</TableHead>
                <TableHead>Montant accordé</TableHead><TableHead>Statut</TableHead><TableHead>Date</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetailId(p.id)} data-testid={`row-pret-${p.id}`}>
                  <TableCell>{p.membreNom} {p.membrePrenom}</TableCell>
                  <TableCell>{formatFCFA(p.montantDemande)}</TableCell>
                  <TableCell>{p.montantAccorde ? formatFCFA(p.montantAccorde) : "-"}</TableCell>
                  <TableCell><Badge variant="outline">{STATUT_LABELS[p.statut] ?? p.statut}</Badge></TableCell>
                  <TableCell>{formatDate(p.createdAt)}</TableCell>
                  <TableCell>
                    {["commission_prets", "bureau", "direction_generale"].includes(p.statut) && (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" onClick={() => valider.mutate({ id: p.id, decision: "approuver" })}>Approuver</Button>
                        <Button size="sm" variant="destructive" onClick={() => valider.mutate({ id: p.id, decision: "rejeter" })}>Rejeter</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!list.data?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucun prêt enregistré.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Échéancier de remboursement</DialogTitle></DialogHeader>
          {detail.data && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {detail.data.membreNom} {detail.data.membrePrenom} — {formatFCFA(detail.data.montantAccorde ?? detail.data.montantDemande)}
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Échéance</TableHead><TableHead>Date</TableHead><TableHead>Montant</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.data.echeances ?? []).map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.echeance}</TableCell>
                      <TableCell>{formatDate(e.dateEcheance)}</TableCell>
                      <TableCell>{formatFCFA(e.montant)}</TableCell>
                      <TableCell>
                        {e.paye ? <Badge>Payé</Badge> : (
                          <Button size="sm" variant="outline" onClick={() => marquerPaye.mutate({ pretId: detail.data.id, echeanceId: e.id })}>Marquer payé</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!detail.data.echeances?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">L'échéancier sera généré après décaissement du prêt.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
