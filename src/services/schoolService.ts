import { db } from '../config/database';
import { schools, users, registrationKeys } from '../models/schema';
import { eq, and, count, desc, sql } from 'drizzle-orm';

export interface SchoolInfo {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  teachersCount: number;
  studentsCount: number;
  admin: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  keyStats?: {
    totalKeys: number;
    usedKeys: number;
    activeKeys: number;
  };
}

export class SchoolService {
  static async getAllSchools(): Promise<SchoolInfo[]> {
    try {
      const result = await db
        .select({
          id: schools.id,
          name: schools.name,
          description: schools.description,
          address: schools.address,
          isActive: schools.isActive,
          createdAt: schools.createdAt,
          adminId: schools.adminId,
          adminFirstName: users.firstName,
          adminLastName: users.lastName,
          adminEmail: users.email,
        })
        .from(schools)
        .leftJoin(users, eq(schools.adminId, users.id))
        .orderBy(desc(schools.createdAt));

      const schoolsWithCounts = await Promise.all(
        result.map(async (school) => {
          const teachersCount = await db
            .select({ count: count() })
            .from(users)
            .where(and(eq(users.schoolId, school.id), eq(users.role, 'teacher')));

          const studentsCount = await db
            .select({ count: count() })
            .from(users)
            .where(and(eq(users.schoolId, school.id), eq(users.role, 'student')));

          // Получаем статистику ключей, связанных с данной школой
          const keyStats = await db
            .select({
              totalKeys: count(),
              usedKeys: sql<number>`sum(case when ${registrationKeys.currentUses} > 0 then 1 else 0 end)`,
              activeKeys: sql<number>`sum(case when ${registrationKeys.isActive} = true then 1 else 0 end)`,
            })
            .from(registrationKeys)
            .leftJoin(users, eq(registrationKeys.id, users.registrationKeyId))
            .where(and(
              eq(registrationKeys.role, 'school'),
              eq(users.schoolId, school.id)
            ));

          return {
            id: school.id,
            name: school.name,
            description: school.description,
            address: school.address,
            isActive: school.isActive || false,
            createdAt: school.createdAt?.toISOString() || new Date().toISOString(),
            teachersCount: teachersCount[0]?.count || 0,
            studentsCount: studentsCount[0]?.count || 0,
            admin: school.adminId
              ? {
                  id: school.adminId,
                  firstName: school.adminFirstName,
                  lastName: school.adminLastName,
                  email: school.adminEmail!,
                }
              : null,
            keyStats: {
              totalKeys: keyStats[0]?.totalKeys || 0,
              usedKeys: Number(keyStats[0]?.usedKeys) || 0,
              activeKeys: Number(keyStats[0]?.activeKeys) || 0,
            },
          };
        })
      );

      return schoolsWithCounts;
    } catch (error) {
      console.error('Error fetching schools:', error);
      throw new Error('Failed to fetch schools');
    }
  }

  static async getSchoolById(schoolId: string): Promise<SchoolInfo | null> {
    try {
      const result = await db
        .select({
          id: schools.id,
          name: schools.name,
          description: schools.description,
          address: schools.address,
          isActive: schools.isActive,
          createdAt: schools.createdAt,
          adminId: schools.adminId,
          adminFirstName: users.firstName,
          adminLastName: users.lastName,
          adminEmail: users.email,
        })
        .from(schools)
        .leftJoin(users, eq(schools.adminId, users.id))
        .where(eq(schools.id, schoolId))
        .limit(1);

      if (!result.length) {
        return null;
      }

      const school = result[0];

      const teachersCount = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.schoolId, school.id), eq(users.role, 'teacher')));

      const studentsCount = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.schoolId, school.id), eq(users.role, 'student')));

      return {
        id: school.id,
        name: school.name,
        description: school.description,
        address: school.address,
        isActive: school.isActive || false,
        createdAt: school.createdAt?.toISOString() || new Date().toISOString(),
        teachersCount: teachersCount[0]?.count || 0,
        studentsCount: studentsCount[0]?.count || 0,
        admin: school.adminId
          ? {
              id: school.adminId,
              firstName: school.adminFirstName,
              lastName: school.adminLastName,
              email: school.adminEmail!,
            }
          : null,
      };
    } catch (error) {
      console.error('Error fetching school by ID:', error);
      throw new Error('Failed to fetch school');
    }
  }

  static async getSchoolUsers(schoolId: string): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          createdAt: users.createdAt,
          teacherId: users.teacherId,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.schoolId, schoolId))
        .orderBy(users.role, desc(users.createdAt));

      return result.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        teacherId: user.teacherId,
        isActive: user.isActive,
      }));
    } catch (error) {
      console.error('Error fetching school users:', error);
      throw new Error('Failed to fetch school users');
    }
  }

  static async getTeachers(schoolId?: string): Promise<Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    schoolId: string | null;
  }>> {
    try {
      const conditions = [eq(users.role, 'teacher'), eq(users.isActive, true)];

      if (schoolId) {
        conditions.push(eq(users.schoolId, schoolId));
      }

      const result = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          schoolId: users.schoolId,
        })
        .from(users)
        .where(and(...conditions))
        .orderBy(users.firstName, users.lastName);

      return result;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      throw new Error('Failed to fetch teachers');
    }
  }
}