import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, FileSpreadsheet, Download, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, Loader2, Calendar, History } from "lucide-react";
import { formatFCFA } from "@/lib/format";

const token = () => localStorage.getItem("mugetra_token") ?? "";

const MOIS = [
  { value: "1", label: "Janvier" }, { value: "2", label: "Février" },
  { value: "3", label: "Mars" }, { value: "4", label: "Avril" },
  { value: "5", label: "Mai" }, { value: "6", label: "Juin" },
  { value: "7", label: "Juillet" }, { value: "8", label: "Août" },
  { value: "9", label: "Septembre" }, { value: "10", label: "Octobre" },
  { value: "11", label: "Novembre" }, { value: "12", label: "Décembre" },
];

const now = new Date();
const ANNEES = Array.from({ length: 10 }, (_, i) => String(now.getFullYear() - i));
const MODES = ["especes", "virement", "cheque", "mobile_money", "regularisation"];

type RowStatut = "ok" | "erreur" | "ignore";
interface ImportResult {
  ligne: number; matricule: string; periode: string; montant: number;
  statut: RowStatut; message?: string;
}
interface ImportResponse {
  importes: number; erreurs: number; ignores: number; total: number;
  annee?: number; mois?: number; periode?: string; results: ImportResult[];
}

interface ManualRowMensuel { id: number; matricule: string; montant: string; note: string }
interface ManualRowArriere { id: number; matricule: string; annee: string; mois: string; montant: string; modePaiement: string; note: string }

function ResultsPanel({ result }: { result: ImportResponse }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-700">{result.importes}</p>
            <p className="text-sm text-green-600">Enregistrées</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-700">{result.ignores}</p>
            <p className="text-sm text-orange-600">Déjà existantes</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-700">{result.erreurs}</p>
            <p className="text-sm text-red-600">Erreurs</p>
          </CardContent>
        </Card>
      </div>
      {result.results.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Détail par ligne</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Ligne</TableHead>
                    <TableHead>Matricule</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.results.map(r => (
                    <TableRow key={r.ligne}>
                      <TableCell className="text-muted-foreground text-sm">{r.ligne}</TableCell>
                      <TableCell className="font-mono text-sm">{r.matricule}</TableCell>
                      <TableCell className="text-sm">{r.periode}</TableCell>
                      <TableCell className="text-sm">{formatFCFA(r.montant)}</TableCell>
                      <TableCell>
                        {r.statut === "ok" && <Badge className="bg-green-500 text-xs">OK</Badge>}
                        {r.statut === "ignore" && <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">Ignoré</Badge>}
                        {r.statut === "erreur" && <Badge variant="destructive" className="text-xs">Erreur</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.message ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DropZone({ onFile, fileName }: { onFile: (f: File) => void; fileName: string | null }) {
  const [dragOver, setDragOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0]; if (f) onFile(f);
  }, [onFile]);
  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"}`}
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      {fileName
        ? <p className="font-medium text-primary">{fileName}</p>
        : <p className="text-muted-foreground text-sm">Glissez un fichier Excel/CSV ici<br/><span className="text-xs">ou cliquez pour parcourir</span></p>
      }
      <input ref={ref} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

export default function ImportCotisations() {
  const [tab, setTab] = useState("mensuel");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // --- Mensuel ---
  const [moisMensuel, setMoisMensuel] = useState(String(now.getMonth() + 1));
  const [anneeMensuel, setAnneeMensuel] = useState(String(now.getFullYear()));
  const [datePaiementMensuel, setDatePaiementMensuel] = useState(now.toISOString().slice(0, 10));
  const [modeMensuel, setModeMensuel] = useState("especes");
  const [fileMensuel, setFileMensuel] = useState<File | null>(null);
  const [fileNameMensuel, setFileNameMensuel] = useState<string | null>(null);
  const [rowsMensuel, setRowsMensuel] = useState<ManualRowMensuel[]>([{ id: 1, matricule: "", montant: "", note: "" }]);
  const nextIdMensuel = useRef(2);

  // --- Arriérés ---
  const [fileArriere, setFileArriere] = useState<File | null>(null);
  const [fileNameArriere, setFileNameArriere] = useState<string | null>(null);
  const [rowsArriere, setRowsArriere] = useState<ManualRowArriere[]>([
    { id: 1, matricule: "", annee: String(now.getFullYear()), mois: "1", montant: "7500", modePaiement: "regularisation", note: "" }
  ]);
  const nextIdArriere = useRef(2);

  const reset = () => { setResult(null); setError(null); };

  // Mensuel — fichier
  const importMensuelFichier = async () => {
    if (!fileMensuel) { setError("Sélectionnez un fichier"); return; }
    setImporting(true); reset();
    try {
      const fd = new FormData();
      fd.append("fichier", fileMensuel);
      fd.append("annee", anneeMensuel);
      fd.append("mois", moisMensuel);
      fd.append("datePaiement", datePaiementMensuel);
      fd.append("modePaiement", modeMensuel);
      const resp = await fetch("/api/cotisations/import-excel", {
        method: "POST", headers: { Authorization: `Bearer ${token()}` }, body: fd,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Erreur");
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setImporting(false); }
  };

  // Mensuel — saisie manuelle
  const importMensuelManuel = async () => {
    const valides = rowsMensuel.filter(r => r.matricule.trim());
    if (!valides.length) { setError("Renseignez au moins un matricule"); return; }
    setImporting(true); reset();
    try {
      const resp = await fetch("/api/cotisations/import-excel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          annee: Number(anneeMensuel), mois: Number(moisMensuel),
          datePaiement: datePaiementMensuel, modePaiement: modeMensuel,
          cotisations: valides.map(r => ({
            matricule: r.matricule.trim().toUpperCase(),
            montant: r.montant ? Number(r.montant) : undefined,
            note: r.note || undefined,
          })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Erreur");
      setResult(data);
      if (data.importes > 0) setRowsMensuel([{ id: nextIdMensuel.current++, matricule: "", montant: "", note: "" }]);
    } catch (e: any) { setError(e.message); }
    finally { setImporting(false); }
  };

  // Arriérés — fichier
  const importArriereFichier = async () => {
    if (!fileArriere) { setError("Sélectionnez un fichier"); return; }
    setImporting(true); reset();
    try {
      const fd = new FormData();
      fd.append("fichier", fileArriere);
      const resp = await fetch("/api/cotisations/import-arrieres", {
        method: "POST", headers: { Authorization: `Bearer ${token()}` }, body: fd,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Erreur");
      setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setImporting(false); }
  };

  // Arriérés — saisie manuelle
  const importArriereManuel = async () => {
    const valides = rowsArriere.filter(r => r.matricule.trim() && r.annee && r.mois);
    if (!valides.length) { setError("Renseignez au moins une ligne complète"); return; }
    setImporting(true); reset();
    try {
      const resp = await fetch("/api/cotisations/import-arrieres", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          cotisations: valides.map(r => ({
            matricule: r.matricule.trim().toUpperCase(),
            annee: Number(r.annee), mois: Number(r.mois),
            montant: r.montant ? Number(r.montant) : undefined,
            mode_paiement: r.modePaiement, note: r.note || undefined,
          })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Erreur");
      setResult(data);
      if (data.importes > 0) setRowsArriere([{ id: nextIdArriere.current++, matricule: "", annee: String(now.getFullYear()), mois: "1", montant: "7500", modePaiement: "regularisation", note: "" }]);
    } catch (e: any) { setError(e.message); }
    finally { setImporting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cotisations">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import de cotisations</h1>
          <p className="text-muted-foreground">Enregistrez plusieurs cotisations en une seule opération.</p>
        </div>
      </div>

      {result && <ResultsPanel result={result} />}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={t => { setTab(t); reset(); }}>
        <TabsList>
          <TabsTrigger value="mensuel"><Calendar className="mr-2 h-4 w-4" />Import mensuel</TabsTrigger>
          <TabsTrigger value="arrieres"><History className="mr-2 h-4 w-4" />Régularisation arriérés</TabsTrigger>
        </TabsList>

        {/* ─────────── IMPORT MENSUEL ─────────── */}
        <TabsContent value="mensuel" className="space-y-4 mt-4">
          {/* Paramètres du mois */}
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du mois</CardTitle>
              <CardDescription>Tous les membres du fichier seront enregistrés pour ce même mois.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label>Mois *</Label>
                  <Select value={moisMensuel} onValueChange={setMoisMensuel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MOIS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Année *</Label>
                  <Select value={anneeMensuel} onValueChange={setAnneeMensuel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ANNEES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Date de paiement</Label>
                  <Input type="date" value={datePaiementMensuel} onChange={e => setDatePaiementMensuel(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Mode de paiement</Label>
                  <Select value={modeMensuel} onValueChange={setModeMensuel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MODES.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="fichier-m">
            <TabsList className="h-8">
              <TabsTrigger value="fichier-m" className="text-xs"><FileSpreadsheet className="mr-1 h-3 w-3" />Fichier Excel</TabsTrigger>
              <TabsTrigger value="manuel-m" className="text-xs"><Plus className="mr-1 h-3 w-3" />Saisie manuelle</TabsTrigger>
            </TabsList>

            <TabsContent value="fichier-m" className="mt-3 space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(`/api/cotisations/import/template-mensuel?token=${token()}`, "_blank")}>
                  <Download className="mr-2 h-3 w-3" />Modèle Excel
                </Button>
              </div>
              <DropZone onFile={f => { setFileMensuel(f); setFileNameMensuel(f.name); reset(); }} fileName={fileNameMensuel} />
              <Button onClick={importMensuelFichier} disabled={!fileNameMensuel || importing} className="w-full">
                {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Import...</> : <><Upload className="mr-2 h-4 w-4" />Importer le fichier</>}
              </Button>
            </TabsContent>

            <TabsContent value="manuel-m" className="mt-3 space-y-3">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-36">Matricule *</TableHead>
                      <TableHead className="min-w-28">Montant (FCFA)</TableHead>
                      <TableHead className="min-w-40">Note</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rowsMensuel.map(row => (
                      <TableRow key={row.id}>
                        <TableCell><Input value={row.matricule} onChange={e => setRowsMensuel(r => r.map(x => x.id === row.id ? { ...x, matricule: e.target.value.toUpperCase() } : x))} placeholder="NPG-2024-001" className="h-8 text-sm" /></TableCell>
                        <TableCell><Input value={row.montant} onChange={e => setRowsMensuel(r => r.map(x => x.id === row.id ? { ...x, montant: e.target.value } : x))} placeholder="7500" type="number" className="h-8 text-sm" /></TableCell>
                        <TableCell><Input value={row.note} onChange={e => setRowsMensuel(r => r.map(x => x.id === row.id ? { ...x, note: e.target.value } : x))} placeholder="Remarque..." className="h-8 text-sm" /></TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRowsMensuel(r => r.filter(x => x.id !== row.id))} disabled={rowsMensuel.length === 1}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => setRowsMensuel(r => [...r, { id: nextIdMensuel.current++, matricule: "", montant: "", note: "" }])}>
                  <Plus className="mr-1 h-3 w-3" />Ajouter une ligne
                </Button>
                <Button onClick={importMensuelManuel} disabled={importing}>
                  {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Import...</> : <><Upload className="mr-2 h-4 w-4" />Enregistrer {rowsMensuel.filter(r => r.matricule).length} cotisation(s)</>}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ─────────── RÉGULARISATION ARRIÉRÉS ─────────── */}
        <TabsContent value="arrieres" className="space-y-4 mt-4">
          <Alert>
            <History className="h-4 w-4" />
            <AlertDescription>
              Utilisez cet onglet pour régulariser des mois impayés passés. Chaque ligne représente un mois distinct pour un membre.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="fichier-a">
            <TabsList className="h-8">
              <TabsTrigger value="fichier-a" className="text-xs"><FileSpreadsheet className="mr-1 h-3 w-3" />Fichier Excel</TabsTrigger>
              <TabsTrigger value="manuel-a" className="text-xs"><Plus className="mr-1 h-3 w-3" />Saisie manuelle</TabsTrigger>
            </TabsList>

            <TabsContent value="fichier-a" className="mt-3 space-y-3">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(`/api/cotisations/import/template-arrieres?token=${token()}`, "_blank")}>
                  <Download className="mr-2 h-3 w-3" />Modèle Excel
                </Button>
              </div>
              <DropZone onFile={f => { setFileArriere(f); setFileNameArriere(f.name); reset(); }} fileName={fileNameArriere} />
              <Button onClick={importArriereFichier} disabled={!fileNameArriere || importing} className="w-full">
                {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Import...</> : <><Upload className="mr-2 h-4 w-4" />Importer le fichier</>}
              </Button>
            </TabsContent>

            <TabsContent value="manuel-a" className="mt-3 space-y-3">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-36">Matricule *</TableHead>
                      <TableHead className="min-w-24">Année *</TableHead>
                      <TableHead className="min-w-28">Mois *</TableHead>
                      <TableHead className="min-w-28">Montant</TableHead>
                      <TableHead className="min-w-32">Mode</TableHead>
                      <TableHead className="min-w-36">Note</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rowsArriere.map(row => (
                      <TableRow key={row.id}>
                        <TableCell><Input value={row.matricule} onChange={e => setRowsArriere(r => r.map(x => x.id === row.id ? { ...x, matricule: e.target.value.toUpperCase() } : x))} placeholder="NPG-2024-001" className="h-8 text-sm" /></TableCell>
                        <TableCell>
                          <Select value={row.annee} onValueChange={v => setRowsArriere(r => r.map(x => x.id === row.id ? { ...x, annee: v } : x))}>
                            <SelectTrigger className="h-8 text-sm w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>{ANNEES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={row.mois} onValueChange={v => setRowsArriere(r => r.map(x => x.id === row.id ? { ...x, mois: v } : x))}>
                            <SelectTrigger className="h-8 text-sm w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>{MOIS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input value={row.montant} onChange={e => setRowsArriere(r => r.map(x => x.id === row.id ? { ...x, montant: e.target.value } : x))} placeholder="7500" type="number" className="h-8 text-sm w-24" /></TableCell>
                        <TableCell>
                          <Select value={row.modePaiement} onValueChange={v => setRowsArriere(r => r.map(x => x.id === row.id ? { ...x, modePaiement: v } : x))}>
                            <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>{MODES.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input value={row.note} onChange={e => setRowsArriere(r => r.map(x => x.id === row.id ? { ...x, note: e.target.value } : x))} placeholder="..." className="h-8 text-sm" /></TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setRowsArriere(r => r.filter(x => x.id !== row.id))} disabled={rowsArriere.length === 1}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => setRowsArriere(r => [...r, { id: nextIdArriere.current++, matricule: "", annee: String(now.getFullYear()), mois: "1", montant: "7500", modePaiement: "regularisation", note: "" }])}>
                  <Plus className="mr-1 h-3 w-3" />Ajouter une ligne
                </Button>
                <Button onClick={importArriereManuel} disabled={importing}>
                  {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Import...</> : <><Upload className="mr-2 h-4 w-4" />Régulariser {rowsArriere.filter(r => r.matricule && r.annee && r.mois).length} entrée(s)</>}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
