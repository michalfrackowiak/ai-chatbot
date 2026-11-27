/**
 * Admin access is controlled by a comma-separated allowlist of email
 * addresses in ADMIN_EMAILS. This keeps authorization independent of the
 * registration flow and works for guest accounts too.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const normalized = email.trim().toLowerCase();

  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}
