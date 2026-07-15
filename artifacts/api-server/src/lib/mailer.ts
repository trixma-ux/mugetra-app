import nodemailer from "nodemailer";

export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp-relay.brevo.com",
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function isMailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!isMailConfigured()) return false;
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"MUGETRA-NPG.CI" <${process.env.SMTP_USER}>`,
      ...opts,
    });
    return true;
  } catch (err) {
    console.error("[mailer] Erreur envoi email :", err);
    return false;
  }
}
