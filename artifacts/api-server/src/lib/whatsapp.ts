/**
 * Envoi WhatsApp via Twilio (WhatsApp Business API)
 * Variables requises :
 *   TWILIO_ACCOUNT_SID  → votre Account SID Twilio
 *   TWILIO_AUTH_TOKEN   → votre Auth Token Twilio
 *   TWILIO_WA_FROM      → numéro WhatsApp Twilio ex: whatsapp:+14155238886 (sandbox Twilio)
 *
 * Inscription gratuite + sandbox WhatsApp : https://www.twilio.com/try-twilio
 * En sandbox, les destinataires doivent d'abord envoyer le code sandbox à ce numéro.
 */
import twilio from "twilio";

export function isWhatsappConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WA_FROM
  );
}

export async function sendWhatsapp(to: string | string[], message: string): Promise<boolean> {
  if (!isWhatsappConfigured()) return false;
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const recipients = Array.isArray(to) ? to : [to];
    const normalised = recipients.map((n) => {
      n = n.replace(/\s+/g, "");
      if (n.startsWith("0") && n.length === 10) n = `+225${n.slice(1)}`;
      else if (!n.startsWith("+")) n = `+225${n}`;
      return `whatsapp:${n}`;
    });
    await Promise.all(
      normalised.map((toNum) =>
        client.messages.create({
          from: process.env.TWILIO_WA_FROM!,
          to: toNum,
          body: message,
        })
      )
    );
    return true;
  } catch (err) {
    console.error("[whatsapp] Erreur envoi WhatsApp :", err);
    return false;
  }
}
