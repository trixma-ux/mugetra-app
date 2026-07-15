import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateAssistance, useGetCurrentUser, useGetMembre, getListAssistancesQueryKey, getGetCurrentUserQueryKey, getGetMembreQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle, Shield, Send } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "deces_membre",          label: "Décès d'un membre actif",      commission: "affaires_sociales" },
  { value: "deces_conjoint",        label: "Décès du conjoint(e)",          commission: "affaires_sociales" },
  { value: "deces_enfant",          label: "Décès d'un enfant",            commission: "affaires_sociales" },
  { value: "deces_parent",          label: "Décès d'un parent",            commission: "affaires_sociales" },
  { value: "deces_beau_parent",     label: "Décès d'un beau-parent",       commission: "affaires_sociales" },
  { value: "deces_mort_ne",         label: "Mort-né",                      commission: "affaires_sociales" },
  { value: "mariage",               label: "Mariage",                      commission: "prets" },
  { value: "retraite",              label: "Retraite",                     commission: "prets" },
  { value: "retraite_complementaire", label: "Retraite complémentaire",    commission: "prets" },
  { value: "pret_sante",            label: "Prêt santé",                   commission: "prets" },
  { value: "licenciement",          label: "Licenciement",                 commission: "prets" },
];

const LIEN_OPTIONS = [
  { value: "conjoint",    label: "Conjoint(e)" },
  { value: "enfant",      label: "Enfant" },
  { value: "parent",      label: "Parent" },
  { value: "beau_parent", label: "Beau-parent" },
  { value: "membre",      label: "Moi-même (membre)" },
];

const formSchema = z.object({
  type: z.string().min(1, "Type requis"),
  dateEvenement: z.string().min(1, "Date requise"),
  beneficiaireNom: z.string().optional(),
  beneficiairePrenom: z.string().optional(),
  beneficiaireRelation: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const NEEDS_BENEFICIAIRE = ["deces_conjoint","deces_enfant","deces_parent","deces_beau_parent","deces_mort_ne"];

export default function MutualisteNouvelleDemande() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey() }
  });
  const membreId = user?.membreId ?? 0;
  const { data: membre } = useGetMembre(membreId, {
    query: { enabled: !!membreId, queryKey: getGetMembreQueryKey(membreId) }
  });

  const createMutation = useCreateAssistance();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "",
      dateEvenement: new Date().toISOString().split("T")[0],
    },
  });

  const selectedType = form.watch("type");
  const typeInfo = TYPE_OPTIONS.find(t => t.value === selectedType);
  const needsBeneficiaire = NEEDS_BENEFICIAIRE.includes(selectedType);

  if (userLoading) return (
    <div className="min-h-screen bg-[#f0faf4] flex items-center justify-center">
      <div className="text-sm text-gray-400">Chargement...</div>
    </div>
  );

  if (!user?.membreId) {
    setLocation("/login");
    return null;
  }

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      data: {
        membreId,
        type: values.type as any,
        dateEvenement: values.dateEvenement,
        description: values.description,
        beneficiaireNom: values.beneficiaireNom,
        beneficiairePrenom: values.beneficiairePrenom,
        beneficiaireRelation: values.beneficiaireRelation,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Demande envoyée ✓", description: "Votre demande a été transmise et sera traitée prochainement." });
        queryClient.invalidateQueries({ queryKey: getListAssistancesQueryKey() });
        setLocation("/mutualiste");
      },
      onError: async (err: any) => {
        let message = "Une erreur est survenue. Veuillez réessayer.";
        try {
          const body = err?.response ? await err.response.json() : null;
          if (body?.error) message = body.error;
          else if (body?.message) message = body.message;
        } catch {}
        toast({ title: "Demande refusée", description: message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f0faf4]">
      {/* Topbar */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => setLocation("/mutualiste")}
            className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <div>
            <img src="/logo-mugetra.png" alt="MUGETRA" className="h-7 object-contain" />
          </div>
          <div className="ml-1">
            <p className="text-xs font-bold text-[#1a5c3a] leading-none">Nouvelle demande</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">d'assistance sociale</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Membre info card */}
        <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1a5c3a] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(membre?.prenom?.[0] ?? "") + (membre?.nom?.[0] ?? "")}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{membre?.prenom} {membre?.nom}</p>
            <p className="text-xs text-gray-400 font-mono">{membre?.matricule} • {membre?.poste}</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b bg-gray-50/50">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#1a5c3a]" /> Détails de la demande
            </h2>
          </div>
          <div className="p-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* Type */}
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Type d'assistance *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Sélectionner le type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Commission Affaires Sociales</div>
                        {TYPE_OPTIONS.filter(t => t.commission === "affaires_sociales").map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                        <div className="px-2 py-1 mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t">Commission des Prêts</div>
                        {TYPE_OPTIONS.filter(t => t.commission === "prets").map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Commission info banner */}
                {typeInfo && (
                  <div className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg text-xs ${
                    typeInfo.commission === "affaires_sociales"
                      ? "bg-blue-50 border border-blue-100 text-blue-700"
                      : "bg-purple-50 border border-purple-100 text-purple-700"
                  }`}>
                    <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Votre demande sera traitée par la <strong>
                        {typeInfo.commission === "affaires_sociales" ? "Commission Affaires Sociales" : "Commission des Prêts"}
                      </strong>.
                    </span>
                  </div>
                )}

                {/* Date */}
                <FormField control={form.control} name="dateEvenement" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Date de l'événement *</FormLabel>
                    <FormControl>
                      <Input type="date" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Bénéficiaire — shown for décès de tierce personne */}
                {needsBeneficiaire && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Personne concernée</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="beneficiaireNom" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-gray-600">Nom</FormLabel>
                          <FormControl><Input className="h-9" placeholder="Nom..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="beneficiairePrenom" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-gray-600">Prénom</FormLabel>
                          <FormControl><Input className="h-9" placeholder="Prénom..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="beneficiaireRelation" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-gray-600">Lien de parenté</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LIEN_OPTIONS.map(l => (
                              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                            ))}
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
                    <FormLabel className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Informations complémentaires</FormLabel>
                    <FormControl>
                      <Textarea
                        className="resize-none text-sm"
                        rows={3}
                        placeholder="Précisions utiles pour le traitement de votre demande..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Info box */}
                <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Après soumission, votre demande passera par plusieurs étapes de validation. Vous pourrez suivre l'avancement depuis votre espace.</span>
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/mutualiste")}
                    className="text-sm"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-[#1a5c3a] hover:bg-[#164d31] gap-2 text-sm"
                  >
                    <Send className="h-4 w-4" />
                    {createMutation.isPending ? "Envoi en cours..." : "Soumettre la demande"}
                  </Button>
                </div>

              </form>
            </Form>
          </div>
        </div>

      </div>
    </div>
  );
}
