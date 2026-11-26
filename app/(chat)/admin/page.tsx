import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { isAdminEmail } from '@/lib/ai/costs';
import { AdminUsageDashboard } from '@/components/admin-usage-dashboard';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect('/api/auth/guest');
  if (!isAdminEmail(session.user.email)) redirect('/expenses');

  return <AdminUsageDashboard />;
}
