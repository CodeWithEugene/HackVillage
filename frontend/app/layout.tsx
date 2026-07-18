import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HackVillage",
    template: "%s · HackVillage",
  },
  description:
    "Trust-as-a-Service for developers. Innovation-as-a-Service for organizations. Open-source infrastructure for high-impact tech events.",
  applicationName: "HackVillage",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HackVillage",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0B3D2E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
