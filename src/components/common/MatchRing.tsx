interface MatchRingProps {
  score: number; // 0..1
  size?: number;
  color?: string;
}

/** Circular match-score indicator, ported from the ijuzip-app.html prototype. */
export function MatchRing({ score, size = 30, color = 'currentColor' }: MatchRingProps) {
  const pct = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const stroke = size <= 26 ? 2.5 : 3.5;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const fontSize = Math.max(9, Math.round(size * 0.3));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, color }} role="img" aria-label={`${pct}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.22,.9,.3,1)' }}
      />
      <text x="50%" y="51%" textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight={700} fill="currentColor">
        {pct}
      </text>
    </svg>
  );
}
