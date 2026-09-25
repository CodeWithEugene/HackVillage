import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-visual" aria-hidden>
        <Image
          src="/marketing/hero/kenya/center-developer.webp"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-top"
        />
      </div>
      <main className="auth-main">
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
    </div>
  );
}
