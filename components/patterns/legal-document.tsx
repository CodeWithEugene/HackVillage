interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalDocument({ title, lastUpdated, children }: LegalDocumentProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <header className="mb-10">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">Last updated {lastUpdated}</p>
      </header>
      <div className="legal">{children}</div>
    </div>
  );
}
