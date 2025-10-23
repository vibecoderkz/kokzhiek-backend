import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function applyIndexes() {
  const { Pool } = await import('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔌 Подключение к базе данных...');

    // Читаем SQL миграцию
    const migrationPath = join(__dirname, '../drizzle/0007_add_audit_logs_indexes.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Применение миграции audit logs indexes...');

    // Выполняем SQL миграцию
    await pool.query(migrationSQL);

    console.log('✅ Индексы успешно созданы!');
    console.log('\nСозданные индексы:');
    console.log('  - audit_logs_user_id_idx');
    console.log('  - audit_logs_entity_type_idx');
    console.log('  - audit_logs_entity_id_idx');
    console.log('  - audit_logs_action_idx');
    console.log('  - audit_logs_created_at_idx');
    console.log('  - audit_logs_entity_composite_idx');
    console.log('  - audit_logs_user_activity_idx');
    console.log('  - audit_logs_description_search_idx (full-text search)');

  } catch (error: any) {
    if (error.code === '42P07') {
      console.log('ℹ️  Индексы уже существуют');
    } else {
      console.error('❌ Ошибка при создании индексов:', error.message);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

applyIndexes()
  .then(() => {
    console.log('\n✅ Готово!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Ошибка:', error);
    process.exit(1);
  });
