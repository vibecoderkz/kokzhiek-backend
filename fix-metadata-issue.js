#!/usr/bin/env node

/**
 * 🚨 СКРИПТ ИСПРАВЛЕНИЯ ПРОБЛЕМЫ С МЕТАДАННЫМИ
 * 
 * Этот скрипт проверяет и исправляет проблему с сохранением метаданных книг
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 === ДИАГНОСТИКА ПРОБЛЕМЫ С МЕТАДАННЫМИ ===\n');

// 1. Проверяем зависимости
console.log('📦 1. Проверяем зависимости...');
try {
    if (fs.existsSync('./package.json')) {
        console.log('✅ package.json найден');
    } else {
        console.log('❌ package.json НЕ найден - запустите скрипт из корня kokzhiek-backend');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Ошибка проверки package.json:', error.message);
}

// 2. Проверяем файлы миграций
console.log('\n📂 2. Проверяем миграции...');
try {
    const migrationFiles = fs.readdirSync('./drizzle').filter(f => f.endsWith('.sql'));
    console.log(`✅ Найдено миграций: ${migrationFiles.length}`);
    
    const latestMigration = migrationFiles[migrationFiles.length - 1];
    if (latestMigration) {
        console.log(`📄 Последняя миграция: ${latestMigration}`);
        
        const migrationContent = fs.readFileSync(`./drizzle/${latestMigration}`, 'utf8');
        if (migrationContent.includes('isbn') && migrationContent.includes('publisher')) {
            console.log('✅ Миграция с метаданными найдена');
        } else {
            console.log('⚠️ Миграция с метаданными НЕ найдена');
        }
    }
} catch (error) {
    console.error('❌ Ошибка проверки миграций:', error.message);
}

// 3. Проверяем схему базы данных
console.log('\n🗄️ 3. Проверяем схему...');
try {
    const schemaPath = './src/models/schema.ts';
    if (fs.existsSync(schemaPath)) {
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        
        const metadataFields = ['isbn', 'year', 'publisher', 'edition', 'subject', 'language'];
        const missingFields = metadataFields.filter(field => !schemaContent.includes(`${field}:`));
        
        if (missingFields.length === 0) {
            console.log('✅ Все поля метаданных найдены в схеме');
        } else {
            console.log('❌ Отсутствующие поля в схеме:', missingFields);
        }
    }
} catch (error) {
    console.error('❌ Ошибка проверки схемы:', error.message);
}

// 4. Проверяем контроллер
console.log('\n🎮 4. Проверяем контроллер...');
try {
    const controllerPath = './src/controllers/bookController.ts';
    if (fs.existsSync(controllerPath)) {
        const controllerContent = fs.readFileSync(controllerPath, 'utf8');
        
        if (controllerContent.includes('UpdateBookSchema')) {
            console.log('✅ UpdateBookSchema найден в контроллере');
        } else {
            console.log('❌ UpdateBookSchema НЕ найден в контроллере');
        }
        
        if (controllerContent.includes('=== BOOK UPDATE DEBUG ===')) {
            console.log('✅ Отладочные логи добавлены в контроллер');
        } else {
            console.log('⚠️ Отладочные логи НЕ найдены в контроллере');
        }
    }
} catch (error) {
    console.error('❌ Ошибка проверки контроллера:', error.message);
}

// 5. Выводим инструкции
console.log('\n🔧 === ИНСТРУКЦИИ ПО ИСПРАВЛЕНИЮ ===\n');

console.log('1️⃣ ПРИМЕНЕНИЕ МИГРАЦИИ:');
console.log('   cd kokzhiek-backend');
console.log('   npm run db:push');
console.log('   # или');
console.log('   npx drizzle-kit push:pg\n');

console.log('2️⃣ ЗАПУСК СЕРВЕРА С ОТЛАДКОЙ:');
console.log('   npm run dev');
console.log('   # Смотрите логи в консоли\n');

console.log('3️⃣ ТЕСТИРОВАНИЕ:');
console.log('   1. Откройте фронтенд');
console.log('   2. Отредактируйте метаданные книги');
console.log('   3. Проверьте логи в консоли браузера');
console.log('   4. Проверьте логи в консоли сервера\n');

console.log('4️⃣ ПОИСК ЛОГОВ:');
console.log('   Frontend: "[EditBookModal] Отправляемые данные"');
console.log('   Backend: "=== BOOK UPDATE DEBUG ==="');
console.log('   Database: "[BookService/updateBook] Результат обновления в БД"\n');

console.log('5️⃣ ЕСЛИ ПРОБЛЕМА СОХРАНЯЕТСЯ:');
console.log('   1. Проверьте подключение к базе данных');
console.log('   2. Убедитесь что пользователь имеет права на редактирование');
console.log('   3. Проверьте Network tab в браузере на ошибки API');
console.log('   4. Посмотрите ошибки в логах сервера\n');

console.log('✅ === ДИАГНОСТИКА ЗАВЕРШЕНА ===');
console.log('📞 Следующий шаг: Запустите npm run dev и протестируйте сохранение метаданных\n');

// Пытаемся применить миграцию автоматически
console.log('🚀 Попытка автоматического применения миграции...');
try {
    console.log('Выполняем: npm run db:push');
    const result = execSync('npm run db:push', { 
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
    });
    console.log('✅ Миграция применена успешно!');
    console.log('📤 Вывод:', result);
} catch (error) {
    console.log('⚠️ Не удалось применить миграцию автоматически');
    console.log('💡 Попробуйте запустить вручную: npm run db:push');
    console.log('🔍 Ошибка:', error.message);
}

console.log('\n🎯 ГОТОВО! Теперь протестируйте сохранение метаданных в приложении.');