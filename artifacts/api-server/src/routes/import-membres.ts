import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, membresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/** Colonnes acceptées dans le fichier Excel / CSV */
const COLUMN_MAP: Record<string, string> = {
  matricule: "matricule",
  nom: "nom",
  prenom: "prenom",
  "prénom": "prenom",
  email: "email",
  telephone: "telephone",
  "téléphone": "telephone",
  "date_naissance": "dateNaissance",
  "date naissance": "dateNaissance",
  "datenaissance": "dateNaissance",
  "date_embauche": "dateEmbauche",
  "date embauche": "dateEmbauche",
  "dateembauche": "dateEmbauche",
  "date_cdi": "dateCdi",
  "date cdi": "dateCdi",
  "datecdi": "dateCdi",
  "date_adhesion": "dateAdhesion",
  "date adhesion": "dateAdhesion",
  "dateadhesion": "dateAdhesion",
  "date d'adhésion": "dateAdhesion",
  statut: "statut",
  "type_adhesion": "typeAdhesion",
  "type adhesion": "typeAdhesion",
  "typeadhesion": "typeAdhesion",
  "type d'adhésion": "typeAdhesion",
  departement: "departement",
  "département": "departement",
  poste: "poste",
  "situation_familiale": "situationFamiliale",
  "situation familiale": "situationFamiliale",
  "situationfamiliale": "situationFamiliale",
  "retraite_complementaire": "retraiteComplementaire",
  "retraite complementaire": "retraiteComplementaire",
  "renonciation_assistances": "renonciationAssistances",
  "renonciation assistances": "renonciationAssistances",
};

function parseBoolean(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val !== 0;
  const s = String(val ?? "").toLowerCase().trim();
  return s === "oui" || s === "true" || s === "1" || s === "yes";
}

function parseDate(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  if (!s) return undefined;
  // DD/MM/YYYY → YYYY-MM-DD
  const fr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  // already ISO
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return undefined;
}

function normalizeRow(raw: Record<string, any>): Record<string, any> {
  const row: Record<string, any> = {};
  for (const [key, val] of Object.entries(raw)) {
    const mapped = COLUMN_MAP[key.toLowerCase().trim()];
    if (mapped) row[mapped] = val;
  }
  return row;
}

function generateMatricule(): string {
  return `MBR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

interface ImportResult {
  ligne: number;
  matricule: string;
  nom: string;
  prenom: string;
  statut: "ok" | "erreur" | "ignore";
  message?: string;
}

async function processRows(rows: Record<string, any>[]): Promise<{ results: ImportResult[]; importes: number; erreurs: number; ignores: number }> {
  const results: ImportResult[] = [];
  let importes = 0;
  let erreurs = 0;
  let ignores = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = normalizeRow(rows[i]);
    const num = i + 2; // ligne Excel (1=header)

    const nom = String(raw.nom ?? "").trim();
    const prenom = String(raw.prenom ?? "").trim();
    const matricule = raw.matricule ? String(raw.matricule).trim() : generateMatricule();
    const dateAdhesion = parseDate(raw.dateAdhesion) ?? new Date().toISOString().slice(0, 10);

    if (!nom || !prenom) {
      results.push({ ligne: num, matricule, nom, prenom, statut: "erreur", message: "Nom et prénom obligatoires" });
      erreurs++;
      continue;
    }

    // Vérifier doublon matricule
    if (raw.matricule) {
      const existing = await db.select().from(membresTable).where(eq(membresTable.matricule, matricule));
      if (existing.length > 0) {
        results.push({ ligne: num, matricule, nom, prenom, statut: "ignore", message: `Matricule ${matricule} existe déjà` });
        ignores++;
        continue;
      }
    }

    try {
      const typeAdhesion = ["ordinaire", "exceptionnel"].includes(String(raw.typeAdhesion ?? "").toLowerCase())
        ? String(raw.typeAdhesion).toLowerCase()
        : "ordinaire";
      const statut = ["actif", "inactif", "radie", "decede", "defaillant", "demissionnaire", "honneur"].includes(String(raw.statut ?? "").toLowerCase())
        ? String(raw.statut).toLowerCase()
        : "actif";

      await db.insert(membresTable).values({
        matricule,
        nom,
        prenom,
        email: raw.email ? String(raw.email).trim() || null : null,
        telephone: raw.telephone ? String(raw.telephone).trim() || null : null,
        dateNaissance: parseDate(raw.dateNaissance),
        dateEmbauche: parseDate(raw.dateEmbauche),
        dateCdi: parseDate(raw.dateCdi),
        dateAdhesion,
        statut,
        typeAdhesion,
        situationFamiliale: raw.situationFamiliale ? String(raw.situationFamiliale).trim() || null : null,
        departement: raw.departement ? String(raw.departement).trim() || null : null,
        poste: raw.poste ? String(raw.poste).trim() || null : null,
        retraiteComplementaire: parseBoolean(raw.retraiteComplementaire),
        renonciationAssistances: parseBoolean(raw.renonciationAssistances),
      });

      results.push({ ligne: num, matricule, nom, prenom, statut: "ok" });
      importes++;
    } catch (err: any) {
      results.push({ ligne: num, matricule, nom, prenom, statut: "erreur", message: err?.message ?? "Erreur inconnue" });
      erreurs++;
    }
  }

  return { results, importes, erreurs, ignores };
}

/** POST /membres/import — accepte JSON (liste) ou multipart (Excel/CSV) */
router.post("/membres/import", requireAuth, upload.single("fichier"), async (req, res): Promise<void> => {
  let rows: Record<string, any>[] = [];

  if (req.file) {
    // Fichier Excel ou CSV
    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  } else if (Array.isArray(req.body)) {
    // JSON array direct
    rows = req.body;
  } else if (Array.isArray(req.body?.membres)) {
    rows = req.body.membres;
  } else {
    res.status(400).json({ error: "Fournissez un fichier Excel/CSV ou un tableau JSON" });
    return;
  }

  if (rows.length === 0) {
    res.status(400).json({ error: "Aucune ligne à importer" });
    return;
  }

  if (rows.length > 500) {
    res.status(400).json({ error: "Maximum 500 membres par import" });
    return;
  }

  const { results, importes, erreurs, ignores } = await processRows(rows);
  res.json({ importes, erreurs, ignores, total: rows.length, results });
});

/** GET /membres/import/template — télécharge un fichier Excel modèle */
router.get("/membres/import/template", requireAuth, async (_req, res): Promise<void> => {
  const headers = [
    "matricule", "nom", "prenom", "email", "telephone",
    "date_naissance", "date_embauche", "date_cdi", "date_adhesion",
    "statut", "type_adhesion", "departement", "poste",
    "situation_familiale", "retraite_complementaire", "renonciation_assistances",
  ];

  const examples = [
    {
      matricule: "NPG-2024-001",
      nom: "KONÉ",
      prenom: "Mamadou",
      email: "m.kone@gandour.ci",
      telephone: "0700000000",
      date_naissance: "15/04/1985",
      date_embauche: "01/06/2018",
      date_cdi: "01/06/2020",
      date_adhesion: "01/01/2024",
      statut: "actif",
      type_adhesion: "ordinaire",
      departement: "Production",
      poste: "Opérateur",
      situation_familiale: "marié",
      retraite_complementaire: "non",
      renonciation_assistances: "non",
    },
    {
      matricule: "NPG-2024-002",
      nom: "DIALLO",
      prenom: "Fatoumata",
      email: "",
      telephone: "0701000001",
      date_naissance: "22/11/1990",
      date_embauche: "15/03/2021",
      date_cdi: "15/03/2021",
      date_adhesion: "01/01/2024",
      statut: "actif",
      type_adhesion: "exceptionnel",
      departement: "Comptabilité",
      poste: "Comptable",
      situation_familiale: "célibataire",
      retraite_complementaire: "non",
      renonciation_assistances: "non",
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(examples, { header: headers });

  // Largeur colonnes
  ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 2, 18) }));

  XLSX.utils.book_append_sheet(wb, ws, "Membres");

  // Feuille instructions
  const instr = XLSX.utils.aoa_to_sheet([
    ["INSTRUCTIONS D'IMPORT — MUGETRA-NPG.CI"],
    [""],
    ["COLONNES OBLIGATOIRES:", "nom, prenom, date_adhesion"],
    ["COLONNES OPTIONNELLES:", "toutes les autres"],
    [""],
    ["FORMATS DE DATE:", "JJ/MM/AAAA ou AAAA-MM-JJ"],
    ["STATUT:", "actif | inactif | radie | decede | defaillant | demissionnaire | honneur"],
    ["TYPE ADHÉSION:", "ordinaire | exceptionnel"],
    ["BOOLÉENS:", "oui / non   ou   1 / 0"],
    [""],
    ["NOTE:", "Si matricule vide, un matricule automatique sera généré"],
    ["NOTE:", "Un matricule existant sera ignoré (pas de doublon)"],
    ["NOTE:", "Maximum 500 membres par fichier"],
  ]);
  instr["!cols"] = [{ wch: 25 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, instr, "Instructions");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="mugetra-import-membres-modele.xlsx"');
  res.send(buf);
});

export default router;
