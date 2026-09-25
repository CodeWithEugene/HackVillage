import { LegalToc } from "@/components/patterns/legal-toc";

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  /** One or two sentences under the title. */
  intro?: string;
  children: React.ReactNode;
}

const CONTENT_ID = "legal-content";

/** Full width text page (terms, privacy, how escrow works) with an "On This Page" sidebar. */
export function LegalDocument({ title, lastUpdated, intro, children }: LegalDocumentProps) {
  return (
    <div className="site-container py-16">
      <header className="mb-12 text-center">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        {intro ? <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">{intro}</p> : null}
        <p className="mt-3 text-sm text-muted">Last updated {lastUpdated}</p>
      </header>
      <div className="legal-layout">
        <aside className="legal-aside">
          <LegalToc containerId={CONTENT_ID} />
        </aside>
        <div id={CONTENT_ID} className="legal">
          {children}
        </div>
      </div>
    </div>
  );
}
