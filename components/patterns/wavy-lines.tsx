/** Two stacked squiggle lines, purely decorative (aria-hidden). */
export function WavyLines({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 340 70" fill="none" className={className}>
      <path
        d="M0 16 Q 21.25 0 42.5 16 T 85 16 T 127.5 16 T 170 16 T 212.5 16 T 255 16 T 297.5 16 T 340 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M0 54 Q 21.25 38 42.5 54 T 85 54 T 127.5 54 T 170 54 T 212.5 54 T 255 54 T 297.5 54 T 340 54"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
