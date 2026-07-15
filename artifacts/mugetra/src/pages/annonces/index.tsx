import { useListAnnonces, getListAnnoncesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export default function AnnoncesList() {
  const { data, isLoading } = useListAnnonces({ query: { queryKey: getListAnnoncesQueryKey() } });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Annonces</h1>
          <p className="text-muted-foreground">Communications et nouvelles.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div>Chargement...</div>
        ) : !data?.length ? (
          <div>Aucune annonce.</div>
        ) : (
          data.map((annonce: any) => (
            <Card key={annonce.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <CardTitle>{annonce.titre}</CardTitle>
                    {annonce.important && <Badge variant="destructive">Important</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(annonce.createdAt)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{annonce.contenu}</p>
                <div className="mt-4 text-xs text-muted-foreground">Publié par: {annonce.publiePar}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
