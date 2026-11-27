import { redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { TransactionsManager } from '@/components/transactions-manager';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
  }

  return <TransactionsManager />;
}
