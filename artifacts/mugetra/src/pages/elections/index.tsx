import { useState } from "react";
import { useApiQuery, useApiMutation, post } from "@/lib/api";
import { MembreSelect } from "@/components/membre-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function ElectionsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [candMembreId, setCandMembreId] = useState("");
  const [form, setForm] = useState({ poste: "", dateOuvertureCandidatures: "", dateClotureCandidatures: "", dateScrutin: "" });

  const list = useApiQuery<any[]>(["/elections"], "/elections");
  const detail = useApiQuery<any>(["/elections", detailId], `/elections/${detailId}`, { enabled: detailId != null });

  const creer = useApiMutation(() => post("/elections", form), [["/elections"]]);
  const candidater = useApiMutation(
    () => post(`/elections/${detailId}/candidatures`, { membreId: Number(candMembreId) }),
    [["/elections", detailId]],
  );
  const validerCandidature = useApiMutation(
    (vars: { id: number; decision: "approuver" | "rejeter" }) => post(`/elections/candidatures/${vars.id}/valider`, { decision: vars.decision }),
    [["/elections", detailId]],
  );
  const voter = useApiMutation(
    (candidatureId: number) => post(`/elections/${detailId}/voter`, { candidatureId }),
    [["/elections", detailId]],
  );
  const depouiller = useApiMutation(() => post(`/elections/${detailId}/depouiller`), [["/elections", detailId], ["/elections"]]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Élections</h1>
          <p className="text-muted-foreground">Candidatures (contrôle automatique 5 ans NPG.CI / 2 ans mutuelle), vote et dépouillement.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="button-nouvelle-election">Ouvrir une élection</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle élection</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Poste à pourvoir</Label><Input value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} placeholder="Président, Commissaire aux comptes..." /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Ouverture</Label><Input type="date" value={form.dateOuvertureCandidatures} onChange={(e) => setForm({ ...form, dateOuvertureCandidatures: e.target.value })} /></div>
                <div><Label>Clôture</Label><Input type="date" value={form.dateClotureCandidatures} onChange={(e) => setForm({ ...form, dateClotureCandidatures: e.target.value })} /></div>
                <div><Label>Scrutin</Label><Input type="date" value={form.dateScrutin} onChange={(e) => setForm({ ...form, dateScrutin: e.target.value })} /></div>
              </div>
              <Button className="w-full" disabled={!form.poste} onClick={() => creer.mutate(undefined as any, { onSuccess: () => { setOpen(false); toast({ title: "Élection créée" }); } })}>Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead>Poste</TableHead><TableHead>Scrutin</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
            <TableBody>
              {(list.data ?? []).map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setDetailId(e.id)} data-testid={`row-election-${e.id}`}>
                  <TableCell>{e.poste}</TableCell>
                  <TableCell>{e.dateScrutin}</TableCell>
                  <TableCell><Badge variant="outline">{e.statut}</Badge></TableCell>
                </TableRow>
              ))}
              {!list.data?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucune élection.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Élection — {detail.data?.poste}</DialogTitle></DialogHeader>
          {detail.data && (
            <div className="space-y-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1"><Label>Ajouter un candidat</Label><MembreSelect value={candMembreId} onChange={setCandMembreId} /></div>
                <Button disabled={!candMembreId} onClick={() => candidater.mutate(undefined as any, {
                  onSuccess: () => { setCandMembreId(""); toast({ title: "Candidature enregistrée" }); },
                  onError: (e: any) => toast({ title: "Candidature refusée", description: e.message, variant: "destructive" }),
                })}>Déposer</Button>
              </div>

              <Table>
                <TableHeader><TableRow><TableHead>Candidat</TableHead><TableHead>Éligibilité</TableHead><TableHead>Statut</TableHead><TableHead>Voix</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {(detail.data.candidatures ?? []).map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.membreNom} {c.membrePrenom} ({c.matricule})</TableCell>
                      <TableCell>
                        <Badge variant={c.ancienneteNpgOk && c.ancienneteMutuelleOk ? "default" : "destructive"}>
                          {c.ancienneteNpgOk && c.ancienneteMutuelleOk ? "Éligible" : "Non éligible"}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.statut}{c.elu && <Badge className="ml-2">Élu(e)</Badge>}</TableCell>
                      <TableCell>{c.nombreVoix}</TableCell>
                      <TableCell className="flex gap-2">
                        {c.statut === "soumise" && (
                          <>
                            <Button size="sm" onClick={() => validerCandidature.mutate({ id: c.id, decision: "approuver" })}>Valider</Button>
                            <Button size="sm" variant="destructive" onClick={() => validerCandidature.mutate({ id: c.id, decision: "rejeter" })}>Rejeter</Button>
                          </>
                        )}
                        {c.statut === "validee" && detail.data.statut !== "depouille" && (
                          <Button size="sm" variant="outline" onClick={() => voter.mutate(c.id)}>Voter</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!detail.data.candidatures?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Aucune candidature.</TableCell></TableRow>}
                </TableBody>
              </Table>

              {detail.data.statut !== "depouille" && (
                <Button className="w-full" onClick={() => depouiller.mutate(undefined as any, { onSuccess: () => toast({ title: "Dépouillement effectué" }) })}>
                  Lancer le dépouillement
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
