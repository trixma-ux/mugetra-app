import { Router, type IRouter } from "express";
import { db, communicationsTable, membresTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { CreateCommunicationBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";
import { sendMail, isMailConfigured } from "../lib/mailer";

const router: IRouter = Router();

async function envoyerMessage(
  canal: string,
  destinataires: string[],
  sujet: string | undefined,
  message: string
): Promise<"envoye" | "partiel" | "en_attente_config"> {
  if (canal === "sms" && !process.env.SMS_API_KEY) return "en_attente_config";
  if (canal === "whatsapp" && !process.env.WHATSAPP_API_TOKEN) return "en_attente_config";

  if (canal === "email") {
    if (!isMailConfigured()) return "en_attente_config";
    let envoyeCount = 0;
    for (const to of destinataires) {
      const ok = await sendMail({
        to,
        subject: sujet ?? "Message de MUGETRA-NPG.CI",
        html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
          <div style="background:#1a5c3a;padding:20px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">MUGETRA-NPG.CI</h2>
            <p style="color:#c9a227;margin:4px 0 0">Portail Mutualiste</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px">
            <div style="white-space:pre-line">${message}</div>
            <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
            <p style="font-size:12px;color:#6b7280;margin:0">MUGETRA-NPG.CI — Portail Mutualiste</p>
          </div>
        </div>`,
      });
      if (ok) envoyeCount++;
    }
    return envoyeCount === destinataires.length ? "envoye" : envoyeCount > 0 ? "partiel" : "en_attente_config";
  }

  return "envoye";
}

router.get("/communications", requireAuth, async (_req, res): Promise<void> => {
  const data = await db.select().from(communicationsTable).orderBy(desc(communicationsTable.createdAt));
  res.json(data);
});

router.post("/communications", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCommunicationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;
  const user = (req as any).user as JwtPayload;

  let cibles = await db.select().from(membresTable);
  if (d.cible === "actifs") cibles = cibles.filter(m => m.statut === "actif");
  else if (d.cible === "defaillants") cibles = cibles.filter(m => m.statut === "defaillant");
  else if (d.cible === "honneur") cibles = cibles.filter(m => m.statut === "honneur");
  else if (d.cible === "selection" && d.destinataireIds?.length) cibles = cibles.filter(m => d.destinataireIds!.includes(m.id));

  const contacts = cibles
    .map(m => d.canal === "email" ? m.email : (d.canal === "whatsapp" ? (m.whatsapp || m.telephone) : m.telephone))
    .filter((c): c is string => !!c);

  const statut = await envoyerMessage(d.canal, contacts, d.sujet, d.message);

  const [c] = await db.insert(communicationsTable).values({
    canal: d.canal, sujet: d.sujet, message: d.message, cible: d.cible ?? "tous",
    destinataireIds: cibles.map(m => m.id), nombreDestinataires: contacts.length,
    statut, createdById: user.userId,
  }).returning();

  res.status(201).json({
    ...c,
    avertissement: statut === "en_attente_config"
      ? `Le journal a bien été enregistré, mais la configuration SMTP est incomplète. Le message n'a pas été délivré.`
      : statut === "partiel"
      ? `Envoi partiel : certains destinataires n'ont pas reçu le message.`
      : undefined,
  });
});

// Raccourcis pour les notifications automatiques citées dans le cahier des charges (anniversaires, décès, mariages, AG, élections)
router.post("/communications/notifier-evenement", requireAuth, async (req, res): Promise<void> => {
  const { type, membreId, message } = req.body as { type: string; membreId?: number; message: string };
  const user = (req as any).user as JwtPayload;
  let destinataireIds: number[] = [];
  if (membreId) {
    const [m] = await db.select().from(membresTable).where(eq(membresTable.id, membreId));
    if (m) destinataireIds = [m.id];
  } else {
    destinataireIds = (await db.select().from(membresTable)).filter(m => m.statut === "actif").map(m => m.id);
  }
  const statut = await envoyerMessage("sms", [], undefined, message);
  const [c] = await db.insert(communicationsTable).values({
    canal: "sms", sujet: `Notification automatique : ${type}`, message, cible: membreId ? "selection" : "actifs",
    destinataireIds, nombreDestinataires: destinataireIds.length, statut, createdById: user.userId,
  }).returning();
  res.status(201).json(c);
});

export default router;
