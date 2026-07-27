# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> password reset >> resets the password via the emailed link and signs in with the new one
- Location: tests/e2e/auth.spec.ts:167:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Send reset link' })

```

# Page snapshot

```yaml
- generic [ref=f2e1]:
  - main [ref=f2e2]:
    - heading "Sign in" [level=1] [ref=f2e3]
    - paragraph [ref=f2e4]: Welcome back.
    - generic [ref=f2e5]:
      - generic [ref=f2e6]:
        - generic [ref=f2e7]: Email
        - textbox "Email" [active] [ref=f2e8]: e2e-reset-3924-1785126549419@example.com
      - generic [ref=f2e9]:
        - generic [ref=f2e10]: Password
        - textbox "Password" [ref=f2e11]
      - button "Sign in" [ref=f2e12]
    - generic [ref=f2e13]:
      - paragraph [ref=f2e14]:
        - link "Forgot your password?" [ref=f2e15] [cursor=pointer]:
          - /url: /reset-password
      - paragraph [ref=f2e16]:
        - text: No account?
        - link "Create one" [ref=f2e17] [cursor=pointer]:
          - /url: /signup
  - button "Open Next.js Dev Tools" [ref=f2e23] [cursor=pointer]
  - alert [ref=f2e27]
```

# Test source

```ts
  86  | 
  87  |   test("signs up, verifies by email, and reaches the dashboard", async ({ page, request }) => {
  88  |     const email = uniqueEmail("happy");
  89  | 
  90  |     await page.goto("/signup");
  91  |     await page.getByLabel("Full name").fill("Happy Path");
  92  |     await page.getByLabel("Email").fill(email);
  93  |     await page.getByLabel("Password (at least 12 characters)").fill(PASSWORD);
  94  |     await page.getByLabel("Confirm password").fill(PASSWORD);
  95  |     await page.getByLabel(/accept the terms/i).check();
  96  |     await page.getByRole("button", { name: "Create account" }).click();
  97  | 
  98  |     await expect(page).toHaveURL(/\/verify-email/);
  99  | 
  100 |     await openLatestEmailLink(request, email, page);
  101 | 
  102 |     await expect(page).toHaveURL(/\/dashboard/);
  103 |     await expect(page.getByRole("heading", { name: /Welcome, Happy Path/ })).toBeVisible();
  104 |     // Every new account starts as a mentee (AUTH-007).
  105 |     await expect(page.getByText("mentee")).toBeVisible();
  106 |   });
  107 | });
  108 | 
  109 | test.describe("sign-in and sign-out", () => {
  110 |   test("rejects wrong credentials without revealing which field was wrong", async ({ page }) => {
  111 |     await page.goto("/signin");
  112 |     await page.getByLabel("Email").fill("nobody-here@example.com");
  113 |     await page.getByLabel("Password").fill("WrongPassword-123");
  114 |     await page.getByRole("button", { name: "Sign in" }).click();
  115 | 
  116 |     await expect(page.getByText("Invalid email or password")).toBeVisible();
  117 |   });
  118 | 
  119 |   test("signs in a verified user, then signs out", async ({ page, request }) => {
  120 |     const email = uniqueEmail("session");
  121 | 
  122 |     await page.goto("/signup");
  123 |     await page.getByLabel("Full name").fill("Session User");
  124 |     await page.getByLabel("Email").fill(email);
  125 |     await page.getByLabel("Password (at least 12 characters)").fill(PASSWORD);
  126 |     await page.getByLabel("Confirm password").fill(PASSWORD);
  127 |     await page.getByLabel(/accept the terms/i).check();
  128 |     await page.getByRole("button", { name: "Create account" }).click();
  129 |     await openLatestEmailLink(request, email, page);
  130 |     await expect(page).toHaveURL(/\/dashboard/);
  131 | 
  132 |     await page.getByRole("button", { name: "Sign out" }).click();
  133 |     await expect(page).toHaveURL("/");
  134 | 
  135 |     // Session is gone: the dashboard should bounce back to sign-in.
  136 |     await page.goto("/dashboard");
  137 |     await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard/);
  138 | 
  139 |     await page.getByLabel("Email").fill(email);
  140 |     await page.getByLabel("Password").fill(PASSWORD);
  141 |     await page.getByRole("button", { name: "Sign in" }).click();
  142 |     await expect(page).toHaveURL(/\/dashboard/);
  143 |   });
  144 | });
  145 | 
  146 | test.describe("route protection", () => {
  147 |   test("redirects anonymous users to sign-in with a return path", async ({ page }) => {
  148 |     await page.goto("/dashboard");
  149 |     await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard/);
  150 |   });
  151 | 
  152 |   test("keeps public pages reachable while signed out", async ({ page }) => {
  153 |     await page.goto("/");
  154 |     await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();
  155 |   });
  156 | });
  157 | 
  158 | test.describe("password reset", () => {
  159 |   test("always reports success, even for an unknown email", async ({ page }) => {
  160 |     await page.goto("/reset-password");
  161 |     await page.getByLabel("Email").fill("definitely-not-registered@example.com");
  162 |     await page.getByRole("button", { name: "Send reset link" }).click();
  163 | 
  164 |     await expect(page.getByRole("status")).toContainText(/if that email has an account/i);
  165 |   });
  166 | 
  167 |   test("resets the password via the emailed link and signs in with the new one", async ({
  168 |     page,
  169 |     request,
  170 |   }) => {
  171 |     const email = uniqueEmail("reset");
  172 |     const newPassword = "Ready2Work-Reset-2";
  173 | 
  174 |     await page.goto("/signup");
  175 |     await page.getByLabel("Full name").fill("Reset User");
  176 |     await page.getByLabel("Email").fill(email);
  177 |     await page.getByLabel("Password (at least 12 characters)").fill(PASSWORD);
  178 |     await page.getByLabel("Confirm password").fill(PASSWORD);
  179 |     await page.getByLabel(/accept the terms/i).check();
  180 |     await page.getByRole("button", { name: "Create account" }).click();
  181 |     await openLatestEmailLink(request, email, page);
  182 |     await page.getByRole("button", { name: "Sign out" }).click();
  183 | 
  184 |     await page.goto("/reset-password");
  185 |     await page.getByLabel("Email").fill(email);
> 186 |     await page.getByRole("button", { name: "Send reset link" }).click();
      |                                                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  187 |     await expect(page.getByRole("status")).toBeVisible();
  188 | 
  189 |     await openLatestEmailLink(request, email, page);
  190 |     await expect(page).toHaveURL(/\/update-password/);
  191 | 
  192 |     await page.getByLabel("New password (at least 12 characters)").fill(newPassword);
  193 |     await page.getByLabel("Confirm new password").fill(newPassword);
  194 |     await page.getByRole("button", { name: "Update password" }).click();
  195 |     await expect(page).toHaveURL(/\/dashboard/);
  196 | 
  197 |     await page.getByRole("button", { name: "Sign out" }).click();
  198 |     await page.goto("/signin");
  199 |     await page.getByLabel("Email").fill(email);
  200 |     await page.getByLabel("Password").fill(newPassword);
  201 |     await page.getByRole("button", { name: "Sign in" }).click();
  202 |     await expect(page).toHaveURL(/\/dashboard/);
  203 |   });
  204 | });
  205 | 
```