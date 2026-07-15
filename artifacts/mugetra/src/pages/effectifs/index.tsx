import { useApiQuery } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  adhesion: "Adhésion", demission: "Démission", licenciement: "Licenciement", radiation: "Radiation",
  deces: "Décès", reintegration: "Réintégration",
};

export default function EffectifsPage() {
  const mouvements = useApiQuery<any>(["/effectifs/mouvements"], "/effectifs/mouvements");
  const alertes = useApiQuery<any>(["/effectifs/alertes"], "/effectifs/alertes");
  const annuaire = useApiQuery<any[]>(["/effectifs/annuaire"], "/effectifs/annuaire");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Effectifs</h1>
        <p className="text-muted-foreground">Mouvements d'effectifs, alertes automatiques et annuaire des membres.</p>
      </div>

      <Tabs defaultValue="alertes">
        <TabsList>
          <TabsTrigger value="alertes">Alertes</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
          <TabsTrigger value="annuaire">Annuaire</TabsTrigger>
        </TabsList>

        <TabsContent value="alertes" className="space-y-3">
          {alertes.data?.enfantsHorsDelai?.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Enfants déclarés hors délai ({alertes.data.enfantsHorsDelai.length})</AlertTitle>
              <AlertDescription>
                Déclaration au-delà de 15 jours après la naissance (Art. 43 R.I.) : {alertes.data.enfantsHorsDelai.map((e: any) => `${e.nom ?? ""} ${e.prenom ?? ""}`).join(", ")}
              </AlertDescription>
            </Alert>
          )}
          {alertes.data?.conjointsAbsents?.length > 0 && (
            <Alert>
              <AlertTitle>Conjoint(e) non déclaré(e) ({alertes.data.conjointsAbsents.length})</AlertTitle>
              <AlertDescription>Membres mariés sans fiche conjoint(e) : {alertes.data.conjointsAbsents.map((m: any) => `${m.nom} ${m.prenom}`).join(", ")}</AlertDescription>
            </Alert>
          )}
          {alertes.data?.membresSuspendus?.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Membres défaillants ({alertes.data.membresSuspendus.length})</AlertTitle>
              <AlertDescription>Cotisations impayées depuis au moins 3 mois (Art. 9 R.I.) : {alertes.data.membresSuspendus.map((m: any) => `${m.nom} ${m.prenom}`).join(", ")}</AlertDescription>
            </Alert>
          )}
          {alertes.data && !alertes.data.enfantsHorsDelai?.length && !alertes.data.conjointsAbsents?.length && !alertes.data.membresSuspendus?.length && (
            <div className="text-muted-foreground">Aucune alerte active.</div>
          )}
        </TabsContent>

        <TabsContent value="mouvements" className="space-y-4">
          {mouvements.data && (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              {Object.entries(mouvements.data.recapitulatif ?? {}).map(([type, count]: any) => (
                <Card key={type}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{TYPE_LABELS[type] ?? type}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{count}</CardContent></Card>
              ))}
            </div>
          )}
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Membre</TableHead><TableHead>Type</TableHead><TableHead>Détails</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {(mouvements.data?.mouvements ?? []).map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.membreNom} {m.membrePrenom} ({m.matricule})</TableCell>
                    <TableCell><Badge variant="outline">{TYPE_LABELS[m.type] ?? m.type}</Badge></TableCell>
                    <TableCell>{m.details}</TableCell>
                    <TableCell>{formatDateTime(m.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {!mouvements.data?.mouvements?.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Aucun mouvement enregistré.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="annuaire">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(annuaire.data ?? []).map((m) => (
              <Card key={m.id} data-testid={`card-annuaire-${m.id}`}>
                <CardContent className="pt-6 flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={m.photoUrl ?? undefined} />
                    <AvatarFallback>{m.nom?.[0]}{m.prenom?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{m.nom} {m.prenom}</div>
                    <div className="text-xs text-muted-foreground">{m.fonction ?? "-"} · {m.service ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{m.matricule}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!annuaire.data?.length && <div className="text-muted-foreground">Aucun membre actif.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
