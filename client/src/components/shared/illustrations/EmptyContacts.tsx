interface Props {
  color?: string;
  size?: number;
  className?: string;
}

/** Monday.com-style illustration: two people silhouettes behind a dashed circle. */
export default function EmptyContacts({
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
      {/* Background disk */}
      <circle cx="60" cy="60" r="54" fill={color} fillOpacity="0.06" />
      {/* Dashed ring */}
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
      {/* Back person */}
      <g opacity="0.55">
        <circle cx="42" cy="48" r="10" fill={color} />
        <path
          d="M24 82c0-9.94 8.06-18 18-18s18 8.06 18 18v2H24v-2z"
          fill={color}
        />
      </g>
      {/* Front person */}
      <circle cx="72" cy="52" r="12" fill={color} />
      <path
        d="M50 90c0-12.15 9.85-22 22-22s22 9.85 22 22v2H50v-2z"
        fill={color}
      />
      {/* Plus badge */}
      <circle cx="92" cy="36" r="12" fill="white" />
      <circle cx="92" cy="36" r="10" fill={color} />
      <path
        d="M92 30v12M86 36h12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
