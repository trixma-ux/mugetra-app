import { useState } from "react";
import { Link } from "wouter";
import { useListMembres, getListMembresQueryKey, MembreStatut } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileDown, Upload } from "lucide-react";
import { formatDate } from "@/lib/format";

export default function MembresList() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListMembres({ search }, { query: { queryKey: getListMembresQueryKey({ search }) } });

  const getStatusBadge = (status: MembreStatut) => {
    switch (status) {
      case "actif": return <Badge className="bg-green-500 hover:bg-green-600">Actif</Badge>;
      case "defaillant": return <Badge variant="destructive">Défaillant</Badge>;
      case "honneur": return <Badge className="bg-yellow-500 hover:bg-yellow-600">Honneur</Badge>;
      case "radie": return <Badge variant="secondary">Radié</Badge>;
      case "demissionnaire": return <Badge variant="outline">Démissionnaire</Badge>;
      case "decede": return <Badge variant="secondary" className="bg-gray-500 text-white">Décédé</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const exportCSV = () => {
    if (!data?.data) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Matricule,Nom,Prenom,Statut,Date Adhesion\n"
      + data.data.map((e: any) => `${e.matricule},${e.nom},${e.prenom},${e.statut},${e.dateAdhesion}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "membres.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Membres</h1>
          <p className="text-muted-foreground">Gérez les membres de la mutuelle.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><FileDown className="mr-2 h-4 w-4" /> Exporter</Button>
          <Link href="/membres/import">
            <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Importer</Button>
          </Link>
          <Link href="/membres/nouveau">
            <Button><Plus className="mr-2 h-4 w-4" /> Nouveau Membre</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom, matricule..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Nom & Prénom</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date d'adhésion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Chargement...</TableCell></TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Aucun membre trouvé</TableCell></TableRow>
                ) : (
                  data?.data.map((membre: any) => (
                    <TableRow key={membre.id}>
                      <TableCell className="font-medium">
                        <Link href={`/membres/${membre.id}`} className="text-primary hover:underline">{membre.matricule}</Link>
                      </TableCell>
                      <TableCell>{membre.nom} {membre.prenom}</TableCell>
                      <TableCell>{getStatusBadge(membre.statut)}</TableCell>
                      <TableCell className="capitalize">{membre.typeAdhesion.replace("_", " ")}</TableCell>
                      <TableCell>{formatDate(membre.dateAdhesion)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
