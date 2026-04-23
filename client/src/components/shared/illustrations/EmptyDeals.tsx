interface Props {
  color?: string;
  size?: number;
  className?: string;
}

/** Monday.com-style illustration: rising bar chart with trend arrow. */
export default function EmptyDeals({
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

      {/* Baseline */}
      <line
        x1="30"
        y1="84"
        x2="94"
        y2="84"
        stroke={color}
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Bars */}
      <rect x="34" y="68" width="10" height="16" rx="2" fill={color} fillOpacity="0.45" />
      <rect x="50" y="56" width="10" height="28" rx="2" fill={color} fillOpacity="0.65" />
      <rect x="66" y="44" width="10" height="40" rx="2" fill={color} fillOpacity="0.85" />
      <rect x="82" y="32" width="10" height="52" rx="2" fill={color} />

      {/* Trend line */}
      <path
        d="M34 66 L50 54 L66 42 L82 30"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Arrow head */}
      <path
        d="M78 28 L86 28 L86 36"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Dollar coin */}
      <circle cx="36" cy="40" r="10" fill="white" />
      <circle cx="36" cy="40" r="9" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5" />
      <text
        x="36"
        y="44"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="700"
        fill={color}
      >
        $
      </text>
    </svg>
  );
}
