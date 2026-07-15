import { useState } from "react";
import { useApiQuery, useApiMutation, post, patch } from "@/lib/api";
import { MembreSelect } from "@/components/membre-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatFCFA, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const TYPES: Record<string, string> = {
  immobilier_logement: "Immobilier — Logement", immobilier_appartement: "Immobilier — Appartement",
  immobilier_terrain: "Immobilier — Terrain", bon_telephone: "Bon d'achat — Téléphone portable",
  bon_dady_shop: "Bon d'achat — Dady-Shop (SOCIAM)", bon_sicomex: "Bon d'achat — Sicomex",
  bon_librairie: "Bon d'achat — Librairie Yopougon Maroc", poulet_fin_annee: "Projet poulet de fin d'année", autre: "Autre",
};

export default function ProjetsPage() {
  const { toast } = useToast();
  const [openProjet, setOpenProjet] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [souscOpen, setSouscOpen] = useState(false);
  const [pForm, setPForm] = useState({ nom: "", type: "bon_telephone", description: "", dureeRemboursementMois: "10" });
  const [sForm, setSForm] = useState({ membreId: "", quantite: "1", coutTotal: "", fraisDossier: "", apportInitial: "", nombreMensualites: "10" });

  const list = useApiQuery<any[]>(["/projets"], "/projets");
  const detail = useApiQuery<any>(["/projets", detailId], `/projets/${detailId}`, { enabled: detailId != null });

  const creerProjet = useApiMutation(() => post("/projets", { ...pForm, dureeRemboursementMois: Number(pForm.dureeRemboursementMois) }), [["/projets"]]);
  const creerSousc = useApiMutation(
    () => post(`/projets/${detailId}/souscriptions`, {
      membreId: Number(sForm.membreId), quantite: Number(sForm.quantite),
      coutTotal: Number(sForm.coutTotal || 0), fraisDossier: Number(sForm.fraisDossier || 0),
      apportInitial: Number(sForm.apportInitial || 0), nombreMensualites: Number(sForm.nombreMensualites),
    }),
    [["/projets", detailId]],
  );
  const payerEcheance = useApiMutation((paiementId: number) => patch(`/projets/paiements/${paiementId}`, {}), [["/projets", detailId]]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projets</h1>
          <p className="text-muted-foreground">Projets immobiliers et bons d'achat divers, avec souscriptions et prélèvements échelonnés.</p>
        </div>
        <Dialog open={openProjet} onOpenChange={setOpenProjet}>
          <DialogTrigger asChild><Button data-testid="button-nouveau-projet">Nouveau projet</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau projet</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nom</Label><Input value={pForm.nom} onChange={(e) => setPForm({ ...pForm, nom: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={pForm.type} onValueChange={(v) => setPForm({ ...pForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Input value={pForm.description} onChange={(e) => setPForm({ ...pForm, description: e.target.value })} /></div>
              <div><Label>Durée de remboursement par défaut (mois)</Label><Input type="number" value={pForm.dureeRemboursementMois} onChange={(e) => setPForm({ ...pForm, dureeRemboursementMois: e.target.value })} /></div>
              <Button className="w-full" disabled={!pForm.nom} onClick={() => creerProjet.mutate(undefined as any, { onSuccess: () => { setOpenProjet(false); toast({ title: "Projet créé" }); } })}>Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(list.data ?? []).map((p) => (
          <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailId(p.id)} data-testid={`card-projet-${p.id}`}>
            <CardHeader><CardTitle className="text-base">{p.nom}</CardTitle></CardHeader>
            <CardContent>
              <Badge variant="outline">{TYPES[p.type] ?? p.type}</Badge>
              <p className="text-sm text-muted-foreground mt-2">{p.description}</p>
            </CardContent>
          </Card>
        ))}
        {!list.data?.length && <div className="text-muted-foreground">Aucun projet enregistré.</div>}
      </div>

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{detail.data?.nom}</DialogTitle></DialogHeader>
          {detail.data && (
            <Tabs defaultValue="souscriptions">
              <TabsList>
                <TabsTrigger value="souscriptions">Souscriptions</TabsTrigger>
                <TabsTrigger value="nouvelle">Nouvelle souscription</TabsTrigger>
              </TabsList>
              <TabsContent value="souscriptions" className="space-y-3">
                <Table>
                  <TableHeader><TableRow><TableHead>Membre</TableHead><TableHead>Mensualité</TableHead><TableHead>Nb mensualités</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(detail.data.souscriptions ?? []).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.membreNom} {s.membrePrenom} ({s.matricule})</TableCell>
                        <TableCell>{formatFCFA(s.montantMensuel)}</TableCell>
                        <TableCell>{s.nombreMensualites}</TableCell>
                        <TableCell><Badge variant="outline">{s.statut}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {!detail.data.souscriptions?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucune souscription.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="nouvelle" className="space-y-3">
                <div><Label>Membre</Label><MembreSelect value={sForm.membreId} onChange={(v) => setSForm({ ...sForm, membreId: v })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantité</Label><Input type="number" value={sForm.quantite} onChange={(e) => setSForm({ ...sForm, quantite: e.target.value })} /></div>
                  <div><Label>Nb mensualités</Label><Input type="number" value={sForm.nombreMensualites} onChange={(e) => setSForm({ ...sForm, nombreMensualites: e.target.value })} /></div>
                  <div><Label>Coût total</Label><Input type="number" value={sForm.coutTotal} onChange={(e) => setSForm({ ...sForm, coutTotal: e.target.value })} /></div>
                  <div><Label>Frais de dossier</Label><Input type="number" value={sForm.fraisDossier} onChange={(e) => setSForm({ ...sForm, fraisDossier: e.target.value })} /></div>
                  <div><Label>Apport initial</Label><Input type="number" value={sForm.apportInitial} onChange={(e) => setSForm({ ...sForm, apportInitial: e.target.value })} /></div>
                </div>
                <Button className="w-full" disabled={!sForm.membreId} onClick={() => creerSousc.mutate(undefined as any, { onSuccess: () => toast({ title: "Souscription enregistrée" }) })}>
                  Enregistrer la souscription
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
