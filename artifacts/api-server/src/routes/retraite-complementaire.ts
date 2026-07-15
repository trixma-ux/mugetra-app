import { Router, type IRouter } from "express";
import { db, cotisationsRcTable, membresTable, parametresTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateCotisationRcBody, RachatPartielRcBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function loadParams(): Promise<Record<string, number>> {
  const rows = await db.select().from(parametresTable);
  const p: Record<string, number> = { cotisationMinRc: 2500, tauxRachatPartielMaxRc: 0.5, moisMinRachatRc: 60 };
  for (const r of rows) p[r.cle] = Number(r.valeur);
  return p;
}

router.get("/retraite-complementaire/:membreId", requireAuth, async (req, res): Promise<void> => {
  const membreId = Number(req.params.membreId);
  const cotisations = await db.select().from(cotisationsRcTable).where(eq(cotisationsRcTable.membreId, membreId)).orderBy(desc(cotisationsRcTable.annee));
  const total = cotisations.reduce((s, c) => s + c.montant, 0);
  res.json({ membreId, nombreCotisations: cotisations.length, totalCotise: total, cotisations });
});

// Art. 5 Fiche RC : cotisation mensuelle minimum de 2 500 FCFA, par tranches de 2 500 FCFA
router.post("/retraite-complementaire", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCotisationRcBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;
  if (d.montant % 2500 !== 0) {
    res.status(400).json({ error: "Le montant doit être un multiple de 2 500 FCFA (Fiche RC, Art. 5)." });
    return;
  }
  const [membre] = await db.select().from(membresTable).where(eq(membresTable.id, d.membreId));
  if (!membre) { res.status(404).json({ error: "Membre introuvable" }); return; }
  if (!membre.retraiteComplementaire) {
    res.status(400).json({ error: "Ce membre n'a pas souscrit au régime de retraite complémentaire (Fiche RC, Art. 3)." });
    return;
  }
  const [c] = await db.insert(cotisationsRcTable).values(d).returning();
  res.status(201).json(c);
});

// Art. 7 Fiche RC : rachat partiel possible après 60 mois de cotisation, plafonné à 50% du capital acquis
router.post("/retraite-complementaire/rachat-partiel", requireAuth, async (req, res): Promise<void> => {
  const parsed = RachatPartielRcBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;
  const params = await loadParams();

  const cotisations = await db.select().from(cotisationsRcTable).where(eq(cotisationsRcTable.membreId, d.membreId));
  if (cotisations.length < (params.moisMinRachatRc ?? 60)) {
    res.status(400).json({ error: `Le rachat partiel n'est possible qu'après ${params.moisMinRachatRc ?? 60} mois de cotisation (Fiche RC, Art. 7). Ce membre en a ${cotisations.length}.` });
    return;
  }
  const capitalAcquis = cotisations.reduce((s, c) => s + c.montant, 0);
  const plafond = Math.round(capitalAcquis * (params.tauxRachatPartielMaxRc ?? 0.5));
  if (d.montant > plafond) {
    res.status(400).json({ error: `Le rachat demandé dépasse le plafond autorisé de ${plafond.toLocaleString("fr-FR")} FCFA (50% du capital acquis, Art. 7).` });
    return;
  }
  res.json({ membreId: d.membreId, capitalAcquis, plafondAutorise: plafond, montantRachete: d.montant, capitalRestant: capitalAcquis - d.montant });
});

export default router;
