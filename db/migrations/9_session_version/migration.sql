-- Session revocation counter (see User.sessionVersion in db/schema.prisma).
-- Additive with a default: existing sessions are issued under version 0.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
