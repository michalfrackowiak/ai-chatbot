import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Income } from '@/lib/db/schema';
import { createIncome, getIncomesByUserId } from '@/lib/db/queries';

const incomeSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  description: z.string().min(1, 'Description is required'),
});

type IncomeFormValues = z.infer<typeof incomeSchema>;

export function IncomeForm({ onSuccess }: { onSuccess: (income: Income) => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const { register, handleSubmit, reset, setError } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
  });

  const onSubmit = async (data: IncomeFormValues) => {
    setIsSaving(true);
    try {
      const result = await createIncome({
        amount: data.amount,
        description: data.description,
        userId: 'current-user', // TODO: get from auth
      });
      onSuccess(result);
      reset();
    } catch (error) {
      setError('general', { message: 'Failed to create income' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Amount</label>
        <input
          {...register('amount')}
          type="text"
          placeholder="e.g., 100.00"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {setError('amount') && <p className="text-sm text-red-600">{setError('amount').message()}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <input
          {...register('description')}
          type="text"
          placeholder="e.g., Salary, freelance project"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Add Income'}
      </button>
    </form>
  );
}