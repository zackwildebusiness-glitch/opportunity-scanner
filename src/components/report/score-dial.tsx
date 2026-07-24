const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreColor(score: number): string {
  if (score >= 80) return "var(--success)";
  if (score >= 60) return "var(--warning)";
  return "var(--danger)";
}

export function ScoreDial({
  score,
  label,
  size = "large",
}: {
  score: number;
  label?: string;
  size?: "large" | "small";
}) {
  const offset = CIRCUMFERENCE * (1 - score / 100);
  const dimension = size === "large" ? 160 : 96;

  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <svg
          viewBox="0 0 120 120"
          width={dimension}
          height={dimension}
          role="img"
          aria-label={`${label ?? "Score"}: ${score} out of 100`}
        >
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="var(--tint)"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={scoreColor(score)}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center font-display font-semibold text-ink ${
            size === "large" ? "text-5xl" : "text-2xl"
          }`}
        >
          {score}
        </span>
      </div>
      {label ? (
        <figcaption className="text-sm font-medium text-muted">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}
