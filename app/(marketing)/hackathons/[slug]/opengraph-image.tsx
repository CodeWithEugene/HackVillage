import { ImageResponse } from "next/og";

import { prisma } from "@/lib/db";
import { formatEventDates } from "@/lib/events/format";
import { PUBLIC_HACKATHON_WHERE } from "@/lib/events/visibility";
import { formatKes } from "@/lib/utils";

/**
 * Per-hackathon social card: title, dates, venue and the escrowed prize pool
 * on brand yellow. Shared links on X/WhatsApp/LinkedIn stop looking like the
 * generic homepage preview.
 */
export const alt = "HackVillage hackathon card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = "#FFED00";
const INK = "#222222";

interface RouteProps {
  params: Promise<{ slug: string }>;
}

export default async function HackathonOgImage({ params }: RouteProps): Promise<ImageResponse> {
  const { slug } = await params;
  const event = await prisma.event
    .findFirst({
      where: { slug, ...PUBLIC_HACKATHON_WHERE },
      select: {
        title: true,
        startsAt: true,
        endsAt: true,
        venueType: true,
        location: true,
        prizes: { select: { amountKes: true } },
      },
    })
    .catch(() => null);

  const poolKes = event ? event.prizes.reduce((sum, prize) => sum + prize.amountKes, 0) : 0;
  const venue = event
    ? event.venueType === "ONLINE"
      ? "Online"
      : (event.location ?? "Kenya")
    : "";
  const dates = event ? formatEventDates(event.startsAt, event.endsAt) : "";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: BRAND,
        color: INK,
        padding: "64px 72px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>
          Hack
          <span style={{ display: "flex", color: INK, opacity: 0.75 }}>Village</span>
        </div>
        <div
          style={{
            display: "flex",
            border: `3px solid ${INK}`,
            borderRadius: 999,
            padding: "8px 22px",
            fontSize: 22,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          Prize Verified
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
        <div
          style={{
            display: "flex",
            fontSize: event && event.title.length > 44 ? 58 : 72,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: -1.5,
          }}
        >
          {event ? event.title : "Escrowed prizes. Instant payouts."}
        </div>
        {event ? (
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, marginTop: 26 }}>
            {dates} · {venue}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderTop: `3px solid ${INK}`,
          paddingTop: 26,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {event ? (
            <>
              <span style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>
                PRIZE POOL — 100% IN ESCROW
              </span>
              <span style={{ display: "flex", fontSize: 44, fontWeight: 800, marginTop: 4 }}>
                {formatKes(poolKes)}
              </span>
            </>
          ) : (
            <span style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>
              100% of every prize pool, locked before go-live
            </span>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>www.hackvillage.xyz</div>
      </div>
    </div>,
    size,
  );
}
