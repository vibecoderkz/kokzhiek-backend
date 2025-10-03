import { Request, Response } from 'express';
import { BookService } from '../services/bookService';
import { z } from 'zod';

const CreateBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  author: z.string().optional(),
  class: z.string().max(10, 'Class must be less than 10 characters').optional(),
  description: z.string().optional(),
  coverImageUrl: z.string().url('Invalid URL format').optional(),
  isPublic: z.boolean().optional(),
  visibility: z.enum(['private', 'school', 'public']).optional(),
  settings: z.record(z.any()).optional(),
});

const UpdateBookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  author: z.string().optional(),
  class: z.string().max(10, 'Class must be less than 10 characters').optional(),
  description: z.string().optional(),
  coverImageUrl: z.string().url('Invalid URL format').optional(),
  isPublic: z.boolean().optional(),
  visibility: z.enum(['private', 'school', 'public']).optional(),
  settings: z.record(z.any()).optional(),
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
      const filters = BookFiltersSchema.parse(req.query);
      const userId = (req as any).user.userId;

      const result = await BookService.getUserBooks(userId, filters);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
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

      console.error('Error fetching books:', error);
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
      const validatedData = UpdateBookSchema.parse(req.body);
      const userId = (req as any).user.userId;

      const book = await BookService.updateBook(bookId, userId, validatedData);

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