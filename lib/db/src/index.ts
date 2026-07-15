import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL est requis. Vérifiez que la base PostgreSQL est bien connectée.");
}

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[db] Erreur inattendue sur le pool PostgreSQL :", err.message);
});

pool.connect().then((client) => {
  client.release();
  console.log("[db] ✅ Connexion PostgreSQL établie");
}).catch((err) => {
  console.error("[db] ❌ Impossible de se connecter à PostgreSQL :", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
