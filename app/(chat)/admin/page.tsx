import { redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { isAdminEmail } from '@/lib/admin';
import { AdminDashboard } from '@/components/admin-dashboard';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  if (!isAdminEmail(session.user.email)) {
    redirect('/transactions');
  }

  return <AdminDashboard />;
}
