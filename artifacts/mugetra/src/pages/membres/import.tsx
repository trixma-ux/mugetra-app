import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, FileSpreadsheet, Download, Plus, Trash2, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";

const token = () => localStorage.getItem("mugetra_token") ?? "";

type RowStatut = "ok" | "erreur" | "ignore";
interface ImportResult { ligne: number; matricule: string; nom: string; prenom: string; statut: RowStatut; message?: string }
interface ImportResponse { importes: number; erreurs: number; ignores: number; total: number; results: ImportResult[] }

interface ManualRow {
  id: number;
  matricule: string; nom: string; prenom: string;
  email: string; telephone: string;
  dateAdhesion: string; typeAdhesion: string; statut: string;
  departement: string; poste: string;
}

const emptyRow = (id: number): ManualRow => ({
  id, matricule: "", nom: "", prenom: "", email: "", telephone: "",
  dateAdhesion: new Date().toISOString().slice(0, 10),
  typeAdhesion: "ordinaire", statut: "actif", departement: "", poste: "",
});

export default function ImportMembres() {
  const [tab, setTab] = useState("excel");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileDataRef = useRef<File | null>(null);

  // Saisie manuelle
  const [rows, setRows] = useState<ManualRow[]>([emptyRow(1)]);
  const nextId = useRef(2);

  const addRow = () => { setRows(r => [...r, emptyRow(nextId.current++)]); };
  const removeRow = (id: number) => { setRows(r => r.filter(x => x.id !== id)); };
  const updateRow = (id: number, field: keyof ManualRow, value: string) => {
    setRows(r => r.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const downloadTemplate = () => {
    window.open(`/api/membres/import/template?token=${token()}`, "_blank");
  };

  const handleFile = (file: File) => {
    fileDataRef.current = file;
    setFileName(file.name);
    setResult(null);
    setError(null);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const importExcel = async () => {
    if (!fileDataRef.current) { setError("Sélectionnez un fichier d'abord"); return; }
    setImporting(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append("fichier", fileDataRef.current);
      const resp = await fetch(`/api/membres/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Erreur lors de l'import");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const importManual = async () => {
    const valides = rows.filter(r => r.nom.trim() && r.prenom.trim());
    if (valides.length === 0) { setError("Renseignez au moins un membre (nom + prénom obligatoires)"); return; }
    setImporting(true); setError(null); setResult(null);
    try {
      const payload = valides.map(r => ({
        matricule: r.matricule || undefined,
        nom: r.nom.trim().toUpperCase(),
        prenom: r.prenom.trim(),
        email: r.email || undefined,
        telephone: r.telephone || undefined,
        date_adhesion: r.dateAdhesion,
        type_adhesion: r.typeAdhesion,
        statut: r.statut,
        departement: r.departement || undefined,
        poste: r.poste || undefined,
      }));
      const resp = await fetch(`/api/membres/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Erreur lors de l'import");
      setResult(data);
      if (data.importes > 0) setRows([emptyRow(nextId.current++)]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/membres">
          <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import de mutualistes</h1>
          <p className="text-muted-foreground">Ajoutez plusieurs membres en une seule opération.</p>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">{result.importes}</p>
              <p className="text-sm text-green-600">Importés avec succès</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-700">{result.ignores}</p>
              <p className="text-sm text-orange-600">Ignorés (déjà existants)</p>
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
      )}

      {result && result.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats détaillés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Ligne</TableHead>
                    <TableHead>Matricule</TableHead>
                    <TableHead>Nom & Prénom</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.results.map(r => (
                    <TableRow key={r.ligne}>
                      <TableCell className="text-muted-foreground">{r.ligne}</TableCell>
                      <TableCell className="font-mono text-sm">{r.matricule}</TableCell>
                      <TableCell>{r.nom} {r.prenom}</TableCell>
                      <TableCell>
                        {r.statut === "ok" && <Badge className="bg-green-500">Importé</Badge>}
                        {r.statut === "ignore" && <Badge variant="outline" className="text-orange-600 border-orange-300">Ignoré</Badge>}
                        {r.statut === "erreur" && <Badge variant="destructive">Erreur</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.message ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="excel"><FileSpreadsheet className="mr-2 h-4 w-4" />Fichier Excel / CSV</TabsTrigger>
          <TabsTrigger value="liste"><Plus className="mr-2 h-4 w-4" />Saisie manuelle</TabsTrigger>
        </TabsList>

        <TabsContent value="excel" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Importer un fichier</CardTitle>
              <CardDescription>Accepte les fichiers Excel (.xlsx, .xls) et CSV (.csv). Maximum 500 membres par fichier.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" /> Télécharger le modèle Excel
              </Button>

              <div
                className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                {fileName ? (
                  <p className="font-medium text-primary">{fileName}</p>
                ) : (
                  <p className="text-muted-foreground">Glissez-déposez votre fichier ici<br/><span className="text-sm">ou cliquez pour parcourir</span></p>
                )}
                <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
              </div>

              <Button onClick={importExcel} disabled={!fileName || importing} className="w-full">
                {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Import en cours...</> : <><Upload className="mr-2 h-4 w-4" />Lancer l'import</>}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Colonnes reconnues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {["matricule","nom *","prenom *","email","telephone","date_naissance","date_embauche","date_cdi","date_adhesion *","statut","type_adhesion","departement","poste","situation_familiale","retraite_complementaire","renonciation_assistances"].map(c => (
                  <code key={c} className="bg-background border rounded px-2 py-0.5 font-mono text-xs">{c}</code>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">* Champs obligatoires • Dates au format JJ/MM/AAAA ou AAAA-MM-JJ</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liste" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Saisie manuelle</CardTitle>
                  <CardDescription>Renseignez directement les membres à ajouter dans le tableau ci-dessous.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addRow}><Plus className="mr-1 h-4 w-4" />Ajouter une ligne</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-32">Matricule</TableHead>
                      <TableHead className="min-w-32">Nom *</TableHead>
                      <TableHead className="min-w-32">Prénom *</TableHead>
                      <TableHead className="min-w-40">Date adhésion *</TableHead>
                      <TableHead className="min-w-32">Type</TableHead>
                      <TableHead className="min-w-32">Statut</TableHead>
                      <TableHead className="min-w-32">Email</TableHead>
                      <TableHead className="min-w-32">Téléphone</TableHead>
                      <TableHead className="min-w-32">Département</TableHead>
                      <TableHead className="min-w-32">Poste</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow key={row.id}>
                        <TableCell><Input value={row.matricule} onChange={e => updateRow(row.id, "matricule", e.target.value)} placeholder="Auto" className="h-8 text-sm w-28" /></TableCell>
                        <TableCell><Input value={row.nom} onChange={e => updateRow(row.id, "nom", e.target.value.toUpperCase())} placeholder="NOM" className="h-8 text-sm w-28" /></TableCell>
                        <TableCell><Input value={row.prenom} onChange={e => updateRow(row.id, "prenom", e.target.value)} placeholder="Prénom" className="h-8 text-sm w-28" /></TableCell>
                        <TableCell><Input type="date" value={row.dateAdhesion} onChange={e => updateRow(row.id, "dateAdhesion", e.target.value)} className="h-8 text-sm w-36" /></TableCell>
                        <TableCell>
                          <Select value={row.typeAdhesion} onValueChange={v => updateRow(row.id, "typeAdhesion", v)}>
                            <SelectTrigger className="h-8 text-sm w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ordinaire">Ordinaire</SelectItem>
                              <SelectItem value="exceptionnel">Exceptionnel</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={row.statut} onValueChange={v => updateRow(row.id, "statut", v)}>
                            <SelectTrigger className="h-8 text-sm w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="actif">Actif</SelectItem>
                              <SelectItem value="inactif">Inactif</SelectItem>
                              <SelectItem value="defaillant">Défaillant</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input value={row.email} onChange={e => updateRow(row.id, "email", e.target.value)} placeholder="email@..." type="email" className="h-8 text-sm w-36" /></TableCell>
                        <TableCell><Input value={row.telephone} onChange={e => updateRow(row.id, "telephone", e.target.value)} placeholder="07..." className="h-8 text-sm w-28" /></TableCell>
                        <TableCell><Input value={row.departement} onChange={e => updateRow(row.id, "departement", e.target.value)} placeholder="Dépt." className="h-8 text-sm w-28" /></TableCell>
                        <TableCell><Input value={row.poste} onChange={e => updateRow(row.id, "poste", e.target.value)} placeholder="Poste" className="h-8 text-sm w-28" /></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">{rows.length} ligne(s) • Si matricule vide, un matricule automatique sera généré</p>
                <Button onClick={importManual} disabled={importing}>
                  {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Import...</> : <><Upload className="mr-2 h-4 w-4" />Importer {rows.filter(r => r.nom && r.prenom).length} membre(s)</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
