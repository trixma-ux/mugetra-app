import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateMembre, getListMembresQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  matricule: z.string().min(1, "Requis").regex(/^[a-zA-Z0-9]+$/, "Lettres et chiffres uniquement (ex: 001 ou MG001)"),
  nom: z.string().min(1, "Requis"),
  prenom: z.string().min(1, "Requis"),
  email: z.string().email("Invalide").optional().or(z.literal("")),
  telephone: z.string().optional().or(z.literal("")),
  typeAdhesion: z.enum(["ordinaire", "exceptionnel", "non_national"]),
  dateAdhesion: z.string().min(1, "Requis"),
});

export default function NouveauMembre() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateMembre();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      matricule: "",
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      typeAdhesion: "ordinaire",
      dateAdhesion: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Membre créé", description: "Le membre a été ajouté avec succès." });
        queryClient.invalidateQueries({ queryKey: getListMembresQueryKey() });
        setLocation("/membres");
      },
      onError: () => {
        toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
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
          <h1 className="text-3xl font-bold tracking-tight">Nouveau Membre</h1>
          <p className="text-muted-foreground">Ajouter un nouveau membre à la mutuelle.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations Personnelles</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="matricule" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matricule</FormLabel>
                    <FormControl><Input placeholder="ex: MG-0001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="typeAdhesion" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'adhésion</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="ordinaire">Ordinaire</SelectItem>
                        <SelectItem value="exceptionnel">Exceptionnel</SelectItem>
                        <SelectItem value="non_national">Non National</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nom" render={({ field }) => (
                  <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="prenom" render={({ field }) => (
                  <FormItem><FormLabel>Prénom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="telephone" render={({ field }) => (
                  <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dateAdhesion" render={({ field }) => (
                  <FormItem><FormLabel>Date d'adhésion</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Enregistrement..." : "Enregistrer le membre"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
