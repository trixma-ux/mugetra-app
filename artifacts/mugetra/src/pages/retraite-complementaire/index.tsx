import { useState } from "react";
import { useApiQuery, useApiMutation, post } from "@/lib/api";
import { MembreSelect } from "@/components/membre-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatFCFA } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function RetraiteComplementairePage() {
  const { toast } = useToast();
  const [membreId, setMembreId] = useState("");
  const [montant, setMontant] = useState("2500");
  const [annee, setAnnee] = useState(String(new Date().getFullYear()));
  const [mois, setMois] = useState(String(new Date().getMonth() + 1));
  const [rachat, setRachat] = useState("");
  const [rachatResult, setRachatResult] = useState<any>(null);

  const detail = useApiQuery<any>(["/retraite-complementaire", membreId], `/retraite-complementaire/${membreId}`, { enabled: !!membreId });

  const cotiser = useApiMutation(
    () => post("/retraite-complementaire", { membreId: Number(membreId), annee: Number(annee), mois: Number(mois), montant: Number(montant) }),
    [["/retraite-complementaire", membreId]],
  );
  const simulerRachat = useApiMutation(async () => {
    const r = await fetch(`/api/retraite-complementaire/rachat-partiel`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("mugetra_token")}` },
      body: JSON.stringify({ membreId: Number(membreId), montant: Number(rachat) }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setRachatResult(data);
    return data;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retraite complémentaire</h1>
        <p className="text-muted-foreground">Régime facultatif — cotisation minimum 2 500 FCFA par tranche, rachat partiel possible après 60 mois (max 50% du capital acquis).</p>
      </div>

      <Card><CardContent className="pt-6">
        <Label>Membre</Label>
        <MembreSelect value={membreId} onChange={setMembreId} />
      </CardContent></Card>

      {membreId && (
        <>
          <Card>
            <CardHeader><CardTitle>Enregistrer une cotisation</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-4 gap-3 items-end">
              <div><Label>Année</Label><Input type="number" value={annee} onChange={(e) => setAnnee(e.target.value)} /></div>
              <div><Label>Mois</Label><Input type="number" min={1} max={12} value={mois} onChange={(e) => setMois(e.target.value)} /></div>
              <div><Label>Montant (multiple de 2500F)</Label><Input type="number" step={2500} value={montant} onChange={(e) => setMontant(e.target.value)} /></div>
              <Button onClick={() => cotiser.mutate(undefined as any, {
                onSuccess: () => toast({ title: "Cotisation RC enregistrée" }),
                onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
              })}>Enregistrer</Button>
            </CardContent>
          </Card>

          {detail.data && (
            <Card>
              <CardHeader><CardTitle>Capital cumulé : {formatFCFA(detail.data.totalCotise)}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Année</TableHead><TableHead>Mois</TableHead><TableHead>Montant</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(detail.data.cotisations ?? []).map((c: any) => (
                      <TableRow key={c.id}><TableCell>{c.annee}</TableCell><TableCell>{c.mois}</TableCell><TableCell>{formatFCFA(c.montant)}</TableCell></TableRow>
                    ))}
                    {!detail.data.cotisations?.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucune cotisation RC.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Simuler un rachat partiel</CardTitle></CardHeader>
            <CardContent className="flex items-end gap-3">
              <div className="flex-1"><Label>Montant souhaité</Label><Input type="number" value={rachat} onChange={(e) => setRachat(e.target.value)} /></div>
              <Button disabled={!rachat} onClick={() => simulerRachat.mutate(undefined as any, { onError: (e: any) => toast({ title: "Rachat refusé", description: e.message, variant: "destructive" }) })}>Simuler</Button>
            </CardContent>
            {rachatResult && (
              <CardContent>
                <Alert>
                  <AlertTitle>Plafond autorisé : {formatFCFA(rachatResult.plafondAutorise)}</AlertTitle>
                  <AlertDescription>Capital restant après rachat : {formatFCFA(rachatResult.capitalRestant)}</AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
