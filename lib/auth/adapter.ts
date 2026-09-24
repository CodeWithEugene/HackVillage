import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "@auth/core/adapters";
import type { PrismaClient } from "@prisma/client";

import { candidateHandles, firstAvailableHandle, stemFromEmail } from "@/lib/auth/handles";

/**
 * Prisma adapter wrapper (ADR-001: adapter is our anti-corruption layer at the
 * identity boundary). The stock adapter cannot insert our required fields —
 * `handle` and `primaryRole` are NOT NULL — so createUser is wrapped to assign
 * them. OAuth users default to the DEVELOPER role + an empty Proof-of-Work
 * profile; onboarding can switch them to organizer.
 */
export function HackVillageAdapter(prisma: PrismaClient): Adapter {
  const base = PrismaAdapter(prisma);

  return {
    ...base,
    createUser: async (data): Promise<AdapterUser> => {
      const email = data.email;
      const handle = await uniqueHandleForEmail(prisma, email);

      const user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email,
            name: data.name,
            emailVerified: data.emailVerified ?? null,
            avatarUrl: data.image ?? null,
            handle,
            primaryRole: "DEVELOPER",
          },
        });
        await tx.roleGrant.create({
          data: { userId: created.id, role: "DEVELOPER" },
        });
        await tx.developerProfile.create({ data: { userId: created.id } });
        return created;
      });

      return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.avatarUrl,
      };
    },
  };
}

/** Find a free handle for an email, with collision suffixes (base, base-2…). */
async function uniqueHandleForEmail(prisma: PrismaClient, email: string): Promise<string> {
  const candidates = candidateHandles(stemFromEmail(email));
  const taken = await prisma.user.findMany({
    where: { handle: { in: candidates, mode: "insensitive" } },
    select: { handle: true },
  });
  const handle = firstAvailableHandle(candidates, taken.map((t) => t.handle));
  // candidateHandles guarantees at least one fallback, so this never resolves null.
  return handle ?? `dev-${Date.now().toString(36)}`;
}
