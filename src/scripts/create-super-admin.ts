import { db } from '../config/database';
import { users, registrationKeys } from '../models/schema';
import { hashPassword, generateRegistrationKey } from '../utils/crypto';
import dotenv from 'dotenv';

dotenv.config();

async function createSuperAdmin() {
  try {
    console.log('Creating super admin user...');

    const adminEmail = 'balinteegor@gmail.com';
    const adminPassword = 'Tomiris2004!';
    const hashedPassword = await hashPassword(adminPassword);

    const [adminUser] = await db.insert(users).values({
      email: adminEmail,
      passwordHash: hashedPassword,
      firstName: 'Balint',
      lastName: 'Eegor',
      role: 'admin',
      emailVerified: true,
    }).returning();

    console.log('✅ Super admin user created:', {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role
    });

    const keyCode = generateRegistrationKey('INIT');
    const [initialKey] = await db.insert(registrationKeys).values({
      keyCode,
      role: 'admin',
      description: 'Initial setup key for admin registration',
      maxUses: 10,
      currentUses: 0,
      isActive: true,
      createdBy: adminUser.id,
    }).returning();

    console.log('✅ Initial registration key created:', {
      keyCode: initialKey.keyCode,
      role: initialKey.role,
      maxUses: initialKey.maxUses
    });

    console.log('\n🎉 Setup complete!');
    console.log('\nLogin credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`\nInitial registration key: ${keyCode}`);
    console.log('\n⚠️  Please change the admin password after first login!');

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) {
  createSuperAdmin();
}

export { createSuperAdmin };