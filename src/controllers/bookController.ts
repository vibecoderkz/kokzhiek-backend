import { Request, Response } from 'express';
import { BookService } from '../services/bookService';
import { z } from 'zod';

const CreateBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  author: z.string().optional(), // legacy field
  authors: z.array(z.string()).optional(), // NEW: array of authors
  grade: z.number().int().min(1).max(11).optional(), // grade (1-11)
  description: z.string().optional(),
  coverImageUrl: z.string().optional(), // Removed URL validation to allow base64
  isPublic: z.boolean().optional(),
  visibility: z.enum(['private', 'school', 'public']).optional(),
  settings: z.record(z.any()).optional(),
  // NEW metadata fields
  isbn: z.string().max(50).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  publisher: z.string().max(255).optional(),
  edition: z.string().max(100).optional(),
  subject: z.string().max(100).optional(),
  language: z.enum(['kz', 'ru', 'en']).optional(),
});

const UpdateBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  author: z.string().optional(), // legacy field
  authors: z.array(z.string()).optional(), // NEW: array of authors
  grade: z.number().int().min(1).max(11).optional(), // grade (1-11)
  description: z.string().optional(),
  coverImageUrl: z.string().optional(), // Removed URL validation to allow base64
  isPublic: z.boolean().optional(),
  visibility: z.enum(['private', 'school', 'public']).optional(),
  settings: z.record(z.any()).optional(),
  // NEW metadata fields
  isbn: z.string().max(50).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  publisher: z.string().max(255).optional(),
  edition: z.string().max(100).optional(),
  subject: z.string().max(100).optional(),
  language: z.enum(['kz', 'ru', 'en']).optional(),
});

const BookFiltersSchema = z.object({
  page: z.string().transform(val => parseInt(val)).refine(val => val > 0, 'Page must be positive').optional(),
  limit: z.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 50, 'Limit must be 1-50').optional(),
  search: z.string().optional(),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  visibility: z.enum(['private', 'school', 'public']).optional(),
  isPublic: z.string().transform(val => val === 'true').optional(),
});

export class BookController {
  async createBook(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = CreateBookSchema.parse(req.body);
      const userId = (req as any).user.userId;
      const userSchoolId = (req as any).user.schoolId;

      const book = await BookService.createBook({
        ...validatedData,
        ownerId: userId,
        schoolId: userSchoolId,
      });

      res.status(201).json({
        success: true,
        message: 'Book created successfully',
        data: { book },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors,
          },
        });
        return;
      }

      console.error('Error creating book:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create book',
        },
      });
    }
  }

  async getUserBooks(req: Request, res: Response): Promise<void> {
    try {
      console.log('📚 GET /api/books - запрос получен');
      console.log('Headers:', req.headers);
      console.log('Query params:', req.query);

      const filters = BookFiltersSchema.parse(req.query);
      const userId = (req as any).user.userId;

      console.log('User ID:', userId);
      console.log('Filters:', filters);

      const result = await BookService.getUserBooks(userId, filters);

      console.log('📚 Найдено книг в БД:', result.books.length);
      if (result.books.length > 0) {
        console.log('📚 Первая книга:', result.books[0]);
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ Validation error:', error.errors);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          },
        });
        return;
      }

      console.error('❌ Error fetching books:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch books',
        },
      });
    }
  }

  async getBook(req: Request, res: Response): Promise<void> {
    try {
      const { bookId } = req.params;
      const userId = (req as any).user.userId;

      const book = await BookService.getBookById(bookId, userId);

      res.json({
        success: true,
        data: { book },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Book not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Book not found',
            },
          });
          return;
        }

        if (error.message === 'Access denied') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied',
            },
          });
          return;
        }
      }

      console.error('Error fetching book:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch book',
        },
      });
    }
  }

  async updateBook(req: Request, res: Response): Promise<void> {
    try {
      const { bookId } = req.params;
      
      // 🔍 DEBUG: Входящие данные
      console.log('=== BOOK UPDATE DEBUG ===');
      console.log('📥 [BookController] Получены данные:', {
        bookId,
        bodyKeys: Object.keys(req.body),
        bodyData: {
          ...req.body,
          coverImageUrl: req.body.coverImageUrl ? 
            `[base64 length: ${req.body.coverImageUrl.length}]` : 
            req.body.coverImageUrl
        }
      });
      
      const validatedData = UpdateBookSchema.parse(req.body);
      console.log('✅ [BookController] Валидация прошла успешно:', {
        ...validatedData,
        coverImageUrl: validatedData.coverImageUrl ? 
          `[base64 length: ${validatedData.coverImageUrl.length}]` : 
          validatedData.coverImageUrl
      });
      
      const userId = (req as any).user.userId;
      console.log('👤 [BookController] User ID:', userId);

      const book = await BookService.updateBook(bookId, userId, validatedData);
      console.log('💾 [BookController] Книга обновлена в сервисе');

      res.json({
        success: true,
        message: 'Book updated successfully',
        data: { book },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors,
          },
        });
        return;
      }

      if (error instanceof Error) {
        if (error.message === 'Book not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Book not found',
            },
          });
          return;
        }

        if (error.message === 'Access denied') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied',
            },
          });
          return;
        }
      }

      console.error('Error updating book:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update book',
        },
      });
    }
  }

  async deleteBook(req: Request, res: Response): Promise<void> {
    try {
      const { bookId } = req.params;
      const userId = (req as any).user.userId;

      await BookService.deleteBook(bookId, userId);

      res.json({
        success: true,
        message: 'Book deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Book not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Book not found',
            },
          });
          return;
        }

        if (error.message === 'Access denied') {
          res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied',
            },
          });
          return;
        }
      }

      console.error('Error deleting book:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete book',
        },
      });
    }
  }

  async getPublicBook(req: Request, res: Response): Promise<void> {
    try {
      const { bookId } = req.params;

      const book = await BookService.getPublicBook(bookId);

      if (!book) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Public book not found',
          },
        });
        return;
      }

      res.json({
        success: true,
        data: { book },
      });
    } catch (error) {
      console.error('Error fetching public book:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch public book',
        },
      });
    }
  }
}