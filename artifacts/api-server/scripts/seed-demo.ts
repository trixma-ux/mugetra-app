/**
 * Seed de démonstration IDEMPOTENT : membres fictifs (matricules DEMO-xxx) et leurs
 * cotisations des 6 derniers mois clos.
 *
 *   DATABASE_URL=... pnpm --filter @workspace/api-server run seed-demo
 *
 * - membres : upsert par matricule (contrainte unique) ;
 * - cotisations : une seule ligne par (membre, année, mois) — ignorée si elle existe déjà.
 * Les données réelles (matricules non DEMO-) ne sont jamais modifiées.
 */
import { and, eq } from "drizzle-orm";
import { db, membresTable, cotisationsTable } from "@workspace/db";
import data from "./seed-data.json" with { type: "json" };

/** Les `n` derniers mois clos avant `ref` (du plus ancien au plus récent). */
export function derniersMois(n: number, ref = new Date()): { annee: number; mois: number }[] {
  const out: { annee: number; mois: number }[] = [];
  for (let i = n; i >= 1; i--) {
    const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1));
    out.push({ annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1 });
  }
  return out;
}

async function main() {
  const periodes = derniersMois(6);
  let nMembres = 0;
  let nCotisations = 0;
  for (const m of data.membres) {
    const values = {
      matricule: m.matricule, nom: m.nom, prenom: m.prenom, telephone: m.telephone, whatsapp: m.telephone,
      departement: m.departement, poste: m.poste, dateAdhesion: m.dateAdhesion, dateCdi: m.dateAdhesion,
      typeCdi: m.typeCdi, statut: m.statut ?? "actif",
    };
    const { matricule, ...update } = values;
    const [membre] = await db.insert(membresTable).values(values)
      .onConflictDoUpdate({ target: membresTable.matricule, set: update }).returning();
    nMembres++;
    // Les mois payés sont les plus anciens de la période (un défaillant a cessé de payer).
    for (const { annee, mois } of periodes.slice(0, m.moisPayes)) {
      const exists = await db.select({ id: cotisationsTable.id }).from(cotisationsTable)
        .where(and(eq(cotisationsTable.membreId, membre.id), eq(cotisationsTable.annee, annee), eq(cotisationsTable.mois, mois)));
      if (exists.length > 0) continue;
      await db.insert(cotisationsTable).values({
        membreId: membre.id, annee, mois, montant: data.cotisationMensuelle,
        datePaiement: `${annee}-${String(mois).padStart(2, "0")}-28`, modePaiement: m.mode, note: "Démo",
      });
      nCotisations++;
    }
  }
  console.log(`Seed démo OK : ${nMembres} membres (upsert), ${nCotisations} cotisation(s) ajoutée(s).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
