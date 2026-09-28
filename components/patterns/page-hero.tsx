/**
 * The shared hero for marketing pages, in the landing page's ruled frame:
 * a thin top bar (kicker on the left, optional links on the right), a large
 * title, an optional lead paragraph and actions, and an optional visual on
 * the right. Wrap the page in `.lp` so the frame tokens apply. It only lays
 * out what the page passes in; it adds no copy of its own.
 */
export function PageHero({
  id = "page-title",
  kicker,
  bar,
  title,
  lead,
  children,
  aside,
  centered = false,
}: {
  id?: string;
  /** Short label for the top bar, e.g. the page's existing eyebrow. */
  kicker?: React.ReactNode;
  /** Right side of the top bar (links, a date). */
  bar?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** Actions or extra lines under the lead. */
  children?: React.ReactNode;
  /** A visual beside the copy on wide screens. */
  aside?: React.ReactNode;
  /** Centre the bar, title and lead (document pages). */
  centered?: boolean;
}) {
  return (
    <section
      className={centered ? "hk-hero pg-hero pg-hero-centered" : "hk-hero pg-hero"}
      aria-labelledby={id}
    >
      <div className="lp-frame hk-hero-frame">
        {kicker || bar ? (
          <div className="hk-hero-bar">
            {kicker ? <span className="hk-hero-kicker">{kicker}</span> : <span />}
            {bar}
          </div>
        ) : null}
        <div className={aside ? "pg-hero-grid" : "pg-hero-copy"}>
          <div>
            <h1 id={id} className="pg-title">
              {title}
            </h1>
            {lead ? <p className="pg-lead">{lead}</p> : null}
            {children}
          </div>
          {aside}
        </div>
      </div>
    </section>
  );
}
