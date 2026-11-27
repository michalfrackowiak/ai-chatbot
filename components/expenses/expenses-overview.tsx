import { IncomeExpenseList } from './income-expense-list';
import { IncomeForm } from './income-form';
import { ExpenseForm } from './expense-form';
import { useState } from 'react';

export function ExpensesOverview() {
  const [section, setSection] = useState<'incomes' | 'expenses'>('incomes');

  const handleIncomeAdd = (income: any) => {
    console.log('Income added:', income);
    // TODO: update state or refetch
  };

  const handleExpenseAdd = (expense: any) => {
    console.log('Expense added:', expense);
    // TODO: update state or refetch
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setSection('incomes')}
          className={section === 'incomes' 
            ? 'bg-primary text-white px-4 py-2 rounded-md'
            : 'text-primary px-4 py-2 rounded-md hover:bg-primary/10'}
        >
          Incomes
        </button>
        <button
          onClick={() => setSection('expenses')}
          className={section === 'expenses'
            ? 'bg-red-600 text-white px-4 py-2 rounded-md'
            : 'text-red-600 px-4 py-2 rounded-md hover:bg-red-600/10'}
        >
          Expenses
        </button>
      </div>

      {section === 'incomes' && (
        <div className="rounded-md border border-border bg-card p-6">
          <IncomeForm onSuccess={handleIncomeAdd} />
          <IncomeExpenseList />
        </div>
      )}

      {section === 'expenses' && (
        <div className="rounded-md border border-border bg-card p-6">
          <ExpenseForm onSuccess={handleExpenseAdd} />
          <IncomeExpenseList />
        </div>
      )}
    </div>
  );
}