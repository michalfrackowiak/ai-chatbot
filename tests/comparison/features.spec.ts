import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

type BranchConfig = {
  financePath: string;
  adminPath: string;
  form?: {
    opener?: string;
    type: string | null;
    amount: string;
    category?: string;
    description: string;
    date?: string;
    submit: RegExp;
  };
  create?: {
    method: 'post';
    path: string;
    status: number;
    body: (description: string) => Record<string, unknown>;
  };
  listPath?: string;
  sample?: {
    method: 'post' | 'put';
    path: string;
    body?: Record<string, unknown>;
  };
  reports?: {
    html: string;
    pdf?: string;
    pdfIsPrintableHtml?: boolean;
  };
};

const configs: Record<string, BranchConfig> = {
  'expenses-nemotron-3-5-lightning': {
    financePath: '/expenses',
    adminPath: '/admin',
    form: {
      opener: 'Expenses',
      type: null,
      amount: 'input[placeholder="e.g., 50.00"]',
      description: 'input[placeholder="e.g., Coffee, utilities"]',
      submit: /Add Expense/i,
    },
  },
  'expenses-hy4': {
    financePath: '/finance',
    adminPath: '/admin',
    form: {
      type: '#type',
      amount: '#amount',
      category: '#category',
      description: '#description',
      date: '#date',
      submit: /Add transaction/i,
    },
    create: {
      method: 'post',
      path: '/api/transactions',
      status: 201,
      body: (description) => ({
        type: 'expense',
        amount: 12.5,
        category: 'Testing',
        description,
        date: new Date().toISOString(),
      }),
    },
    listPath: '/api/transactions',
    sample: { method: 'put', path: '/api/transactions' },
    reports: {
      html: '/api/reports?format=html',
      pdf: '/api/reports?format=pdf',
    },
  },
  'expenses-gpt-6-2-sol': {
    financePath: '/',
    adminPath: '/admin/usage',
    form: {
      opener: 'Income & expenses',
      type: 'select[name="kind"]',
      amount: 'input[name="amount"]',
      description: 'input[name="description"]',
      date: 'input[name="date"]',
      submit: /Add entry/i,
    },
    create: {
      method: 'post',
      path: '/api/ledger',
      status: 200,
      body: (description) => ({
        action: 'add',
        entry: {
          kind: 'expense',
          amount: 12.5,
          currency: 'USD',
          description,
          date: new Date().toISOString().slice(0, 10),
        },
      }),
    },
    listPath: '/api/ledger',
    sample: {
      method: 'post',
      path: '/api/ledger',
      body: { action: 'sample' },
    },
    reports: {
      html: '/api/ledger/report?format=html',
      pdf: '/api/ledger/report?format=pdf',
      pdfIsPrintableHtml: true,
    },
  },
  'expenses-gpt-6-2-astra': {
    financePath: '/',
    adminPath: '/admin',
    form: {
      opener: 'Income & expenses',
      type: 'select[aria-label="Transaction type"]',
      amount: 'input[aria-label="Amount in USD"]',
      description: 'input[aria-label="Description"]',
      date: 'input[aria-label="Date"]',
      submit: /Add transaction/i,
    },
    create: {
      method: 'post',
      path: '/api/ledger',
      status: 204,
      body: (description) => ({
        action: 'add',
        kind: 'expense',
        description,
        amount: 12.5,
        date: new Date().toISOString().slice(0, 10),
      }),
    },
    listPath: '/api/ledger',
    sample: {
      method: 'post',
      path: '/api/ledger',
      body: { action: 'sample' },
    },
    reports: { html: '/api/ledger/report' },
  },
  'expenses-big-pickle': {
    financePath: '/transactions',
    adminPath: '/admin',
    form: {
      type: '#type',
      amount: '#amount',
      category: '#category',
      description: '#description',
      date: '#occurredAt',
      submit: /Add transaction/i,
    },
    create: {
      method: 'post',
      path: '/api/transactions',
      status: 201,
      body: (description) => ({
        type: 'expense',
        amount: 12.5,
        category: 'Testing',
        description,
      }),
    },
    listPath: '/api/transactions',
    reports: {
      html: '/api/reports?format=html',
      pdf: '/api/reports?format=pdf',
    },
  },
  'expenses-copilot-luna-6': {
    financePath: '/expenses',
    adminPath: '/admin',
    form: {
      type: '#type',
      amount: '#amount',
      category: '#category',
      description: '#description',
      date: '#occurredAt',
      submit: /Add transaction/i,
    },
    create: {
      method: 'post',
      path: '/api/transactions',
      status: 201,
      body: (description) => ({
        kind: 'expense',
        amount: 12.5,
        category: 'Testing',
        description,
      }),
    },
    listPath: '/api/transactions',
    sample: { method: 'post', path: '/api/transactions/sample' },
    reports: {
      html: '/api/reports',
      pdf: '/api/reports?format=print',
      pdfIsPrintableHtml: true,
    },
  },
};

const branch = process.env.COMPARISON_BRANCH;
const config = branch ? configs[branch] : undefined;
const outputDirectory = path.resolve(
  process.env.COMPARISON_ARTIFACTS ?? `comparison-results/${branch ?? 'unknown'}`,
);

if (!config) {
  throw new Error(`Unsupported COMPARISON_BRANCH "${branch ?? ''}".`);
}

async function capture(page: Page, name: string) {
  await fs.mkdir(outputDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(outputDirectory, name),
    fullPage: true,
  });
}

test.describe(`feature comparison: ${branch}`, () => {
  test('human-like chat and finance/admin navigation', async ({ page }) => {
    await page.goto('/');
    const composer = page.getByPlaceholder('Send a message...');
    await expect(composer).toBeVisible();
    await composer.fill('I spent $12.50 on coffee');
    await capture(page, '01-chat-prompt.png');
    await composer.press('Enter');
    await expect(page.getByText('I spent $12.50 on coffee')).toBeVisible();

    await page.goto(config!.financePath);
    await expect(page.locator('body')).toContainText(
      /income|expense|ledger|transaction/i,
    );
    await capture(page, '02-finance.png');

    if (config!.form) {
      if (config!.form.opener) {
        await page
          .getByText(config!.form.opener, { exact: true })
          .first()
          .click();
      }

      const description = `Browser coffee ${Date.now()}`;
      if (config!.form.type) {
        await page.locator(config!.form.type).selectOption('expense');
      }
      await page.locator(config!.form.amount).fill('12.50');
      if (config!.form.category) {
        await page.locator(config!.form.category).fill('Testing');
      }
      await page.locator(config!.form.description).fill(description);
      if (config!.form.date) {
        await page.locator(config!.form.date).fill(
          new Date().toISOString().slice(0, 10),
        );
      }
      await capture(page, '02a-transaction-form.png');
      await page.getByRole('button', { name: config!.form.submit }).click();
      await expect(page.getByText(description, { exact: true })).toBeVisible();
      await capture(page, '02b-transaction-added.png');
    }

    await page.goto(config!.adminPath);
    await expect(page.locator('body')).not.toContainText(
      /internal server error|application error/i,
    );
    await capture(page, '03-admin.png');
  });

  test('finance API accepts a transaction and renders the requested report formats', async ({
    page,
  }) => {
    test.skip(!config!.create || !config!.listPath, 'No finance API on this branch.');

    await page.goto('/');
    const request = page.context().request;
    const description = `Comparison coffee ${Date.now()}`;
    const created = await request.post(config!.create!.path, {
      data: config!.create!.body(description),
    });

    expect(created.status(), await created.text()).toBe(config!.create!.status);
    const listResponse = await request.get(config!.listPath!);
    expect(listResponse.ok()).toBeTruthy();
    const listData: unknown = await listResponse.json();
    const entries = Array.isArray(listData)
      ? listData
      : (listData as { transactions?: unknown[] }).transactions ?? [];
    expect(JSON.stringify(entries)).toContain(description);

    if (config!.reports) {
      const html = await request.get(config!.reports.html);
      expect(html.ok()).toBeTruthy();
      expect(html.headers()['content-type']).toContain('text/html');
      const htmlBody = await html.text();
      expect(htmlBody).toContain(description);

      if (config!.reports.pdf) {
        const pdf = await request.get(config!.reports.pdf);
        expect(pdf.ok()).toBeTruthy();
        if (config!.reports.pdfIsPrintableHtml) {
          expect(pdf.headers()['content-type']).toContain('text/html');
          expect(await pdf.text()).toContain(description);
        } else {
          expect(pdf.headers()['content-type']).toContain('application/pdf');
          expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');
        }
      }
    }
  });

  test('sample data can be loaded and appears in the list', async ({ page }) => {
    test.skip(!config!.sample || !config!.listPath, 'No sample-data API on this branch.');

    await page.goto('/');
    const request = page.context().request;

    const loaded = await request.fetch(config!.sample!.path, {
      method: config!.sample!.method,
      data: config!.sample!.body,
    });
    expect(loaded.ok(), await loaded.text()).toBeTruthy();

    const after = await request.get(config!.listPath!);
    expect(after.ok()).toBeTruthy();
    const afterData: unknown = await after.json();
    const afterEntries = Array.isArray(afterData)
      ? afterData
      : (afterData as { transactions?: unknown[] }).transactions ?? [];
    expect(afterEntries.length).toBeGreaterThan(0);
  });
});
