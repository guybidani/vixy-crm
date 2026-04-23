interface Props {
  color?: string;
  size?: number;
  className?: string;
}

/** Monday.com-style illustration: support headset with chat bubble. */
export default function EmptyTickets({
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

      {/* Headset band */}
      <path
        d="M34 64 Q34 36 60 36 Q86 36 86 64"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Left earpiece */}
      <rect x="28" y="60" width="14" height="22" rx="4" fill={color} />
      <rect x="30" y="62" width="10" height="18" rx="3" fill="white" fillOpacity="0.25" />
      {/* Right earpiece */}
      <rect x="78" y="60" width="14" height="22" rx="4" fill={color} />
      <rect x="80" y="62" width="10" height="18" rx="3" fill="white" fillOpacity="0.25" />
      {/* Mic arm */}
      <path
        d="M42 80 Q42 92 58 92"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="60" cy="92" r="4" fill={color} />

      {/* Chat bubble */}
      <path
        d="M72 26 H96 Q100 26 100 30 V44 Q100 48 96 48 H86 L80 54 V48 H72 Q68 48 68 44 V30 Q68 26 72 26 Z"
        fill="white"
        stroke={color}
        strokeWidth="2"
      />
      <circle cx="76" cy="37" r="1.8" fill={color} />
      <circle cx="84" cy="37" r="1.8" fill={color} />
      <circle cx="92" cy="37" r="1.8" fill={color} />
    </svg>
  );
}
