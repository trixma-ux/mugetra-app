import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, cotisationsTable, membresTable, parametresTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const MOIS_LABELS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

function parseDate(val: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === "number") {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  const fr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return new Date().toISOString().slice(0, 10);
}

function normalizeKey(key: string): string {
  return key.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/'/g, "");
}

function mapRow(raw: Record<string, any>): Record<string, any> {
  const MAP: Record<string, string> = {
    matricule: "matricule",
    annee: "annee", annee_: "annee",
    mois: "mois", mois_: "mois",
    montant: "montant",
    date_paiement: "datePaiement", date_reglement: "datePaiement",
    datepaiement: "datePaiement", datereglement: "datePaiement",
    mode_paiement: "modePaiement", modepaiement: "modePaiement",
    type_reglement: "modePaiement", typereglement: "modePaiement",
    note: "note", notes: "note", observation: "note",
  };
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(raw)) {
    const k = normalizeKey(key);
    if (MAP[k]) out[MAP[k]] = val;
  }
  return out;
}

interface ImportCotResult {
  ligne: number;
  matricule: string;
  periode: string;
  montant: number;
  statut: "ok" | "erreur" | "ignore";
  message?: string;
}

/** POST /cotisations/import-excel — import mensuel (même mois pour tous) */
router.post("/cotisations/import-excel", requireAuth, upload.single("fichier"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  // Paramètres du mois ciblé
  const annee = parseInt(req.body?.annee ?? req.query.annee as string);
  const mois = parseInt(req.body?.mois ?? req.query.mois as string);
  const datePaiement = req.body?.datePaiement ?? req.query.datePaiement ?? new Date().toISOString().slice(0, 10);
  const modePaiement = req.body?.modePaiement ?? "especes";

  if (!annee || !mois || mois < 1 || mois > 12) {
    res.status(400).json({ error: "Paramètres annee et mois obligatoires (1-12)" });
    return;
  }

  // Charger le montant par défaut
  const params = await db.select().from(parametresTable);
  const paramsMap: Record<string, number> = { cotisationMensuelle: 7500 };
  for (const p of params) paramsMap[p.cle] = Number(p.valeur);
  const montantDefaut = paramsMap.cotisationMensuelle;

  let rows: Record<string, any>[] = [];
  if (req.file) {
    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  } else if (Array.isArray(req.body?.cotisations)) {
    rows = req.body.cotisations;
  } else {
    res.status(400).json({ error: "Fournissez un fichier Excel ou un tableau JSON cotisations" });
    return;
  }

  if (rows.length === 0) { res.status(400).json({ error: "Aucune ligne à importer" }); return; }
  if (rows.length > 1000) { res.status(400).json({ error: "Maximum 1000 lignes par import" }); return; }

  const membres = await db.select().from(membresTable);
  const membreByMatricule = Object.fromEntries(membres.map(m => [m.matricule.trim().toUpperCase(), m]));

  const results: ImportCotResult[] = [];
  let importes = 0, erreurs = 0, ignores = 0;

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapRow(rows[i]);
    const matricule = String(mapped.matricule ?? rows[i].matricule ?? "").trim().toUpperCase();
    const montant = Math.round(Number(mapped.montant || montantDefaut));
    const ligne = i + 2;
    const periode = `${MOIS_LABELS[mois - 1]} ${annee}`;

    if (!matricule) {
      results.push({ ligne, matricule: "(vide)", periode, montant, statut: "erreur", message: "Matricule manquant" });
      erreurs++; continue;
    }

    const membre = membreByMatricule[matricule];
    if (!membre) {
      results.push({ ligne, matricule, periode, montant, statut: "erreur", message: "Matricule introuvable" });
      erreurs++; continue;
    }

    // Vérifier doublon
    const existant = await db.select().from(cotisationsTable).where(
      and(eq(cotisationsTable.membreId, membre.id), eq(cotisationsTable.annee, annee), eq(cotisationsTable.mois, mois))
    );
    if (existant.length > 0) {
      results.push({ ligne, matricule, periode, montant, statut: "ignore", message: "Déjà enregistré pour cette période" });
      ignores++; continue;
    }

    try {
      await db.insert(cotisationsTable).values({
        membreId: membre.id, annee, mois, montant,
        datePaiement: parseDate(mapped.datePaiement) || datePaiement,
        modePaiement,
        note: mapped.note ? String(mapped.note) : undefined,
        createdById: user.userId,
      });
      results.push({ ligne, matricule, periode, montant, statut: "ok" });
      importes++;
    } catch (err: any) {
      results.push({ ligne, matricule, periode, montant, statut: "erreur", message: err?.message ?? "Erreur" });
      erreurs++;
    }
  }

  res.json({ importes, erreurs, ignores, total: rows.length, annee, mois, periode: `${MOIS_LABELS[mois - 1]} ${annee}`, results });
});

/** POST /cotisations/import-arrieres — import arriérés multi-mois */
router.post("/cotisations/import-arrieres", requireAuth, upload.single("fichier"), async (req, res): Promise<void> => {
  const user = (req as any).user as JwtPayload;

  const params = await db.select().from(parametresTable);
  const paramsMap: Record<string, number> = { cotisationMensuelle: 7500 };
  for (const p of params) paramsMap[p.cle] = Number(p.valeur);
  const montantDefaut = paramsMap.cotisationMensuelle;

  let rows: Record<string, any>[] = [];
  if (req.file) {
    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  } else if (Array.isArray(req.body?.cotisations)) {
    rows = req.body.cotisations;
  } else {
    res.status(400).json({ error: "Fournissez un fichier Excel ou un tableau JSON cotisations" });
    return;
  }

  if (rows.length === 0) { res.status(400).json({ error: "Aucune ligne à importer" }); return; }
  if (rows.length > 2000) { res.status(400).json({ error: "Maximum 2000 lignes par import" }); return; }

  const membres = await db.select().from(membresTable);
  const membreByMatricule = Object.fromEntries(membres.map(m => [m.matricule.trim().toUpperCase(), m]));

  const results: ImportCotResult[] = [];
  let importes = 0, erreurs = 0, ignores = 0;

  for (let i = 0; i < rows.length; i++) {
    const mapped = mapRow(rows[i]);
    const matricule = String(mapped.matricule ?? rows[i].matricule ?? "").trim().toUpperCase();
    const annee = parseInt(String(mapped.annee ?? "0"));
    const mois = parseInt(String(mapped.mois ?? "0"));
    const montant = Math.round(Number(mapped.montant || montantDefaut));
    const ligne = i + 2;
    const periode = `${MOIS_LABELS[mois - 1] ?? "?"} ${annee}`;

    if (!matricule) {
      results.push({ ligne, matricule: "(vide)", periode, montant, statut: "erreur", message: "Matricule manquant" });
      erreurs++; continue;
    }
    if (!annee || !mois || mois < 1 || mois > 12 || annee < 2000) {
      results.push({ ligne, matricule, periode, montant, statut: "erreur", message: `Période invalide (annee=${annee}, mois=${mois})` });
      erreurs++; continue;
    }

    const membre = membreByMatricule[matricule];
    if (!membre) {
      results.push({ ligne, matricule, periode, montant, statut: "erreur", message: "Matricule introuvable" });
      erreurs++; continue;
    }

    const existant = await db.select().from(cotisationsTable).where(
      and(eq(cotisationsTable.membreId, membre.id), eq(cotisationsTable.annee, annee), eq(cotisationsTable.mois, mois))
    );
    if (existant.length > 0) {
      results.push({ ligne, matricule, periode, montant, statut: "ignore", message: "Déjà enregistré pour cette période" });
      ignores++; continue;
    }

    try {
      await db.insert(cotisationsTable).values({
        membreId: membre.id, annee, mois, montant,
        datePaiement: parseDate(mapped.datePaiement) || new Date().toISOString().slice(0, 10),
        modePaiement: mapped.modePaiement ? String(mapped.modePaiement) : "regularisation",
        note: mapped.note ? String(mapped.note) : undefined,
        createdById: user.userId,
      });
      results.push({ ligne, matricule, periode, montant, statut: "ok" });
      importes++;
    } catch (err: any) {
      results.push({ ligne, matricule, periode, montant, statut: "erreur", message: err?.message ?? "Erreur" });
      erreurs++;
    }
  }

  res.json({ importes, erreurs, ignores, total: rows.length, results });
});

/** GET /cotisations/import/template-mensuel */
router.get("/cotisations/import/template-mensuel", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const examples = [
    { matricule: "NPG-2024-001", montant: 7500, note: "" },
    { matricule: "NPG-2024-002", montant: 7500, note: "" },
    { matricule: "NPG-2024-003", montant: 7500, note: "Paiement groupé" },
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(examples, { header: ["matricule", "montant", "note"] });
  ws["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "Cotisations");

  const instr = XLSX.utils.aoa_to_sheet([
    ["MODÈLE — IMPORT MENSUEL DE COTISATIONS"],
    [""],
    ["UTILISATION:", `Renseignez les matricules des membres qui ont payé pour le mois sélectionné.`],
    ["COLONNES:", "matricule (obligatoire), montant (optionnel — défaut : paramètre système), note (optionnel)"],
    ["NOTE:", "Les membres déjà enregistrés pour le même mois seront ignorés (pas de doublon)."],
  ]);
  instr["!cols"] = [{ wch: 15 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, instr, "Instructions");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="mugetra-cotisations-mensuel-modele.xlsx"');
  res.send(buf);
});

/** GET /cotisations/import/template-arrieres */
router.get("/cotisations/import/template-arrieres", requireAuth, async (_req, res): Promise<void> => {
  const examples = [
    { matricule: "NPG-2024-001", annee: 2024, mois: 1, montant: 7500, mode_paiement: "regularisation", note: "Janvier 2024" },
    { matricule: "NPG-2024-001", annee: 2024, mois: 2, montant: 7500, mode_paiement: "regularisation", note: "Février 2024" },
    { matricule: "NPG-2024-002", annee: 2023, mois: 11, montant: 7500, mode_paiement: "virement", note: "" },
    { matricule: "NPG-2024-002", annee: 2023, mois: 12, montant: 7500, mode_paiement: "virement", note: "" },
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(examples, {
    header: ["matricule", "annee", "mois", "montant", "mode_paiement", "note"],
  });
  ws["!cols"] = [{ wch: 20 }, { wch: 8 }, { wch: 6 }, { wch: 10 }, { wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, "Arriérés");

  const instr = XLSX.utils.aoa_to_sheet([
    ["MODÈLE — IMPORT ARRIÉRÉS / RÉGULARISATION"],
    [""],
    ["UTILISATION:", "Chaque ligne représente un mois à régulariser pour un membre."],
    ["COLONNES OBLIGATOIRES:", "matricule, annee (ex: 2024), mois (1-12)"],
    ["COLONNES OPTIONNELLES:", "montant, mode_paiement, note"],
    ["MODE PAIEMENT:", "especes | virement | cheque | regularisation"],
    ["NOTE:", "Les entrées déjà existantes (même matricule + mois + année) seront ignorées."],
  ]);
  instr["!cols"] = [{ wch: 25 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, instr, "Instructions");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="mugetra-cotisations-arrieres-modele.xlsx"');
  res.send(buf);
});

export default router;
