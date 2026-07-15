import { useState } from "react";
import { useApiQuery, useApiMutation, post } from "@/lib/api";
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

const CATEGORIES = ["cotisation", "don", "ristourne", "assistance", "pret", "fonctionnement", "autre"];

export default function ComptabilitePage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: "", type: "encaissement", categorie: "cotisation", libelle: "", montant: "", compte: "caisse" });
  const annee = new Date().getFullYear();

  const ecritures = useApiQuery<any[]>(["/comptabilite/ecritures"], "/comptabilite/ecritures");
  const balance = useApiQuery<any>(["/comptabilite/balance", annee], `/comptabilite/balance?annee=${annee}`);
  const budgetBe = useApiQuery<any>(["/comptabilite/budget-be", annee], `/comptabilite/budget-be/calcul?annee=${annee}`);
  const budgets = useApiQuery<any[]>(["/comptabilite/budgets"], "/comptabilite/budgets");

  const creerEcriture = useApiMutation(
    () => post("/comptabilite/ecritures", { ...form, montant: Number(form.montant) }),
    [["/comptabilite/ecritures"], ["/comptabilite/balance", annee]],
  );
  const creerBudgetBe = useApiMutation(
    () => post("/comptabilite/budgets", { annee, type: "fonctionnement_be", montantPrevisionnel: budgetBe.data?.budgetFonctionnementBeSuggere ?? 0, adoptePar: "B.E" }),
    [["/comptabilite/budgets"]],
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comptabilité</h1>
          <p className="text-muted-foreground">Journal des encaissements/décaissements, trésorerie et budgets.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="button-nouvelle-ecriture">Nouvelle écriture</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle écriture comptable</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="encaissement">Encaissement</SelectItem><SelectItem value="decaissement">Décaissement</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Compte</Label>
                  <Select value={form.compte} onValueChange={(v) => setForm({ ...form, compte: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="caisse">Caisse</SelectItem><SelectItem value="banque">Banque</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.categorie} onValueChange={(v) => setForm({ ...form, categorie: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Libellé</Label><Input value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} /></div>
              <div><Label>Montant</Label><Input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} /></div>
              <Button className="w-full" disabled={!form.date || !form.libelle || !form.montant} onClick={() => creerEcriture.mutate(undefined as any, { onSuccess: () => { setOpen(false); toast({ title: "Écriture enregistrée" }); } })}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="journal">
        <TabsList>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="tresorerie">Trésorerie {annee}</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="journal">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Catégorie</TableHead><TableHead>Libellé</TableHead><TableHead>Compte</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
              <TableBody>
                {(ecritures.data ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell><Badge variant={e.type === "encaissement" ? "default" : "destructive"}>{e.type}</Badge></TableCell>
                    <TableCell>{e.categorie}</TableCell><TableCell>{e.libelle}</TableCell><TableCell>{e.compte}</TableCell>
                    <TableCell className="text-right">{formatFCFA(e.montant)}</TableCell>
                  </TableRow>
                ))}
                {!ecritures.data?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucune écriture.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tresorerie">
          {balance.data && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Solde global</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{formatFCFA(balance.data.soldeGlobal)}</CardContent></Card>
              {balance.data.comptes.map((c: any) => (
                <Card key={c.compte}><CardHeader><CardTitle className="text-sm text-muted-foreground capitalize">{c.compte}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{formatFCFA(c.solde)}</div>
                    <div className="text-xs text-muted-foreground">Encaissé {formatFCFA(c.encaissements)} · Décaissé {formatFCFA(c.decaissements)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          {budgetBe.data && (
            <Card>
              <CardHeader><CardTitle>Budget de fonctionnement du Bureau Exécutif (Art. 80 R.I.)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">5% des cotisations annuelles ({formatFCFA(budgetBe.data.totalCotisations)}) + 15% des dons ({formatFCFA(budgetBe.data.totalDons)})</div>
                <div className="text-2xl font-bold">{formatFCFA(budgetBe.data.budgetFonctionnementBeSuggere)}</div>
                <Button size="sm" onClick={() => creerBudgetBe.mutate(undefined as any, { onSuccess: () => toast({ title: "Budget B.E. enregistré" }) })}>Adopter ce budget</Button>
              </CardContent>
            </Card>
          )}
          <Card><CardHeader><CardTitle>Budgets adoptés</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Année</TableHead><TableHead>Type</TableHead><TableHead>Prévisionnel</TableHead><TableHead>Consommé</TableHead><TableHead>Adopté par</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(budgets.data ?? []).map((b) => (
                    <TableRow key={b.id}><TableCell>{b.annee}</TableCell><TableCell>{b.type}</TableCell><TableCell>{formatFCFA(b.montantPrevisionnel)}</TableCell><TableCell>{formatFCFA(b.montantConsomme)}</TableCell><TableCell>{b.adoptePar}</TableCell></TableRow>
                  ))}
                  {!budgets.data?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Aucun budget adopté.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
