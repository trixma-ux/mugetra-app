import { useLocation } from "wouter";
import { useCreateMembre, getListMembresQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { MembreForm, emptyMembreForm, type MembreFormValues } from "@/components/membre-form";

export default function NouveauMembre() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateMembre();

  const onSubmit = (values: MembreFormValues) => {
    // Nettoyer les champs vides → undefined pour éviter les erreurs de validation backend
    const payload: Record<string, any> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v !== "" && v !== null && v !== undefined) payload[k] = v;
    }
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: "Membre créé", description: "Le membre a été ajouté avec succès." });
        queryClient.invalidateQueries({ queryKey: getListMembresQueryKey() });
        setLocation("/membres");
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? err?.message ?? "Une erreur est survenue.";
        toast({ title: "Erreur", description: msg, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/membres")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Nouveau Membre</h1>
          <p className="text-muted-foreground">Ajouter un nouveau membre à la mutuelle.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations Personnelles</CardTitle>
        </CardHeader>
        <CardContent>
          <MembreForm
            defaultValues={emptyMembreForm()}
            onSubmit={onSubmit}
            isPending={createMutation.isPending}
            submitLabel="Enregistrer le membre"
          />
        </CardContent>
      </Card>
    </div>
  );
}
