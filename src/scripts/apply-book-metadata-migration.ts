import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function applyMigration() {
  console.log('🔄 Applying book metadata migration...');

  const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  try {
    const sql = neon(databaseUrl);

    // Read the migration file
    const migrationPath = path.join(__dirname, '../../drizzle/0004_open_madrox.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📦 Executing migration SQL...');
    console.log('File:', migrationPath);
    console.log('');

    // Split by statement breakpoint and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 60) + '...');
      try {
        await sql(statement);
        console.log('✅ Success');
      } catch (error: any) {
        if (error.code === '42701') {
          // Column already exists
          console.log('⚠️  Column already exists, skipping');
        } else {
          throw error;
        }
      }
    }

    console.log('');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('New fields added to books table:');
    console.log('  - authors (jsonb) - array of authors');
    console.log('  - grade (integer) - grade level (1-11)');
    console.log('  - isbn (varchar) - ISBN code');
    console.log('  - year (integer) - publication year');
    console.log('  - publisher (varchar) - publisher name');
    console.log('  - edition (varchar) - edition info');
    console.log('  - subject (varchar) - book subject');
    console.log('  - language (varchar) - book language (kz/ru/en)');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
