"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Enter your website address.")
    .max(2048, "That address is too long."),
});

type FormValues = z.infer<typeof formSchema>;

export function ScanUrlForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);

    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: values.url }),
      });

      const data = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !data.id) {
        setServerError(
          data.error ?? "Something went wrong. Please try again.",
        );
        return;
      }

      router.push(`/scan/${data.id}`);
    } catch {
      setServerError("Couldn't reach the server. Check your connection and try again.");
    }
  }

  const errorMessage = errors.url?.message ?? serverError;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-xl"
      noValidate
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-0">
        <label htmlFor="scan-url" className="sr-only">
          Website address
        </label>
        <input
          id="scan-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="yourwebsite.com"
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={errorMessage ? "scan-url-error" : undefined}
          disabled={isSubmitting}
          className="h-14 flex-1 rounded-lg border-2 border-line-strong bg-surface px-5 text-lg text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper disabled:opacity-60 sm:rounded-r-none sm:border-r-0"
          {...register("url")}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-14 rounded-lg border-2 border-line-strong bg-accent px-7 text-lg font-semibold text-ink transition-colors hover:bg-accent-hover hover:text-white focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-paper disabled:opacity-60 sm:rounded-l-none"
        >
          {isSubmitting ? "Starting…" : "Scan my site"}
        </button>
      </div>

      <div className="mt-3 min-h-6" aria-live="polite">
        {errorMessage ? (
          <p id="scan-url-error" className="text-sm font-medium text-danger">
            {errorMessage}
          </p>
        ) : (
          <p className="text-sm text-muted">
            Public sites only. Takes about a minute.
          </p>
        )}
      </div>
    </form>
  );
}
