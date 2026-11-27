import { config } from 'dotenv';

config({ path: '.env.local' });

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { toCents } from '../transactions/money';
import { transaction, user } from './schema';
import { generateHashedPassword } from './utils';

const email = process.argv[2] ?? 'demo@example.com';
const password = 'password';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is not defined. Set it in .env.local first.');
}

const client = postgres(process.env.POSTGRES_URL, { max: 1 });
const db = drizzle(client);

const samples: Array<{
  daysAgo: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
}> = [
  { daysAgo: 0, type: 'expense', amount: 12.4, category: 'groceries', description: 'Weekly shop' },
  { daysAgo: 1, type: 'expense', amount: 4.5, category: 'transport', description: 'Bus pass' },
  { daysAgo: 2, type: 'expense', amount: 38.0, category: 'dining', description: 'Dinner with friends' },
  { daysAgo: 4, type: 'expense', amount: 9.99, category: 'subscriptions', description: 'Streaming service' },
  { daysAgo: 6, type: 'income', amount: 450, category: 'freelance', description: 'Design invoice' },
  { daysAgo: 8, type: 'expense', amount: 64.2, category: 'utilities', description: 'Electricity bill' },
  { daysAgo: 11, type: 'expense', amount: 21.5, category: 'groceries', description: 'Farmers market' },
  { daysAgo: 14, type: 'expense', amount: 15.0, category: 'transport', description: 'Fuel' },
  { daysAgo: 18, type: 'expense', amount: 120.0, category: 'shopping', description: 'New running shoes' },
  { daysAgo: 22, type: 'income', amount: 3200, category: 'salary', description: 'Monthly salary' },
  { daysAgo: 22, type: 'expense', amount: 1250, category: 'rent', description: 'Apartment rent' },
  { daysAgo: 25, type: 'expense', amount: 42.75, category: 'groceries', description: 'Groceries' },
  { daysAgo: 29, type: 'expense', amount: 29.99, category: 'subscriptions', description: 'Music subscription' },
  { daysAgo: 33, type: 'expense', amount: 18.3, category: 'dining', description: 'Lunch' },
  { daysAgo: 38, type: 'income', amount: 450, category: 'freelance', description: 'Design invoice' },
  { daysAgo: 45, type: 'expense', amount: 55.0, category: 'utilities', description: 'Internet bill' },
  { daysAgo: 52, type: 'income', amount: 3200, category: 'salary', description: 'Monthly salary' },
  { daysAgo: 52, type: 'expense', amount: 1250, category: 'rent', description: 'Apartment rent' },
  { daysAgo: 58, type: 'expense', amount: 80.0, category: 'shopping', description: 'Kitchen supplies' },
  { daysAgo: 64, type: 'expense', amount: 33.4, category: 'groceries', description: 'Groceries' },
  { daysAgo: 70, type: 'income', amount: 250, category: 'freelance', description: 'Consulting' },
  { daysAgo: 76, type: 'expense', amount: 24.0, category: 'dining', description: 'Coffee and lunch' },
  { daysAgo: 82, type: 'income', amount: 3200, category: 'salary', description: 'Monthly salary' },
  { daysAgo: 82, type: 'expense', amount: 1250, category: 'rent', description: 'Apartment rent' },
];

async function seed() {
  const [account] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  const userId = account?.id ?? (await createDemoUser());

  const existing = await db
    .select({ id: transaction.id })
    .from(transaction)
    .where(eq(transaction.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    console.log(`⏭️  ${email} already has transactions; nothing seeded.`);
    return;
  }

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();

  await db.insert(transaction).values(
    samples.map((sample) => ({
      userId,
      type: sample.type,
      amount: toCents(sample.amount),
      category: sample.category,
      description: sample.description,
      occurredAt: new Date(now - sample.daysAgo * day),
      source: 'seed' as const,
    })),
  );

  console.log(`✅ Seeded ${samples.length} transactions for ${email}.`);
  if (!account) console.log(`   Demo login: ${email} / ${password}`);
}

async function createDemoUser(): Promise<string> {
  const [created] = await db
    .insert(user)
    .values({ email, password: generateHashedPassword(password) })
    .returning({ id: user.id });

  return created.id;
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
