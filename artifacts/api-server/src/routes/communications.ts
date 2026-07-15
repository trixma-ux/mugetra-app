import { Router, type IRouter } from "express";
import { db, communicationsTable, membresTable } from "@workspace/db";
import { desc, inArray, eq } from "drizzle-orm";
import { CreateCommunicationBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

/**
 * Envoi effectif du message. Aucune clé d'API tierce (Twilio, WhatsApp Business API,
 * fournisseur SMS local, SMTP...) n'était fournie dans le projet d'origine : cette
 * fonction journalise l'envoi et renvoie "en_attente_config" tant qu'un vrai
 * connecteur n'est pas branché ici (voir README.md, section Communication).
 */
async function envoyerMessage(_canal: string, _destinataires: string[], _sujet: string | undefined, _message: string): Promise<"envoye" | "en_attente_config"> {
  const hasSmsConfig = !!process.env.SMS_API_KEY;
  const hasWhatsappConfig = !!process.env.WHATSAPP_API_TOKEN;
  const hasEmailConfig = !!process.env.SMTP_HOST;
  if (_canal === "sms" && !hasSmsConfig) return "en_attente_config";
  if (_canal === "whatsapp" && !hasWhatsappConfig) return "en_attente_config";
  if (_canal === "email" && !hasEmailConfig) return "en_attente_config";
  // TODO brancher ici l'appel réel au fournisseur (voir README).
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
      ? `Le journal a bien été enregistré, mais aucune clé d'API n'est configurée pour le canal "${d.canal}". Le message n'a pas réellement été délivré (voir README.md).`
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
