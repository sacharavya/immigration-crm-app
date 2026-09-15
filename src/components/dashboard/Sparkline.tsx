// A small, decorative trend line. Always navy: it shows the shape of the
// series, never the good/bad signal (the KPI change badge carries that). The
// line stretches to the card width via a 0..100 viewBox and non-uniform scale.

type SparklineProps = {
  points: number[];
  // Stable id for this instance's gradient, so multiple cards do not collide.
  id: string;
  width?: number;
  height?: number;
  className?: string;
};

export function Sparkline({
  points,
  id,
  width = 100,
  height = 32,
  className,
}: SparklineProps) {
  const gradientId = `sparkline-${id}`;
  const series = points.length >= 2 ? points : [points[0] ?? 0, points[0] ?? 0];

  const min = Math.min(...series);
  const max = Math.max(...series);
  // Nothing moved: a flat line carries no signal and reads as a divider rule.
  if (max === min) return null;
  const span = max - min || 1;
  const pad = 2;
  const usable = height - pad * 2;

  const coords = series.map((v, i) => {
    const x = (i / (series.length - 1)) * width;
    const norm = (v - min) / span;
    const y = pad + (1 - norm) * usable;
    return { x, y };
  });

  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `${coords[0].x},${height} ${line} ${coords[coords.length - 1].x},${height}`;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ display: "block", width: "100%", height }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} stroke="none" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
