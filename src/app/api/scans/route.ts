import { NextResponse, after } from "next/server";
import { z } from "zod";

import { UrlValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertPublicHostname, normalizeSubmittedUrl } from "@/lib/url-security";
import { createScan, logScanEvent } from "@/repositories/scan-repository";
import { runScanJob } from "@/jobs/run-scan-job";

export const runtime = "nodejs";

const bodySchema = z.object({
  url: z.string().min(1, "Enter a website address.").max(2048),
});

function clientKey(request: Request): string {
  // Behind a proxy/CDN the left-most XFF entry is the caller.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Creates a scan record and kicks off background processing via after().
 * The response returns immediately with the scan id; the client polls
 * GET /api/scans/[id] for progress.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(`scan:${clientKey(request)}`);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Too many scans. Try again in ${Math.ceil(rate.retryAfterSeconds / 60)} minute(s).`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter a valid website address." },
      { status: 400 },
    );
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeSubmittedUrl(parsed.data.url);
    await assertPublicHostname(new URL(normalizedUrl).hostname);
  } catch (error) {
    const message =
      error instanceof UrlValidationError
        ? error.userMessage
        : "That address can't be scanned. Enter a public website URL.";

    return NextResponse.json({ error: message }, { status: 422 });
  }

  try {
    const scan = await createScan({
      submittedUrl: parsed.data.url.trim(),
      normalizedUrl,
    });

    await logScanEvent(scan.id, "queued", "Scan created and queued.");

    // Process outside the request/response cycle; the page polls for status.
    after(async () => {
      await runScanJob(scan.id);
    });

    return NextResponse.json({ id: scan.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/scans failed:", error);

    return NextResponse.json(
      { error: "Something went wrong starting your scan. Please try again." },
      { status: 500 },
    );
  }
}
