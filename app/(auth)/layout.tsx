export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      {/* eslint-disable-next-line @next/next/no-img-element -- animated brand lockup, no static/SVG source */}
      <img
        src="/branding/HackVillage-Logo.gif"
        alt="HackVillage"
        className="h-16 w-auto rounded-card"
      />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
