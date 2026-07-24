import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ScanProgress } from "@/components/scan/scan-progress";
import { getScanById } from "@/repositories/scan-repository";

export const metadata: Metadata = {
  title: "Scanning…",
  robots: { index: false },
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const scan = await getScanById(id);

  if (!scan) {
    notFound();
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="text-sm font-medium text-accent-deep underline-offset-4 hover:underline print-hidden"
        >
          ← Website Opportunity Scanner
        </Link>

        <h1 className="mt-6 font-display text-3xl font-semibold text-ink sm:text-4xl">
          Scanning your homepage
        </h1>
        <p className="mt-2 text-muted">
          This usually takes under a minute. You can leave this page open — it
          updates automatically.
        </p>

        <div className="mt-8">
          <ScanProgress
            initial={{
              id: scan.id,
              submittedUrl: scan.submittedUrl,
              normalizedUrl: scan.normalizedUrl,
              status: scan.status,
              progress: scan.progress,
              currentStage: scan.currentStage,
              errorCode: scan.errorCode,
              errorMessage: scan.errorMessage,
            }}
          />
        </div>
      </div>
    </main>
  );
}
