import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { transaction, user } from './schema';
import { getSampleTransactions } from '@/lib/finance/sample-data';
import { generateHashedPassword } from './utils';

config({ path: '.env.local' });

const DEMO_EMAIL = 'demo@chat.local';
const DEMO_PASSWORD = 'demo1234';

const runSeed = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);

  console.log('⏳ Seeding demo account and sample transactions...');

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, DEMO_EMAIL))
    .limit(1);

  let userId = existing?.id;

  if (!userId) {
    const [created] = await db
      .insert(user)
      .values({
        email: DEMO_EMAIL,
        password: generateHashedPassword(DEMO_PASSWORD),
      })
      .returning({ id: user.id });
    userId = created.id;
  }

  const existingTransactions = await db
    .select({ id: transaction.id })
    .from(transaction)
    .where(eq(transaction.userId, userId))
    .limit(1);

  if (existingTransactions.length === 0) {
    await db.insert(transaction).values(
      getSampleTransactions().map((sample) => ({ ...sample, userId })),
    );
  }

  console.log('✅ Demo account ready');
  console.log(`   Email:    ${DEMO_EMAIL}`);
  console.log(`   Password: ${DEMO_PASSWORD}`);
  console.log('   Sign in at /login, then open /finance.');
  await connection.end();
  process.exit(0);
};

runSeed().catch((error) => {
  console.error('❌ Seed failed');
  console.error(error);
  process.exit(1);
});
