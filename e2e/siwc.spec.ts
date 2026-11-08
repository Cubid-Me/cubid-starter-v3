import { expect, test } from "@playwright/test";

test("completes PKCE, verifies signed claims, and refreshes and clears the starter session", async ({
  page,
}) => {
  await page.goto("/#siwc");
  const panel = page.locator("#siwc");
  await expect(panel.getByRole("status")).toHaveText("Not signed in yet");
  await panel
    .getByRole("button", { name: "Sign in with Cubid", exact: true })
    .click();
  await page.getByRole("link", { name: "Approve test sign-in" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:4301/#siwc");
  await expect(panel.getByRole("status")).toHaveText("Successfully signed in");
  await expect(
    panel.getByText("Verify ID token using issuer signing keys"),
  ).toBeVisible();
  await expect(panel).not.toContainText(
    /private-fixture@example\.test|fixture-access-token|Private Fixture/,
  );
  await page.reload();
  await expect(panel.getByRole("status")).toHaveText("Successfully signed in");
  const refreshed = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/cubid/siwc/session",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  expect((await refreshed).ok()).toBe(true);
  await panel.getByRole("button", { name: "Clear starter session" }).click();
  await expect(panel.getByRole("status")).toHaveText("Not signed in yet");
});

test("rejects a token with a tampered signature", async ({ page }) => {
  await page.goto("/#siwc");
  const panel = page.locator("#siwc");
  await panel.getByRole("button", { name: "Force consent" }).click();
  await page.getByRole("link", { name: "Approve test sign-in" }).click();
  await expect(panel).toContainText("invalid_id_token_signature");
  await expect(panel.getByRole("status")).toHaveText("Not signed in yet");
  expect(new URL(page.url()).searchParams.has("siwc_error")).toBe(false);
});

test("refreshes the displayed session at expiry", async ({ page }) => {
  await page.goto("/#siwc");
  const panel = page.locator("#siwc");
  await panel.getByRole("button", { name: "Force login" }).click();
  await page.getByRole("link", { name: "Approve test sign-in" }).click();
  await expect(panel.getByRole("status")).toHaveText("Successfully signed in");
  await expect(panel.getByRole("status")).toHaveText("Not signed in yet", {
    timeout: 12_000,
  });
});

test("shows the failed start trace without unsafe response details", async ({
  page,
}) => {
  await page.route("**/api/cubid/siwc/start?**", (route) =>
    route.fulfill({
      status: 500,
      json: {
        error: "missing_config",
        missing: ["CUBID_SIWC_CLIENT_ID"],
        details: "private-fixture-error",
      },
    }),
  );
  await page.goto("/#siwc");
  const panel = page.locator("#siwc");
  await panel
    .getByRole("button", { name: "Sign in with Cubid", exact: true })
    .click();
  await expect(panel.getByText("Start authorization failed")).toBeVisible();
  await expect(panel).toContainText("missing_config");
  await expect(panel).not.toContainText("private-fixture-error");
  await expect(panel.getByRole("status")).toHaveText("Not signed in yet");
});
