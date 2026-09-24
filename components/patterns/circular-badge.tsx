interface CircularBadgeProps {
  id: string;
  text: string;
  size: number;
  className?: string;
}

/** A slow-spinning ring of repeating text, purely decorative (aria-hidden). */
export function CircularBadge({ id, text, size, className }: CircularBadgeProps) {
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ animation: "hv-spin 22s linear infinite", transformOrigin: "center", transformBox: "fill-box" }}
    >
      <path
        id={id}
        fill="none"
        d={`M ${cx},${cy - r} A ${r},${r} 0 1 1 ${cx - 0.01},${cy - r}`}
      />
      <circle cx={cx} cy={cy} r={16} className="fill-ink" />
      <text fontSize="10.5" letterSpacing="2" className="fill-ink font-semibold uppercase">
        <textPath href={`#${id}`}>
          {text} &#8226; {text} &#8226;{" "}
        </textPath>
      </text>
    </svg>
  );
}
