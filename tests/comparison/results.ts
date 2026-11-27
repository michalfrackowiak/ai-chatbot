import fs from 'node:fs';
import path from 'node:path';
import type { RequirementId } from './config';

export type CheckStatus = 'pass' | 'fail' | 'skip';

export type CheckResult = {
  id: string;
  requirement: RequirementId;
  name: string;
  status: CheckStatus;
  detail?: string;
};

type ResultFile = {
  branch: string;
  suite: 'unit' | 'browser';
  checks: CheckResult[];
};

const branch = process.env.COMPARISON_BRANCH ?? 'unknown';
const artifacts = path.resolve(
  process.env.COMPARISON_ARTIFACTS ?? `comparison-results/${branch}`,
);

function fileFor(suite: 'unit' | 'browser'): string {
  return path.join(artifacts, `${suite}-results.json`);
}

export function recordCheck(suite: 'unit' | 'browser', check: CheckResult): void {
  fs.mkdirSync(artifacts, { recursive: true });
  const file = fileFor(suite);
  const data: ResultFile = fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, 'utf8')) as ResultFile)
    : { branch, suite, checks: [] };

  const index = data.checks.findIndex((entry) => entry.id === check.id);
  if (index >= 0) {
    data.checks[index] = check;
  } else {
    data.checks.push(check);
  }
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

/** Run a named requirement check, recording pass/fail without aborting the suite. */
export async function check(
  suite: 'unit' | 'browser',
  requirement: RequirementId,
  id: string,
  name: string,
  run: () => Promise<void> | void,
): Promise<boolean> {
  try {
    await run();
    recordCheck(suite, { id, requirement, name, status: 'pass' });
    return true;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    recordCheck(suite, { id, requirement, name, status: 'fail', detail });
    return false;
  }
}

export function skipCheck(
  suite: 'unit' | 'browser',
  requirement: RequirementId,
  id: string,
  name: string,
  detail = '',
): void {
  recordCheck(suite, { id, requirement, name, status: 'skip', detail });
}
