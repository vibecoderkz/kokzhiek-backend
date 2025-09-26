import { db } from '../src/config/database';
import { users, schools, registrationKeys } from '../src/models/schema';
import { eq } from 'drizzle-orm';

async function cleanDatabase() {
  console.log('🧹 Начинаем очистку базы данных...');

  try {
    // Оставляем только админов для управления системой
    const adminUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'admin'));

    console.log(`📊 Найдено ${adminUsers.length} админов (будут сохранены)`);

    // Удаляем всех неадминов (школы, учителя, ученики)
    console.log('🗑️ Удаляем пользователей (кроме админов)...');
    const deletedUsers = await db
      .delete(users)
      .where(eq(users.role, 'school'))
      .returning();

    const deletedTeachers = await db
      .delete(users)
      .where(eq(users.role, 'teacher'))
      .returning();

    const deletedStudents = await db
      .delete(users)
      .where(eq(users.role, 'student'))
      .returning();

    console.log(`✅ Удалено: ${deletedUsers.length} школ, ${deletedTeachers.length} учителей, ${deletedStudents.length} учеников`);

    // Удаляем все школы
    console.log('🏫 Удаляем школы...');
    const deletedSchools = await db.delete(schools).returning();
    console.log(`✅ Удалено школ: ${deletedSchools.length}`);

    // Удаляем все ключи регистрации
    console.log('🔑 Удаляем ключи регистрации...');
    const deletedKeys = await db.delete(registrationKeys).returning();
    console.log(`✅ Удалено ключей: ${deletedKeys.length}`);

    console.log('🎉 Очистка базы данных завершена!');
    console.log('💡 Теперь можно создавать новые ключи регистрации через админку');

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при очистке базы данных:', error);
    process.exit(1);
  }
}

cleanDatabase();