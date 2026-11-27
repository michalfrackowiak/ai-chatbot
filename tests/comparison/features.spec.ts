import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { getConfig } from './config';
import { check, recordCheck, skipCheck } from './results';

/**
 * Human-like browser journeys over each candidate branch. Every journey is
 * expressed against the requirements rather than a branch's internals: the
 * user types a natural-language expense into the chat, opens the finance
 * screen, adds an entry with the form, requests a report and finally signs in
 * as an administrator to inspect AI spend and change a usage limit.
 */

const branch = process.env.COMPARISON_BRANCH;
const config = getConfig(branch);
const outputDirectory = path.resolve(
  process.env.COMPARISON_ARTIFACTS ?? `comparison-results/${branch ?? 'unknown'}`,
);
const adminEmail = process.env.COMPARISON_ADMIN_EMAIL ?? 'admin@comparison.local';
const adminPassword =
  process.env.COMPARISON_ADMIN_PASSWORD ?? 'ComparisonAdmin123!';
const adminUserId = process.env.COMPARISON_ADMIN_USER_ID ?? '';

async function capture(page: Page, name: string) {
  await fs.mkdir(outputDirectory, { recursive: true });
  await page.screenshot({ path: path.join(outputDirectory, name), fullPage: true });
}

/** Establish the admin session through NextAuth directly. */
async function ensureAdminSession(page: Page): Promise<void> {
  const request = page.context().request;
  const csrfResponse = await request.get('/api/auth/csrf', { timeout: 30_000 });
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  await request.post('/api/auth/callback/credentials', {
    form: {
      email: adminEmail,
      password: adminPassword,
      csrfToken,
      callbackUrl: config.adminPath,
      json: 'true',
    },
    maxRedirects: 0,
    timeout: 30_000,
  });
  await expect
    .poll(
      async () => {
        const session = await request.get('/api/auth/session');
        const data = (await session.json()) as { user?: { email?: string } };
        return data.user?.email ?? '';
      },
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .toBe(adminEmail);
}

async function entriesFrom(response: APIResponse): Promise<unknown[]> {
  const data: unknown = await response.json();
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    for (const key of ['transactions', 'entries', 'ledger', 'items', 'data']) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
  }
  return [];
}

test.describe(`feature comparison: ${branch}`, () => {
  test('chat prompt and finance form behave like a human user', async ({ page }) => {
    await page.goto('/');

    await check('browser', 'R2', 'b-chat-prompt', 'assistant accepts a natural expense', async () => {
      const composer = page.getByPlaceholder('Send a message...');
      await expect(composer).toBeVisible();
      await composer.fill('I spent $12.50 on coffee');
      await capture(page, '01-chat-prompt.png');
      await composer.press('Enter');
      await expect(page.getByText('I spent $12.50 on coffee')).toBeVisible();
      await capture(page, '01b-chat-response.png');
    });

    await check('browser', 'R1', 'b-finance-list', 'finance screen lists income and expenses', async () => {
      await page.goto(config.financePath);
      await expect(page.locator('body')).not.toContainText(
        /build error|internal server error|application error/i,
      );
      await expect(page.locator('body')).toContainText(
        /income|expense|ledger|transaction/i,
      );
      await capture(page, '02-finance.png');
    });

    if (!config.form) {
      skipCheck('browser', 'R1', 'b-form-submit', 'no entry form discovered');
    } else {
      const form = config.form;
      await check('browser', 'R1', 'b-form-submit', 'an entry can be added through the form', async () => {
        await page.goto(config.financePath);
        if (form.opener) {
          // Some branches put the form inside a <summary> below the fold;
          // a DOM click avoids Playwright's viewport actionability check.
          await page
            .getByText(form.opener, { exact: true })
            .first()
            .evaluate((element) => (element as HTMLElement).click());
        }
        const description = `Browser coffee ${Date.now()}`;
        if (form.type) {
          await page.locator(form.type).selectOption(form.typeValue ?? 'expense');
        }
        await page.locator(form.amount).fill('12.50');
        if (form.category) {
          if (form.categoryIsSelect) {
            await page.locator(form.category).selectOption({ index: 1 });
          } else {
            await page.locator(form.category).fill('Testing');
          }
        }
        await page.locator(form.description).fill(description);
        if (form.date) {
          await page.locator(form.date).fill(new Date().toISOString().slice(0, 10));
        }
        await capture(page, '02a-transaction-form.png');
        await page
          .getByRole('button', { name: form.submit })
          .evaluate((element) => (element as HTMLElement).click());
        await expect(page.getByText(description, { exact: true })).toBeVisible();
        await capture(page, '02b-transaction-added.png');
      });
    }
  });

  // Admin flows run before the report check: a broken report route can
  // otherwise leave the Next dev server showing a build-error overlay and
  // invalidate later browser journeys.
  test('admin sees AI spend and can change a usage limit', async ({ page }) => {
    if (config.adminAuth !== 'none') {
      await check('browser', 'R6', 'b-admin-login', 'administrator can sign in', async () => {
        await page.goto('/login');
        const emailInput = page.getByPlaceholder('user@acme.com');
        if (await emailInput.count()) {
          await emailInput.fill(adminEmail);
        } else {
          await page.locator('#email, input[type="email"]').first().fill(adminEmail);
        }
        await page.getByLabel('Password').fill(adminPassword);
        await page.getByRole('button', { name: 'Sign In' }).click();
        // Wait until the session cookie actually identifies the seeded
        // administrator before visiting a role-gated page.
        await expect
          .poll(
            async () => {
              const response = await page.request.get('/api/auth/session');
              const session = (await response.json()) as {
                user?: { email?: string };
              };
              return session.user?.email ?? '';
            },
            { timeout: 20_000, intervals: [500, 1000, 2000] },
          )
          .toBe(adminEmail);
      });

      // A branch whose UI sign-in hangs should not prevent the rest of the
      // admin journey from being evaluated.
      try {
        await ensureAdminSession(page);
      } catch (error) {
        recordCheck('browser', {
          id: 'b-admin-api-login',
          requirement: 'R6',
          name: 'API sign-in fallback for admin checks',
          status: 'fail',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await check('browser', 'R6', 'b-admin-panel', 'admin panel renders spend and usage', async () => {
      await page.goto(config.adminPath);
      // Guest branches redirect through /api/auth/guest before landing here.
      await expect(page).toHaveURL(new RegExp(config.adminPath), {
        timeout: 15_000,
      });
      await expect(page.locator('body')).not.toContainText(
        /internal server error|application error|build error/i,
      );
      await expect(page.locator('body')).toContainText(
        /spend|cost|usage|limit|token/i,
      );
      await capture(page, '04-admin.png');
    });

    await check('browser', 'R5', 'b-admin-cost', 'admin exposes a running cost estimate', async () => {
      await page.goto(config.adminPath);
      await expect(page.locator('body')).toContainText(/cost|spend|\$|usd/i);
    });

    const limits = config.limits;
    if (limits.kind === 'none') {
      skipCheck('browser', 'R6', 'b-admin-limits', 'no limit control discovered');
      return;
    }

    await check('browser', 'R6', 'b-admin-limits', 'a usage limit can be set', async () => {
      if (limits.kind === 'form') {
        await page.goto(config.adminPath);
        for (const field of limits.fields) {
          await page.locator(field.selector).fill(field.value);
        }
        await capture(page, '04a-limit-form.png');
        await page.getByRole('button', { name: limits.submit }).click();
        await capture(page, '04b-limit-saved.png');
      } else {
        const response = await page.context().request.fetch(limits.api.path, {
          method: limits.api.method,
          data: limits.api.body(adminUserId),
          timeout: 30_000,
        });
        expect(response.ok(), await response.text()).toBeTruthy();
        await page.goto(config.adminPath);
        await capture(page, '04b-limit-saved.png');
      }
    });
  });

  test('finance API accepts an entry and exports reports', async ({ page }) => {
    if (!config.create || !config.listPath) {
      skipCheck('browser', 'R1', 'b-api-create', 'no finance API on this branch');
      skipCheck('browser', 'R4', 'b-reports', 'no report API on this branch');
      return;
    }

    const request = page.context().request;
    // The finance APIs are session-scoped; create the app's guest session
    // without loading a page (which can be slow on a cold dev server).
    await request.get('/api/auth/guest', { timeout: 30_000 });
    const description = `Comparison coffee ${Date.now()}`;

    await check('browser', 'R1', 'b-api-create', 'API creates an entry that appears in the list', async () => {
      const created = await request.post(config.create!.path, {
        data: config.create!.body(description),
        timeout: 30_000,
      });
      expect(created.status(), await created.text()).toBe(config.create!.status);
      const listed = await request.get(config.listPath!, { timeout: 30_000 });
      expect(listed.ok()).toBeTruthy();
      expect(JSON.stringify(await entriesFrom(listed))).toContain(description);
    });

    if (!config.reports) {
      skipCheck('browser', 'R4', 'b-reports', 'no report API on this branch');
      return;
    }

    await check('browser', 'R4', 'b-reports', 'HTML and PDF reports render the new entry', async () => {
      const html = await request.get(config.reports!.html, { timeout: 30_000 });
      expect(html.ok(), await html.text()).toBeTruthy();
      expect(html.headers()['content-type']).toContain('text/html');
      const htmlBody = await html.text();
      expect(htmlBody).toContain(description);
      // Report endpoints may send Content-Disposition: attachment, so render
      // the fetched HTML directly instead of navigating (which downloads).
      await page.setContent(htmlBody);
      await capture(page, '03-report-html.png');

      if (config.reports!.pdf) {
        const pdf = await request.get(config.reports!.pdf, { timeout: 30_000 });
        expect(pdf.ok(), await pdf.text()).toBeTruthy();
        if (config.reports!.pdfIsPrintableHtml) {
          expect(pdf.headers()['content-type']).toContain('text/html');
          expect(await pdf.text()).toContain(description);
        } else {
          expect(pdf.headers()['content-type']).toContain('application/pdf');
          expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');
        }
      }
    });
  });

  test('sample data can be loaded', async ({ page }) => {
    if (!config.sample || !config.listPath) {
      skipCheck('browser', 'R3', 'b-sample-data', 'no sample-data API discovered');
      return;
    }

    const request = page.context().request;
    await request.get('/api/auth/guest', { timeout: 30_000 });

    await check('browser', 'R3', 'b-sample-data', 'sample data loads into the ledger', async () => {
      const loaded = await request.fetch(config.sample!.path, {
        method: config.sample!.method,
        data: config.sample!.body,
        timeout: 30_000,
      });
      expect(loaded.ok(), await loaded.text()).toBeTruthy();
      const after = await request.get(config.listPath!, { timeout: 30_000 });
      expect(after.ok()).toBeTruthy();
      expect((await entriesFrom(after)).length).toBeGreaterThan(0);
    });
  });

});
