import { Router } from 'express';
import { ChapterController } from '../controllers/chapterController';
import { BlockController } from '../controllers/blockController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const chapterController = new ChapterController();
const blockController = new BlockController();

/**
 * @swagger
 * /api/chapters/{chapterId}:
 *   get:
 *     summary: Get chapter details with blocks
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     responses:
 *       200:
 *         description: Chapter details retrieved successfully
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
 *                     chapter:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                           nullable: true
 *                         position:
 *                           type: number
 *                         settings:
 *                           type: object
 *                         book:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             title:
 *                               type: string
 *                         blocks:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                               content:
 *                                 type: object
 *                               style:
 *                                 type: object
 *                               position:
 *                                 type: number
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                               updatedAt:
 *                                 type: string
 *                                 format: date-time
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       404:
 *         description: Chapter not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
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
router.get('/:chapterId', authenticateToken, chapterController.getChapter.bind(chapterController));

/**
 * @swagger
 * /api/chapters/{chapterId}:
 *   put:
 *     summary: Update chapter details
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Chapter title
 *               description:
 *                 type: string
 *                 description: Chapter description
 *               settings:
 *                 type: object
 *                 description: Chapter-specific settings
 *     responses:
 *       200:
 *         description: Chapter updated successfully
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
 *                   example: Chapter updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     chapter:
 *                       type: object
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Chapter not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
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
router.put('/:chapterId', authenticateToken, chapterController.updateChapter.bind(chapterController));

/**
 * @swagger
 * /api/chapters/{chapterId}:
 *   delete:
 *     summary: Delete a chapter
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     responses:
 *       200:
 *         description: Chapter deleted successfully
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
 *                   example: Chapter deleted successfully
 *       404:
 *         description: Chapter not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
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
router.delete('/:chapterId', authenticateToken, chapterController.deleteChapter.bind(chapterController));

/**
 * @swagger
 * /api/chapters/{chapterId}/reorder:
 *   put:
 *     summary: Reorder chapter position within a book
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPosition
 *             properties:
 *               newPosition:
 *                 type: number
 *                 minimum: 0
 *                 description: New position for the chapter
 *     responses:
 *       200:
 *         description: Chapter reordered successfully
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
 *                   example: Chapter reordered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     chapter:
 *                       type: object
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Chapter not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
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
router.put('/:chapterId/reorder', authenticateToken, chapterController.reorderChapter.bind(chapterController));

/**
 * @swagger
 * /api/chapters/{chapterId}/duplicate:
 *   post:
 *     summary: Duplicate a chapter with all blocks
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID to duplicate
 *     responses:
 *       201:
 *         description: Chapter duplicated successfully
 *       404:
 *         description: Chapter not found
 *       403:
 *         description: Access denied
 */
router.post('/:chapterId/duplicate', authenticateToken, chapterController.duplicateChapter.bind(chapterController));

/**
 * @swagger
 * /api/chapters/{chapterId}/blocks:
 *   post:
 *     summary: Create a new block in a chapter
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - content
 *             properties:
 *               type:
 *                 type: string
 *                 maxLength: 50
 *                 description: Block type (text, image, video, etc.)
 *               content:
 *                 type: object
 *                 description: Block content data
 *               style:
 *                 type: object
 *                 description: Block styling information
 *               position:
 *                 type: number
 *                 minimum: 0
 *                 description: Block position (auto-assigned if not provided)
 *     responses:
 *       201:
 *         description: Block created successfully
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
 *                   example: Block created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     block:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         type:
 *                           type: string
 *                         content:
 *                           type: object
 *                         style:
 *                           type: object
 *                         position:
 *                           type: number
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
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
router.post('/:chapterId/blocks', authenticateToken, blockController.createBlock.bind(blockController));

/**
 * @swagger
 * /api/chapters/{chapterId}/blocks/bulk-update:
 *   put:
 *     summary: Bulk update multiple blocks in a chapter
 *     tags: [Chapters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blocks
 *             properties:
 *               blocks:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Block ID
 *                     content:
 *                       type: object
 *                       description: Updated block content
 *                     style:
 *                       type: object
 *                       description: Updated block style
 *                     position:
 *                       type: number
 *                       minimum: 0
 *                       description: Updated block position
 *     responses:
 *       200:
 *         description: Blocks updated successfully
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
 *                   example: Blocks updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     blocks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           type:
 *                             type: string
 *                           content:
 *                             type: object
 *                           style:
 *                             type: object
 *                           position:
 *                             type: number
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Access denied
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
router.put('/:chapterId/blocks/bulk-update', authenticateToken, blockController.bulkUpdateBlocks.bind(blockController));

export default router;