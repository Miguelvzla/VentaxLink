import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnvFile } from "dotenv";
import { PrismaClient } from "@prisma/client";

/**
 * Next/Turbo suelen ejecutar con cwd en `apps/*`, donde no existe `.env` con `DATABASE_URL`.
 * Prisma CLI sí carga `packages/database/.env`; alineamos el runtime del paquete compartido.
 */
function ensureDatabaseUrlFromEnvFiles() {
  if (process.env.DATABASE_URL?.trim()) return;

  const bases = new Set<string>();
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    bases.add(dir);
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  const candidates: string[] = [];
  for (const base of bases) {
    candidates.push(resolve(base, "packages", "database", ".env"));
    candidates.push(resolve(base, ".env"));
  }

  for (const p of candidates) {
    if (!existsSync(p)) continue;
    loadEnvFile({ path: p });
    if (process.env.DATABASE_URL?.trim()) return;
  }
}

ensureDatabaseUrlFromEnvFiles();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";
