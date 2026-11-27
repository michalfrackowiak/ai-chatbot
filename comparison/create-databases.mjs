import postgres from 'postgres';

const adminUrl = process.env.POSTGRES_ADMIN_URL;
if (!adminUrl) {
  throw new Error(
    'Set POSTGRES_ADMIN_URL to a local Postgres database with CREATE DATABASE permission.',
  );
}

const databases = [
  'fcmp_nemotron',
  'fcmp_hy4',
  'fcmp_sol',
  'fcmp_astra',
  'fcmp_pickle',
  'fcmp_luna',
];
const sql = postgres(adminUrl, { max: 1 });

try {
  for (const name of databases) {
    const existing = await sql`select 1 from pg_database where datname = ${name}`;
    if (existing.length === 0) {
      await sql.unsafe(`create database "${name}"`);
      console.log(`Created ${name}`);
    } else {
      console.log(`Keeping existing ${name}`);
    }
  }
} finally {
  await sql.end();
}
