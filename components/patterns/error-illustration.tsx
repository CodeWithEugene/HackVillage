/**
 * Error state illustration: a laptop whose screen wears a worried face, with
 * its power cable pulled loose. Same palette and face animation as the 404
 * (.nf-eye / .nf-eyebrow / .nf-mouth in globals.css), so reduced motion
 * settings flatten it the same way.
 */
export function ErrorIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 480 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground shadow */}
      <ellipse cx="240" cy="286" rx="178" ry="14" fill="var(--color-ink)" opacity="0.08" />

      {/* Screen */}
      <rect x="108" y="36" width="264" height="178" rx="18" fill="var(--color-ink)" />
      <rect x="121" y="49" width="238" height="152" rx="9" fill="var(--color-brand)" />
      <circle cx="240" cy="42.5" r="2.5" fill="var(--color-brand-soft)" />

      {/* Worried face on the screen */}
      <g className="nf-eyebrow">
        <path d="M178 96 L204 88" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      </g>
      <g className="nf-eyebrow nf-eyebrow-right">
        <path d="M276 88 L302 96" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      </g>
      <g className="nf-eye">
        <circle cx="193" cy="118" r="13" fill="#fff" />
        <circle cx="196" cy="121" r="6" fill="var(--color-ink)" />
      </g>
      <g className="nf-eye nf-eye-right">
        <circle cx="287" cy="118" r="13" fill="#fff" />
        <circle cx="284" cy="121" r="6" fill="var(--color-ink)" />
      </g>
      <g className="nf-mouth">
        <path
          d="M204 166 Q216 154 228 166 T252 166 T276 166"
          stroke="#fff"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Base */}
      <path
        d="M84 222 H396 L412 254 Q414 262 405 262 H75 Q66 262 68 254 Z"
        fill="var(--color-ink)"
      />
      <rect
        x="208"
        y="226"
        width="64"
        height="8"
        rx="4"
        fill="var(--color-brand-soft)"
        opacity="0.6"
      />

      {/* Cable pulled out of the socket */}
      <path
        d="M396 240 C430 240 432 272 404 276 C384 279 372 292 392 298 L408 298"
        stroke="var(--color-ink)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="406" y="289" width="22" height="18" rx="4" fill="var(--color-ink)" />
      <path
        d="M428 293 H436 M428 303 H436"
        stroke="var(--color-ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="448" y="284" width="18" height="28" rx="5" fill="var(--color-brand-soft)" />
      {/* Sparks between plug and socket */}
      <path
        d="M440 276 L444 284 M452 270 L452 279 M462 276 L458 284"
        stroke="var(--color-brand)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
