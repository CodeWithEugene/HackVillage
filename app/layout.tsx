import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { JsonLd } from "@/components/seo/json-ld";
import { DEFAULT_OG_IMAGE } from "@/lib/seo/metadata";
import { ThemeController } from "@/components/patterns/theme-controller";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "HackVillage: The Hackathon Platform With Escrowed Prizes",
    template: "%s · HackVillage",
  },
  description:
    "The open-source hackathon platform for Kenya and Africa: 100% escrowed prize pools, winners paid 50% instantly, and verified Proof-of-Work developer portfolios.",
  openGraph: {
    title: "HackVillage: The Hackathon Platform With Escrowed Prizes",
    description:
      "100% of the prize pool is locked in escrow before a hackathon goes live. Winners are paid 50% the same day.",
    type: "website",
    siteName: "HackVillage",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    site: "@hackvillagexyz",
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
        {/* Entity anchor: one Organization + WebSite graph node on every page,
            referenced by @id from Event/Article/Profile schema elsewhere. */}
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
