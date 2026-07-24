import type { AuditFinding } from "@/types/audit";

const STATUS_STYLES: Record<
  AuditFinding["status"],
  { label: string; className: string }
> = {
  pass: { label: "Pass", className: "bg-success/10 text-success" },
  warning: { label: "Warning", className: "bg-warning/10 text-warning" },
  fail: { label: "Needs attention", className: "bg-danger/10 text-danger" },
};

const SEVERITY_LABELS: Record<AuditFinding["severity"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function FindingCard({ finding }: { finding: AuditFinding }) {
  const status = STATUS_STYLES[finding.status];

  return (
    <article className="rounded-lg border border-line bg-surface p-5 break-inside-avoid">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
        >
          {status.label}
        </span>
        {finding.status !== "pass" ? (
          <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-medium text-muted">
            {SEVERITY_LABELS[finding.severity]} severity
          </span>
        ) : null}
        {finding.category === "conversion" && finding.status !== "pass" ? (
          <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">
            Heuristic opportunity
          </span>
        ) : null}
      </div>

      <h4 className="mt-3 font-semibold text-ink">{finding.title}</h4>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {finding.description}
      </p>

      {finding.evidence.length > 0 ? (
        <div className="mt-3 rounded-md bg-soft p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Evidence
          </p>
          <ul className="mt-1 space-y-1">
            {finding.evidence.map((item, index) => (
              <li
                key={index}
                className="break-words font-mono text-xs text-ink/80"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {finding.status !== "pass" ? (
        <p className="mt-3 text-sm leading-relaxed text-ink">
          <span className="font-semibold">Recommended fix: </span>
          {finding.recommendation}
        </p>
      ) : null}
    </article>
  );
}
