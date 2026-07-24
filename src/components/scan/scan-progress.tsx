"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ScanStage, ScanStatus } from "@/types/scan";

interface ScanStatusPayload {
  id: string;
  submittedUrl: string;
  normalizedUrl: string;
  status: ScanStatus;
  progress: number;
  currentStage: ScanStage;
  errorCode: string | null;
  errorMessage: string | null;
}

const STAGE_LABELS: Record<ScanStage, { title: string; detail: string }> = {
  queued: {
    title: "Queued",
    detail: "Your scan is in line and starting shortly.",
  },
  collecting: {
    title: "Collecting",
    detail: "Fetching your homepage and reading its structure.",
  },
  auditing: {
    title: "Auditing",
    detail: "Running checks across SEO, performance, mobile, accessibility, conversion, and trust.",
  },
  scoring: {
    title: "Scoring",
    detail: "Calculating category scores and your overall opportunity score.",
  },
  generating: {
    title: "Writing your report",
    detail: "Turning verified findings into plain-English recommendations.",
  },
  completed: {
    title: "Complete",
    detail: "Your report is ready.",
  },
  failed: {
    title: "Scan failed",
    detail: "We couldn't complete this scan.",
  },
};

const STAGE_ORDER: ScanStage[] = [
  "queued",
  "collecting",
  "auditing",
  "scoring",
  "generating",
  "completed",
];

const POLL_INTERVAL_MS = 2000;

export function ScanProgress({ initial }: { initial: ScanStatusPayload }) {
  const router = useRouter();
  const [scan, setScan] = useState<ScanStatusPayload>(initial);
  const [pollFailed, setPollFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDone = scan.status === "completed" || scan.status === "failed";

  useEffect(() => {
    if (isDone) return;

    timerRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/scans/${scan.id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          setPollFailed(true);
          return;
        }

        const data = (await response.json()) as ScanStatusPayload;
        setPollFailed(false);
        setScan(data);
      } catch {
        // Transient network failure — keep polling.
        setPollFailed(true);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scan.id, isDone]);

  const retry = useCallback(async () => {
    setRetrying(true);
    setRetryError(null);

    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scan.normalizedUrl }),
      });

      const data = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !data.id) {
        setRetryError(data.error ?? "Couldn't restart the scan. Please try again.");
        return;
      }

      router.push(`/scan/${data.id}`);
      router.refresh();
    } catch {
      setRetryError("Couldn't reach the server. Please try again.");
    } finally {
      setRetrying(false);
    }
  }, [scan.normalizedUrl, router]);

  const stage = STAGE_LABELS[scan.currentStage];
  const activeIndex = STAGE_ORDER.indexOf(
    scan.currentStage === "failed" ? "queued" : scan.currentStage,
  );

  return (
    <div className="w-full max-w-2xl">
      <p className="break-all text-sm font-medium text-muted">
        {scan.normalizedUrl}
      </p>

      {scan.status === "failed" ? (
        <div className="mt-6 rounded-xl border-2 border-danger/30 bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-danger">
            Scan failed
          </h2>
          <p className="mt-3 text-muted">
            {scan.errorMessage ??
              "We couldn't complete this scan. The site may be unreachable."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={retry}
              disabled={retrying}
              className="rounded-lg border-2 border-line-strong bg-accent px-5 py-2.5 font-semibold text-ink transition-colors hover:bg-accent-hover hover:text-white disabled:opacity-60"
            >
              {retrying ? "Restarting…" : "Try again"}
            </button>
            <Link href="/" className="font-medium text-accent-deep underline-offset-4 hover:underline">
              Scan a different site
            </Link>
          </div>
          {retryError ? (
            <p className="mt-3 text-sm font-medium text-danger">{retryError}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {stage.title}
            </h2>
            <span className="font-display text-xl text-accent-deep">
              {scan.progress}%
            </span>
          </div>
          <p className="mt-2 text-muted">{stage.detail}</p>

          <div
            role="progressbar"
            aria-valuenow={scan.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Scan progress"
            className="mt-6 h-2.5 overflow-hidden rounded-full bg-tint"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(scan.progress, 4)}%` }}
            />
          </div>

          <ol className="mt-6 space-y-2">
            {STAGE_ORDER.slice(0, 5).map((key, index) => {
              const state =
                index < activeIndex
                  ? "done"
                  : index === activeIndex
                    ? "active"
                    : "pending";

              return (
                <li key={key} className="flex items-center gap-3 text-sm">
                  <span
                    aria-hidden
                    className={
                      state === "done"
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-success text-[10px] font-bold text-white"
                        : state === "active"
                          ? "h-5 w-5 animate-pulse rounded-full border-2 border-accent bg-tint"
                          : "h-5 w-5 rounded-full border border-line"
                    }
                  >
                    {state === "done" ? "✓" : ""}
                  </span>
                  <span
                    className={
                      state === "pending" ? "text-muted/60" : "font-medium text-ink"
                    }
                  >
                    {STAGE_LABELS[key].title}
                  </span>
                </li>
              );
            })}
          </ol>

          {scan.status === "completed" ? (
            <div className="mt-8">
              <Link
                href={`/report/${scan.id}`}
                className="inline-block rounded-lg border-2 border-line-strong bg-accent px-6 py-3 text-lg font-semibold text-ink transition-colors hover:bg-accent-hover hover:text-white"
              >
                View your report →
              </Link>
            </div>
          ) : null}

          {pollFailed ? (
            <p className="mt-4 text-sm text-warning">
              Connection hiccup — still checking for updates…
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
