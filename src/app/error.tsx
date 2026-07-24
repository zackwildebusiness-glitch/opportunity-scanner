"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Something went wrong
        </h1>
        <p className="mt-2 text-muted">
          An unexpected error occurred. Your scan data is safe — try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg border-2 border-line-strong bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-hover hover:text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
