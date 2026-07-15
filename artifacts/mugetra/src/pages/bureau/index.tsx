import { useState } from "react";
import { useApiQuery, useApiMutation, post } from "@/lib/api";
import { MembreSelect } from "@/components/membre-select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, formatFCFA } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const POSTES = [
  "vice_president", "secretaire_general", "secretaire_general_adjoint", "tresorier_general", "tresorier_adjoint",
  "secretaire_organisation", "secretaire_organisation_adjoint", "responsable_affaires_sociales",
  "responsable_prets", "responsable_sports", "representant_conseillers_1", "representant_conseillers_2",
];

export default function BureauPage() {
  const { toast } = useToast();
  const [mandatOpen, setMandatOpen] = useState(false);
  const [reunionOpen, setReunionOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [mForm, setMForm] = useState({ membreId: "", poste: "vice_president", dateDebut: "" });
  const [rForm, setRForm] = useState({ dateReunion: "", ordreDuJour: "", decaissementMontant: "" });
  const [dForm, setDForm] = useState({ titre: "", description: "" });

  const mandats = useApiQuery<any[]>(["/bureau/mandats"], "/bureau/mandats");
  const reunions = useApiQuery<any[]>(["/bureau/reunions"], "/bureau/reunions");
  const decisions = useApiQuery<any[]>(["/bureau/decisions"], "/bureau/decisions");

  const creerMandat = useApiMutation(() => post("/bureau/mandats", mForm), [["/bureau/mandats"]]);
  const terminerMandat = useApiMutation((id: number) => post(`/bureau/mandats/${id}/mettre-fin`), [["/bureau/mandats"]]);
  const creerReunion = useApiMutation(
    () => post("/bureau/reunions", { ...rForm, decaissementMontant: rForm.decaissementMontant ? Number(rForm.decaissementMontant) : undefined }),
    [["/bureau/reunions"]],
  );
  const creerDecision = useApiMutation(() => post("/bureau/decisions", dForm), [["/bureau/decisions"]]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bureau Exécutif</h1>
        <p className="text-muted-foreground">Mandats (3 ans), réunions mensuelles et décisions du Bureau Exécutif.</p>
      </div>

      <Tabs defaultValue="mandats">
        <TabsList>
          <TabsTrigger value="mandats">Mandats</TabsTrigger>
          <TabsTrigger value="reunions">Réunions</TabsTrigger>
          <TabsTrigger value="decisions">Décisions</TabsTrigger>
        </TabsList>

        <TabsContent value="mandats" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={mandatOpen} onOpenChange={setMandatOpen}>
              <DialogTrigger asChild><Button data-testid="button-nouveau-mandat">Nommer un membre</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouveau mandat</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Membre</Label><MembreSelect value={mForm.membreId} onChange={(v) => setMForm({ ...mForm, membreId: v })} /></div>
                  <div>
                    <Label>Poste</Label>
                    <select className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={mForm.poste} onChange={(e) => setMForm({ ...mForm, poste: e.target.value })}>
                      {POSTES.map((p) => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  <div><Label>Date de début</Label><Input type="date" value={mForm.dateDebut} onChange={(e) => setMForm({ ...mForm, dateDebut: e.target.value })} /></div>
                  <Button className="w-full" disabled={!mForm.membreId || !mForm.dateDebut} onClick={() => creerMandat.mutate(undefined as any, {
                    onSuccess: () => { setMandatOpen(false); toast({ title: "Mandat créé" }); },
                    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
                  })}>Nommer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Membre</TableHead><TableHead>Poste</TableHead><TableHead>Début</TableHead><TableHead>Fin</TableHead><TableHead>Statut</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {(mandats.data ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.membreNom} {m.membrePrenom}</TableCell>
                    <TableCell>{m.poste.replace(/_/g, " ")}</TableCell>
                    <TableCell>{formatDate(m.dateDebut)}</TableCell>
                    <TableCell>{m.dateFin ? formatDate(m.dateFin) : "-"}</TableCell>
                    <TableCell><Badge variant={m.actif ? "default" : "outline"}>{m.actif ? "Actif" : "Terminé"}</Badge></TableCell>
                    <TableCell>{m.actif && <Button size="sm" variant="outline" onClick={() => terminerMandat.mutate(m.id)}>Mettre fin</Button>}</TableCell>
                  </TableRow>
                ))}
                {!mandats.data?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucun mandat.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="reunions" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={reunionOpen} onOpenChange={setReunionOpen}>
              <DialogTrigger asChild><Button data-testid="button-nouvelle-reunion">Nouvelle réunion</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouvelle réunion du B.E</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Date</Label><Input type="date" value={rForm.dateReunion} onChange={(e) => setRForm({ ...rForm, dateReunion: e.target.value })} /></div>
                  <div><Label>Ordre du jour</Label><Textarea value={rForm.ordreDuJour} onChange={(e) => setRForm({ ...rForm, ordreDuJour: e.target.value })} /></div>
                  <div><Label>Décaissement (budget de fonctionnement, Art. 79 R.I.)</Label><Input type="number" value={rForm.decaissementMontant} onChange={(e) => setRForm({ ...rForm, decaissementMontant: e.target.value })} /></div>
                  <Button className="w-full" disabled={!rForm.dateReunion} onClick={() => creerReunion.mutate(undefined as any, { onSuccess: () => { setReunionOpen(false); toast({ title: "Réunion créée" }); } })}>Créer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Ordre du jour</TableHead><TableHead>Décaissement</TableHead></TableRow></TableHeader>
              <TableBody>
                {(reunions.data ?? []).map((r) => (
                  <TableRow key={r.id}><TableCell>{formatDate(r.dateReunion)}</TableCell><TableCell>{r.ordreDuJour}</TableCell><TableCell>{r.decaissementMontant ? formatFCFA(r.decaissementMontant) : "-"}</TableCell></TableRow>
                ))}
                {!reunions.data?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucune réunion.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
              <DialogTrigger asChild><Button data-testid="button-nouvelle-decision">Nouvelle décision</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouvelle décision</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Titre</Label><Input value={dForm.titre} onChange={(e) => setDForm({ ...dForm, titre: e.target.value })} /></div>
                  <div><Label>Description</Label><Textarea value={dForm.description} onChange={(e) => setDForm({ ...dForm, description: e.target.value })} /></div>
                  <Button className="w-full" disabled={!dForm.titre} onClick={() => creerDecision.mutate(undefined as any, { onSuccess: () => { setDecisionOpen(false); toast({ title: "Décision enregistrée" }); } })}>Enregistrer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-3">
            {(decisions.data ?? []).map((d) => (
              <Card key={d.id}><CardContent className="pt-6"><div className="font-medium">{d.titre}</div><p className="text-sm text-muted-foreground">{d.description}</p><div className="text-xs text-muted-foreground mt-1">{formatDate(d.createdAt)}</div></CardContent></Card>
            ))}
            {!decisions.data?.length && <div className="text-muted-foreground">Aucune décision enregistrée.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
