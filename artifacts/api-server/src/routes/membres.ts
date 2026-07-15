import { Router, type IRouter } from "express";
import { db, membresTable, personnesDeclareeesTable, cotisationsTable, usersTable, parametresTable, mouvementsEffectifsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { eq, or, ilike, and, sql, desc, ne, isNull } from "drizzle-orm";
import {
  CreateMembreBody, UpdateMembreBody, UpdateMembreStatutBody,
  DeclarerDecesMembreBody, ListMembresQueryParams,
  GetMembreParams, UpdateMembreParams, UpdateMembreStatutParams,
  GetMembreCarenceParams, DeclarerDecesMembreParams, DeleteMembreParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function buildMembreResponse(m: any, personnes?: any[]) {
  return {
    id: m.id, matricule: m.matricule, nom: m.nom, prenom: m.prenom,
    email: m.email, telephone: m.telephone,
    dateNaissance: m.dateNaissance, dateEmbauche: m.dateEmbauche,
    dateCdi: m.dateCdi, dateAdhesion: m.dateAdhesion,
    statut: m.statut, typeAdhesion: m.typeAdhesion,
    situationFamiliale: m.situationFamiliale, departement: m.departement,
    poste: m.poste, retraiteComplementaire: m.retraiteComplementaire,
    renonciationAssistances: m.renonciationAssistances, permisConduire: m.permisConduire,
    createdAt: m.createdAt?.toISOString?.() ?? m.createdAt,
  };
}

router.get("/membres/defaillants", requireAuth, async (req, res): Promise<void> => {
  const membres = await db.select().from(membresTable).where(eq(membresTable.statut, "defaillant"));
  const result = await Promise.all(membres.map(async (m) => {
    const cotisations = await db.select().from(cotisationsTable).where(eq(cotisationsTable.membreId, m.id));
    const totalPaye = cotisations.reduce((s, c) => s + c.montant, 0);
    const moisDepuisAdhesion = m.dateAdhesion
      ? Math.floor((Date.now() - new Date(m.dateAdhesion).getTime()) / (30 * 24 * 3600 * 1000))
      : 0;
    const montantDu = Math.max(0, moisDepuisAdhesion * 7500 - totalPaye);
    return { ...buildMembreResponse(m), montantDu, moisEnArrieres: Math.ceil(montantDu / 7500) };
  }));
  res.json(result);
});

router.get("/membres", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListMembresQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : { page: 1, limit: 20 };
  const { page = 1, limit = 20, statut, search } = params as any;

  const conditions = [];
  if (statut) conditions.push(eq(membresTable.statut, statut));
  if (search) conditions.push(or(ilike(membresTable.nom, `%${search}%`), ilike(membresTable.prenom, `%${search}%`), ilike(membresTable.matricule, `%${search}%`)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(membresTable).where(where);
  const total = Number(countResult?.count ?? 0);
  const data = await db.select().from(membresTable).where(where).orderBy(desc(membresTable.createdAt)).limit(limit).offset((page - 1) * limit);

  res.json({ data: data.map((m) => buildMembreResponse(m)), total, page, limit });
});

router.post("/membres", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMembreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { conjoint, enfants, parents, beauxParents, ...membreData } = parsed.data as any;
  const [membre] = await db.insert(membresTable).values({ ...membreData, dateAdhesion: membreData.dateAdhesion ?? new Date().toISOString().slice(0, 10) }).returning();

  if (conjoint) {
    await db.insert(personnesDeclareeesTable).values({ membreId: membre.id, ...conjoint, lienParente: "conjoint" });
  }
  for (const e of enfants ?? []) {
    await db.insert(personnesDeclareeesTable).values({ membreId: membre.id, ...e, lienParente: "enfant" });
  }
  for (const p of parents ?? []) {
    await db.insert(personnesDeclareeesTable).values({ membreId: membre.id, ...p, lienParente: "parent" });
  }
  for (const bp of beauxParents ?? []) {
    await db.insert(personnesDeclareeesTable).values({ membreId: membre.id, ...bp, lienParente: "beau_parent" });
  }

  await db.insert(mouvementsEffectifsTable).values({
    membreId: membre.id, type: "adhesion",
    details: `Adhésion ${membre.typeAdhesion === "exceptionnel" ? "exceptionnelle" : "ordinaire"} enregistrée`,
  });

  res.status(201).json(buildMembreResponse(membre));
});

router.get("/membres/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetMembreParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  const [m] = await db.select().from(membresTable).where(eq(membresTable.id, params.data.id));
  if (!m) { res.status(404).json({ error: "Membre introuvable" }); return; }

  const personnes = await db.select().from(personnesDeclareeesTable).where(eq(personnesDeclareeesTable.membreId, m.id));
  const cotisations = await db.select().from(cotisationsTable).where(eq(cotisationsTable.membreId, m.id));
  const totalPaye = cotisations.reduce((s, c) => s + c.montant, 0);

  res.json({
    ...buildMembreResponse(m),
    conjoint: personnes.find(p => p.lienParente === "conjoint") ?? null,
    enfants: personnes.filter(p => p.lienParente === "enfant"),
    parents: personnes.filter(p => p.lienParente === "parent"),
    beauxParents: personnes.filter(p => p.lienParente === "beau_parent"),
    cotisationsResume: { totalPaye, arrieres: 0, moisPaies: cotisations.length },
  });
});

router.put("/membres/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateMembreParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  const parsed = UpdateMembreBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { conjoint, enfants, parents, beauxParents, ...membreData } = parsed.data as any;
  const [updated] = await db.update(membresTable).set(membreData).where(eq(membresTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Membre introuvable" }); return; }
  res.json(buildMembreResponse(updated));
});

router.delete("/membres/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteMembreParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  await db.delete(membresTable).where(eq(membresTable.id, params.data.id));
  res.sendStatus(204);
});

router.patch("/membres/:id/statut", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateMembreStatutParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  const parsed = UpdateMembreStatutBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(membresTable).set({ statut: parsed.data.statut }).where(eq(membresTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Membre introuvable" }); return; }
  res.json(buildMembreResponse(updated));
});

router.get("/membres/:id/carence", requireAuth, async (req, res): Promise<void> => {
  const params = GetMembreCarenceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  const typeAssistance = req.query.type as string | undefined;

  const [m] = await db.select().from(membresTable).where(eq(membresTable.id, params.data.id));
  if (!m) { res.status(404).json({ error: "Membre introuvable" }); return; }

  // Charger les paramètres dynamiques
  const paramsDB = await db.select().from(parametresTable);
  const p: Record<string, number> = {
    delaiCarenceNouveauCdi: 3, delaiCarenceAncienCdi: 10, delaiCarenceRetraite: 60,
    delaiCarenceAdhesionExceptionnelle: 6,
  };
  for (const row of paramsDB) p[row.cle] = Number(row.valeur);

  const dateRef = m.dateCdi ? new Date(m.dateCdi) : new Date(m.dateAdhesion);
  const now = new Date();
  const moisDepuis = Math.floor((now.getTime() - dateRef.getTime()) / (30.44 * 24 * 3600 * 1000));

  const isRetraite = typeAssistance === "retraite" || typeAssistance === "retraite_complementaire";
  const isDecesOuMariage = !typeAssistance || ["deces_membre","deces_conjoint","deces_enfant","deces_parent","deces_beau_parent","deces_mort_ne","mariage"].includes(typeAssistance);
  let delai: number;
  let motif: string;

  if (isRetraite) {
    delai = p.delaiCarenceRetraite;
    motif = `Retraite — ${delai} mois (5 ans) de carence obligatoires (Art. 8 Statuts)`;
  } else if (m.typeAdhesion === "exceptionnel") {
    delai = p.delaiCarenceAdhesionExceptionnelle;
    motif = "Adhésion exceptionnelle — 6 mois de carence (Décision n°05-2025)";
  } else if (isDecesOuMariage && m.typeCdi === "ancien") {
    delai = p.delaiCarenceAncienCdi;
    motif = "Ancien CDI — 10 mois de carence pour décès/mariage (Art. 8 Statuts)";
  } else {
    delai = p.delaiCarenceNouveauCdi;
    motif = "Nouveau CDI — 3 mois de carence pour décès/mariage (Art. 8 Statuts)";
  }

  const moisRestants = Math.max(0, delai - moisDepuis);
  const dateFinCarence = new Date(dateRef);
  dateFinCarence.setMonth(dateFinCarence.getMonth() + delai);

  // Calcul des arriérés
  const cotisations = await db.select().from(cotisationsTable).where(eq(cotisationsTable.membreId, m.id));
  const moisDepuisAdhesion = Math.floor((now.getTime() - new Date(m.dateAdhesion).getTime()) / (30.44 * 24 * 3600 * 1000));
  const arrieres = Math.max(0, moisDepuisAdhesion - cotisations.length);
  const arrearsBlocking = arrieres > 0;

  res.json({
    membreId: m.id,
    matricule: m.matricule,
    typeAdhesion: m.typeAdhesion,
    renonciationAssistances: m.renonciationAssistances,
    enCarence: moisRestants > 0 || arrearsBlocking,
    moisRestants,
    dateFinCarence: dateFinCarence.toISOString().slice(0, 10),
    motif: arrearsBlocking
      ? `${motif} — Bloqué : ${arrieres} mois d'arriérés à régulariser avant toute assistance`
      : motif,
    eligible: moisRestants === 0 && !arrearsBlocking,
    cotisations: { moisPaies: cotisations.length, arrieres },
  });
});

router.post("/membres/:id/deces", requireAuth, async (req, res): Promise<void> => {
  const params = DeclarerDecesMembreParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  const parsed = DeclarerDecesMembreBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(membresTable)
    .set({ statut: "decede", dateDeces: parsed.data.dateDeces, causeDeces: (parsed.data as any).causeDeces })
    .where(eq(membresTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Membre introuvable" }); return; }
  await db.insert(mouvementsEffectifsTable).values({
    membreId: updated.id, type: "deces", details: (parsed.data as any).causeDeces ?? undefined,
  });
  res.json(buildMembreResponse(updated));
});

/** GET /membres/:id/acces — vérifie si le membre a un compte portail actif */
router.get("/membres/:id/acces", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const [m] = await db.select().from(membresTable).where(eq(membresTable.id, id));
  if (!m) { res.status(404).json({ error: "Membre introuvable" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.membreId, id));
  res.json({
    actif: !!user,
    identifiant: user ? m.matricule : null,
    email: user ? user.email : null,
    createdAt: user?.createdAt?.toISOString?.() ?? null,
  });
});

/** POST /membres/:id/reset-acces — génère un nouveau mot de passe */
router.post("/membres/:id/reset-acces", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const [m] = await db.select().from(membresTable).where(eq(membresTable.id, id));
  if (!m) { res.status(404).json({ error: "Membre introuvable" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.membreId, id));
  if (!user) { res.status(404).json({ error: "Ce membre n'a pas encore de compte portail. Utilisez 'Autoriser l'accès' d'abord." }); return; }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const password = Array.from(crypto.randomBytes(8)).map(b => chars[b % chars.length]).join("");
  const hash = await bcrypt.hash(password, 10);

  await db.update(usersTable).set({ motDePasse: hash }).where(eq(usersTable.membreId, id));

  let emailSent = false;
  if (process.env.SMTP_HOST && m.email) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `"MUGETRA-NPG.CI" <${process.env.SMTP_USER}>`,
        to: m.email,
        subject: "Réinitialisation de votre mot de passe — MUGETRA-NPG.CI",
        html: `<div style="font-family:sans-serif;max-width:500px;margin:auto">
          <div style="background:#1a5c3a;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">MUGETRA-NPG.CI</h2>
            <p style="color:#c9a227;margin:4px 0 0">Portail Mutualiste</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
            <p>Bonjour <strong>${m.prenom} ${m.nom}</strong>,</p>
            <p>Votre mot de passe a été réinitialisé par l'administration.</p>
            <div style="background:#f0faf4;border:1px solid #1a5c3a33;border-radius:6px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px"><strong>Identifiant :</strong> ${m.matricule}</p>
              <p style="margin:0"><strong>Nouveau mot de passe :</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;font-size:16px">${password}</code></p>
            </div>
            <p style="font-size:12px;color:#6b7280">Veuillez conserver ces informations en lieu sûr. Cordialement,<br/>MUGETRA-NPG.CI</p>
          </div>
        </div>`,
      });
      emailSent = true;
    } catch {}
  }

  res.json({ success: true, identifiant: m.matricule, motDePasse: password, emailSent,
    message: `Mot de passe réinitialisé. Identifiant: ${m.matricule} | Nouveau mot de passe: ${password}` });
});

/** DELETE /membres/:id/resilier-acces — supprime le compte portail du membre */
router.delete("/membres/:id/resilier-acces", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const [m] = await db.select().from(membresTable).where(eq(membresTable.id, id));
  if (!m) { res.status(404).json({ error: "Membre introuvable" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.membreId, id));
  if (!user) { res.status(404).json({ error: "Ce membre n'a pas de compte portail" }); return; }
  await db.delete(usersTable).where(eq(usersTable.membreId, id));
  res.json({ success: true, message: `Accès portail supprimé pour ${m.prenom} ${m.nom} (${m.matricule})` });
});

router.post("/membres/:id/autoriser-acces", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }

  const [m] = await db.select().from(membresTable).where(eq(membresTable.id, id));
  if (!m) { res.status(404).json({ error: "Membre introuvable" }); return; }

  const existing = await db.select().from(usersTable).where(eq(usersTable.membreId, id));
  if (existing.length > 0) {
    res.status(409).json({ error: "Ce membre a déjà un compte actif.", identifiant: m.matricule });
    return;
  }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const password = Array.from(crypto.randomBytes(8)).map(b => chars[b % chars.length]).join("");
  const hash = await bcrypt.hash(password, 10);
  const email = m.email ?? `${m.matricule.toLowerCase().replace("-", ".")}@mugetra.ci`;

  await db.insert(usersTable).values({
    email,
    motDePasse: hash,
    nom: m.nom,
    prenom: m.prenom,
    role: "mutualiste",
    membreId: id,
  });

  let emailSent = false;
  if (process.env.SMTP_HOST && m.email) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT ?? "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `"MUGETRA-NPG.CI" <${process.env.SMTP_USER}>`,
        to: m.email,
        subject: "Vos accès au Portail Mutualiste MUGETRA-NPG.CI",
        html: `<div style="font-family:sans-serif;max-width:500px;margin:auto">
          <div style="background:#1a5c3a;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">MUGETRA-NPG.CI</h2>
            <p style="color:#c9a227;margin:4px 0 0">Portail Mutualiste</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
            <p>Bonjour <strong>${m.prenom} ${m.nom}</strong>,</p>
            <p>Votre accès au portail mutualiste a été activé par l'administration.</p>
            <div style="background:#f0faf4;border:1px solid #1a5c3a33;border-radius:6px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px"><strong>Identifiant :</strong> ${m.matricule}</p>
              <p style="margin:0"><strong>Mot de passe :</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;font-size:16px">${password}</code></p>
            </div>
            <p style="font-size:12px;color:#6b7280">Veuillez conserver ces informations en lieu sûr. Cordialement,<br/>MUGETRA-NPG.CI</p>
          </div>
        </div>`,
      });
      emailSent = true;
    } catch {}
  }

  res.json({ success: true, identifiant: m.matricule, motDePasse: password, email, emailSent,
    message: `Compte créé. Identifiant: ${m.matricule} | Mot de passe: ${password}` });
});

export default router;
