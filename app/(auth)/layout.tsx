import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuthVisual } from "@/components/patterns/auth-visual";
import { ThemeSwitcher } from "@/components/patterns/theme-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      {/* The form comes first in the DOM so keyboard users reach it first; CSS
          places the photo in the left column. */}
      <main className="auth-main">
        <div className="auth-topbar">
          <Link href="/" className="auth-home">
            <ArrowLeft aria-hidden className="size-5" />
            Home
          </Link>
          <ThemeSwitcher />
        </div>
        <Link href="/" aria-label="HackVillage home">
          {/* eslint-disable-next-line @next/next/no-img-element -- animated brand lockup, no static/SVG source */}
          <img
            src="/branding/HackVillage-Logo.gif"
            alt="HackVillage"
            className="h-16 w-auto rounded-card"
          />
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </main>
      <AuthVisual />
    </div>
  );
}
