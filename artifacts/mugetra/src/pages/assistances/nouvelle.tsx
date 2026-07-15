import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateAssistance, getListAssistancesQueryKey, useListMembres } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const TYPE_OPTIONS = [
  { value: "deces_membre",            label: "Décès d'un membre actif",      group: "Commission Affaires Sociales" },
  { value: "deces_conjoint",          label: "Décès du conjoint(e)",          group: "Commission Affaires Sociales" },
  { value: "deces_enfant",            label: "Décès d'un enfant",            group: "Commission Affaires Sociales" },
  { value: "deces_parent",            label: "Décès d'un parent",            group: "Commission Affaires Sociales" },
  { value: "deces_beau_parent",       label: "Décès d'un beau-parent",       group: "Commission Affaires Sociales" },
  { value: "deces_mort_ne",           label: "Mort-né",                      group: "Commission Affaires Sociales" },
  { value: "mariage",                 label: "Mariage",                      group: "Commission des Prêts" },
  { value: "retraite",                label: "Retraite",                     group: "Commission des Prêts" },
  { value: "retraite_complementaire", label: "Retraite complémentaire",      group: "Commission des Prêts" },
  { value: "pret_sante",              label: "Prêt santé",                   group: "Commission des Prêts" },
  { value: "licenciement",            label: "Licenciement",                 group: "Commission des Prêts" },
];

const LIEN_OPTIONS = [
  { value: "conjoint",    label: "Conjoint(e)" },
  { value: "enfant",      label: "Enfant" },
  { value: "parent",      label: "Parent" },
  { value: "beau_parent", label: "Beau-parent" },
  { value: "membre",      label: "Moi-même (membre)" },
];

const NEEDS_BENEFICIAIRE = ["deces_conjoint","deces_enfant","deces_parent","deces_beau_parent","deces_mort_ne"];

const formSchema = z.object({
  membreId: z.coerce.number().min(1, "Membre requis"),
  type: z.string().min(1, "Type requis"),
  dateEvenement: z.string().min(1, "Requis"),
  beneficiaireNom: z.string().optional(),
  beneficiairePrenom: z.string().optional(),
  beneficiaireRelation: z.string().optional(),
  description: z.string().optional(),
});

export default function NouvelleAssistance() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateAssistance();
  const { data: membresData } = useListMembres({ limit: 1000 });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "",
      dateEvenement: new Date().toISOString().split("T")[0],
    },
  });

  const selectedType = form.watch("type");
  const needsBenef = NEEDS_BENEFICIAIRE.includes(selectedType);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate({ data: values as any }, {
      onSuccess: () => {
        toast({ title: "Demande créée", description: "La demande d'assistance a été enregistrée." });
        queryClient.invalidateQueries({ queryKey: getListAssistancesQueryKey() });
        setLocation("/assistances");
      },
      onError: () => {
        toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
      }
    });
  };

  const casSocial = TYPE_OPTIONS.filter(t => t.group === "Commission Affaires Sociales");
  const casPrets  = TYPE_OPTIONS.filter(t => t.group === "Commission des Prêts");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/assistances")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle demande d'assistance</h1>
          <p className="text-muted-foreground text-sm">Créer une demande pour un membre.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations de la demande</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* Membre */}
              <FormField control={form.control} name="membreId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Membre *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {membresData?.data.map((m: any) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.matricule} — {m.prenom} {m.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'assistance *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Com. Affaires Sociales</div>
                        {casSocial.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        <div className="px-2 py-1 mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-t">Com. des Prêts</div>
                        {casPrets.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Date */}
                <FormField control={form.control} name="dateEvenement" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de l'événement *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Bénéficiaire si décès d'une tierce personne */}
              {needsBenef && (
                <div className="space-y-3 p-4 rounded-lg border border-dashed bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personne décédée</p>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="beneficiaireNom" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Nom</FormLabel>
                        <FormControl><Input placeholder="Nom..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="beneficiairePrenom" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Prénom</FormLabel>
                        <FormControl><Input placeholder="Prénom..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="beneficiaireRelation" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Lien de parenté</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {LIEN_OPTIONS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Notes */}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes / Informations complémentaires</FormLabel>
                  <FormControl>
                    <Textarea rows={3} className="resize-none" placeholder="Précisions..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setLocation("/assistances")}>Annuler</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Enregistrement..." : "Soumettre la demande"}
                </Button>
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
