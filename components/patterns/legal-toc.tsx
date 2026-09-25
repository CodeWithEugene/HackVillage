"use client";

import { useEffect, useState } from "react";

import { headingSlugs, tocLabel } from "@/lib/legal/headings";
import { cn } from "@/lib/utils";

interface TocEntry {
  id: string;
  label: string;
}

/**
 * "On This Page" for a text document. It reads the rendered section headings
 * (h2) inside `containerId`, gives them anchor ids, and highlights the section
 * being read. Pages stay plain JSX; nothing has to be declared twice.
 */
export function LegalToc({ containerId }: { containerId: string }) {
  const [entries, setEntries] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const headings = Array.from(document.getElementById(containerId)?.querySelectorAll("h2") ?? []);
    const ids = headingSlugs(headings.map((heading) => heading.textContent ?? ""));
    headings.forEach((heading, index) => {
      heading.id = ids[index];
    });
    setEntries(
      headings.map((heading, index) => ({
        id: ids[index],
        label: tocLabel(heading.textContent ?? ""),
      })),
    );

    // The heading nearest the top of the viewport is the one being read.
    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px" },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [containerId]);

  if (entries.length === 0) return null;

  return (
    <nav aria-label="On this page" className="legal-toc">
      <p className="legal-toc-title">On This Page</p>
      <ol>
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              aria-current={activeId === entry.id ? "location" : undefined}
              className={cn("legal-toc-link", activeId === entry.id && "is-active")}
            >
              {entry.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
