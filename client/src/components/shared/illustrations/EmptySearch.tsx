interface Props {
  color?: string;
  size?: number;
  className?: string;
}

/** Monday.com-style illustration: magnifying glass scanning dots. */
export default function EmptySearch({
  color = "#0073EA",
  size = 120,
  className,
}: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="54" fill={color} fillOpacity="0.06" />
      <circle
        cx="60"
        cy="60"
        r="48"
        stroke={color}
        strokeOpacity="0.25"
        strokeWidth="2"
        strokeDasharray="4 6"
        fill="none"
      />

      {/* Tiny document silhouettes */}
      <g opacity="0.35">
        <rect x="30" y="34" width="18" height="22" rx="2" fill={color} />
        <rect x="72" y="30" width="16" height="20" rx="2" fill={color} />
        <rect x="28" y="74" width="16" height="18" rx="2" fill={color} />
      </g>

      {/* Magnifying glass circle */}
      <circle cx="66" cy="60" r="20" fill="white" stroke={color} strokeWidth="4" />
      <circle cx="66" cy="60" r="14" fill={color} fillOpacity="0.1" />
      {/* Inner sparkle / scanned rows */}
      <line x1="58" y1="56" x2="74" y2="56" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.55" />
      <line x1="58" y1="62" x2="70" y2="62" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.35" />
      <line x1="58" y1="68" x2="72" y2="68" stroke={color} strokeWidth="2" strokeLinecap="round" strokeOpacity="0.45" />

      {/* Handle */}
      <line
        x1="82"
        y1="76"
        x2="96"
        y2="90"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
