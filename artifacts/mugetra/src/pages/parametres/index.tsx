import { useGetParametres, getGetParametresQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFCFA } from "@/lib/format";

export default function Parametres() {
  const { data, isLoading } = useGetParametres({ query: { queryKey: getGetParametresQueryKey() } });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground">Configuration de la mutuelle.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Règles Générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <div>Chargement...</div> : (
              <>
                <div className="flex justify-between border-b pb-2">
                  <span>Cotisation Mensuelle</span>
                  <span className="font-bold">{formatFCFA(data?.cotisationMensuelle)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Plafond Prêt Santé</span>
                  <span className="font-bold">{formatFCFA(data?.plafondPretSante)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Max Mois Régularisation</span>
                  <span className="font-bold">{data?.maxMoisRegularisation} mois</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assistances</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? <div>Chargement...</div> : (
              <>
                <div className="flex justify-between border-b pb-2">
                  <span>Mariage</span>
                  <span className="font-bold">{formatFCFA(data?.assistanceMariage)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Retraite</span>
                  <span className="font-bold">{formatFCFA(data?.assistanceRetraite)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Décès Membre Actif</span>
                  <span className="font-bold">{formatFCFA(data?.assistanceDecesMembreActif)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
