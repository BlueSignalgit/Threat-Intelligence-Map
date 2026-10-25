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
    path: "/tmp/bluesignal-threat-map.png",
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

test("English map, zoom controls, bounded panning and threat popups work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("BlueSignal's Threat Map");
  await expect(page.locator(".brand")).toHaveText("BlueSignal'sThreat Map");
  const map = page.locator(".leaflet-container");
  await map.scrollIntoViewIfNeeded();
  await expect(
    page.locator(".country-label").filter({ hasText: /^Russia$/ }),
  ).toHaveCount(1);
  await expect(
    page
      .locator(".country-label")
      .filter({ hasText: /^United States of America$/ }),
  ).toHaveCount(1);
  const marker = page.locator(".threat-marker").first();
  if (await marker.count()) {
    await marker.click();
    await expect(page.locator(".leaflet-popup-content")).toContainText(
      "Source: Feodo Tracker",
    );
    await page.locator(".leaflet-popup-close-button").click();
  }
  const zoomIn = page.getByRole("button", { name: "Zoom in", exact: true });
  const zoomOut = page.getByRole("button", { name: "Zoom out", exact: true });
  await zoomIn.click();
  await expect(map).toHaveAttribute(
    "aria-label",
    "Interactive global threat map in English, zoom 3",
  );
  await zoomIn.click();
  await expect(map).toHaveAttribute(
    "aria-label",
    "Interactive global threat map in English, zoom 4",
  );
  await expect(
    page.locator(".city-label").filter({ hasText: /^London$/ }),
  ).toHaveCount(1);
  await expect(
    page.locator(".city-label").filter({ hasText: /^Beijing$/ }),
  ).toHaveCount(1);
  // Force successive drag attempts at the antimeridian; the layer must settle at its bound.
  async function dragRight() {
    const bounds = await map.boundingBox();
    if (!bounds) throw new Error("Map has no bounds");
    await page.mouse.move(bounds.x + 80, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width - 40,
      bounds.y + bounds.height / 2,
      { steps: 25 },
    );
    await page.mouse.up();
  }
  for (let i = 0; i < 12; i++) await dragRight();
  const russia = page.locator(".country-label").filter({ hasText: /^Russia$/ });
  const before = await russia.evaluate((el) => el.getBoundingClientRect().x);
  await dragRight();
  await expect
    .poll(() => russia.evaluate((el) => el.getBoundingClientRect().x))
    .toBeCloseTo(before, 0);
  await expect(russia).toHaveCount(1);
  // Every requested tile stays within a single world's valid x range, with no wrapped duplicates.
  const sources = await page
    .locator(".leaflet-tile")
    .evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src));
  for (const source of sources) {
    const match = source.match(
      /GoogleMapsCompatible_Level8\/(\d+)\/(\d+)\/(\d+)\.jpeg/,
    );
    expect(match).not.toBeNull();
    expect(Number(match![3])).toBeLessThan(2 ** Number(match![1]));
  }
  for (let i = 0; i < 8; i++) {
    if ((await zoomOut.getAttribute("aria-disabled")) === "true") break;
    const current = Number(
      (await map.getAttribute("aria-label"))!.split("zoom ")[1],
    );
    await zoomOut.click();
    await expect(map).toHaveAttribute(
      "aria-label",
      `Interactive global threat map in English, zoom ${current - 1}`,
    );
  }
  await expect(zoomOut).toHaveAttribute("aria-disabled", "true");
  await page.setViewportSize({ width: 2560, height: 1200 });
  await expect(zoomOut).toHaveAttribute("aria-disabled", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(map).toBeVisible();
});

test("public NASA basemap returns real imagery without an API key", async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.VERIFY_BASEMAP !== "1",
    "Live provider check runs in CI or with VERIFY_BASEMAP=1",
  );
  const oldProviderRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("cartocdn.com"))
      oldProviderRequests.push(request.url());
  });
  await page.goto("/");
  const tiles = page.locator(".leaflet-tile");
  await expect
    .poll(
      () =>
        tiles.evaluateAll(
          (elements) =>
            elements.filter((element) => {
              const image = element as HTMLImageElement;
              return image.complete && image.naturalWidth === 256;
            }).length,
        ),
      { timeout: 30000 },
    )
    .toBeGreaterThan(0);
  const source = await tiles.first().getAttribute("src");
  expect(source).toContain("https://gibs.earthdata.nasa.gov/");
  const response = await page.request.get(source!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/jpeg");
  const image = await response.body();
  expect(image.subarray(0, 3).toString("hex")).toBe("ffd8ff");
  await testInfo.attach("unmodified-provider-tile", {
    body: image,
    contentType: "image/jpeg",
  });
  await expect(page.locator(".leaflet-control-attribution")).toContainText(
    "NASA GIBS / Blue Marble",
  );
  await expect(
    page.locator(".country-label").filter({ hasText: /^Russia$/ }),
  ).toHaveCount(1);
  await testInfo.attach("rendered-map", {
    body: await page.locator(".map").screenshot(),
    contentType: "image/png",
  });
  expect(oldProviderRequests).toEqual([]);
});
