import { Router, type IRouter } from "express";
import { db, ecrituresComptablesTable, budgetsTable, cotisationsTable, parametresTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { CreateEcritureBody, ListEcrituresQueryParams, CreateBudgetBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

// ─────────────────────────── JOURNAL / GRAND LIVRE ───────────────────────────

router.get("/comptabilite/ecritures", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListEcrituresQueryParams.safeParse(req.query);
  const q = (parsed.success ? parsed.data : {}) as any;
  const conditions: any[] = [];
  if (q.annee) { conditions.push(gte(ecrituresComptablesTable.date, `${q.annee}-01-01`)); conditions.push(lte(ecrituresComptablesTable.date, `${q.annee}-12-31`)); }
  if (q.compte) conditions.push(eq(ecrituresComptablesTable.compte, q.compte));
  if (q.categorie) conditions.push(eq(ecrituresComptablesTable.categorie, q.categorie));
  const where = conditions.length ? and(...conditions) : undefined;
  const data = await db.select().from(ecrituresComptablesTable).where(where).orderBy(desc(ecrituresComptablesTable.date));
  res.json(data);
});

router.post("/comptabilite/ecritures", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateEcritureBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = (req as any).user as JwtPayload;
  const [e] = await db.insert(ecrituresComptablesTable).values({ ...parsed.data, createdById: user.userId }).returning();
  res.status(201).json(e);
});

// GET /comptabilite/balance?annee=2026 — état de trésorerie + répartition caisse/banque (Art.75 R.I.)
router.get("/comptabilite/balance", requireAuth, async (req, res): Promise<void> => {
  const annee = Number(req.query.annee) || new Date().getFullYear();
  const ecritures = await db.select().from(ecrituresComptablesTable).where(
    and(gte(ecrituresComptablesTable.date, `${annee}-01-01`), lte(ecrituresComptablesTable.date, `${annee}-12-31`))
  );
  const parComptes = ["caisse", "banque"].map(compte => {
    const lignes = ecritures.filter(e => e.compte === compte);
    const encaissements = lignes.filter(e => e.type === "encaissement").reduce((s, e) => s + e.montant, 0);
    const decaissements = lignes.filter(e => e.type === "decaissement").reduce((s, e) => s + e.montant, 0);
    return { compte, encaissements, decaissements, solde: encaissements - decaissements };
  });
  const parCategorie = Object.entries(
    ecritures.reduce((acc: Record<string, number>, e) => {
      const signe = e.type === "encaissement" ? 1 : -1;
      acc[e.categorie] = (acc[e.categorie] ?? 0) + signe * e.montant;
      return acc;
    }, {})
  ).map(([categorie, montant]) => ({ categorie, montant }));

  res.json({
    annee,
    comptes: parComptes,
    soldeGlobal: parComptes.reduce((s, c) => s + c.solde, 0),
    parCategorie,
  });
});

// ─────────────────────────── BUDGETS ───────────────────────────

router.get("/comptabilite/budgets", requireAuth, async (req, res): Promise<void> => {
  const annee = req.query.annee ? Number(req.query.annee) : undefined;
  const data = annee
    ? await db.select().from(budgetsTable).where(eq(budgetsTable.annee, annee))
    : await db.select().from(budgetsTable).orderBy(desc(budgetsTable.annee));
  res.json(data);
});

router.post("/comptabilite/budgets", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBudgetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [b] = await db.insert(budgetsTable).values(parsed.data).returning();
  res.status(201).json(b);
});

/**
 * GET /comptabilite/budget-be/calcul?annee=2026
 * Calcule automatiquement le budget de fonctionnement du Bureau Exécutif
 * conformément à l'Article 80 du Règlement Intérieur :
 *   5 % des cotisations annuelles des membres + 15 % des dons/subventions/ristournes.
 */
router.get("/comptabilite/budget-be/calcul", requireAuth, async (req, res): Promise<void> => {
  const annee = Number(req.query.annee) || new Date().getFullYear();
  const cotisations = await db.select().from(cotisationsTable).where(eq(cotisationsTable.annee, annee));
  const totalCotisations = cotisations.reduce((s, c) => s + c.montant, 0);

  const ecritures = await db.select().from(ecrituresComptablesTable).where(
    and(gte(ecrituresComptablesTable.date, `${annee}-01-01`), lte(ecrituresComptablesTable.date, `${annee}-12-31`),
      eq(ecrituresComptablesTable.categorie, "don"))
  );
  const totalDons = ecritures.filter(e => e.type === "encaissement").reduce((s, e) => s + e.montant, 0);

  const paramsRows = await db.select().from(parametresTable);
  const params: Record<string, number> = { pctBudgetBeCotisations: 0.05, pctBudgetBeDons: 0.15 };
  for (const p of paramsRows) params[p.cle] = Number(p.valeur);

  const montant = Math.round(totalCotisations * params.pctBudgetBeCotisations + totalDons * params.pctBudgetBeDons);
  res.json({
    annee, totalCotisations, totalDons,
    pctCotisations: params.pctBudgetBeCotisations, pctDons: params.pctBudgetBeDons,
    budgetFonctionnementBeSuggere: montant,
  });
});

export default router;
