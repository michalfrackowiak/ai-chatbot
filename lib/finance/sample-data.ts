export type SampleEntry = {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
};

/**
 * A small, realistic data set spanning the last two months. Used both by
 * the in-app "Load sample data" button and the `pnpm db:seed` CLI.
 */
export function getSampleTransactions(now = new Date()): Array<SampleEntry> {
  const daysAgo = (days: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days);
    date.setHours(12, 0, 0, 0);
    return date;
  };

  const raw: Array<Omit<SampleEntry, 'date'> & { daysAgo: number }> = [
    { type: 'income', amount: 420000, category: 'Salary', description: 'Monthly salary', daysAgo: 58 },
    { type: 'income', amount: 420000, category: 'Salary', description: 'Monthly salary', daysAgo: 28 },
    { type: 'income', amount: 420000, category: 'Salary', description: 'Monthly salary', daysAgo: 2 },
    { type: 'income', amount: 85000, category: 'Freelance', description: 'Website redesign', daysAgo: 19 },
    { type: 'expense', amount: 145000, category: 'Rent', description: 'Apartment rent', daysAgo: 56 },
    { type: 'expense', amount: 145000, category: 'Rent', description: 'Apartment rent', daysAgo: 26 },
    { type: 'expense', amount: 145000, category: 'Rent', description: 'Apartment rent', daysAgo: 1 },
    { type: 'expense', amount: 12750, category: 'Groceries', description: 'Weekly groceries', daysAgo: 48 },
    { type: 'expense', amount: 9840, category: 'Groceries', description: 'Weekly groceries', daysAgo: 41 },
    { type: 'expense', amount: 14320, category: 'Groceries', description: 'Weekly groceries', daysAgo: 34 },
    { type: 'expense', amount: 11205, category: 'Groceries', description: 'Weekly groceries', daysAgo: 27 },
    { type: 'expense', amount: 13670, category: 'Groceries', description: 'Weekly groceries', daysAgo: 20 },
    { type: 'expense', amount: 10550, category: 'Groceries', description: 'Weekly groceries', daysAgo: 13 },
    { type: 'expense', amount: 12430, category: 'Groceries', description: 'Weekly groceries', daysAgo: 6 },
    { type: 'expense', amount: 6400, category: 'Transport', description: 'Metro pass', daysAgo: 24 },
    { type: 'expense', amount: 4750, category: 'Transport', description: 'Taxi', daysAgo: 11 },
    { type: 'expense', amount: 15200, category: 'Utilities', description: 'Electricity and water', daysAgo: 22 },
    { type: 'expense', amount: 13200, category: 'Utilities', description: 'Internet and phone', daysAgo: 9 },
    { type: 'expense', amount: 7600, category: 'Dining', description: 'Dinner with friends', daysAgo: 16 },
    { type: 'expense', amount: 4299, category: 'Software', description: 'Design tools subscription', daysAgo: 14 },
    { type: 'expense', amount: 8900, category: 'Health', description: 'Pharmacy', daysAgo: 7 },
    { type: 'expense', amount: 2500, category: 'Entertainment', description: 'Cinema tickets', daysAgo: 4 },
  ];

  return raw.map(({ daysAgo: offset, ...entry }) => ({
    ...entry,
    date: daysAgo(offset),
  }));
}
