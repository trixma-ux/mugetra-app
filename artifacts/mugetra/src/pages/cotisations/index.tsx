import { useState } from "react";
import { Link } from "wouter";
import { useListCotisations, getListCotisationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { formatFCFA, formatDate } from "@/lib/format";

export default function CotisationsList() {
  const { data, isLoading } = useListCotisations({}, { query: { queryKey: getListCotisationsQueryKey({}) } });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotisations</h1>
          <p className="text-muted-foreground">Historique des cotisations.</p>
        </div>
        <Link href="/cotisations/import">
          <Button><Upload className="mr-2 h-4 w-4" />Importer</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date de règlement</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Chargement...</TableCell></TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Aucune cotisation trouvée</TableCell></TableRow>
                ) : (
                  data?.data.map((cot: any) => (
                    <TableRow key={cot.id}>
                      <TableCell>{cot.membreMatricule} - {cot.membreNom} {cot.membrePrenom}</TableCell>
                      <TableCell>{cot.mois}/{cot.annee}</TableCell>
                      <TableCell className="font-medium text-green-600">+{formatFCFA(cot.montant)}</TableCell>
                      <TableCell>{formatDate(cot.dateReglement)}</TableCell>
                      <TableCell className="capitalize">{cot.typeReglement}</TableCell>
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
