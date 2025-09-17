import { Router } from 'express';
import { BookController } from '../controllers/bookController';

const router = Router();
const bookController = new BookController();

/**
 * @swagger
 * /api/public/books/{bookId}:
 *   get:
 *     summary: Get public book details (no authentication required)
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Public book details retrieved successfully
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
 *                     book:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                           nullable: true
 *                         coverImageUrl:
 *                           type: string
 *                           nullable: true
 *                         isPublic:
 *                           type: boolean
 *                           example: true
 *                         visibility:
 *                           type: string
 *                         settings:
 *                           type: object
 *                         owner:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             firstName:
 *                               type: string
 *                             lastName:
 *                               type: string
 *                             email:
 *                               type: string
 *                         chaptersCount:
 *                           type: number
 *                         permissions:
 *                           type: object
 *                           properties:
 *                             canEdit:
 *                               type: boolean
 *                               example: false
 *                             canDelete:
 *                               type: boolean
 *                               example: false
 *                             canShare:
 *                               type: boolean
 *                               example: false
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       404:
 *         description: Public book not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/books/:bookId', bookController.getPublicBook.bind(bookController));

export default router;