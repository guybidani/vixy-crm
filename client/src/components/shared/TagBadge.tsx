interface TagBadgeProps {
  name: string;
  color: string;
}

export default function TagBadge({ name, color }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {name}
    </span>
  );
}
