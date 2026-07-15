/**
 * Envoi SMS via Africa's Talking (couvre la Côte d'Ivoire et toute l'Afrique)
 * Variables requises :
 *   AT_API_KEY   → votre clé API Africa's Talking
 *   AT_USERNAME  → votre nom d'utilisateur Africa's Talking (sandbox = "sandbox")
 *   AT_SENDER    → (optionnel) nom de l'expéditeur affiché sur le téléphone
 *
 * Inscription gratuite + sandbox : https://account.africastalking.com
 */
import AfricasTalking from "africastalking";

export function isSmsConfigured(): boolean {
  return !!(process.env.AT_API_KEY && process.env.AT_USERNAME);
}

export async function sendSms(to: string | string[], message: string): Promise<boolean> {
  if (!isSmsConfigured()) return false;
  try {
    const at = AfricasTalking({
      apiKey: process.env.AT_API_KEY!,
      username: process.env.AT_USERNAME!,
    });
    const sms = at.SMS;
    const recipients = Array.isArray(to) ? to : [to];
    // Normalise les numéros ivoiriens : 07XXXXXXXX → +2250XXXXXXXX
    const normalised = recipients.map((n) => {
      n = n.replace(/\s+/g, "");
      if (n.startsWith("0") && n.length === 10) return `+225${n.slice(1)}`;
      if (!n.startsWith("+")) return `+225${n}`;
      return n;
    });
    await sms.send({
      to: normalised,
      message,
      from: process.env.AT_SENDER ?? "MUGETRA",
    });
    return true;
  } catch (err) {
    console.error("[sms] Erreur envoi SMS :", err);
    return false;
  }
}
