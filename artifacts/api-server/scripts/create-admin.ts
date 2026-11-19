/**
 * Création du premier administrateur (pas d'inscription publique, par conception).
 *
 *   DATABASE_URL=... pnpm --filter @workspace/api-server run create-admin -- \
 *     --email admin@exemple.ci --password '********' [--nom Admin] [--prenom MUGETRA] [--reset-password]
 *
 * Variables équivalentes : ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NOM, ADMIN_PRENOM.
 * Idempotent : si l'email existe déjà, le compte est conservé tel quel (rôle forcé à `admin`) ;
 * le mot de passe n'est remplacé qu'avec --reset-password. Le mot de passe n'est jamais affiché.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = (arg("email") ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = arg("password") ?? process.env.ADMIN_PASSWORD ?? "";
  const nom = arg("nom") ?? process.env.ADMIN_NOM ?? "Administrateur";
  const prenom = arg("prenom") ?? process.env.ADMIN_PRENOM ?? "MUGETRA";
  const reset = process.argv.includes("--reset-password");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email invalide (--email ou ADMIN_EMAIL).");
  if (password.length < 12) throw new Error("Mot de passe trop court : 12 caractères minimum (--password ou ADMIN_PASSWORD).");

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    const set: Partial<typeof usersTable.$inferInsert> = { role: "admin" };
    if (reset) set.motDePasse = await bcrypt.hash(password, 10);
    await db.update(usersTable).set(set).where(eq(usersTable.id, existing.id));
    console.log(`Administrateur ${email} déjà présent (id ${existing.id}) : rôle admin confirmé${reset ? ", mot de passe réinitialisé" : ", mot de passe inchangé"}.`);
    return;
  }
  const [u] = await db.insert(usersTable).values({
    email, motDePasse: await bcrypt.hash(password, 10), nom, prenom, role: "admin",
  }).returning({ id: usersTable.id });
  console.log(`Administrateur ${email} créé (id ${u.id}).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message ?? e); process.exit(1); });
