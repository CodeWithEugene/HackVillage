/**
 * Safe HTML for emails. Email bodies are built with the `html` tag, which
 * escapes every interpolated value, so a hackathon title or organization name
 * can never inject markup into an email. Nested `html` fragments pass through
 * untouched. Section bodies are typed SafeHtml, so a plain template string
 * won't compile.
 */
export class SafeHtml {
  constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function interpolate(value: unknown): string {
  if (value instanceof SafeHtml) return value.value;
  if (value === null || value === undefined || value === false) return "";
  return escapeHtml(String(value));
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  return new SafeHtml(
    strings.reduce(
      (out, chunk, index) =>
        out + chunk + (index < values.length ? interpolate(values[index]) : ""),
      "",
    ),
  );
}

/** HTML written by a HackVillage maintainer (never user input), used as is. */
export function trustedHtml(value: string): SafeHtml {
  return new SafeHtml(value);
}
