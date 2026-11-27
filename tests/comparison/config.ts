/**
 * Shared configuration for the v2 expense-feature comparison harness.
 *
 * Each candidate branch implements the same six requirements behind a
 * different UI/API surface. The entries below describe the observable
 * surface of each branch so the same browser and unit suites can drive all
 * of them without modifying candidate code.
 */

export const REQUIREMENTS = [
  { id: 'R1', title: 'Income and expenses can be added and listed' },
  { id: 'R2', title: 'The assistant can manage them and the list updates' },
  { id: 'R3', title: 'Sample data is available' },
  { id: 'R4', title: 'Reports can be exported as HTML or PDF' },
  { id: 'R5', title: 'Running cost can be estimated' },
  { id: 'R6', title: 'Admin panel shows AI spend and can set usage limits' },
] as const;

export type RequirementId = (typeof REQUIREMENTS)[number]['id'];

export type FormConfig = {
  opener?: string;
  type: string | null;
  typeValue?: string;
  amount: string;
  category?: string;
  categoryIsSelect?: boolean;
  description: string;
  date?: string;
  submit: RegExp;
};

export type CreateConfig = {
  method: 'post';
  path: string;
  status: number;
  body: (description: string) => Record<string, unknown>;
};

export type SampleConfig = {
  method: 'post' | 'put';
  path: string;
  body?: Record<string, unknown>;
};

export type ReportConfig = {
  html: string;
  pdf?: string;
  pdfIsPrintableHtml?: boolean;
};

export type LimitConfig =
  | {
      kind: 'api';
      api: {
        method: 'put';
        path: string;
        body: (adminUserId: string) => Record<string, unknown>;
      };
    }
  | {
      kind: 'form';
      fields: Array<{ selector: string; value: string }>;
      submit: RegExp;
    }
  | { kind: 'none' };

export type BranchConfig = {
  pr: number;
  model: string;
  financePath: string;
  adminPath: string;
  adminAuth: 'email' | 'id' | 'none';
  form?: FormConfig;
  create?: CreateConfig;
  listPath?: string;
  sample?: SampleConfig;
  reports?: ReportConfig;
  limits: LimitConfig;
  costEvidence: string;
};

export const BRANCHES: Record<string, BranchConfig> = {
  'expenses-nemotron-3-5-lightning': {
    pr: 6,
    model: 'Nemotron 3.5 Lightning',
    financePath: '/expenses',
    adminPath: '/admin',
    adminAuth: 'none',
    form: {
      opener: 'Expenses',
      type: null,
      amount: 'input[placeholder="e.g., 50.00"]',
      description: 'input[placeholder="e.g., Coffee, utilities"]',
      submit: /Add Expense/i,
    },
    limits: {
      kind: 'form',
      fields: [
        { selector: 'input[placeholder="e.g., 50"]', value: '37.50' },
        { selector: 'input[placeholder="e.g., 20"]', value: '12.50' },
      ],
      submit: /Set Limits/i,
    },
    costEvidence: 'Admin panel cost summary and monthly/weekly USD limits',
  },

  'expenses-hy4': {
    pr: 5,
    model: 'Tencent Hy4',
    financePath: '/finance',
    adminPath: '/admin',
    adminAuth: 'email',
    form: {
      type: '#type',
      typeValue: 'expense',
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
    limits: {
      kind: 'api',
      api: {
        method: 'put',
        path: '/api/admin/limits',
        body: (adminUserId) => ({
          userId: adminUserId,
          monthlyCostMicros: 3_000_000,
          monthlyTokenLimit: 50_000,
          enabled: true,
        }),
      },
    },
    costEvidence: 'lib/ai/pricing.ts calculator and admin AI spend breakdown',
  },

  'expenses-gpt-6-2-sol': {
    pr: 4,
    model: 'GPT 6.2 Sol',
    financePath: '/',
    adminPath: '/admin/usage',
    adminAuth: 'id',
    form: {
      opener: 'Income & expenses',
      type: 'select[name="kind"]',
      typeValue: 'expense',
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
    limits: {
      kind: 'form',
      fields: [
        { selector: 'input[name="calls"]', value: '250' },
        { selector: 'input[name="budget"]', value: '5' },
      ],
      submit: /Save limits/i,
    },
    costEvidence: 'Admin usage page shows estimated spend; lib/ai/model-pricing.ts',
  },

  'expenses-gpt-6-2-astra': {
    pr: 3,
    model: 'GPT 6.2 Astra',
    financePath: '/',
    adminPath: '/admin',
    adminAuth: 'id',
    form: {
      opener: 'Income & expenses',
      type: 'select[aria-label="Transaction type"]',
      typeValue: 'expense',
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
    limits: {
      kind: 'form',
      fields: [{ selector: '#limit', value: '250' }],
      submit: /Save limit/i,
    },
    costEvidence: 'lib/ai/usage.ts pricing middleware and admin spend table',
  },

  'expenses-big-pickle': {
    pr: 2,
    model: 'Open Code Big Pickle',
    financePath: '/transactions',
    adminPath: '/admin',
    adminAuth: 'email',
    form: {
      type: '#type',
      typeValue: 'expense',
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
    limits: {
      kind: 'api',
      api: {
        method: 'put',
        path: '/api/admin/limits',
        body: () => ({ maxMessagesPerDay: 100, maxMonthlySpendUsd: 5 }),
      },
    },
    costEvidence: 'docs/COST_ESTIMATE.md and lib/ai/pricing.ts',
  },

  'expenses-copilot-luna-6': {
    pr: 1,
    model: 'Copilot Fusion GPT 6 Luna',
    financePath: '/expenses',
    adminPath: '/admin',
    adminAuth: 'email',
    form: {
      type: 'select[name="kind"]',
      typeValue: 'expense',
      amount: 'input[name="amount"]',
      category: 'input[name="category"]',
      description: 'input[name="description"]',
      date: 'input[name="occurredAt"]',
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
    limits: {
      kind: 'api',
      api: {
        method: 'put',
        path: '/api/admin/usage',
        body: (adminUserId) => ({ userId: adminUserId, adminLimitUsd: 5 }),
      },
    },
    costEvidence: 'lib/ai/costs.ts model pricing and per-account admin caps',
  },
};

export function getConfig(branch: string | undefined): BranchConfig {
  const config = branch ? BRANCHES[branch] : undefined;
  if (!config) {
    throw new Error(`Unsupported COMPARISON_BRANCH "${branch ?? ''}".`);
  }
  return config;
}
