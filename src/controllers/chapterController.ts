import { Request, Response } from 'express';
import { ChapterService } from '../services/chapterService';
import { z } from 'zod';

const CreateChapterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  position: z.number().int().min(0).optional(),
  settings: z.record(z.any()).optional(),
});

const UpdateChapterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  description: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

const ReorderChapterSchema = z.object({
  newPosition: z.number().int().min(0, 'Position must be non-negative'),
});

export class ChapterController {
  async createChapter(req: Request, res: Response): Promise<void> {
    try {
      const { bookId } = req.params;
      const validatedData = CreateChapterSchema.parse(req.body);
      const userId = (req as any).user.userId;

      const chapter = await ChapterService.createChapter({
        bookId,
        ...validatedData,
      }, userId);

      res.status(201).json({
        success: true,
        message: 'Chapter created successfully',
        data: { chapter },
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

      if (error instanceof Error && error.message === 'Access denied') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        });
        return;
      }

      console.error('Error creating chapter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create chapter',
        },
      });
    }
  }

  async getBookChapters(req: Request, res: Response): Promise<void> {
    try {
      const { bookId } = req.params;
      const userId = (req as any).user.userId;

      const chapters = await ChapterService.getBookChapters(bookId, userId);

      res.json({
        success: true,
        data: { chapters },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Access denied') {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied',
          },
        });
        return;
      }

      console.error('Error fetching chapters:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch chapters',
        },
      });
    }
  }

  async getChapter(req: Request, res: Response): Promise<void> {
    try {
      const { chapterId } = req.params;
      const userId = (req as any).user.userId;

      const chapter = await ChapterService.getChapterById(chapterId, userId);

      res.json({
        success: true,
        data: { chapter },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Chapter not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Chapter not found',
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

      console.error('Error fetching chapter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch chapter',
        },
      });
    }
  }

  async updateChapter(req: Request, res: Response): Promise<void> {
    try {
      const { chapterId } = req.params;
      const validatedData = UpdateChapterSchema.parse(req.body);
      const userId = (req as any).user.userId;

      const chapter = await ChapterService.updateChapter(chapterId, validatedData, userId);

      res.json({
        success: true,
        message: 'Chapter updated successfully',
        data: { chapter },
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
        if (error.message === 'Chapter not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Chapter not found',
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

      console.error('Error updating chapter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update chapter',
        },
      });
    }
  }

  async deleteChapter(req: Request, res: Response): Promise<void> {
    try {
      const { chapterId } = req.params;
      const userId = (req as any).user.userId;

      await ChapterService.deleteChapter(chapterId, userId);

      res.json({
        success: true,
        message: 'Chapter deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Chapter not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Chapter not found',
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

      console.error('Error deleting chapter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete chapter',
        },
      });
    }
  }

  async reorderChapter(req: Request, res: Response): Promise<void> {
    try {
      const { chapterId } = req.params;
      const { newPosition } = ReorderChapterSchema.parse(req.body);
      const userId = (req as any).user.userId;

      const chapter = await ChapterService.reorderChapter(chapterId, newPosition, userId);

      res.json({
        success: true,
        message: 'Chapter reordered successfully',
        data: { chapter },
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
        if (error.message === 'Chapter not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Chapter not found',
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

      console.error('Error reordering chapter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reorder chapter',
        },
      });
    }
  }

  /**
   * Duplicate a chapter with all blocks
   */
  async duplicateChapter(req: Request, res: Response): Promise<void> {
    try {
      const { chapterId } = req.params;
      const userId = (req as any).user.userId;

      const newChapter = await ChapterService.duplicateChapter(chapterId, userId);

      res.status(201).json({
        success: true,
        message: 'Chapter duplicated successfully',
        data: { chapter: newChapter },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Chapter not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Chapter not found',
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

      console.error('Error duplicating chapter:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to duplicate chapter',
        },
      });
    }
  }
}