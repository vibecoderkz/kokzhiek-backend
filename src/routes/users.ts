import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();
const authController = new AuthController();

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
});

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                   example: Profile retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/profile', authenticateToken, authController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: User's last name
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to user's avatar image
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
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
 */
router.put('/profile', authenticateToken, validateRequest(UpdateProfileSchema), authController.updateProfile);

/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)'
 *                 description: New password (minimum 8 characters, must contain uppercase, lowercase, and number)
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                   example: Password changed successfully
 *       400:
 *         description: Invalid input data or current password incorrect
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
 */
router.put('/change-password', authenticateToken, validateRequest(ChangePasswordSchema), authController.changePassword);

/**
 * @swagger
 * /api/users/my-school:
 *   get:
 *     summary: Get my school data (for school role - see all teachers and students)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: School data retrieved successfully
 *       403:
 *         description: Access denied - only for school role
 */
router.get('/my-school', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.role !== 'school') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only school administrators can access this endpoint' }
      });
    }

    const { SchoolService } = await import('../services/schoolService');

    if (!user.schoolId) {
      return res.status(404).json({
        success: false,
        error: { code: 'SCHOOL_NOT_FOUND', message: 'School not found for this user' }
      });
    }

    const schoolUsers = await SchoolService.getSchoolUsers(user.schoolId);
    const schoolInfo = await SchoolService.getSchoolById(user.schoolId);

    return res.json({
      success: true,
      message: 'School data retrieved successfully',
      data: {
        school: schoolInfo,
        users: schoolUsers
      }
    });
  } catch (error) {
    console.error('Error getting school data:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve school data' }
    });
  }
});

/**
 * @swagger
 * /api/users/my-students:
 *   get:
 *     summary: Get my students (for teacher role)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Students retrieved successfully
 *       403:
 *         description: Access denied - only for teacher role
 */
router.get('/my-students', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only teachers can access this endpoint' }
      });
    }

    const { db } = await import('../config/database');
    const { users } = await import('../models/schema');
    const { eq } = await import('drizzle-orm');

    const students = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.teacherId, user.userId));

    return res.json({
      success: true,
      message: 'Students retrieved successfully',
      data: { students }
    });
  } catch (error) {
    console.error('Error getting students:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve students' }
    });
  }
});

/**
 * @swagger
 * /api/users/my-teacher:
 *   get:
 *     summary: Get my teacher (for student role)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher retrieved successfully
 *       403:
 *         description: Access denied - only for student role
 */
router.get('/my-teacher', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only students can access this endpoint' }
      });
    }

    const { db } = await import('../config/database');
    const { users } = await import('../models/schema');
    const { eq } = await import('drizzle-orm');

    if (!user.teacherId) {
      return res.json({
        success: true,
        message: 'No teacher assigned',
        data: { teacher: null }
      });
    }

    const [teacher] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        schoolId: users.schoolId
      })
      .from(users)
      .where(eq(users.id, user.teacherId))
      .limit(1);

    return res.json({
      success: true,
      message: 'Teacher retrieved successfully',
      data: { teacher }
    });
  } catch (error) {
    console.error('Error getting teacher:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve teacher' }
    });
  }
});

/**
 * @swagger
 * /api/users/my-info:
 *   get:
 *     summary: Get current user info with related data based on role
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info retrieved successfully
 */
router.get('/my-info', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    const { db } = await import('../config/database');
    const { users } = await import('../models/schema');
    const { eq } = await import('drizzle-orm');

    // Get current user details
    const [currentUser] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        schoolId: users.schoolId,
        teacherId: users.teacherId,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    return res.json({
      success: true,
      message: 'User info retrieved successfully',
      data: { user: currentUser }
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve user info' }
    });
  }
});

export default router;