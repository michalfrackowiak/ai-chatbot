import 'server-only';
import type { User } from 'next-auth';

export function isUsageAdmin(user: User | undefined) {
  return (
    !!user?.id &&
    user.type === 'regular' &&
    (process.env.AI_ADMIN_USER_IDS ?? '')
      .split(',')
      .some((id) => id.trim() === user.id)
  );
}
