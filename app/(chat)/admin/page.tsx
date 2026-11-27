import { redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import {
  getAdminDashboardData,
  getAdminUsers,
} from '@/lib/db/finance-queries';
import { MODEL_PRICING } from '@/lib/ai/pricing';
import { AdminDashboard } from '@/components/admin-dashboard';

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  if (session.user.type !== 'admin') {
    redirect('/finance');
  }

  const [data, users] = await Promise.all([
    getAdminDashboardData(),
    getAdminUsers(),
  ]);

  return (
    <AdminDashboard
      data={data}
      users={users}
      pricing={MODEL_PRICING}
      adminEmail={session.user.email ?? ''}
    />
  );
}
