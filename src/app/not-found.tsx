import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="max-w-md text-center">
        <p className="font-display text-6xl font-semibold text-accent">404</p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
          Page not found
        </h1>
        <p className="mt-2 text-muted">
          That page doesn&apos;t exist — or the scan link you followed has a
          typo.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg border-2 border-line-strong bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-hover hover:text-white"
        >
          Scan a website
        </Link>
      </div>
    </main>
  );
}
