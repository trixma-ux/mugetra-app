import { Router, type IRouter } from "express";
import { db, commissariatControlesTable, ecrituresComptablesTable, cotisationsTable, assistancesTable, pretsTable } from "@workspace/db";
import { desc, gte, lte, and } from "drizzle-orm";
import { CreateControleBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

router.get("/commissariat/controles", requireAuth, async (_req, res): Promise<void> => {
  const data = await db.select().from(commissariatControlesTable).orderBy(desc(commissariatControlesTable.dateControle));
  res.json(data);
});

// Art. 33.8 R.I. : le commissariat aux comptes doit contrôler la mutuelle au moins deux fois par an.
router.post("/commissariat/controles", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateControleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = (req as any).user as JwtPayload;
  const [c] = await db.insert(commissariatControlesTable).values({ ...parsed.data, controleurUserId: user.userId }).returning();
  res.status(201).json(c);
});

// GET /commissariat/synthese?annee=2026 — vue de contrôle en lecture seule (Art.33.6 R.I. : accès à toute pièce utile)
router.get("/commissariat/synthese", requireAuth, async (req, res): Promise<void> => {
  const annee = Number(req.query.annee) || new Date().getFullYear();
  const debut = `${annee}-01-01`;
  const fin = `${annee}-12-31`;

  const ecritures = await db.select().from(ecrituresComptablesTable).where(
    and(gte(ecrituresComptablesTable.date, debut), lte(ecrituresComptablesTable.date, fin))
  );
  const encaissements = ecritures.filter(e => e.type === "encaissement").reduce((s, e) => s + e.montant, 0);
  const decaissements = ecritures.filter(e => e.type === "decaissement").reduce((s, e) => s + e.montant, 0);

  const cotisations = await db.select().from(cotisationsTable);
  const assistancesPayees = await db.select().from(assistancesTable);
  const prets = await db.select().from(pretsTable);

  const controlesCetteAnnee = (await db.select().from(commissariatControlesTable))
    .filter(c => c.dateControle?.startsWith(String(annee)));

  res.json({
    annee,
    tresorerie: { encaissements, decaissements, solde: encaissements - decaissements },
    cotisations: { nombre: cotisations.length, total: cotisations.reduce((s, c) => s + c.montant, 0) },
    assistances: {
      total: assistancesPayees.length,
      payees: assistancesPayees.filter(a => a.statut === "payee").length,
      montantVerse: assistancesPayees.filter(a => a.statut === "payee").reduce((s, a) => s + (a.montant ?? 0), 0),
    },
    prets: {
      total: prets.length,
      encours: prets.filter(p => p.statut === "accorde").length,
      montantEncours: prets.filter(p => p.statut === "accorde").reduce((s, p) => s + (p.montantAccorde ?? 0), 0),
    },
    controlesEffectuesCetteAnnee: controlesCetteAnnee.length,
    // Art.33.8 R.I. : minimum 2 contrôles par an
    conformeFrequenceControle: controlesCetteAnnee.length >= 2,
  });
});

export default router;
