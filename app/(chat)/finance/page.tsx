import { redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { FinanceDashboard } from '@/components/finance-dashboard';

export default async function FinancePage() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  return <FinanceDashboard userEmail={session.user.email ?? ''} />;
}
