import { useEffect, useState } from 'react';
import { getIncomesByUserId, getExpensesByUserId } from '@/lib/db/queries';
import { Income, Expense } from '@/lib/db/schema';

export function IncomeExpenseList() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeLoading, setIncomeLoading] = useState(true);
  const [expenseLoading, setExpenseLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIncomeLoading(true);
      setExpenseLoading(true);
      
      try {
        const [incomesResult, expensesResult] = await Promise.all([
          getIncomesByUserId({ userId: 'current-user' }),
          getExpensesByUserId({ userId: 'current-user' }),
        ]);
        
        setIncomes(incomesResult);
        setExpenses(expensesResult);
      } catch (error) {
        console.error('Failed to load incomes/expenses:', error);
      } finally {
        setIncomeLoading(false);
        setExpenseLoading(false);
      }
    }

    loadData();
  }, []);

  const totalIncome = incomes.reduce((sum, income) => {
    const amount = parseFloat(income.amount);
    return isNaN(amount) ? sum + 0 : sum + amount;
  }, 0);

  const totalExpenses = expenses.reduce((sum, expense) => {
    const amount = parseFloat(expense.amount);
    return isNaN(amount) ? sum + 0 : sum + amount;
  }, 0);

  const net = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Incomes Section */}
      <div>
        <h3 className="text-lg font-medium mb-3">Incomes</h3>
        {incomeLoading ? (
          <p className="text-muted-foreground">Loading incomes...</p>
        ) : incomes.length === 0 ? (
          <p className="text-muted-foreground">No incomes recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full rounded-md border border-border bg-card">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Description</th>
                  <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Amount</th>
                  <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((income) => (
                  <tr key={income.id} className="border-b border-border">
                    <td className="p-3">{income.description}</td>
                    <td className="p-3 font-medium">{income.amount}</td>
                    <td className="p-3 text-sm text-muted-foreground">{new Date(income.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex justify-between items-center">
          <span className="font-medium">Total Income: {totalIncome.toFixed(2)}</span>
          <span className="text-primary font-semibold">+{net > 0 ? net.toFixed(2) : '0'}</span>
        </div>
      </div>

      {/* Expenses Section */}
      <div>
        <h3 className="text-lg font-medium mb-3">Expenses</h3>
        {expenseLoading ? (
          <p className="text-muted-foreground">Loading expenses...</p>
        ) : expenses.length === 0 ? (
          <p className="text-muted-foreground">No expenses recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full rounded-md border border-border bg-card">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Description</th>
                  <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Amount</th>
                  <th className="p-3 text-left text-xs font-medium uppercase text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-border">
                    <td className="p-3">{expense.description}</td>
                    <td className="p-3 font-medium text-red-600">{expense.amount}</td>
                    <td className="p-3 text-sm text-muted-foreground">{new Date(expense.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex justify-between items-center">
          <span className="font-medium">Total Expenses: {totalExpenses.toFixed(2)}</span>
          <span className="text-red-600 font-semibold">{net < 0 ? (-net).toFixed(2) : '0'}</span>
        </div>
      </div>
    </div>
  );
}