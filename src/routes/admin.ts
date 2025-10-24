
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { requireRole } from '../middleware/roleAuth';
import { RegistrationKeyService } from '../services/registrationKeyService';
import { SchoolService } from '../services/schoolService';
import { z } from 'zod';
import { UserRole } from '../types/auth';

const router = Router();

const CreateKeySchema = z.object({
  role: z.enum(['admin', 'moderator', 'author', 'school', 'teacher', 'student']),
  description: z.string().optional(),
  maxUses: z.number().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
});

const CreateBulkKeysSchema = z.object({
  role: z.enum(['admin', 'moderator', 'author', 'school', 'teacher', 'student']),
  count: z.number().min(1).max(100),
  description: z.string().optional(),
  maxUses: z.number().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  keyPrefix: z.string().optional(),
});

/**
 * @swagger
 * /api/admin/registration-keys:
 *   post:
 *     summary: Create a new registration key
 *     tags: [Admin - Registration Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, author, school, teacher, student]
 *                 description: Role that the registration key will grant
 *               description:
 *                 type: string
 *                 description: Optional description for the key
 *               maxUses:
 *                 type: number
 *                 minimum: 1
 *                 description: "Maximum number of uses (default: 1)"
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiration date
 *     responses:
 *       201:
 *         description: Registration key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Registration key created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     keyInfo:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         keyCode:
 *                           type: string
 *                         role:
 *                           type: string
 *                         description:
 *                           type: string
 *                           nullable: true
 *                         maxUses:
 *                           type: number
 *                           nullable: true
 *                         usesRemaining:
 *                           type: number
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         status:
 *                           type: string
 *                           enum: [active, expired, exhausted, inactive]
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/registration-keys',
  authenticateToken,
  requireRole(['admin']),
  validateRequest(CreateKeySchema),
  async (req, res): Promise<void> => {
    try {
      const { role, description, maxUses, expiresAt } = req.body;
      const userId = (req as any).user.userId;

      const keyInfo = await RegistrationKeyService.createRegistrationKey({
        role: role as UserRole,
        description,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Registration key created successfully',
        data: { keyInfo }
      });
    } catch (error) {
      console.error('Error creating registration key:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create registration key',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/registration-keys/bulk:
 *   post:
 *     summary: Create multiple registration keys at once
 *     tags: [Admin - Registration Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - count
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, author, school, teacher, student]
 *                 description: Role that the registration keys will grant
 *               count:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Number of keys to create
 *               description:
 *                 type: string
 *                 description: Optional description for the keys
 *               maxUses:
 *                 type: number
 *                 minimum: 1
 *                 description: "Maximum number of uses per key (default: 1)"
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiration date for all keys
 *               keyPrefix:
 *                 type: string
 *                 description: Optional prefix for generated keys
 *     responses:
 *       201:
 *         description: Registration keys created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Registration keys created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     keys:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Array of generated key codes
 *                     count:
 *                       type: number
 *                       description: Number of keys created
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/registration-keys/bulk',
  authenticateToken,
  requireRole(['admin']),
  validateRequest(CreateBulkKeysSchema),
  async (req, res): Promise<void> => {
    try {
      const { role, count, description, maxUses, expiresAt, keyPrefix } = req.body;
      const userId = (req as any).user.userId;

      const keys = await RegistrationKeyService.createBulkRegistrationKeys({
        role: role as UserRole,
        count,
        description,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        keyPrefix,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        message: 'Registration keys created successfully',
        data: { keys, count: keys.length }
      });
    } catch (error) {
      console.error('Error creating bulk registration keys:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create registration keys',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/registration-keys:
 *   get:
 *     summary: Get all registration keys with optional filtering
 *     tags: [Admin - Registration Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of keys per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, exhausted, inactive]
 *         description: Filter by key status
 *     responses:
 *       200:
 *         description: Registration keys retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Registration keys retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     keys:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           keyCode:
 *                             type: string
 *                           role:
 *                             type: string
 *                           description:
 *                             type: string
 *                             nullable: true
 *                           maxUses:
 *                             type: number
 *                             nullable: true
 *                           currentUses:
 *                             type: number
 *                             nullable: true
 *                           usesRemaining:
 *                             type: number
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           status:
 *                             type: string
 *                             enum: [active, expired, exhausted, inactive]
 *                     total:
 *                       type: number
 *                       description: Total number of keys
 *                     page:
 *                       type: number
 *                       description: Current page number
 *                     limit:
 *                       type: number
 *                       description: Number of keys per page
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/registration-keys',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const status = req.query.status as 'active' | 'expired' | 'exhausted' | 'inactive' | undefined;
      const keyCode = req.query.keyCode as string | undefined;

      const result = await RegistrationKeyService.getAllRegistrationKeys({
        page,
        limit,
        status,
        keyCode,
      });

      res.json({
        success: true,
        message: 'Registration keys retrieved successfully',
        data: {
          ...result,
          page,
          limit,
        }
      });
    } catch (error) {
      console.error('Error retrieving registration keys:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve registration keys',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/registration-keys/{keyCode}:
 *   get:
 *     summary: Get details of a specific registration key
 *     tags: [Admin - Registration Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The registration key code
 *     responses:
 *       200:
 *         description: Registration key details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Registration key details retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     keyInfo:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         keyCode:
 *                           type: string
 *                         role:
 *                           type: string
 *                         description:
 *                           type: string
 *                           nullable: true
 *                         maxUses:
 *                           type: number
 *                           nullable: true
 *                         currentUses:
 *                           type: number
 *                           nullable: true
 *                         usesRemaining:
 *                           type: number
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                         status:
 *                           type: string
 *                           enum: [active, expired, exhausted, inactive]
 *       404:
 *         description: Registration key not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/registration-keys/:keyCode',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const { keyCode } = req.params;

      const keyInfo = await RegistrationKeyService.getRegistrationKeyByCode(keyCode);

      if (!keyInfo) {
        res.status(404).json({
          success: false,
          error: {
            code: 'KEY_NOT_FOUND',
            message: 'Registration key not found',
          }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Registration key details retrieved successfully',
        data: { keyInfo }
      });
    } catch (error) {
      console.error('Error retrieving registration key:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve registration key',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/registration-keys/{keyCode}:
 *   delete:
 *     summary: Delete a registration key
 *     tags: [Admin - Registration Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyCode
 *         required: true
 *         schema:
 *           type: string
 *         description: The registration key code to delete
 *     responses:
 *       200:
 *         description: Registration key deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Registration key deleted successfully
 *       404:
 *         description: Registration key not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/registration-keys/:keyCode',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const { keyCode } = req.params;

      const result = await RegistrationKeyService.deleteRegistrationKey(keyCode);

      if (!result.success) {
        const statusCode = result.error === 'Registration key not found' ? 404 : 500;
        const errorCode = result.error === 'Registration key not found' ? 'KEY_NOT_FOUND' : 'INTERNAL_ERROR';

        res.status(statusCode).json({
          success: false,
          error: {
            code: errorCode,
            message: result.error,
          }
        });
        return;
      }

      res.json({
        success: true,
        message: 'Registration key deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting registration key:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete registration key',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/schools:
 *   get:
 *     summary: Get all schools with statistics
 *     tags: [Admin - Schools]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Schools retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Schools retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       address:
 *                         type: string
 *                         nullable: true
 *                       isActive:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       teachersCount:
 *                         type: number
 *                       studentsCount:
 *                         type: number
 *                       admin:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                             nullable: true
 *                           lastName:
 *                             type: string
 *                             nullable: true
 *                           email:
 *                             type: string
 *                       keyStats:
 *                         type: object
 *                         properties:
 *                           totalKeys:
 *                             type: number
 *                           usedKeys:
 *                             type: number
 *                           activeKeys:
 *                             type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/schools',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const schools = await SchoolService.getAllSchools();

      res.json({
        success: true,
        message: 'Schools retrieved successfully',
        data: schools
      });
    } catch (error) {
      console.error('Error retrieving schools:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve schools',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/schools/{schoolId}/users:
 *   get:
 *     summary: Get all users in a specific school
 *     tags: [Admin - Schools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema:
 *           type: string
 *         description: The school ID
 *     responses:
 *       200:
 *         description: School users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: School users retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                         nullable: true
 *                       lastName:
 *                         type: string
 *                         nullable: true
 *                       role:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       teacherId:
 *                         type: string
 *                         nullable: true
 *       404:
 *         description: School not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/schools/:schoolId/users',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const { schoolId } = req.params;

      const school = await SchoolService.getSchoolById(schoolId);
      if (!school) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SCHOOL_NOT_FOUND',
            message: 'School not found',
          }
        });
        return;
      }

      const users = await SchoolService.getSchoolUsers(schoolId);

      res.json({
        success: true,
        message: 'School users retrieved successfully',
        data: users
      });
    } catch (error) {
      console.error('Error retrieving school users:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve school users',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/assign-student:
 *   post:
 *     summary: Assign student to teacher
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - teacherId
 *             properties:
 *               studentId:
 *                 type: string
 *                 description: ID of the student
 *               teacherId:
 *                 type: string
 *                 description: ID of the teacher (empty string to unassign)
 *     responses:
 *       200:
 *         description: Student assigned successfully
 *       404:
 *         description: Student or teacher not found
 */
router.post('/assign-student',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const { studentId, teacherId } = req.body;

      const { db } = await import('../config/database');
      const { users } = await import('../models/schema');
      const { eq, and } = await import('drizzle-orm');

      // Validate student exists and is a student
      const [student] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, studentId), eq(users.role, 'student')))
        .limit(1);

      if (!student) {
        res.status(404).json({
          success: false,
          error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found' }
        });
        return;
      }

      // If teacherId is provided, validate teacher exists and is a teacher
      if (teacherId && teacherId !== '') {
        const [teacher] = await db
          .select()
          .from(users)
          .where(and(eq(users.id, teacherId), eq(users.role, 'teacher')))
          .limit(1);

        if (!teacher) {
          res.status(404).json({
            success: false,
            error: { code: 'TEACHER_NOT_FOUND', message: 'Teacher not found' }
          });
          return;
        }

        // Validate teacher and student are in the same school
        if (teacher.schoolId !== student.schoolId) {
          res.status(400).json({
            success: false,
            error: { code: 'SCHOOL_MISMATCH', message: 'Teacher and student must be in the same school' }
          });
          return;
        }
      }

      // Update student's teacherId
      await db
        .update(users)
        .set({ teacherId: teacherId === '' ? null : teacherId })
        .where(eq(users.id, studentId));

      res.json({
        success: true,
        message: teacherId === '' ? 'Student unassigned from teacher' : 'Student assigned to teacher successfully'
      });
    } catch (error) {
      console.error('Error assigning student:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to assign student' }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalKeys:
 *                       type: number
 *                     usedKeys:
 *                       type: number
 *                     totalSchools:
 *                       type: number
 *                     totalUsers:
 *                       type: number
 *                     activeUsers:
 *                       type: number
 */
router.get('/dashboard/stats',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const { db } = await import('../config/database');
      const { registrationKeys, schools, users } = await import('../models/schema');
      const { count, gt, eq, and } = await import('drizzle-orm');

      // Get total keys
      const [totalKeysResult] = await db
        .select({ count: count() })
        .from(registrationKeys);

      // Get used keys (where currentUses > 0)
      const [usedKeysResult] = await db
        .select({ count: count() })
        .from(registrationKeys)
        .where(gt(registrationKeys.currentUses, 0));

      // Get total schools
      const [totalSchoolsResult] = await db
        .select({ count: count() })
        .from(schools);

      // Get total users (only active)
      const [totalUsersResult] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true));

      // Get active users (active AND emailVerified)
      const [activeUsersResult] = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.isActive, true), eq(users.emailVerified, true)));

      res.json({
        success: true,
        data: {
          totalKeys: totalKeysResult.count,
          usedKeys: usedKeysResult.count,
          totalSchools: totalSchoolsResult.count,
          totalUsers: totalUsersResult.count,
          activeUsers: activeUsersResult.count
        }
      });
    } catch (error) {
      console.error('Error retrieving dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve dashboard statistics',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with filtering and pagination
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, moderator, author, school, teacher, student]
 *         description: Filter by user role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           role:
 *                             type: string
 *                           schoolId:
 *                             type: string
 *                             nullable: true
 *                           teacherId:
 *                             type: string
 *                             nullable: true
 *                           schoolName:
 *                             type: string
 *                             nullable: true
 *                           emailVerified:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: number
 *                       description: Total number of users
 *                     page:
 *                       type: number
 *                       description: Current page number
 *                     limit:
 *                       type: number
 *                       description: Number of users per page
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/users',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const role = req.query.role as string | undefined;
      const search = req.query.search as string | undefined;

      const { db } = await import('../config/database');
      const { users } = await import('../models/schema');
      const { eq, like, and, or, desc, count } = await import('drizzle-orm');

      // Build where conditions
      const conditions = [];

      if (role) {
        conditions.push(eq(users.role, role as any));
      }

      if (search) {
        const searchLower = `%${search.toLowerCase()}%`;
        conditions.push(
          or(
            like(users.firstName, searchLower),
            like(users.lastName, searchLower),
            like(users.email, searchLower)
          )
        );
      }

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get paginated users
      const usersList = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          schoolId: users.schoolId,
          teacherId: users.teacherId,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      // Add school names for users with schoolId
      const enrichedUsers = await Promise.all(
        usersList.map(async (user) => {
          let schoolName = null;

          if (user.schoolId) {
            const [school] = await db
              .select({ firstName: users.firstName, lastName: users.lastName })
              .from(users)
              .where(and(eq(users.id, user.schoolId), eq(users.role, 'school')))
              .limit(1);

            if (school) {
              schoolName = `${school.firstName} ${school.lastName}`;
            }
          }

          return {
            ...user,
            schoolName
          };
        })
      );

      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users: enrichedUsers,
          total: totalResult.count,
          page,
          limit
        }
      });
    } catch (error) {
      console.error('Error retrieving users:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve users',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/books:
 *   get:
 *     summary: Get all books with filtering, sorting and pagination
 *     tags: [Admin - Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of books per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by book title or author
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, author, createdAt, updatedAt, ownerEmail]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *       - in: query
 *         name: ownerId
 *         schema:
 *           type: string
 *         description: Filter by owner ID
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
 *         description: Filter by public/private status
 *     responses:
 *       200:
 *         description: Books retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/books',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const search = req.query.search as string | undefined;
      const sortBy = (req.query.sortBy as string) || 'createdAt'; // title, author, createdAt, updatedAt, ownerEmail
      const sortOrder = (req.query.sortOrder as string) || 'desc'; // asc, desc
      const ownerId = req.query.ownerId as string | undefined;
      const isPublic = req.query.isPublic as string | undefined;

      const { db } = await import('../config/database');
      const { books, users } = await import('../models/schema');
      const { like, or, desc, asc, count, eq, and } = await import('drizzle-orm');

      // Build where conditions
      const conditions = [];

      if (search) {
        const searchLower = `%${search.toLowerCase()}%`;
        conditions.push(
          or(
            like(books.title, searchLower),
            like(books.author, searchLower)
          )
        );
      }

      // Filter by owner
      if (ownerId) {
        conditions.push(eq(books.ownerId, ownerId));
      }

      // Filter by public status
      if (isPublic !== undefined) {
        const isPublicBool = isPublic === 'true';
        conditions.push(eq(books.isPublic, isPublicBool));
      }

      // Determine sort column and direction
      const sortDirection = sortOrder === 'asc' ? asc : desc;
      let sortColumn;
      switch (sortBy) {
        case 'title':
          sortColumn = books.title;
          break;
        case 'author':
          sortColumn = books.author;
          break;
        case 'updatedAt':
          sortColumn = books.updatedAt;
          break;
        case 'ownerEmail':
          sortColumn = users.email;
          break;
        case 'createdAt':
        default:
          sortColumn = books.createdAt;
          break;
      }

      // Get total count
      const [totalResult] = await db
        .select({ count: count() })
        .from(books)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get paginated books with owner info
      const booksList = await db
        .select({
          id: books.id,
          title: books.title,
          author: books.author,
          authors: books.authors,
          class: books.class,
          grade: books.grade,
          description: books.description,
          coverImageUrl: books.coverImageUrl,
          ownerId: books.ownerId,
          schoolId: books.schoolId,
          isPublic: books.isPublic,
          visibility: books.visibility,
          isbn: books.isbn,
          year: books.year,
          publisher: books.publisher,
          edition: books.edition,
          subject: books.subject,
          language: books.language,
          createdAt: books.createdAt,
          updatedAt: books.updatedAt,
          ownerEmail: users.email,
          ownerFirstName: users.firstName,
          ownerLastName: users.lastName
        })
        .from(books)
        .leftJoin(users, eq(users.id, books.ownerId))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sortDirection(sortColumn))
        .limit(limit)
        .offset((page - 1) * limit);

      // Enrich books with chapter count and audit log info
      const { chapters, auditLogs } = await import('../models/schema');
      const enrichedBooks = await Promise.all(
        booksList.map(async (book) => {
          // Count chapters for this book
          const [chapterCount] = await db
            .select({ count: count() })
            .from(chapters)
            .where(eq(chapters.bookId, book.id));

          // Get last audit log for this book
          const [lastAudit] = await db
            .select({
              action: auditLogs.action,
              description: auditLogs.description,
              createdAt: auditLogs.createdAt,
              userId: auditLogs.userId,
              extraData: auditLogs.extraData,
            })
            .from(auditLogs)
            .where(
              eq(auditLogs.entityId, book.id)
            )
            .orderBy(desc(auditLogs.createdAt))
            .limit(1);

          // Get editor info if audit log exists
          let lastEditorEmail = null;
          if (lastAudit && lastAudit.userId) {
            const [editor] = await db
              .select({ email: users.email })
              .from(users)
              .where(eq(users.id, lastAudit.userId))
              .limit(1);
            lastEditorEmail = editor?.email || null;
          }

          return {
            ...book,
            lastEditedAt: lastAudit?.createdAt || book.updatedAt,
            lastEditAction: lastAudit?.action || null,
            lastEditDescription: lastAudit?.description || null,
            lastEditedBy: lastAudit?.userId || null,
            lastEditorEmail,
            chaptersCount: chapterCount.count || 0,
            lastAuditExtraData: lastAudit?.extraData || null
          };
        })
      );

      res.json({
        success: true,
        message: 'Books retrieved successfully',
        data: {
          books: enrichedBooks,
          total: totalResult.count,
          page,
          limit,
          totalPages: Math.ceil(totalResult.count / limit)
        }
      });
    } catch (error) {
      console.error('Error retrieving books:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve books',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/export:
 *   get:
 *     summary: Export system data
 *     tags: [Admin - Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Export format
 *       - in: query
 *         name: data
 *         schema:
 *           type: string
 *           enum: [all, keys, schools, users]
 *           default: all
 *         description: Data to export
 *     responses:
 *       200:
 *         description: Data exported successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/export',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const format = (req.query.format as string) || 'csv';
      const dataType = (req.query.data as string) || 'all';

      const { db } = await import('../config/database');
      const { registrationKeys, schools, users } = await import('../models/schema');

      let data: any = {};

      if (dataType === 'all' || dataType === 'keys') {
        const keysData = await db.select().from(registrationKeys);
        data.registrationKeys = keysData;
      }

      if (dataType === 'all' || dataType === 'schools') {
        const schoolsData = await db.select().from(schools);
        data.schools = schoolsData;
      }

      if (dataType === 'all' || dataType === 'users') {
        const usersData = await db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          schoolId: users.schoolId,
          teacherId: users.teacherId,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt
        }).from(users);
        data.users = usersData;
      }

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=kokzhiek_export_${new Date().toISOString().split('T')[0]}.json`);
        res.json(data);
      } else {
        // CSV format
        const createCSV = (items: any[], headers: string[]) => {
          if (!items.length) return '';
          const csvHeaders = headers.join(',');
          const csvRows = items.map(item =>
            headers.map(header => {
              const value = item[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return String(value);
            }).join(',')
          );
          return [csvHeaders, ...csvRows].join('\n');
        };

        let csvContent = '';

        if (data.registrationKeys) {
          csvContent += 'REGISTRATION KEYS\n';
          csvContent += createCSV(data.registrationKeys, ['id', 'keyCode', 'role', 'description', 'maxUses', 'currentUses', 'expiresAt', 'isActive', 'createdAt']);
          csvContent += '\n\n';
        }

        if (data.schools) {
          csvContent += 'SCHOOLS\n';
          csvContent += createCSV(data.schools, ['id', 'name', 'description', 'address', 'isActive', 'adminId', 'createdAt']);
          csvContent += '\n\n';
        }

        if (data.users) {
          csvContent += 'USERS\n';
          csvContent += createCSV(data.users, ['id', 'email', 'firstName', 'lastName', 'role', 'schoolId', 'teacherId', 'emailVerified', 'createdAt']);
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=kokzhiek_export_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to export data',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/audit-logs/export:
 *   get:
 *     summary: Export audit logs to CSV or JSON file
 *     tags: [Admin - Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Export format
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [create, update, delete, login, logout, access]
 *         description: Filter by action type
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filter by entity type (e.g., book, user)
 *     responses:
 *       200:
 *         description: Audit logs exported successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/audit-logs/export',
  authenticateToken,
  requireRole(['admin', 'moderator']),
  async (req, res): Promise<void> => {
    try {
      const format = (req.query.format as string) || 'csv';
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const action = req.query.action as string | undefined;
      const entityType = req.query.entityType as string | undefined;

      const { AuditService } = await import('../services/auditService');

      // Используем существующий метод экспорта из AuditService
      if (format === 'csv') {
        const csvData = await AuditService.exportToCSV({
          startDate,
          endDate,
          action: action as any,
          entityType,
          limit: 10000, // Максимум для экспорта
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvData);
      } else {
        // JSON формат
        const logsData = await AuditService.getAuditLogs({
          startDate,
          endDate,
          action: action as any,
          entityType,
          limit: 10000,
          page: 1,
        });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().split('T')[0]}.json`);
        res.json({
          success: true,
          exportedAt: new Date().toISOString(),
          filters: {
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            action,
            entityType
          },
          data: logsData.logs,
          total: logsData.pagination.total
        });
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to export audit logs',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/audit-logs/search:
 *   get:
 *     summary: Search audit logs by description keywords
 *     tags: [Admin - Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (keywords to search in descriptions)
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of logs per page
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [create, update, delete, login, logout, access]
 *         description: Filter by action type
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filter by entity type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs until this date
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Search results retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           action:
 *                             type: string
 *                           description:
 *                             type: string
 *                           entityType:
 *                             type: string
 *                           entityId:
 *                             type: string
 *                           entityName:
 *                             type: string
 *                             nullable: true
 *                           userId:
 *                             type: string
 *                           userEmail:
 *                             type: string
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           ipAddress:
 *                             type: string
 *                             nullable: true
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         totalPages:
 *                           type: number
 *                     query:
 *                       type: string
 *                       description: The search query used
 *       400:
 *         description: Invalid input - search query is required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/audit-logs/search',
  authenticateToken,
  requireRole(['admin', 'moderator']),
  async (req, res): Promise<void> => {
    try {
      const query = req.query.query as string;

      if (!query || query.trim() === '') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Search query is required',
          }
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const action = req.query.action as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const { AuditService } = await import('../services/auditService');

      // Используем существующий метод с поиском
      const logsData = await AuditService.getAuditLogs({
        search: query,
        page,
        limit,
        action: action as any,
        entityType,
        startDate,
        endDate,
      });

      res.json({
        success: true,
        message: 'Search results retrieved successfully',
        data: {
          logs: logsData.logs,
          pagination: logsData.pagination,
          query: query,
          filters: {
            action,
            entityType,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Error searching audit logs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search audit logs',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get audit logs with advanced filtering and pagination
 *     tags: [Admin - Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: Filter by book ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filter by entity type (e.g., book)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [create, update, delete, login, logout, access]
 *         description: Filter by action type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter until this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in descriptions
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully with stats
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Moderator access required
 */
router.get('/audit-logs',
  authenticateToken,
  requireRole(['admin', 'moderator']),
  async (req, res): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const entityId = req.query.entityId as string | undefined;
      const userId = req.query.userId as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const action = req.query.action as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const search = req.query.search as string | undefined;

      const { AuditService } = await import('../services/auditService');

      // Получаем логи с фильтрами
      const logsData = await AuditService.getAuditLogs({
        page,
        limit,
        entityId,
        userId,
        entityType,
        action: action as any,
        startDate,
        endDate,
        search,
      });

      // Получаем статистику по пользователям (с теми же фильтрами, но без пагинации)
      const userStats = await AuditService.getUserStats({
        entityId,
        entityType,
        action: action as any,
        startDate,
        endDate,
      });

      res.json({
        success: true,
        message: 'Audit logs retrieved successfully',
        data: {
          logs: logsData.logs,
          pagination: logsData.pagination,
          userStats, // Сколько изменений у кого
          filters: {
            entityId,
            userId,
            entityType,
            action,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            search,
          }
        }
      });
    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve audit logs',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/audit-logs/{logId}/undo:
 *   post:
 *     summary: Undo a specific action recorded in audit logs
 *     tags: [Admin - Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: logId
 *         required: true
 *         schema:
 *           type: string
 *         description: The audit log ID to undo
 *     responses:
 *       200:
 *         description: Action undone successfully
 *       400:
 *         description: Action cannot be undone
 *       404:
 *         description: Audit log not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/audit-logs/:logId/undo',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const { logId } = req.params;
      const userId = (req as any).user.userId;

      const { db } = await import('../config/database');
      const { auditLogs, books, chapters, blocks, registrationKeys } = await import('../models/schema');
      const { eq } = await import('drizzle-orm');

      // Получаем audit log
      const [log] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, logId))
        .limit(1);

      if (!log) {
        res.status(404).json({
          success: false,
          error: {
            code: 'LOG_NOT_FOUND',
            message: 'Audit log not found',
          }
        });
        return;
      }

      // Определяем, можно ли отменить действие
      const action = log.action.toLowerCase();
      const entityType = log.entityType.toLowerCase();

      // Проверяем, что это не системное действие
      if (action === 'logged_in' || action === 'logged_out' || action === 'accessed') {
        res.status(400).json({
          success: false,
          error: {
            code: 'CANNOT_UNDO',
            message: 'System actions cannot be undone',
          }
        });
        return;
      }

      const { AuditService } = await import('../services/auditService');

      try {
        // В зависимости от типа действия и сущности выполняем откат
        if (action === 'created') {
          // Для created - удаляем созданную сущность
          if (entityType === 'book' && log.entityId) {
            await db.delete(books).where(eq(books.id, log.entityId));
            await AuditService.log({
              userId,
              action: 'delete',
              entityType: 'book',
              entityId: log.entityId,
              description: `Undid creation: ${log.description}`,
              extraData: { undoLogId: logId }
            });
          } else if (entityType === 'chapter' && log.entityId) {
            await db.delete(chapters).where(eq(chapters.id, log.entityId));
            await AuditService.log({
              userId,
              action: 'delete',
              entityType: 'chapter',
              entityId: log.entityId,
              description: `Undid creation: ${log.description}`,
              extraData: { undoLogId: logId }
            });
          } else if (entityType === 'block' && log.entityId) {
            await db.delete(blocks).where(eq(blocks.id, log.entityId));
            await AuditService.log({
              userId,
              action: 'delete',
              entityType: 'block',
              entityId: log.entityId,
              description: `Undid creation: ${log.description}`,
              extraData: { undoLogId: logId }
            });
          } else if (entityType === 'registration_key' && log.entityId) {
            await db.delete(registrationKeys).where(eq(registrationKeys.id, log.entityId));
            await AuditService.log({
              userId,
              action: 'delete',
              entityType: 'registration_key',
              entityId: log.entityId,
              description: `Undid creation: ${log.description}`,
              extraData: { undoLogId: logId }
            });
          } else {
            res.status(400).json({
              success: false,
              error: {
                code: 'UNSUPPORTED_ENTITY',
                message: `Undo not supported for entity type: ${entityType}`,
              }
            });
            return;
          }
        } else if (action === 'updated' || action.includes('updated')) {
          // Для updated - восстанавливаем старые значения
          const extraData = log.extraData as any;

          if (!extraData || !extraData.changes) {
            res.status(400).json({
              success: false,
              error: {
                code: 'NO_UNDO_DATA',
                message: 'No data available to undo this action',
              }
            });
            return;
          }

          // Формируем объект с старыми значениями
          const oldValues: Record<string, any> = {};
          for (const change of extraData.changes) {
            oldValues[change.field] = change.oldValue;
          }

          if (entityType === 'book' && log.entityId) {
            await db.update(books)
              .set(oldValues)
              .where(eq(books.id, log.entityId));

            await AuditService.log({
              userId,
              action: 'update',
              entityType: 'book',
              entityId: log.entityId,
              description: `Undid update: ${log.description}`,
              extraData: { undoLogId: logId, restoredValues: oldValues }
            });
          } else if (entityType === 'chapter' && log.entityId) {
            await db.update(chapters)
              .set(oldValues)
              .where(eq(chapters.id, log.entityId));

            await AuditService.log({
              userId,
              action: 'update',
              entityType: 'chapter',
              entityId: log.entityId,
              description: `Undid update: ${log.description}`,
              extraData: { undoLogId: logId, restoredValues: oldValues }
            });
          } else {
            res.status(400).json({
              success: false,
              error: {
                code: 'UNSUPPORTED_ENTITY',
                message: `Undo not supported for entity type: ${entityType}`,
              }
            });
            return;
          }
        } else if (action === 'deleted') {
          // Для deleted - восстанавливаем удаленную сущность
          res.status(400).json({
            success: false,
            error: {
              code: 'CANNOT_RESTORE',
              message: 'Restoring deleted entities is not yet supported. Please create a new entity manually.',
            }
          });
          return;
        } else {
          res.status(400).json({
            success: false,
            error: {
              code: 'UNSUPPORTED_ACTION',
              message: `Undo not supported for action: ${action}`,
            }
          });
          return;
        }

        res.json({
          success: true,
          message: 'Action undone successfully',
          data: {
            undoneLogId: logId,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId
          }
        });
      } catch (undoError) {
        console.error('Error performing undo:', undoError);
        res.status(500).json({
          success: false,
          error: {
            code: 'UNDO_FAILED',
            message: 'Failed to undo action: ' + (undoError instanceof Error ? undoError.message : 'Unknown error'),
          }
        });
      }
    } catch (error) {
      console.error('Error undoing action:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to undo action',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/books/find:
 *   post:
 *     summary: Find text in books
 *     tags: [Admin - Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - findText
 *             properties:
 *               findText:
 *                 type: string
 *                 description: Text to search for
 *               searchField:
 *                 type: string
 *                 enum: [all, title, author]
 *                 default: all
 *                 description: Field to search in
 *               caseSensitive:
 *                 type: boolean
 *                 default: false
 *                 description: Case sensitive search
 *               wholeWord:
 *                 type: boolean
 *                 default: false
 *                 description: Match whole words only
 *               useRegex:
 *                 type: boolean
 *                 default: false
 *                 description: Use regular expression
 *     responses:
 *       200:
 *         description: Search completed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/books/find',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const {
        findText,
        searchField = 'all',
        caseSensitive = false,
        wholeWord = false,
        useRegex = false
      } = req.body;

      if (!findText || findText.trim() === '') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Search text is required',
          }
        });
        return;
      }

      const { db } = await import('../config/database');
      const { books } = await import('../models/schema');
      const { like, or, and } = await import('drizzle-orm');

      // Подготовка поискового запроса
      let searchPattern: string;

      if (useRegex) {
        // Для regex используем as is
        searchPattern = findText;
      } else if (wholeWord) {
        // Для целых слов добавляем границы
        searchPattern = caseSensitive
          ? `%${findText}%`
          : `%${findText.toLowerCase()}%`;
      } else {
        // Обычный поиск
        searchPattern = caseSensitive
          ? `%${findText}%`
          : `%${findText.toLowerCase()}%`;
      }

      const conditions = [];

      // Применяем поиск в зависимости от выбранного поля
      if (searchField === 'all' || searchField === 'title') {
        conditions.push(
          caseSensitive
            ? like(books.title, searchPattern)
            : like(books.title, searchPattern)
        );
      }

      if (searchField === 'all' || searchField === 'author') {
        conditions.push(
          caseSensitive
            ? like(books.author, searchPattern)
            : like(books.author, searchPattern)
        );
      }

      // Выполняем поиск
      const matchedBooks = await db
        .select({
          id: books.id,
          title: books.title,
          author: books.author,
        })
        .from(books)
        .where(conditions.length > 1 ? or(...conditions) : conditions[0]);

      // Подсчитываем совпадения в каждой книге
      const results = matchedBooks.map(book => {
        let matchCount = 0;
        let field = '';

        if (searchField === 'all' || searchField === 'title') {
          const titleMatches = book.title ?
            (caseSensitive
              ? (book.title.match(new RegExp(useRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
              : (book.title.toLowerCase().match(new RegExp(useRegex ? findText.toLowerCase() : findText.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
            ) : 0;

          if (titleMatches > 0) {
            matchCount += titleMatches;
            field = 'title';
          }
        }

        if (searchField === 'all' || searchField === 'author') {
          const authorMatches = book.author ?
            (caseSensitive
              ? (book.author.match(new RegExp(useRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
              : (book.author.toLowerCase().match(new RegExp(useRegex ? findText.toLowerCase() : findText.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
            ) : 0;

          if (authorMatches > 0) {
            matchCount += authorMatches;
            field = field ? 'title, author' : 'author';
          }
        }

        return {
          bookId: book.id,
          bookTitle: book.title,
          field,
          oldValue: field.includes('title') ? book.title : book.author,
          newValue: '', // Для find не заполняем
          matchCount
        };
      });

      res.json({
        success: true,
        message: `Found ${results.length} books with ${results.reduce((sum, r) => sum + r.matchCount, 0)} matches`,
        data: {
          results,
          searchParams: {
            findText,
            searchField,
            caseSensitive,
            wholeWord,
            useRegex
          }
        }
      });
    } catch (error) {
      console.error('Error finding text in books:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search books',
        }
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/books/replace:
 *   post:
 *     summary: Replace text in books
 *     tags: [Admin - Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - findText
 *               - replaceText
 *             properties:
 *               findText:
 *                 type: string
 *                 description: Text to search for
 *               replaceText:
 *                 type: string
 *                 description: Text to replace with
 *               searchField:
 *                 type: string
 *                 enum: [all, title, author]
 *                 default: all
 *                 description: Field to search in
 *               caseSensitive:
 *                 type: boolean
 *                 default: false
 *                 description: Case sensitive search
 *               wholeWord:
 *                 type: boolean
 *                 default: false
 *                 description: Match whole words only
 *               useRegex:
 *                 type: boolean
 *                 default: false
 *                 description: Use regular expression
 *     responses:
 *       200:
 *         description: Replace completed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/books/replace',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const {
        findText,
        replaceText,
        searchField = 'all',
        caseSensitive = false,
        wholeWord = false,
        useRegex = false
      } = req.body;

      if (!findText || findText.trim() === '') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Search text is required',
          }
        });
        return;
      }

      if (replaceText === undefined || replaceText === null) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Replace text is required',
          }
        });
        return;
      }

      const userId = (req as any).user.userId;

      const { db } = await import('../config/database');
      const { books } = await import('../models/schema');
      const { like, or, eq } = await import('drizzle-orm');
      const { AuditService } = await import('../services/auditService');

      // Подготовка поискового запроса
      let searchPattern: string;

      if (useRegex) {
        searchPattern = findText;
      } else if (wholeWord) {
        searchPattern = caseSensitive
          ? `%${findText}%`
          : `%${findText.toLowerCase()}%`;
      } else {
        searchPattern = caseSensitive
          ? `%${findText}%`
          : `%${findText.toLowerCase()}%`;
      }

      const conditions = [];

      if (searchField === 'all' || searchField === 'title') {
        conditions.push(
          caseSensitive
            ? like(books.title, searchPattern)
            : like(books.title, searchPattern)
        );
      }

      if (searchField === 'all' || searchField === 'author') {
        conditions.push(
          caseSensitive
            ? like(books.author, searchPattern)
            : like(books.author, searchPattern)
        );
      }

      // Находим все подходящие книги
      const matchedBooks = await db
        .select()
        .from(books)
        .where(conditions.length > 1 ? or(...conditions) : conditions[0]);

      const results = [];

      // Для каждой книги выполняем замену
      for (const book of matchedBooks) {
        const updates: Record<string, any> = {};
        const changes: any[] = [];
        let matchCount = 0;

        // Функция для выполнения замены
        const performReplace = (text: string | null): string | null => {
          if (!text) return text;

          let result: string;
          let count = 0;

          if (useRegex) {
            const regex = new RegExp(findText, caseSensitive ? 'g' : 'gi');
            result = text.replace(regex, (match) => {
              count++;
              return replaceText;
            });
          } else if (wholeWord) {
            const escapedText = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedText}\\b`, caseSensitive ? 'g' : 'gi');
            result = text.replace(regex, (match) => {
              count++;
              return replaceText;
            });
          } else {
            if (caseSensitive) {
              const splits = text.split(findText);
              count = splits.length - 1;
              result = splits.join(replaceText);
            } else {
              const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
              result = text.replace(regex, (match) => {
                count++;
                return replaceText;
              });
            }
          }

          matchCount += count;
          return result;
        };

        // Заменяем в title
        if ((searchField === 'all' || searchField === 'title') && book.title) {
          const newTitle = performReplace(book.title);
          if (newTitle !== book.title) {
            updates.title = newTitle;
            changes.push({
              field: 'title',
              oldValue: book.title,
              newValue: newTitle
            });
          }
        }

        // Заменяем в author
        if ((searchField === 'all' || searchField === 'author') && book.author) {
          const newAuthor = performReplace(book.author);
          if (newAuthor !== book.author) {
            updates.author = newAuthor;
            changes.push({
              field: 'author',
              oldValue: book.author,
              newValue: newAuthor
            });
          }
        }

        // Если есть изменения, обновляем книгу
        if (Object.keys(updates).length > 0) {
          await db
            .update(books)
            .set(updates)
            .where(eq(books.id, book.id));

          // Создаем audit log
          await AuditService.log({
            userId,
            action: 'update',
            entityType: 'book',
            entityId: book.id,
            entityName: book.title,
            description: `Bulk replace: "${findText}" → "${replaceText}" in ${changes.map(c => c.field).join(', ')}`,
            extraData: {
              changes,
              findReplace: {
                findText,
                replaceText,
                searchField,
                caseSensitive,
                wholeWord,
                useRegex
              }
            }
          });

          results.push({
            bookId: book.id,
            bookTitle: book.title,
            field: changes.map(c => c.field).join(', '),
            oldValue: changes[0].oldValue,
            newValue: changes[0].newValue,
            matchCount
          });
        }
      }

      res.json({
        success: true,
        message: `Replaced in ${results.length} books`,
        data: {
          results,
          totalMatches: results.reduce((sum, r) => sum + r.matchCount, 0),
          searchParams: {
            findText,
            replaceText,
            searchField,
            caseSensitive,
            wholeWord,
            useRegex
          }
        }
      });
    } catch (error) {
      console.error('Error replacing text in books:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to replace text in books',
        }
      });
    }
  }
);

export default router;