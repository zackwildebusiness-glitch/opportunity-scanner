import { NextResponse } from "next/server";

import { getScanById } from "@/repositories/scan-repository";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public scan status endpoint, polled by the /scan/[id] page.
 * Returns only user-safe fields — never internal error details.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  }

  try {
    const scan = await getScanById(id);

    if (!scan) {
      return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: scan.id,
      submittedUrl: scan.submittedUrl,
      normalizedUrl: scan.normalizedUrl,
      status: scan.status,
      progress: scan.progress,
      currentStage: scan.currentStage,
      errorCode: scan.errorCode,
      errorMessage: scan.errorMessage,
      createdAt: scan.createdAt,
      completedAt: scan.completedAt,
    });
  } catch (error) {
    console.error("GET /api/scans/[id] failed:", error);

    return NextResponse.json(
      { error: "Something went wrong loading this scan." },
      { status: 500 },
    );
  }
}
