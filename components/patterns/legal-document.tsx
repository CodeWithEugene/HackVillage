import { LegalToc } from "@/components/patterns/legal-toc";
import { PageHero } from "@/components/patterns/page-hero";

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  /** One or two sentences under the title. */
  intro?: string;
  children: React.ReactNode;
}

const CONTENT_ID = "legal-content";

/**
 * Long-form text page (terms, privacy, how escrow works, for organizers,
 * contribute) in the ruled frame: a hero with the title and intro, then an
 * "On This Page" rail that stays put beside the sections as they scroll.
 */
export function LegalDocument({ title, lastUpdated, intro, children }: LegalDocumentProps) {
  return (
    <div className="lp">
      <PageHero kicker={`Last updated ${lastUpdated}`} title={title} lead={intro} />
      <div className="lp-frame lp-divided legal-layout">
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
