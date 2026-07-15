import { useState } from "react";
import { useApiQuery, useApiMutation, post } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate, formatFCFA } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function SportsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titre: "", type: "tournoi", dateActivite: "", budget: "", description: "" });

  const list = useApiQuery<any[]>(["/sports/activites"], "/sports/activites");
  const creer = useApiMutation(() => post("/sports/activites", { ...form, budget: form.budget ? Number(form.budget) : undefined }), [["/sports/activites"]]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sports et Loisirs</h1>
          <p className="text-muted-foreground">Calendrier des activités, tournois, sorties et voyages.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="button-nouvelle-activite">Nouvelle activité</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle activité</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Titre</Label><Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="tournoi">Tournoi</SelectItem><SelectItem value="sortie">Sortie récréative</SelectItem><SelectItem value="voyage">Voyage</SelectItem><SelectItem value="autre">Autre</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Date</Label><Input type="date" value={form.dateActivite} onChange={(e) => setForm({ ...form, dateActivite: e.target.value })} /></div>
              <div><Label>Budget</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <Button className="w-full" disabled={!form.titre} onClick={() => creer.mutate(undefined as any, { onSuccess: () => { setOpen(false); toast({ title: "Activité créée" }); } })}>Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(list.data ?? []).map((a) => (
          <Card key={a.id} data-testid={`card-activite-${a.id}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{a.titre}</CardTitle>
              <Badge variant="outline">{a.type}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{a.description}</p>
              <div className="text-xs text-muted-foreground mt-2">{formatDate(a.dateActivite)} · Budget {formatFCFA(a.budget)}</div>
            </CardContent>
          </Card>
        ))}
        {!list.data?.length && <div className="text-muted-foreground">Aucune activité programmée.</div>}
      </div>
    </div>
  );
}
