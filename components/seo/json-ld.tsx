import type { ReactElement } from "react";

type Schema = Record<string, unknown>;

/**
 * Renders JSON-LD structured data. Escape `<` so page-supplied strings
 * (event titles, summaries, bios) can never terminate the script tag.
 */
export function JsonLd({ data }: { data: Schema | Schema[] }): ReactElement {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
