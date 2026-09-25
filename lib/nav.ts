/**
 * Whether a nav link should show as the current page. Home only matches
 * exactly (every path starts with "/"); other links also match their
 * sub-pages, so /events/some-slug keeps "Hackathons" active. Hash links
 * (/#how-it-works) point at a section of another page, never a page of
 * their own, so they are never "current".
 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
