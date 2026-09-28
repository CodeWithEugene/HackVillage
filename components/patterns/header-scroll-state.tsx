"use client";

import { useEffect } from "react";

/**
 * Marks <html data-scrolled> once the page leaves the top, so the header can
 * sit transparent over a hero (the landing ribbon runs up behind it) and
 * turn solid as soon as content scrolls beneath it.
 */
export function HeaderScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    const update = () => root.toggleAttribute("data-scrolled", window.scrollY > 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      root.removeAttribute("data-scrolled");
    };
  }, []);
  return null;
}
