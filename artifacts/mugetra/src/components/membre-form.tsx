import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Formulaire fiche membre, partagé entre la création et la modification. */
const MATRICULE_MSG = "Lettres et chiffres uniquement (ex: 001 ou MG001)";

/**
 * originalMatricule : en modification, le matricule actuel est accepté tel quel
 * même s'il suit un ancien format (ex. « DEMO-001 ») ; un nouveau matricule doit
 * respecter la règle de création.
 */
export const makeMembreFormSchema = (originalMatricule?: string) => z.object({
  matricule: z.string().trim().min(1, "Champ requis").refine(
    (v) => v === originalMatricule || /^[a-zA-Z0-9]+$/.test(v), MATRICULE_MSG),
  nom: z.string().trim().min(1, "Champ requis"),
  prenom: z.string().trim().min(1, "Champ requis"),
  email: z.string().trim().email("Adresse email invalide").optional().or(z.literal("")),
  telephone: z.string().trim().regex(/^\+?[0-9 .-]{8,20}$/, "Numéro de téléphone invalide").optional().or(z.literal("")),
  typeAdhesion: z.enum(["ordinaire", "exceptionnel", "non_national"], { errorMap: () => ({ message: "Choisissez un type d'adhésion" }) }),
  dateAdhesion: z.string().min(1, "Champ requis"),
});

export const membreFormSchema = makeMembreFormSchema();
export type MembreFormValues = z.infer<typeof membreFormSchema>;

export const emptyMembreForm = (): MembreFormValues => ({
  matricule: "",
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  typeAdhesion: "ordinaire",
  dateAdhesion: new Date().toISOString().split("T")[0],
});

/** Valeurs du formulaire à partir d'un membre renvoyé par l'API. */
export function membreToFormValues(m: any): MembreFormValues {
  const type = ["ordinaire", "exceptionnel", "non_national"].includes(m?.typeAdhesion) ? m.typeAdhesion : "ordinaire";
  return {
    matricule: m?.matricule ?? "",
    nom: m?.nom ?? "",
    prenom: m?.prenom ?? "",
    email: m?.email ?? "",
    telephone: m?.telephone ?? "",
    typeAdhesion: type,
    dateAdhesion: (m?.dateAdhesion ?? "").slice(0, 10),
  };
}

type Props = {
  defaultValues: MembreFormValues;
  onSubmit: (values: MembreFormValues) => void;
  isPending?: boolean;
  submitLabel: string;
  onCancel?: () => void;
  /** Matricule actuel (mode modification). */
  originalMatricule?: string;
};

export function MembreForm({ defaultValues, onSubmit, isPending, submitLabel, onCancel, originalMatricule }: Props) {
  const form = useForm<MembreFormValues>({ resolver: zodResolver(makeMembreFormSchema(originalMatricule)), defaultValues });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="matricule" render={({ field }) => (
            <FormItem>
              <FormLabel>Matricule</FormLabel>
              <FormControl><Input placeholder="ex: MG0001" {...field} /></FormControl>
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
            <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="dateAdhesion" render={({ field }) => (
            <FormItem><FormLabel>Date d'adhésion</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Annuler</Button>}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Enregistrement..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
