import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

// JWT_SECRET est obligatoire en production (arrêt immédiat s'il manque).
// Valeur de secours réservée au développement / aux tests locaux.
const DEV_ONLY_JWT_SECRET = "mugetra-dev-only-jwt-secret-do-not-use-in-prod";
const JWT_SECRET: string = (() => {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  const env = process.env.NODE_ENV ?? "development";
  if (env === "development" || env === "test") return DEV_ONLY_JWT_SECRET;
  throw new Error(`JWT_SECRET doit être défini (NODE_ENV=${env}).`);
})();

export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  membreId: number | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token =
    header?.startsWith("Bearer ") ? header.slice(7) :
    (req.query?.token as string | undefined) ??
    req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: "Non authentifié" });
    return;
  }
  try {
    const payload = verifyToken(token);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Accès refusé" });
      return;
    }
    next();
  };
}
