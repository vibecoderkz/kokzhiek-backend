import { Request, Response } from 'express';
import { BlockService } from '../services/blockService';
import { z } from 'zod';

const CreateBlockSchema = z.object({
  type: z.string().min(1, 'Type is required').max(50, 'Type must be less than 50 characters'),
  content: z.record(z.any()),
  style: z.record(z.any()).optional(),
  position: z.number().int().min(0).optional(),
});

const UpdateBlockSchema = z.object({
  type: z.string().min(1, 'Type is required').max(50, 'Type must be less than 50 characters').optional(),
  content: z.record(z.any()).optional(),
  style: z.record(z.any()).optional(),
});

const ReorderBlockSchema = z.object({
  newPosition: z.number().int().min(0, 'Position must be non-negative'),
});

const BulkUpdateBlockSchema = z.object({
  id: z.string().uuid('Invalid block ID'),
  content: z.record(z.any()).optional(),
  style: z.record(z.any()).optional(),
  position: z.number().int().min(0).optional(),
});

const BulkUpdateBlocksSchema = z.object({
  blocks: z.array(BulkUpdateBlockSchema).min(1, 'At least one block must be provided'),
});

export class BlockController {
  async createBlock(req: Request, res: Response): Promise<void> {
    try {
      const { chapterId } = req.params;
      const validatedData = CreateBlockSchema.parse(req.body);
      const userId = (req as any).user.userId;

      const block = await BlockService.createBlock({
        chapterId,
        ...validatedData,
      }, userId);

      res.status(201).json({
        success: true,
        message: 'Block created successfully',
        data: { block },
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

      console.error('Error creating block:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create block',
        },
      });
    }
  }

  async updateBlock(req: Request, res: Response): Promise<void> {
    try {
      const { blockId } = req.params;
      const validatedData = UpdateBlockSchema.parse(req.body);
      const userId = (req as any).user.userId;

      const block = await BlockService.updateBlock(blockId, validatedData, userId);

      res.json({
        success: true,
        message: 'Block updated successfully',
        data: { block },
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
        if (error.message === 'Block not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Block not found',
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

      console.error('Error updating block:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update block',
        },
      });
    }
  }

  async deleteBlock(req: Request, res: Response): Promise<void> {
    try {
      const { blockId } = req.params;
      const userId = (req as any).user.userId;

      await BlockService.deleteBlock(blockId, userId);

      res.json({
        success: true,
        message: 'Block deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Block not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Block not found',
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

      console.error('Error deleting block:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete block',
        },
      });
    }
  }

  async reorderBlock(req: Request, res: Response): Promise<void> {
    try {
      const { blockId } = req.params;
      const { newPosition } = ReorderBlockSchema.parse(req.body);
      const userId = (req as any).user.userId;

      const block = await BlockService.reorderBlock(blockId, newPosition, userId);

      res.json({
        success: true,
        message: 'Block reordered successfully',
        data: { block },
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
        if (error.message === 'Block not found') {
          res.status(404).json({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Block not found',
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

      console.error('Error reordering block:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to reorder block',
        },
      });
    }
  }

  async bulkUpdateBlocks(req: Request, res: Response): Promise<void> {
    try {
      const { chapterId } = req.params;
      const { blocks } = BulkUpdateBlocksSchema.parse(req.body);
      const userId = (req as any).user.userId;

      const updatedBlocks = await BlockService.bulkUpdateBlocks(chapterId, blocks, userId);

      res.json({
        success: true,
        message: 'Blocks updated successfully',
        data: { blocks: updatedBlocks },
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

      console.error('Error bulk updating blocks:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update blocks',
        },
      });
    }
  }
}