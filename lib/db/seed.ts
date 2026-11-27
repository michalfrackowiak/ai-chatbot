import { db } from './';
import { income, expense, aiUsageLog, user } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  // Check if data already exists
  const existingIncomes = await db.select().from(income);
  const existingExpenses = await db.select().from(expense);
  const existingUsers = await db.select().from(user);
  
  if (existingIncomes.length > 0 || existingExpenses.length > 0) {
    console.log('Sample data already exists, skipping seed');
    return;
  }
  
  // If no users exist, create a default one
  const defaultUserId = existingUsers[0]?.id || (await db.insert(user)
    .values({ email: 'test@example.com', password: 'password123' })
    .returning({ id: user.id }));
  
  // Sample income data
  const sampleIncomes = [
    { amount: '5000', description: 'Monthly Salary' },
    { amount: '200', description: 'Freelance project' },
    { amount: '150', description: 'Bonus' },
    { amount: '300', description: 'Refund' },
  ];
  
  // Sample expense data
  const sampleExpenses = [
    { amount: '120', description: 'Groceries' },
    { amount: '80', description: 'Utilities' },
    { amount: '65', description: 'Coffee shop' },
    { amount: '45', description: 'Transportation' },
    { amount: '200', description: 'Internet bill' },
    { amount: '150', description: ' Gym membership' },
  ];
  
  // Insert incomes
  for (const inc of sampleIncomes) {
    await db.insert(income).values({
      amount: inc.amount,
      description: inc.description,
      userId: defaultUserId[0].id,
    });
  }
  
  // Insert expenses
  for (const exp of sampleExpenses) {
    await db.insert(expense).values({
      amount: exp.amount,
      description: exp.description,
      userId: defaultUserId[0].id,
    });
  }
  
  // Insert some AI usage log entries
  await db.insert(aiUsageLog).values([
    {
      model: 'gpt-4',
      promptTokens: 150,
      completionTokens: 200,
      cost: '0.15',
      userId: defaultUserId[0].id,
    },
    {
      model: 'gpt-3.5-turbo',
      promptTokens: 100,
      completionTokens: 150,
      cost: '0.05',
      userId: defaultUserId[0].id,
    },
  ]);
  
  console.log('Sample data seeded successfully');
}

seed().catch(console.error);
export { seed };