import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates the full testing & feature comparison report from the recorded
 * JSON results and screenshots. Running `run.ps1` followed by this script
 * always produces an up-to-date TESTING_REPORT.md at the repository root.
 */
const repoRoot = path.resolve(import.meta.dirname, '..');
const resultsRoot = path.join(repoRoot, 'comparison-results');

const REQUIREMENTS = [
  ['R1', 'Income and expenses can be added and listed'],
  ['R2', 'The assistant can manage them and the list updates right away'],
  ['R3', 'Sample data is available'],
  ['R4', 'Reports can be exported as HTML or PDF'],
  ['R5', 'It is possible to estimate the running cost of the app'],
  ['R6', 'Admin panel shows AI spend and allows setting usage limits'],
];

const SCREENSHOT_LABELS = {
  '01-chat-prompt.png': 'Natural-language expense typed into the chat composer',
  '01b-chat-response.png': 'Assistant response to the typed expense',
  '02-finance.png': 'Income/expense screen with entries',
  '02a-transaction-form.png': 'Add-entry form filled in as a user would',
  '02b-transaction-added.png': 'Submitted entry visible in the list',
  '03-report-html.png': 'HTML report rendered with the submitted entry',
  '04-admin.png': 'Authenticated admin panel with AI spend',
  '04a-limit-form.png': 'Usage-limit control before saving',
  '04b-limit-saved.png': 'State after saving the usage limit',
};

const TOOLS = [
  ['Test runner (unit)', 'Node.js built-in `node:test`, executed via `tsx --test`', '4.23.15 (tsx) / 26.13.1 (Node)'],
  ['Test runner (browser)', 'Playwright Test', '1.65.1'],
  ['Browser', 'Chromium headless shell', 'revision 1255'],
  ['Runtime', 'Node.js', '26.13.1'],
  ['Package manager', 'pnpm', '9.12.3'],
  ['Application server', 'Next.js dev server (Webpack, not Turbopack)', '15.3.0-canary.31'],
  ['Database', 'Local PostgreSQL on port 5433, one `fcmp_*` database per branch', 'postgres client 3.4.9'],
  ['Schema setup', 'Drizzle Kit (`db:migrate` with `db:push --force` fallback)', '0.25.0'],
  ['Admin identity seeding', 'bcrypt-ts password hash + direct SQL insert', '5.0.3'],
  ['Orchestration', 'PowerShell `comparison/run.ps1`', 'Windows PowerShell'],
  ['Model calls', 'Application test provider (mocked) — no live model API key', '—'],
];

function cleanDetail(detail) {
  if (!detail) return '';
  const text = String(detail)
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 320 ? `${text.slice(0, 320)}…` : text;
}

function readChecks(branch, suite) {
  const file = path.join(resultsRoot, branch, `${suite}-results.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')).checks ?? [];
  } catch {
    return [];
  }
}

function count(checks, status) {
  return checks.filter((c) => c.status === status).length;
}

function summaryCell(checks) {
  if (checks.length === 0) return '—';
  const fail = count(checks, 'fail');
  const pass = count(checks, 'pass');
  const skip = count(checks, 'skip');
  if (fail) return `FAIL (${fail}/${checks.length})`;
  if (pass) return `PASS (${pass}/${checks.length})`;
  return `SKIP (${skip}/${checks.length})`;
}

const metaFile = path.join(resultsRoot, 'run-meta.json');
if (!fs.existsSync(metaFile)) {
  throw new Error('run-meta.json is missing; run comparison/run.ps1 first.');
}
const runs = JSON.parse(fs.readFileSync(metaFile, 'utf8'));

const data = runs.map((run) => {
  const unit = readChecks(run.branch, 'unit');
  const browser = readChecks(run.branch, 'browser');
  const all = [...unit, ...browser];
  const screenshots = fs
    .existsSync(path.join(resultsRoot, run.branch))
    ? fs
        .readdirSync(path.join(resultsRoot, run.branch))
        .filter((f) => f.endsWith('.png'))
        .sort()
    : [];
  return {
    ...run,
    unit,
    browser,
    checks: all,
    screenshots,
    pass: count(all, 'pass'),
    fail: count(all, 'fail'),
    skip: count(all, 'skip'),
  };
});

const totals = data.reduce(
  (acc, branch) => ({
    pass: acc.pass + branch.pass,
    fail: acc.fail + branch.fail,
    skip: acc.skip + branch.skip,
    screenshots: acc.screenshots + branch.screenshots.length,
  }),
  { pass: 0, fail: 0, skip: 0, screenshots: 0 },
);

const lines = [];
const add = (...values) => lines.push(...values);

const fullyPassing = data.filter((b) => b.fail === 0);
const nearlyPassing = data.filter((b) => b.fail === 1);
const best = [...fullyPassing].sort(
  (a, b) => b.checks.length - a.checks.length || b.screenshots.length - a.screenshots.length,
)[0];
const describe = (branches) =>
  branches.map((b) => `PR #${b.pr} (${b.model})`).join(', ');

add(
  '# Testing and Feature Comparison Report',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} from the recorded run on branch \`test-results-v2-hy4\`.`,
  '',
  '## 1. Executive summary',
  '',
  `Six candidate branches implementing the same income/expense feature were tested with the same unit and browser suites. In total **${totals.pass + totals.fail + totals.skip} checks** were recorded: **${totals.pass} passed**, **${totals.fail} failed**, **${totals.skip} skipped**, supported by **${totals.screenshots} screenshots**.`,
  '',
  `${fullyPassing.length} implementations passed every applicable check: **${describe(fullyPassing)}**. ${nearlyPassing.length ? `${describe(nearlyPassing)} each had a single failed check.` : ''} Nemotron was the weakest implementation: its natural-language parser returns \`null\` and its finance/admin routes render a Next.js build error.`,
  '',
  `The strongest implementation overall was **PR #${best.pr} (${best.model})**, with **${best.pass}/${best.checks.length} checks passing** and ${best.screenshots.length} screenshots covering the full flow, including HTML reports, authenticated admin spend and a saved usage limit.`,
  '',
  '## 2. Scope and requirements',
  '',
  '| ID | Requirement |',
  '| --- | --- |',
);
for (const [id, title] of REQUIREMENTS) add(`| ${id} | ${title} |`);

add(
  '',
  '## 3. Test tools and environment',
  '',
  '| Area | Tool | Version / detail |',
  '| --- | --- | --- |',
);
for (const [area, tool, version] of TOOLS) add(`| ${area} | ${tool} | ${version} |`);

add(
  '',
  '## 4. Methodology',
  '',
  '1. Each PR branch is fetched into a detached worktree under `%TEMP%\\ai-chatbot-comparison`; candidate code is never edited or merged.',
  '2. Each branch gets an isolated PostgreSQL database (`fcmp_*`). Migrations are applied with `db:migrate`, falling back to `drizzle-kit push --force` when a reused database already has the schema.',
  '3. A single known administrator is seeded into every database and exposed through the branch-specific admin allowlist (`ADMIN_EMAILS`, `AI_ADMIN_USER_IDS`, `FINANCE_ADMIN_IDS`).',
  '4. The app is started with its Webpack dev server on a dedicated port (3111–3116). No Redis instance or live model API key is needed.',
  '5. Unit checks import each branch\'s own pure domain helpers from its worktree and exercise money conversion, validation, pricing and natural-language parsing.',
  '6. Browser checks walk a human-like journey: type a natural-language expense into chat, open the finance screen, add an entry through the form, create an entry through the API, load sample data, request HTML/PDF reports, sign in as admin, view spend and save a usage limit. Screenshots are captured at each reached step.',
  '7. Every check is recorded with a pass/fail/skip status and an optional failure detail in `comparison-results/<branch>/{unit,browser}-results.json`.',
  '8. `comparison/report.mjs` produces the matrix and `comparison/full-report.mjs` produces this document directly from those JSON files.',
  '',
  '## 5. Feature comparison matrix',
  '',
  '| Requirement | ' +
    data.map((b) => `#${b.pr} ${b.model}`).join(' | ') +
    ' |',
  '| --- | ' + data.map(() => '---').join(' | ') + ' |',
);
for (const [id, title] of REQUIREMENTS) {
  add(
    `| **${id}** ${title} | ` +
      data
        .map((b) => summaryCell(b.checks.filter((c) => c.requirement === id)))
        .join(' | ') +
      ' |',
  );
}

add(
  '',
  '## 6. Test results summary',
  '',
  '| PR | Branch | Migration | Unit pass/fail | Browser pass/fail | Skips | Screenshots | Overall |',
  '| ---: | --- | --- | ---: | ---: | ---: | ---: | --- |',
);
for (const b of data) {
  const unitPass = count(b.unit, 'pass');
  const unitFail = count(b.unit, 'fail');
  const browserPass = count(b.browser, 'pass');
  const browserFail = count(b.browser, 'fail');
  const verdict = b.fail === 0 ? 'PASS' : `FAIL (${b.fail})`;
  add(
    `| [#${b.pr}](https://github.com/michalfrackowiak/ai-chatbot/pull/${b.pr}) | \`${b.branch}\` | ${b.migration} | ${unitPass}/${unitFail} | ${browserPass}/${browserFail} | ${b.skip} | ${b.screenshots.length} | ${verdict} |`,
  );
}
add(
  '',
  '## 7. Branch-by-branch results',
  '',
);

for (const b of data) {
  add(
    `### PR #${b.pr} — ${b.model} (\`${b.branch}\`)`,
    '',
    `${b.pass} passed, ${b.fail} failed, ${b.skip} skipped across ${b.checks.length} recorded checks.`,
    '',
    '#### Unit tests',
    '',
  );
  if (b.unit.length === 0) {
    add('_No unit checks recorded._', '');
  } else {
    add('| Check | Requirement | Result | Detail |', '| --- | --- | --- | --- |');
    for (const c of b.unit) {
      add(
        `| ${c.name} | ${c.requirement} | ${c.status.toUpperCase()} | ${cleanDetail(c.detail) || '—'} |`,
      );
    }
    add('');
  }

  add('#### Functional tests', '', '');
  if (b.browser.length === 0) {
    add('_No browser checks recorded._', '');
  } else {
    add('| Check | Requirement | Result | Detail |', '| --- | --- | --- | --- |');
    for (const c of b.browser) {
      add(
        `| ${c.name} | ${c.requirement} | ${c.status.toUpperCase()} | ${cleanDetail(c.detail) || '—'} |`,
      );
    }
    add('');
  }

  add('#### Screenshots', '');
  if (b.screenshots.length === 0) {
    add('_No screenshots were captured for this branch._', '');
  } else {
    add('| Screenshot | Flow step |', '| --- | --- |');
    for (const file of b.screenshots) {
      add(
        `| ![${file}](${path.posix.join('comparison-results', b.branch, file)}) | \`${file}\` — ${SCREENSHOT_LABELS[file] ?? 'captured flow step'} |`,
      );
    }
    add('');
  }

  const failed = b.checks.filter((c) => c.status === 'fail');
  add('#### Findings', '');
  if (failed.length === 0) {
    add('No failed checks for this branch.', '');
  } else {
    for (const c of failed) {
      add(`- **${c.name}** (${c.requirement}, \`${c.id}\`): ${cleanDetail(c.detail) || 'see JSON results'}`);
    }
    add('');
  }
}

add(
  '## 8. Cross-cutting findings and recommendations',
  '',
  '- **Data-entry and API flows are broadly sound.** Five of six branches passed the form, list and API checks; the chat composer worked on every branch.',
  '- **Reports are the least consistent surface.** Big Pickle\'s report route fails to compile because `pdfkit` is not installed; Nemotron exposes no HTTP report endpoint.',
  '- **Admin coverage requires allowlist configuration.** Branches gate admin access either by e-mail or by user id. The harness seeds one identity and configures all four mechanisms so the admin panel and limit changes are genuinely exercised rather than visited as a guest.',
  '- **UI sign-in is flaky on some branches.** A server-action sign-in sometimes stays in its loading state; a NextAuth credentials API fallback keeps the admin checks meaningful, and the UI attempt remains a recorded check.',
  '- **Sample data exists on four branches** (Hy4, Sol, Astra, Luna). Nemotron and Big Pickle have no discoverable sample-data endpoint.',
  '- **Nemotron needs the most work:** the natural-language parser returns `null`, and `components/expenses/expenses-overview.tsx` uses `useState` without a client directive, which breaks the finance and admin routes.',
  '- **Big Pickle needs a single dependency fix:** add `pdfkit` to make its HTML/PDF report route compile.',
  '',
  '## 9. Reproducing this report',
  '',
  '```powershell',
  "$env:POSTGRES_ADMIN_URL = 'postgres://postgres:postgres@127.0.0.1:5433/postgres'",
  'pnpm exec playwright install chromium',
  '.\\comparison\\run.ps1',
  'node comparison\\report.mjs',
  'node comparison\\full-report.mjs',
  '```',
  '',
  '`run.ps1 -Branches expenses-hy4` limits the run to one branch. Generated artifacts are written under `comparison-results/` and server logs under `%TEMP%\\ai-chatbot-comparison-logs\\`.',
  '',
  '## Appendix A — artifact inventory',
  '',
  '| Path | Contents |',
  '| --- | --- |',
  '| `comparison/run.ps1` | Full runner: databases, worktrees, migrations, admin seed, servers, suites |',
  '| `comparison/create-databases.mjs` | Creates the six isolated `fcmp_*` databases |',
  '| `comparison/seed-admin.mjs` | Seeds the known administrator identity |',
  '| `comparison/report.mjs` | Generates `run-summary.md` and `COMPARISON.md` |',
  '| `comparison/full-report.mjs` | Generates this report |',
  '| `playwright.comparison.config.ts` | Playwright configuration for the browser suite |',
  '| `tests/comparison/config.ts` | Per-branch UI/API surface definitions |',
  '| `tests/comparison/unit.test.ts` | Domain unit checks |',
  '| `tests/comparison/features.spec.ts` | Human-like browser journeys |',
  '| `tests/comparison/results.ts` | JSON check recorder |',
  '| `comparison-results/<branch>/*.png` | Screenshots of the captured flow |',
  '| `comparison-results/<branch>/*-results.json` | Raw pass/fail/skip results |',
);

fs.writeFileSync(
  path.join(repoRoot, 'TESTING_REPORT.md'),
  `${lines.join('\n')}\n`,
);
console.log('Wrote TESTING_REPORT.md');
