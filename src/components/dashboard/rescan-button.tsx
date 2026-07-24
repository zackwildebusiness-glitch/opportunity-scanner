"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Re-submits a previously scanned URL and navigates to the new scan's status
 * page. Reuses POST /api/scans, so rate limiting and URL validation apply.
 */
export function RescanButton({ url }: { url: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");

  async function rescan() {
    setState("pending");

    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data: { id?: string; error?: string } = await response.json();

      if (!response.ok || !data.id) {
        throw new Error(data.error ?? "Rescan failed.");
      }

      router.push(`/scan/${data.id}`);
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      onClick={rescan}
      disabled={state === "pending"}
      className="font-medium text-accent-deep underline-offset-4 hover:underline disabled:cursor-wait disabled:text-muted"
    >
      {state === "pending" ? "Starting…" : state === "error" ? "Retry rescan" : "Rescan"}
    </button>
  );
}
