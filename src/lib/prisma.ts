import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildPool() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  // Strip sslmode from URL — pg v9+ treats 'require'/'prefer' as 'verify-full',
  // which overrides rejectUnauthorized. We control SSL via the ssl option instead.
  let connectionString = rawUrl;
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete("sslmode");
    connectionString = u.toString();
  } catch { /* not a valid URL, use as-is */ }

  return new Pool({
    connectionString,
    ssl: rawUrl.length > 0 ? { rejectUnauthorized: false } : false,
  });
}

function createPrismaClient() {
  const pool = buildPool();
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
