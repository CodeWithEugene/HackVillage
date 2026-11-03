import { AcceptInvitationClient } from "@/components/onboarding/accept-invitation-client";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await requireUser();

  const invitation = await prisma.orgInvitation.findUnique({
    where: { token },
    include: { org: { select: { name: true, slug: true } } },
  });

  if (
    !invitation ||
    invitation.acceptedAt ||
    // Server Component: runs once per server request, so Date.now() is the
    // intended per-request expiry check (react-hooks/purity is new in
    // eslint-config-next 16 and doesn't distinguish RSC render from client).
    // eslint-disable-next-line react-hooks/purity -- see comment above
    invitation.expiresAt.getTime() <= Date.now()
  ) {
    return <AcceptInvitationClient invalid orgName={invitation?.org.name} />;
  }

  return (
    <AcceptInvitationClient
      orgName={invitation.org.name}
      email={user.email}
      token={token}
    />
  );
}
