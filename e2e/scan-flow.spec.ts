import { expect, test } from "@playwright/test";

/**
 * Critical-path e2e: submit a valid URL → scan record created → progress
 * shown → scan completes → report renders.
 *
 * Requires a real environment (.env.local with Supabase keys); the scan
 * fetches a live public site, so this is an environment test, not a unit
 * test. Target is example.com — small, stable, and always up.
 */
const TARGET_SITE = "example.com";

test("submit URL → progress → completed → report", async ({ page }) => {
  await page.goto("/");

  // Landing page renders with the form.
  await expect(
    page.getByRole("heading", { level: 1 }),
  ).toContainText(/homepage/i);

  const input = page.getByRole("textbox", { name: /website address/i }).first();
  await input.fill(TARGET_SITE);
  await page
    .getByRole("button", { name: /scan my site/i })
    .first()
    .click();

  // Routed to the status page with a scan id.
  await page.waitForURL(/\/scan\/[0-9a-f-]{36}/, { timeout: 15_000 });
  await expect(page.getByRole("progressbar")).toBeVisible();

  // Wait for completion (polling UI updates every 2s).
  const reportLink = page.getByRole("link", { name: /view your report/i });
  await expect(reportLink).toBeVisible({ timeout: 90_000 });

  await reportLink.click();
  await page.waitForURL(/\/report\/[0-9a-f-]{36}/);

  // Report shows the scanned URL, overall score, and category scores.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    TARGET_SITE,
  );
  await expect(
    page.getByRole("img", { name: /overall opportunity score/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /scores by category/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /all findings/i }),
  ).toBeVisible();
});

test("unsafe URL is rejected with a friendly error", async ({ page }) => {
  await page.goto("/");

  const input = page.getByRole("textbox", { name: /website address/i }).first();
  await input.fill("localhost:8080");
  await page
    .getByRole("button", { name: /scan my site/i })
    .first()
    .click();

  await expect(
    page.getByText(/valid public website/i).first(),
  ).toBeVisible({ timeout: 10_000 });
  expect(page.url()).not.toMatch(/\/scan\//);
});
