import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Ready2Work-Test-1";

function uniqueEmail(label: string): string {
  return `e2e-${label}-${process.pid}-${Date.now()}@example.com`;
}

const MAILPIT = "http://localhost:54324";

async function openLatestEmailLink(
  request: import("@playwright/test").APIRequestContext,
  email: string,
  page: Page,
) {
  let messageId: string | undefined;

  await expect
    .poll(
      async () => {
        const search = await request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
        );
        const { messages } = (await search.json()) as { messages: { ID: string }[] };
        messageId = messages[0]?.ID;
        return messages.length;
      },
      { message: `expected an email for ${email}`, timeout: 15_000 },
    )
    .toBeGreaterThan(0);

  const detail = await request.get(`${MAILPIT}/api/v1/message/${messageId}`);
  const { HTML, Text } = (await detail.json()) as { HTML?: string; Text?: string };
  const content = HTML || Text || "";
  const link = content.match(/https?:\/\/[^\s"'<>]*(?:token_hash|token)=[^\s"'<>]*/)?.[0];
  expect(link, "email should contain an action link").toBeTruthy();

  await request.delete(`${MAILPIT}/api/v1/messages`, { data: { IDs: [messageId] } });
  await page.goto(link!.replace(/&amp;/g, "&"));
}

async function signUpAndVerify(
  page: Page,
  request: import("@playwright/test").APIRequestContext,
  label: string,
): Promise<string> {
  const email = uniqueEmail(label);
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(`Test ${label}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password (at least 12 characters)").fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByLabel(/accept the terms/i).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await openLatestEmailLink(request, email, page);
  await expect(page).toHaveURL(/\/dashboard/);
  return email;
}

/** Answers every question on the current page with the same Likert choice, then advances. */
async function answerCurrentPage(page: Page, label: string) {
  const groups = await page.getByRole("group").all();
  for (const group of groups) {
    // The radio input is visually hidden (sr-only) for a custom-styled look.
    // force:true skips the visibility check, which would otherwise fail on
    // a zero-size input even though it's a legitimate, interactable control.
    await group.getByRole("radio", { name: label, exact: true }).check({ force: true });
  }
}

test.describe("Feature 1: Career Discovery", () => {
  test("completes the RIASEC assessment and reaches results with top 3 careers", async ({
    page,
    request,
  }) => {
    await signUpAndVerify(page, request, "career");

    await page.goto("/career-discovery");
    await page.getByRole("button", { name: "Start Assessment" }).click();
    await expect(page).toHaveURL(/\/career-discovery\/.+/);

    // 30 questions, 5 per page => 6 pages. Answer "Agree" throughout.
    for (let pageIndex = 0; pageIndex < 6; pageIndex++) {
      await expect(page.getByText(`Page ${pageIndex + 1} of 6`)).toBeVisible();
      await answerCurrentPage(page, "Agree");
      const isLastPage = await page.getByRole("button", { name: "Submit" }).isVisible();
      if (isLastPage) {
        await page.getByRole("button", { name: "Submit" }).click();
        break;
      }
      await page.getByRole("button", { name: "Next", exact: true }).click();
      // Advancing saves progress via a server action before the next page's
      // questions render, so wait for the page indicator to actually change.
      await expect(page.getByText(`Page ${pageIndex + 2} of 6`)).toBeVisible();
    }

    await expect(page).toHaveURL(/\/career-discovery\/.+\/results/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top 3 career matches" })).toBeVisible();

    const matchBadges = page.getByText(/% match/);
    await expect(matchBadges).toHaveCount(3);
  });
});

test.describe("Feature 2: Personalized Roadmap", () => {
  test("generates a roadmap from a chosen career and tracks step completion", async ({
    page,
    request,
  }) => {
    await signUpAndVerify(page, request, "roadmap");

    await page.goto("/roadmap/new");
    await expect(page.getByRole("heading", { name: "Generate your roadmap" })).toBeVisible();
    await page.getByRole("button", { name: "Generate Roadmap" }).click();

    await expect(page).toHaveURL(/\/roadmap\/.+/, { timeout: 10_000 });
    await expect(page.getByText(/complete/i).first()).toBeVisible();

    // Toggling the first step should update progress.
    const firstCheckbox = page.getByRole("checkbox").first();
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked();
  });
});

test.describe("Feature 3: Job Simulation", () => {
  test("submits a simulation and receives rubric-based feedback", async ({ page, request }) => {
    await signUpAndVerify(page, request, "simulation");

    await page.goto("/simulations");
    await expect(page.getByRole("heading", { name: "Job simulation" })).toBeVisible();

    // Click the first simulation link in the catalog.
    await page.locator('a[href^="/simulations/"]').first().click();
    await expect(page).toHaveURL(/\/simulations\/[^/]+$/);
    await expect(page.getByText("Scoring rubric")).toBeVisible();

    await page
      .getByLabel("Your submission")
      .fill(
        "This is a detailed submission that addresses the task requirements with specific " +
          "reasoning, concrete examples, and a clear structure covering the key points expected " +
          "by the rubric criteria, including budget, timeline, risk, and stakeholder communication " +
          "considerations relevant to this role and industry context.".repeat(2),
      );
    await page.getByRole("button", { name: "Submit" }).click();

    await expect(page).toHaveURL(/\/simulations\/submissions\/.+/, { timeout: 10_000 });
    await expect(page.getByText(/score/i).first()).toBeVisible();
  });
});

test.describe("Feature 4: Interview Practice", () => {
  test("answers all questions and receives content-based feedback", async ({
    page,
    request,
  }) => {
    await signUpAndVerify(page, request, "interview");

    await page.goto("/interviews");
    await expect(page.getByRole("heading", { name: "Interview Practice" })).toBeVisible();

    await page.locator('a[href^="/interviews/"]').first().click();
    await expect(page).toHaveURL(/\/interviews\/[^/]+$/);
    await page.getByRole("button", { name: "Start Interview" }).click();

    await expect(page).toHaveURL(/\/interviews\/sessions\/.+/);

    // Answer every question until the session offers "Finish".
    for (let i = 0; i < 10; i++) {
      const finishButton = page.getByRole("button", { name: "Finish and see feedback" });
      if (await finishButton.isVisible().catch(() => false)) {
        await finishButton.click();
        break;
      }
      await page
        .locator("textarea")
        .fill(
          "In my previous internship I led a small project where I identified a bottleneck, " +
            "for example a slow database query, and specifically optimized it, resulting in a " +
            "30% speed improvement for our users.",
        );
      const submitButton = page.getByRole("button", { name: "Next Question" });
      await submitButton.click();
      // The form submits via a transition + router.refresh() rather than a
      // navigation, so wait for the pending state to resolve before the next
      // iteration re-queries the (now re-rendered) page.
      await expect(page.getByRole("button", { name: "Saving…" })).toHaveCount(0);
    }

    await expect(page).toHaveURL(/\/interviews\/sessions\/.+\/feedback/, { timeout: 10_000 });
    await expect(page.getByText(/Overall score/i)).toBeVisible();
  });
});
