/** The four point brand star used as decoration on the home and How It Works pages. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 80" aria-hidden="true">
      <path d="M40 0C42 26 54 38 80 40C54 42 42 54 40 80C38 54 26 42 0 40C26 38 38 26 40 0Z" />
    </svg>
  );
}
