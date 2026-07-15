import { useState } from "react";
import { useApiQuery, useApiMutation, post } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatFCFA, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function CommissariatPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ dateControle: "", perimetre: "", observations: "" });
  const annee = new Date().getFullYear();

  const controles = useApiQuery<any[]>(["/commissariat/controles"], "/commissariat/controles");
  const synthese = useApiQuery<any>(["/commissariat/synthese", annee], `/commissariat/synthese?annee=${annee}`);

  const creer = useApiMutation(() => post("/commissariat/controles", form), [["/commissariat/controles"], ["/commissariat/synthese", annee]]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commissariat aux comptes</h1>
          <p className="text-muted-foreground">Contrôle de la gestion technique, administrative et financière (min. 2 contrôles/an, Art. 33.8 R.I.).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="button-nouveau-controle">Nouveau contrôle</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau contrôle</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Date du contrôle</Label><Input type="date" value={form.dateControle} onChange={(e) => setForm({ ...form, dateControle: e.target.value })} /></div>
              <div><Label>Périmètre contrôlé</Label><Input value={form.perimetre} onChange={(e) => setForm({ ...form, perimetre: e.target.value })} placeholder="Cotisations, assistances, prêts..." /></div>
              <div><Label>Observations</Label><Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></div>
              <Button className="w-full" disabled={!form.dateControle} onClick={() => creer.mutate(undefined as any, { onSuccess: () => { setOpen(false); toast({ title: "Contrôle enregistré" }); } })}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {synthese.data && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Trésorerie {annee}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatFCFA(synthese.data.tresorerie.solde)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Cotisations perçues</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatFCFA(synthese.data.cotisations.total)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Assistances versées</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatFCFA(synthese.data.assistances.montantVerse)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Prêts en cours</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatFCFA(synthese.data.prets.montantEncours)}</CardContent></Card>
        </div>
      )}

      {synthese.data && !synthese.data.conformeFrequenceControle && (
        <Alert variant="destructive">
          <AlertTitle>Fréquence de contrôle non conforme</AlertTitle>
          <AlertDescription>Seulement {synthese.data.controlesEffectuesCetteAnnee} contrôle(s) enregistré(s) pour {annee}. L'Article 33.8 du règlement intérieur en exige au moins deux par an.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Historique des contrôles</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Périmètre</TableHead><TableHead>Observations</TableHead></TableRow></TableHeader>
            <TableBody>
              {(controles.data ?? []).map((c) => (
                <TableRow key={c.id}><TableCell>{formatDate(c.dateControle)}</TableCell><TableCell>{c.perimetre}</TableCell><TableCell>{c.observations}</TableCell></TableRow>
              ))}
              {!controles.data?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucun contrôle enregistré.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
