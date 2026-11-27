import { hash } from 'bcrypt-ts';
import postgres from 'postgres';

/**
 * Inserts (or refreshes) a known administrator in an isolated comparison
 * database. These schemas do not declare a unique constraint on email and
 * some have foreign keys pointing at users, so the seed must update the
 * existing identity rather than delete/reinsert it.
 */
const url = process.env.POSTGRES_URL;
const email = process.env.COMPARISON_ADMIN_EMAIL ?? 'admin@comparison.local';
const password = process.env.COMPARISON_ADMIN_PASSWORD ?? 'ComparisonAdmin123!';
const fallbackId =
  process.env.COMPARISON_ADMIN_USER_ID ?? '00000000-4000-4000-8000-000000000001';

if (!url) {
  throw new Error('POSTGRES_URL is required for admin seeding.');
}

const sql = postgres(url, { max: 1 });
try {
  const passwordHash = await hash(password, 10);
  const existing =
    await sql`select id from "User" where email = ${email} order by id limit 1`;

  let adminId;
  if (existing.length > 0) {
    adminId = existing[0].id;
    await sql`update "User" set password = ${passwordHash} where id = ${adminId}::uuid`;
  } else {
    adminId = fallbackId;
    await sql`
      insert into "User" (id, email, password)
      values (${adminId}::uuid, ${email}, ${passwordHash})
    `;
  }

  // The runner reads this line so id-gated branches can allowlist the id
  // that actually exists in their database.
  console.log(`ADMIN_USER_ID=${adminId}`);
} finally {
  await sql.end();
}
