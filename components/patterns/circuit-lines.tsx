const TRACES = [
  "M6 17h43l16 16h40l24-24h45l24 24h39l16-16h41",
  "M6 49h43l16 16h40l24-24h45l24 24h39l16-16h41",
];

/** Rounded SVG dashes travel steadily from the left endpoint to the right. */
export function CircuitLines({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 300 70" fill="none" className={className}>
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {TRACES.map((path) => (
          <path key={path} d={path} />
        ))}
        <circle cx="5" cy="17" r="3" />
        <circle cx="295" cy="17" r="3" />
        <circle cx="5" cy="49" r="3" />
        <circle cx="295" cy="49" r="3" />
      </g>
      {TRACES.map((path, index) => (
        <path
          key={path}
          d={path}
          pathLength={100}
          className="hero-circuit-dot"
          style={{ animationDelay: `${-index * 2.5}s` }}
        />
      ))}
    </svg>
  );
}
