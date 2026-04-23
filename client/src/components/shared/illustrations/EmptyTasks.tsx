interface Props {
  color?: string;
  size?: number;
  className?: string;
}

/** Monday.com-style illustration: clipboard / checklist with checkmarks. */
export default function EmptyTasks({
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

      {/* Clipboard */}
      <rect x="34" y="28" width="52" height="68" rx="6" fill="white" stroke={color} strokeWidth="2" />
      {/* Clip */}
      <rect x="48" y="22" width="24" height="12" rx="3" fill={color} />

      {/* Completed task */}
      <rect x="42" y="44" width="12" height="12" rx="3" fill={color} />
      <path
        d="M45 50 L48.5 53.5 L53 47"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="58" y1="50" x2="80" y2="50" stroke={color} strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />

      {/* Second completed task */}
      <rect x="42" y="62" width="12" height="12" rx="3" fill={color} fillOpacity="0.6" />
      <path
        d="M45 68 L48.5 71.5 L53 65"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="58" y1="68" x2="78" y2="68" stroke={color} strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />

      {/* Incomplete task */}
      <rect x="42" y="80" width="12" height="12" rx="3" fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.45" />
      <line x1="58" y1="86" x2="74" y2="86" stroke={color} strokeOpacity="0.25" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
