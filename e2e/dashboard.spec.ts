import { test, expect } from "@playwright/test";
test("real snapshot renders, navigation and search work, and mobile stays usable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.request.get("/data/intelligence.json");
  expect(response.ok()).toBeTruthy();
  const snapshot = await response.json();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Overview", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Loading source records…")).toHaveCount(0);
  await expect(page.locator(".threat-marker")).toHaveCount(
    snapshot.indicators.filter((r: { location?: unknown }) => r.location)
      .length,
  );
  await page.screenshot({
    path: "/tmp/offensive-defenders-dashboard.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Exploited CVEs", exact: true })
    .click();
  if (snapshot.vulnerabilities.length) {
    const cve = snapshot.vulnerabilities[0].id;
    await page.getByRole("textbox", { name: "Search intelligence" }).fill(cve);
    await expect(
      page.getByRole("link", { name: cve, exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("textbox", { name: "Search intelligence" })
    .fill("no-record-should-match-this-search");
  await expect(page.getByText("No records match your search.")).toBeVisible();
  await page.getByRole("button", { name: "Data sources", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Source transparency" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /URLhaus & ThreatFox/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Threat indicators", exact: true })
    .click();
  if (snapshot.indicators.length) {
    await page
      .getByRole("textbox", { name: "Search intelligence" })
      .fill(snapshot.indicators[0].ip);
    await expect(
      page.getByRole("cell", {
        name: `${snapshot.indicators[0].ip}:${snapshot.indicators[0].port}`,
        exact: true,
      }),
    ).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", {
      name: "Threat indicators",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("failed snapshot request is visible and retry recovers", async ({
  page,
}) => {
  await page.route("**/data/intelligence.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("503");
  await page.unroute("**/data/intelligence.json");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("Snapshot: Unavailable")).toHaveCount(0);
});
