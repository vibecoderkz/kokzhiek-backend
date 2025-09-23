import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { requireRole } from '../middleware/roleAuth';
import { RegistrationKeyService } from '../services/registrationKeyService';
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
 *                 description: Maximum number of uses (default: 1)
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
 *                 description: Maximum number of uses per key (default: 1)
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
 *                 description: Maximum number of uses (default: 1)
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
router.get('/registration-keys',
  authenticateToken,
  requireRole(['admin']),
  async (req, res): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const status = req.query.status as 'active' | 'expired' | 'exhausted' | 'inactive' | undefined;

      const result = await RegistrationKeyService.getAllRegistrationKeys({
        page,
        limit,
        status,
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

<<<<<<< HEAD
=======
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
 *                 description: Maximum number of uses per key (default: 1)
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

>>>>>>> d0414bb (Fix: Combine GET and POST in single JSDoc block for /api/admin/registration-keys)
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

export default router;