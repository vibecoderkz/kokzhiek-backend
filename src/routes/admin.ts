
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
            chaptersCount: chapterCount.count || 0
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

export default router;