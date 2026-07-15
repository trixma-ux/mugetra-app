import { useListAssistances, getListAssistancesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatFCFA, formatDate } from "@/lib/format";
import { Plus } from "lucide-react";

export default function AssistancesList() {
  const { data, isLoading } = useListAssistances({}, { query: { queryKey: getListAssistancesQueryKey({}) } });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assistances</h1>
          <p className="text-muted-foreground">Demandes d'assistance.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center">Chargement...</TableCell></TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune demande trouvée</TableCell></TableRow>
                ) : (
                  data?.data.map((ast: any) => (
                    <TableRow key={ast.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">{ast.membreMatricule}<br/><span className="font-sans text-sm font-medium">{ast.membrePrenom} {ast.membreNom}</span></TableCell>
                      <TableCell className="capitalize text-sm">{ast.type.replace(/_/g, " ")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{ast.statut.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="font-medium text-sm">{formatFCFA(ast.montantDemande)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(ast.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/assistances/${ast.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Voir →</Button>
                        </Link>
                      </TableCell>
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
