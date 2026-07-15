import { useState } from "react";
import { useApiQuery, useApiMutation, post } from "@/lib/api";
import { MembreSelect } from "@/components/membre-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatFCFA, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const TYPES: Record<string, string> = {
  demission_mutuelle: "Démission de la mutuelle (reste à la NPG.CI)",
  demission_npg: "Démission de la NPG.CI (par ricochet)",
  licenciement: "Licenciement",
  radiation: "Radiation",
};

export default function DepartsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ membreId: "", type: "demission_mutuelle", dateDepart: "", motif: "" });
  const [simulation, setSimulation] = useState<any>(null);

  const list = useApiQuery<any[]>(["/departs"], "/departs");

  const simuler = useApiMutation(async () => {
    if (!form.membreId) return null;
    const data = await fetch(`/api/departs/simuler/${form.membreId}?type=${form.type}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("mugetra_token")}` },
    }).then((r) => r.json());
    setSimulation(data);
    return data;
  }, []);

  const creer = useApiMutation(
    () => post("/departs", { membreId: Number(form.membreId), type: form.type, dateDepart: form.dateDepart, motif: form.motif }),
    [["/departs"]],
  );
  const valider = useApiMutation((id: number) => post(`/departs/${id}/valider`), [["/departs"]]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Départs</h1>
          <p className="text-muted-foreground">Démissions, licenciements et radiations — indemnités calculées automatiquement (Art. 97-99 R.I.).</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSimulation(null); }}>
          <DialogTrigger asChild><Button data-testid="button-nouveau-depart">Nouveau dossier</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau dossier de départ</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Membre</Label>
                <MembreSelect value={form.membreId} onChange={(v) => { setForm({ ...form, membreId: v }); setSimulation(null); }} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => { setForm({ ...form, type: v }); setSimulation(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de départ</Label>
                <Input type="date" value={form.dateDepart} onChange={(e) => setForm({ ...form, dateDepart: e.target.value })} />
              </div>
              <div>
                <Label>Motif</Label>
                <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} />
              </div>

              <Button variant="outline" className="w-full" disabled={!form.membreId} onClick={() => simuler.mutate(undefined as any)}>
                Simuler l'indemnité
              </Button>

              {simulation && (
                <Alert>
                  <AlertTitle>Indemnité estimée : {formatFCFA(simulation.montantIndemnite)} ({simulation.fraction})</AlertTitle>
                  <AlertDescription>{simulation.motif}</AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full"
                disabled={!form.membreId || !form.dateDepart || creer.isPending}
                onClick={() => creer.mutate(undefined as any, {
                  onSuccess: () => { setOpen(false); setForm({ membreId: "", type: "demission_mutuelle", dateDepart: "", motif: "" }); setSimulation(null); toast({ title: "Dossier de départ enregistré" }); },
                  onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
                })}
              >
                Enregistrer le dossier
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead>
                <TableHead>Indemnité</TableHead><TableHead>Statut</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((d) => (
                <TableRow key={d.id} data-testid={`row-depart-${d.id}`}>
                  <TableCell>{d.membreNom} {d.membrePrenom} ({d.matricule})</TableCell>
                  <TableCell>{TYPES[d.type] ?? d.type}</TableCell>
                  <TableCell>{formatDate(d.dateDepart)}</TableCell>
                  <TableCell>
                    {formatFCFA(d.montantIndemnite)} <span className="text-xs text-muted-foreground">({d.fraction})</span>
                    {d.bloqueParDelai && <Badge variant="destructive" className="ml-2">Bloqué (5 ans)</Badge>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{d.statut}</Badge></TableCell>
                  <TableCell>
                    {d.statut === "en_attente" && !d.bloqueParDelai && (
                      <Button size="sm" onClick={() => valider.mutate(d.id)}>Valider</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!list.data?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucun dossier de départ.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
