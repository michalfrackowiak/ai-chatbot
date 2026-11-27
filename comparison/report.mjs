import fs from 'node:fs';
import path from 'node:path';

/**
 * Turns the per-branch JSON check results into a human-readable comparison.
 * Nothing here interprets a branch's source code; all findings come from
 * checks that were actually executed by the unit and browser suites.
 */
const repoRoot = path.resolve(import.meta.dirname, '..');
const resultsRoot = path.join(repoRoot, 'comparison-results');

const requirements = [
  ['R1', 'Income and expenses can be added and listed'],
  ['R2', 'The assistant can manage them and the list updates'],
  ['R3', 'Sample data is available'],
  ['R4', 'Reports can be exported as HTML or PDF'],
  ['R5', 'Running cost can be estimated'],
  ['R6', 'Admin panel shows AI spend and can set usage limits'],
];

const metaFile = path.join(resultsRoot, 'run-meta.json');
if (!fs.existsSync(metaFile)) {
  throw new Error('run-meta.json is missing; run comparison/run.ps1 first.');
}
const runs = JSON.parse(fs.readFileSync(metaFile, 'utf8'));

function readChecks(branch, suite) {
  const file = path.join(resultsRoot, branch, `${suite}-results.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')).checks ?? [];
  } catch {
    return [];
  }
}

function summarize(checks) {
  if (checks.length === 0) return '—';
  const pass = checks.filter((c) => c.status === 'pass').length;
  const fail = checks.filter((c) => c.status === 'fail').length;
  const skip = checks.filter((c) => c.status === 'skip').length;
  if (fail > 0) return `FAIL (${fail}/${checks.length})`;
  if (pass > 0) return `PASS (${pass}/${checks.length})`;
  return `SKIP (${skip})`;
}

const cells = new Map();
for (const run of runs) {
  const checks = [
    ...readChecks(run.branch, 'unit'),
    ...readChecks(run.branch, 'browser'),
  ];
  cells.set(run.branch, { run, checks });
}

// run-summary.md -----------------------------------------------------------
const summaryLines = [
  '# Comparison run results (v2)',
  '',
  '| PR | Branch | Migration | Unit exit | Browser exit | Checks (pass/fail/skip) | Artifacts |',
  '| ---: | --- | --- | ---: | ---: | --- | --- |',
];
for (const { run, checks } of cells.values()) {
  const pass = checks.filter((c) => c.status === 'pass').length;
  const fail = checks.filter((c) => c.status === 'fail').length;
  const skip = checks.filter((c) => c.status === 'skip').length;
  summaryLines.push(
    `| [#${run.pr}](https://github.com/michalfrackowiak/ai-chatbot/pull/${run.pr}) | \`${run.branch}\` | ${run.migration} | ${run.unitExit} | ${run.functionalExit} | ${pass}/${fail}/${skip} | [screenshots](${run.branch}) |`,
  );
}
fs.writeFileSync(
  path.join(resultsRoot, 'run-summary.md'),
  `${summaryLines.join('\n')}\n`,
);

// COMPARISON.md ------------------------------------------------------------
const matrix = [
  '# Expense feature comparison (v2)',
  '',
  'Every cell is the result of checks that were executed against that branch,',
  'not a manual review. `FAIL (n/m)` means n of m checks for that requirement',
  'failed; `PASS` means all executed checks passed; `SKIP` means the branch',
  'exposes no observable surface for that requirement.',
  '',
  '| Requirement | ' +
    [...cells.values()].map(({ run }) => `\`${run.branch}\``).join(' | ') +
    ' |',
  '| --- | ' + [...cells.values()].map(() => '---').join(' | ') + ' |',
];
for (const [id, title] of requirements) {
  const row = [...cells.values()].map(({ checks }) =>
    summarize(checks.filter((c) => c.requirement === id)),
  );
  matrix.push(`| **${id}** ${title} | ${row.join(' | ')} |`);
}

matrix.push('', '## Findings by branch', '');
for (const { run, checks } of cells.values()) {
  matrix.push(
    `### [#${run.pr}](${run.pr}) ${run.model} — \`${run.branch}\``,
    '',
    `Screenshots: [${run.branch}](${run.branch})`,
    '',
    '| Check | Requirement | Result | Detail |',
    '| --- | --- | --- | --- |',
  );
  if (checks.length === 0) {
    matrix.push('| _no checks recorded_ | — | — | — |');
  }
  for (const c of checks) {
    const icon = c.status === 'pass' ? 'PASS' : c.status === 'fail' ? 'FAIL' : 'SKIP';
    matrix.push(
      `| ${c.name} | ${c.requirement} | ${icon} | ${(c.detail ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').slice(0, 200)} |`,
    );
  }
  matrix.push('');
}

fs.writeFileSync(path.join(resultsRoot, 'COMPARISON.md'), `${matrix.join('\n')}\n`);
console.log('Wrote comparison-results/run-summary.md and COMPARISON.md');
