import { ExpensesOverview } from '@/components/expenses/expenses-overview';

export default function ExpensesPage() {
  return (
    <main className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <ExpensesOverview />
      </div>
    </main>
  );
}