import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function applyMigration() {
  const sql = neon(DATABASE_URL!);

  try {
    console.log('🔄 Reading migration file...');
    const migrationPath = path.join(__dirname, '../drizzle/0004_empty_komodo.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n🚀 Applying migration...');

    // Split by statement-breakpoint and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      console.log(`\n▶ Executing: ${statement.substring(0, 80)}...`);
      await sql(statement);
      console.log('✅ Success');
    }

    console.log('\n✨ Migration applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
