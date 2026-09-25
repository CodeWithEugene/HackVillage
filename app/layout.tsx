import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ThemeController } from "@/components/patterns/theme-controller";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "HackVillage: Prize Verified Hackathons",
    template: "%s · HackVillage",
  },
  description:
    "The open-source infrastructure for high-impact tech events: 100% escrowed prize pools, 50% instant payouts, and verified Proof-of-Work developer profiles.",
  openGraph: {
    title: "HackVillage: Prize Verified Hackathons",
    description:
      "100% of the prize pool is locked in escrow before an event goes live. Winners are paid 50% the same day, verified on a public ledger.",
    type: "website",
    siteName: "HackVillage",
    images: [
      {
        url: "/branding/og.png",
        width: 1200,
        height: 630,
        alt: "HackVillage: the open-source infrastructure for high-impact tech events",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
