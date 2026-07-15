import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiQuery } from "@/lib/api";

interface Membre { id: number; nom: string; prenom: string; matricule: string; }

export function MembreSelect({ value, onChange, placeholder = "Sélectionner un membre" }: {
  value?: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const { data } = useApiQuery<{ data: Membre[] } | Membre[]>(["/membres", "select"], "/membres?limit=1000");
  const membres: Membre[] = Array.isArray(data) ? data : (data as any)?.data ?? [];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid="select-membre">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {membres.map((m) => (
          <SelectItem key={m.id} value={String(m.id)}>
            {m.nom} {m.prenom} — {m.matricule}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
