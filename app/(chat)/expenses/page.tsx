import { redirect } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { ExpensesDashboard } from '@/components/expenses-dashboard';

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user) redirect('/api/auth/guest');

  return <ExpensesDashboard />;
}
