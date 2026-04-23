interface Props {
  color?: string;
  size?: number;
  className?: string;
}

/** Monday.com-style illustration: alert triangle with scattered broken pieces. */
export default function EmptyError({
  color = "#E44258",
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

      {/* Triangle */}
      <path
        d="M60 30 L94 86 Q96 90 92 90 H28 Q24 90 26 86 Z"
        fill="white"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M60 36 L88 84 Q89 86 87 86 H33 Q31 86 32 84 Z"
        fill={color}
        fillOpacity="0.15"
      />

      {/* Exclamation */}
      <line
        x1="60"
        y1="52"
        x2="60"
        y2="72"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="60" cy="80" r="2.5" fill={color} />

      {/* Sparks */}
      <line x1="34" y1="40" x2="28" y2="34" stroke={color} strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="86" y1="40" x2="92" y2="34" stroke={color} strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="30" y1="60" x2="24" y2="60" stroke={color} strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="90" y1="60" x2="96" y2="60" stroke={color} strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
