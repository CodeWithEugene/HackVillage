import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton. The globalThis cache prevents hot-reload from
 * spawning a new client per dev-server recompile (exhausting connections).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
