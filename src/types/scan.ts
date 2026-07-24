/** Current workflow stage for a submitted website scan. */
export type ScanStage =
  | "queued"
  | "collecting"
  | "auditing"
  | "scoring"
  | "generating"
  | "completed"
  | "failed";

/** High-level lifecycle status for a submitted website scan. */
export type ScanStatus = "pending" | "running" | "completed" | "failed";

/** Persisted scan record tracked while a website is analyzed. */
export interface Scan {
  id: string;
  submittedUrl: string;
  normalizedUrl: string;
  resolvedUrl: string | null;
  status: ScanStatus;
  progress: number;
  currentStage: ScanStage;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
