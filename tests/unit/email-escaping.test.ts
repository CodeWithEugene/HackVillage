import { describe, expect, it } from "vitest";

import { html, SafeHtml, trustedHtml } from "@/lib/notifications/html";
import { renderEmail } from "@/lib/notifications/layout";
import { disputeResolvedEmail } from "@/lib/notifications/templates/admin";
import { kybRejectedEmail, orgInviteEmail } from "@/lib/notifications/templates/organizations";
import { teamInviteEmail } from "@/lib/notifications/templates/teams";

const HOSTILE = `Evil <a href="https://phish.example">Co</a> & "Partners"`;

describe("html tag", () => {
  it("escapes interpolated values", () => {
    expect(html`<p>${"<script>alert(1)</script>"}</p>`.value).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
    expect(html`<p title="${`" onmouseover="x`}">x</p>`.value).toBe(
      '<p title="&quot; onmouseover=&quot;x">x</p>',
    );
  });

  it("passes nested fragments through and drops empty values", () => {
    const inner = html`<strong>${"A & B"}</strong>`;
    expect(html`<p>${inner}${null}${undefined}${false}</p>`.value).toBe(
      "<p><strong>A &amp; B</strong></p>",
    );
    expect(html`${3} items`.value).toBe("3 items");
  });

  it("marks maintainer written HTML as trusted without changing it", () => {
    const trusted = trustedHtml("<p>Hi</p>");
    expect(trusted).toBeInstanceOf(SafeHtml);
    expect(trusted.value).toBe("<p>Hi</p>");
  });
});

describe("email layout", () => {
  it("escapes the preheader, heading, details, and button", () => {
    const out = renderEmail({
      preheader: "<b>preview</b>",
      section: {
        heading: "Hi <i>there</i>",
        bodyHtml: html`<p>Body</p>`,
        details: [{ label: "<x>", value: "<y>" }],
        ctaUrl: 'https://example.com/?a=1&b="2"',
        ctaLabel: "<Go>",
      },
    });
    expect(out).not.toMatch(/<b>preview|<i>there|<x>|<y>|<Go>/);
    expect(out).toContain("&lt;b&gt;preview&lt;/b&gt;");
    expect(out).toContain('href="https://example.com/?a=1&amp;b=&quot;2&quot;"');
    expect(out).toContain("<p>Body</p>");
  });
});

describe("templates with user entered names", () => {
  it("escapes an organization name in the invite HTML but keeps it readable in text", () => {
    const email = orgInviteEmail(HOSTILE, "https://www.hackvillage.xyz/invites/abc");
    expect(email.html).not.toContain('<a href="https://phish.example">');
    expect(email.html).toContain(
      "Evil &lt;a href=&quot;https://phish.example&quot;&gt;Co&lt;/a&gt; &amp;",
    );
    expect(email.text).toContain(HOSTILE);
  });

  it("escapes reasons and notes written by reviewers", () => {
    expect(kybRejectedEmail("Org", "<img src=x onerror=alert(1)>").html).toContain(
      "&lt;img src=x onerror=alert(1)&gt;",
    );
    expect(disputeResolvedEmail("Hack", true, "<b>note</b>").html).toContain(
      "&lt;b&gt;note&lt;/b&gt;",
    );
  });

  it("escapes team and hackathon names", () => {
    const email = teamInviteEmail("<Team>", "<Hack>", "https://www.hackvillage.xyz/teams/x");
    expect(email.html).not.toMatch(/<Team>|<Hack>/);
    expect(email.html).toContain("&lt;Team&gt;");
  });
});
