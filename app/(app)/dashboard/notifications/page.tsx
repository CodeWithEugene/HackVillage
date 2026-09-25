import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Notifications" };

const TYPE_LABELS: Record<string, { title: string; detail: (payload: Record<string, unknown>) => string }> = {
  "media.penalty": {
    title: "Trust Penalty: Media Deadline",
    detail: (p) =>
      `−10 for missing the 48-hour gallery on ${String(p.eventTitle ?? "an event")}.`,
  },
};

export default async function NotificationsPage() {
  const user = await requireOnboardedUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = notifications.filter((n) => n.readAt == null).length;
  if (unread > 0) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Notifications</h1>
        <p className="mt-1 text-sm text-muted">
          {notifications.length} total{unread > 0 ? ` · ${unread} new (now marked read)` : ""}
        </p>
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing yet"
          description="Payout updates, media deadlines, and platform news land here."
        />
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => {
            const meta = TYPE_LABELS[notification.type] ?? {
              title: notification.type.replace(/[._]/g, " "),
              detail: () => "",
            };
            const payload = (notification.payload ?? {}) as Record<string, unknown>;
            return (
              <li key={notification.id}>
                <Card className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{meta.title}</p>
                    <p className="text-sm text-muted">{meta.detail(payload)}</p>
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(notification.createdAt).toLocaleDateString("en-KE", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-center text-sm text-muted">
        <Link href="/dashboard" className="underline hover:text-ink">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
