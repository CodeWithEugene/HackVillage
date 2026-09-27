import { prisma } from "@/lib/db";
import { enqueue } from "@/lib/queue";
import { alertAdmins } from "@/lib/notifications/admin-alert";
import { renderEmail, renderText, type EmailTemplate } from "@/lib/notifications/layout";
import { html } from "@/lib/notifications/html";
import { appUrl } from "@/lib/url";

/**
 * Refund primitive (audit remediation): the ONLY sanctioned way to refund a
 * locked prize vault (pre-live cancellation, admin-approved dispute
 * resolution). Fiat NEVER moves here — the Paystack refund is a manual ops
 * step; this primitive flips the vault state machine, attests the refund on
 * the public ledger, and pages ops with exact manual instructions.
 *
 * Idempotent: an already-REFUNDED vault returns { refunded: false } with zero
 * side effects. Only LOCKED vaults refund cleanly; HALF_RELEASED refunds are
 * allowed (winners hold their instant tranches) with the reason logged loudly.
 */
export async function refundLockedVault(
  eventId: string,
  reason: string,
  actorId?: string
): Promise<{ refunded: boolean; attested: boolean }> {
  const vault = await prisma.vaultState.findUnique({
    where: { eventId },
    include: {
      event: {
        select: {
          title: true,
          slug: true,
          org: { select: { owner: { select: { email: true } } } },
          deposits: {
            where: { status: "SUCCEEDED" },
            select: { paystackReference: true, grossAmountKes: true },
          },
        },
      },
    },
  });
  if (!vault) {
    console.error(`[escrow] refund refused: no vault for event ${eventId}`);
    return { refunded: false, attested: false };
  }
  if (vault.chainState === "REFUNDED") {
    return { refunded: false, attested: false };
  }
  if (vault.chainState !== "LOCKED" && vault.chainState !== "HALF_RELEASED") {
    console.error(
      `[escrow] refund refused: vault for event ${eventId} is ${vault.chainState} — only LOCKED/HALF_RELEASED vaults refund`
    );
    return { refunded: false, attested: false };
  }
  if (vault.chainState === "HALF_RELEASED") {
    console.warn(
      `[escrow] refunding a HALF_RELEASED vault (event ${eventId}) — winners already received instant tranches. Reason: ${reason}`
    );
  }

  const refundRef = `refund-${eventId}`;

  await prisma.$transaction([
    prisma.vaultState.update({
      where: { eventId },
      data: { chainState: "REFUNDED", refundedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action: "escrow.refund",
        entity: "VaultState",
        entityId: vault.id,
        reason: reason.slice(0, 400),
        meta: { eventId, previousState: vault.chainState, refundRef },
      },
    }),
  ]);

  // The on-chain refund attestation follows the committed state (state-aware
  // handler; retries absorb RPC blips).
  await enqueue(
    "escrow.attest-refund",
    { eventId, refundRef },
    { singletonKey: `vault-refund:${eventId}`, retryLimit: 10, expireInSeconds: 3600 }
  );

  await alertAdmins(
    refundAdminEmail({
      eventTitle: vault.event.title,
      eventSlug: vault.event.slug,
      reason,
      previousState: vault.chainState,
      organizerEmail: vault.event.org.owner.email,
      deposits: vault.event.deposits,
    })
  ).catch((error: unknown) => console.error("[escrow] refund alert failed", error));

  return { refunded: true, attested: true };
}

function refundAdminEmail(input: {
  eventTitle: string;
  eventSlug: string;
  reason: string;
  previousState: string;
  organizerEmail: string;
  deposits: { paystackReference: string; grossAmountKes: number }[];
}): EmailTemplate {
  const totalGross = input.deposits.reduce((sum, d) => sum + d.grossAmountKes, 0);
  const referenceLines =
    input.deposits.map((d) => `${d.paystackReference} (KES ${d.grossAmountKes.toLocaleString("en-KE")})`).join(", ") ||
    "none recorded";
  return {
    subject: `Vault Refund Initiated: ${input.eventTitle}`,
    html: renderEmail({
      preheader: "A prize vault was marked REFUNDED — complete the refund in Paystack.",
      section: {
        heading: "Vault Refund — Manual Step Required",
        bodyHtml: html`<p style="margin:0;">The prize vault for <strong>${input.eventTitle}</strong> was marked REFUNDED (was ${input.previousState}). Reason: ${input.reason}. The ledger attestation is queued. <strong>Now refund the deposit(s) manually in the Paystack dashboard</strong> — references: ${referenceLines}.</p>`,
        details: [
          { label: "Hackathon", value: input.eventSlug },
          { label: "Total deposited (gross)", value: `KES ${totalGross.toLocaleString("en-KE")}` },
          { label: "Organizer", value: input.organizerEmail },
        ],
        ctaUrl: appUrl("/admin/payments"),
        ctaLabel: "Open The Admin Queue",
      },
    }),
    text: renderText([
      `Vault for ${input.eventTitle} (${input.eventSlug}) marked REFUNDED (was ${input.previousState}).`,
      `Reason: ${input.reason}.`,
      `Refund these deposits manually in Paystack: ${referenceLines}.`,
      `Organizer: ${input.organizerEmail}.`,
      appUrl("/admin/payments"),
    ]),
  };
}
