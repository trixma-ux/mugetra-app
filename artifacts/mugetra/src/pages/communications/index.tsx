import { useState } from "react";
import { useApiQuery, useApiMutation, post } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

export default function CommunicationsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ canal: "sms", sujet: "", message: "", cible: "actifs" });
  const list = useApiQuery<any[]>(["/communications"], "/communications");
  const envoyer = useApiMutation(() => post("/communications", form), [["/communications"]]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Communication</h1>
        <p className="text-muted-foreground">Envois groupés SMS, WhatsApp et Email vers les mutualistes.</p>
      </div>

      <Alert>
        <AlertTitle>Connecteurs d'envoi</AlertTitle>
        <AlertDescription>
          Sans clé d'API SMS/WhatsApp/SMTP configurée sur le serveur, les messages sont journalisés avec le statut
          « en attente de configuration » mais ne sont pas réellement délivrés. Voir le README pour brancher un fournisseur.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Canal</Label>
              <Select value={form.canal} onValueChange={(v) => setForm({ ...form, canal: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="sms">SMS</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="email">Email</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cible</Label>
              <Select value={form.cible} onValueChange={(v) => setForm({ ...form, cible: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les membres</SelectItem>
                  <SelectItem value="actifs">Membres actifs</SelectItem>
                  <SelectItem value="defaillants">Membres défaillants</SelectItem>
                  <SelectItem value="honneur">Membres d'honneur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.canal === "email" && <div><Label>Sujet</Label><Input value={form.sujet} onChange={(e) => setForm({ ...form, sujet: e.target.value })} /></div>}
          <div><Label>Message</Label><Textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <Button disabled={!form.message} onClick={() => envoyer.mutate(undefined as any, {
            onSuccess: (r: any) => { setForm({ ...form, message: "" }); toast({ title: r.avertissement ? "Journalisé (non délivré)" : "Message envoyé", description: r.avertissement }); },
          })}>Envoyer</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Canal</TableHead><TableHead>Cible</TableHead><TableHead>Destinataires</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
            <TableBody>
              {(list.data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{formatDateTime(c.createdAt)}</TableCell>
                  <TableCell><Badge variant="outline">{c.canal}</Badge></TableCell>
                  <TableCell>{c.cible}</TableCell>
                  <TableCell>{c.nombreDestinataires}</TableCell>
                  <TableCell><Badge variant={c.statut === "envoye" ? "default" : "destructive"}>{c.statut}</Badge></TableCell>
                </TableRow>
              ))}
              {!list.data?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Aucun envoi.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
