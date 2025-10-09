import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  console.log('🔄 Starting database migration...');

  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  try {
    const sql = neon(databaseUrl) as any;
    const db = drizzle(sql as any);

    console.log('📦 Applying migrations from ./drizzle folder...');

    await migrate(db as any, { migrationsFolder: './drizzle' });

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('New fields added to books table:');
    console.log('  - authors (jsonb)');
    console.log('  - grade (integer)');
    console.log('  - isbn (varchar)');
    console.log('  - year (integer)');
    console.log('  - publisher (varchar)');
    console.log('  - edition (varchar)');
    console.log('  - subject (varchar)');
    console.log('  - language (varchar)');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
