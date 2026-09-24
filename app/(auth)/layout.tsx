export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      {/* eslint-disable-next-line @next/next/no-img-element -- brand PNG */}
      <img src="/branding/icon-96.png" alt="" className="size-16 rounded-card" />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
