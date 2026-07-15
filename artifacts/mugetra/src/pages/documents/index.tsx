import { useState } from "react";
import { useApiQuery, useApiMutation, del } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES: Record<string, string> = {
  statut: "Statuts", reglement_interieur: "Règlement intérieur", pv: "Procès-verbaux", rapport: "Rapports",
  courrier: "Courriers", decision: "Décisions", contrat: "Contrats", photo: "Photos", autre: "Autre",
};

export default function DocumentsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [categorie, setCategorie] = useState<string | undefined>(undefined);
  const [nom, setNom] = useState("");
  const [uploadCategorie, setUploadCategorie] = useState("autre");
  const [file, setFile] = useState<File | null>(null);

  const list = useApiQuery<any[]>(["/documents", categorie], categorie ? `/documents?categorie=${categorie}` : "/documents");

  const upload = useApiMutation(async () => {
    if (!file) throw new Error("Sélectionnez un fichier");
    const fd = new FormData();
    fd.append("fichier", file);
    fd.append("nom", nom || file.name);
    fd.append("categorie", uploadCategorie);
    const token = localStorage.getItem("mugetra_token");
    const res = await fetch("/api/documents", { method: "POST", body: fd, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    if (!res.ok) throw new Error((await res.json())?.error ?? "Échec de l'envoi");
    return res.json();
  }, [["/documents", categorie]]);

  const supprimer = useApiMutation((id: number) => del(`/documents/${id}`), [["/documents", categorie]]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion documentaire</h1>
          <p className="text-muted-foreground">Archivage numérique des statuts, PV, rapports, courriers, décisions et contrats.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="button-upload-document">Ajouter un document</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau document</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nom (facultatif)</Label><Input value={nom} onChange={(e) => setNom(e.target.value)} /></div>
              <div>
                <Label>Catégorie</Label>
                <Select value={uploadCategorie} onValueChange={setUploadCategorie}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Fichier</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              <Button className="w-full" disabled={!file || upload.isPending} onClick={() => upload.mutate(undefined as any, {
                onSuccess: () => { setOpen(false); setFile(null); setNom(""); toast({ title: "Document ajouté" }); },
                onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
              })}>Envoyer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={!categorie ? "default" : "outline"} onClick={() => setCategorie(undefined)}>Tous</Button>
        {Object.entries(CATEGORIES).map(([k, v]) => (
          <Button key={k} size="sm" variant={categorie === k ? "default" : "outline"} onClick={() => setCategorie(k)}>{v}</Button>
        ))}
      </div>

      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Catégorie</TableHead><TableHead>Ajouté le</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {(list.data ?? []).map((d) => (
              <TableRow key={d.id} data-testid={`row-document-${d.id}`}>
                <TableCell><a className="underline" href={d.cheminFichier} target="_blank" rel="noreferrer">{d.nom}</a></TableCell>
                <TableCell><Badge variant="outline">{CATEGORIES[d.categorie] ?? d.categorie}</Badge></TableCell>
                <TableCell>{formatDate(d.createdAt)}</TableCell>
                <TableCell><Button size="sm" variant="destructive" onClick={() => supprimer.mutate(d.id)}>Supprimer</Button></TableCell>
              </TableRow>
            ))}
            {!list.data?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucun document.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
