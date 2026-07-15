import { useState } from "react";
import { useApiQuery, useApiMutation, post } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function AssembleesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState({ type: "ordinaire", titre: "", ordreDuJour: "", dateConvocation: "", dateTenue: "", lieu: "" });
  const [resForm, setResForm] = useState({ titre: "", description: "", modeVote: "main_levee" });

  const list = useApiQuery<any[]>(["/assemblees"], "/assemblees");
  const detail = useApiQuery<any>(["/assemblees", detailId], `/assemblees/${detailId}`, { enabled: detailId != null });

  const creer = useApiMutation(() => post("/assemblees", form), [["/assemblees"]]);
  const creerResolution = useApiMutation(() => post(`/assemblees/${detailId}/resolutions`, resForm), [["/assemblees", detailId]]);
  const voter = useApiMutation((vars: { id: number; pour: number; contre: number; abstention: number }) =>
    post(`/assemblees/resolutions/${vars.id}/voter`, vars), [["/assemblees", detailId]]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assemblées Générales</h1>
          <p className="text-muted-foreground">AG ordinaires et extraordinaires — convocations, émargement, quorum, résolutions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="button-nouvelle-ag">Convoquer une AG</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle Assemblée Générale</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordinaire">Ordinaire (quorum 50%)</SelectItem>
                    <SelectItem value="extraordinaire">Extraordinaire (quorum 2/3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Titre</Label><Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></div>
              <div><Label>Ordre du jour</Label><Textarea value={form.ordreDuJour} onChange={(e) => setForm({ ...form, ordreDuJour: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date de convocation</Label><Input type="date" value={form.dateConvocation} onChange={(e) => setForm({ ...form, dateConvocation: e.target.value })} /></div>
                <div><Label>Date de tenue</Label><Input type="date" value={form.dateTenue} onChange={(e) => setForm({ ...form, dateTenue: e.target.value })} /></div>
              </div>
              <div><Label>Lieu</Label><Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} /></div>
              <Button className="w-full" disabled={!form.titre} onClick={() => creer.mutate(undefined as any, { onSuccess: () => { setOpen(false); toast({ title: "AG créée" }); } })}>
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Type</TableHead><TableHead>Date de tenue</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
            <TableBody>
              {(list.data ?? []).map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => setDetailId(a.id)} data-testid={`row-ag-${a.id}`}>
                  <TableCell>{a.titre}</TableCell>
                  <TableCell><Badge variant="outline">{a.type}</Badge></TableCell>
                  <TableCell>{formatDate(a.dateTenue)}</TableCell>
                  <TableCell>{a.statut}</TableCell>
                </TableRow>
              ))}
              {!list.data?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucune assemblée.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{detail.data?.titre}</DialogTitle></DialogHeader>
          {detail.data && (
            <Tabs defaultValue="resolutions">
              <TabsList>
                <TabsTrigger value="resolutions">Résolutions</TabsTrigger>
                <TabsTrigger value="nouvelle">Nouvelle résolution</TabsTrigger>
                <TabsTrigger value="quorum">Quorum</TabsTrigger>
              </TabsList>
              <TabsContent value="resolutions" className="space-y-2">
                {(detail.data.resolutions ?? []).map((r: any) => (
                  <Card key={r.id}>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{r.titre}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">{r.description}</p>
                      <div className="text-sm">Pour: {r.pour ?? 0} · Contre: {r.contre ?? 0} · Abstention: {r.abstention ?? 0}</div>
                      {r.adoptee != null && <Badge variant={r.adoptee ? "default" : "destructive"}>{r.adoptee ? "Adoptée" : "Rejetée"}</Badge>}
                      {r.adoptee == null && (
                        <VoteForm onSubmit={(pour, contre, abstention) => voter.mutate({ id: r.id, pour, contre, abstention })} />
                      )}
                    </CardContent>
                  </Card>
                ))}
                {!detail.data.resolutions?.length && <div className="text-muted-foreground text-sm">Aucune résolution pour cette AG.</div>}
              </TabsContent>
              <TabsContent value="nouvelle" className="space-y-3">
                <div><Label>Titre</Label><Input value={resForm.titre} onChange={(e) => setResForm({ ...resForm, titre: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={resForm.description} onChange={(e) => setResForm({ ...resForm, description: e.target.value })} /></div>
                <div>
                  <Label>Mode de vote</Label>
                  <Select value={resForm.modeVote} onValueChange={(v) => setResForm({ ...resForm, modeVote: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="main_levee">Main levée</SelectItem><SelectItem value="bulletin_secret">Bulletin secret</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button className="w-full" disabled={!resForm.titre} onClick={() => creerResolution.mutate(undefined as any, { onSuccess: () => toast({ title: "Résolution ajoutée" }) })}>Ajouter</Button>
              </TabsContent>
              <TabsContent value="quorum" className="space-y-2 text-sm">
                <div>Membres actifs présents : {detail.data.presentsCount}</div>
                <div>Quorum requis : {detail.data.quorumRequisPct}%</div>
                <div>Quorum atteint : {detail.data.quorumAtteint == null ? "Non calculé (clôturer l'AG)" : (detail.data.quorumAtteint ? "Oui ✅" : "Non ❌")}</div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VoteForm({ onSubmit }: { onSubmit: (pour: number, contre: number, abstention: number) => void }) {
  const [pour, setPour] = useState("0");
  const [contre, setContre] = useState("0");
  const [abstention, setAbstention] = useState("0");
  return (
    <div className="flex items-end gap-2">
      <div><Label className="text-xs">Pour</Label><Input className="w-20" type="number" value={pour} onChange={(e) => setPour(e.target.value)} /></div>
      <div><Label className="text-xs">Contre</Label><Input className="w-20" type="number" value={contre} onChange={(e) => setContre(e.target.value)} /></div>
      <div><Label className="text-xs">Abstention</Label><Input className="w-20" type="number" value={abstention} onChange={(e) => setAbstention(e.target.value)} /></div>
      <Button size="sm" onClick={() => onSubmit(Number(pour), Number(contre), Number(abstention))}>Enregistrer le vote</Button>
    </div>
  );
}
