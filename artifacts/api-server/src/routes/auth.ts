import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, membresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { identifiant, email, motDePasse } = req.body ?? {};
  const loginId: string = identifiant ?? email;
  if (!loginId || !motDePasse) {
    res.status(400).json({ error: "Identifiant et mot de passe requis" });
    return;
  }

  let user: typeof usersTable.$inferSelect | undefined;
  const byEmail = await db.select().from(usersTable).where(eq(usersTable.email, loginId));
  if (byEmail.length > 0) {
    user = byEmail[0];
  } else {
    const byMatricule = await db.select().from(membresTable).where(eq(membresTable.matricule, loginId));
    if (byMatricule.length > 0) {
      const membreId = byMatricule[0].id;
      const byMembre = await db.select().from(usersTable).where(eq(usersTable.membreId, membreId));
      if (byMembre.length > 0) user = byMembre[0];
    }
  }

  if (!user) { res.status(401).json({ error: "Identifiants incorrects" }); return; }
  const ok = await bcrypt.compare(motDePasse, user.motDePasse);
  if (!ok) { res.status(401).json({ error: "Identifiants incorrects" }); return; }

  const token = signToken({ userId: user.id, email: user.email, role: user.role, membreId: user.membreId });
  res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000, sameSite: "lax" });
  res.json({
    token,
    user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role, membreId: user.membreId },
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.clearCookie("token");
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userPayload = (req as any).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userPayload.userId));
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }
  res.json({ id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role, membreId: user.membreId });
});

export default router;
