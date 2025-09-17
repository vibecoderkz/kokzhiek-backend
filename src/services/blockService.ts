import { eq, and, asc, desc, max, sql } from 'drizzle-orm';
import { db } from '../config/database';
import { blocks, chapters, books, bookCollaborators } from '../models/schema';

export interface CreateBlockInput {
  chapterId: string;
  type: string;
  content: Record<string, any>;
  style?: Record<string, any>;
  position?: number;
}

export interface UpdateBlockInput {
  type?: string;
  content?: Record<string, any>;
  style?: Record<string, any>;
}

export interface BulkUpdateBlockInput {
  id: string;
  content?: Record<string, any>;
  style?: Record<string, any>;
  position?: number;
}

export interface BlockData {
  id: string;
  type: string;
  content: any;
  style: any;
  position: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class BlockService {
  static async createBlock(input: CreateBlockInput, userId: string): Promise<BlockData> {
    // Check if user can edit the chapter's book
    const canEdit = await this.canUserEditChapter(input.chapterId, userId);
    if (!canEdit) {
      throw new Error('Access denied');
    }

    // Get the next position if not provided
    let position = input.position;
    if (position === undefined) {
      const result = await db
        .select({ maxPosition: max(blocks.position) })
        .from(blocks)
        .where(eq(blocks.chapterId, input.chapterId));

      position = (result[0]?.maxPosition || -1) + 1;
    } else {
      // Shift existing blocks if needed
      await this.shiftBlocksAfterPosition(input.chapterId, position);
    }

    const [block] = await db.insert(blocks).values({
      chapterId: input.chapterId,
      type: input.type,
      content: input.content,
      style: input.style || {},
      position,
    }).returning();

    return {
      id: block.id,
      type: block.type,
      content: block.content,
      style: block.style,
      position: block.position,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
    };
  }

  static async updateBlock(blockId: string, input: UpdateBlockInput, userId: string): Promise<BlockData> {
    // Get block to check chapter access
    const block = await db.query.blocks.findFirst({
      where: eq(blocks.id, blockId),
    });

    if (!block) {
      throw new Error('Block not found');
    }

    // Check if user can edit the chapter's book
    const canEdit = await this.canUserEditChapter(block.chapterId, userId);
    if (!canEdit) {
      throw new Error('Access denied');
    }

    const [updatedBlock] = await db
      .update(blocks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(blocks.id, blockId))
      .returning();

    if (!updatedBlock) {
      throw new Error('Block not found');
    }

    return {
      id: updatedBlock.id,
      type: updatedBlock.type,
      content: updatedBlock.content,
      style: updatedBlock.style,
      position: updatedBlock.position,
      createdAt: updatedBlock.createdAt,
      updatedAt: updatedBlock.updatedAt,
    };
  }

  static async deleteBlock(blockId: string, userId: string): Promise<void> {
    // Get block to check chapter access
    const block = await db.query.blocks.findFirst({
      where: eq(blocks.id, blockId),
    });

    if (!block) {
      throw new Error('Block not found');
    }

    // Check if user can edit the chapter's book
    const canEdit = await this.canUserEditChapter(block.chapterId, userId);
    if (!canEdit) {
      throw new Error('Access denied');
    }

    // Delete block
    await db.delete(blocks).where(eq(blocks.id, blockId));

    // Reorder remaining blocks
    await this.reorderBlocksAfterDeletion(block.chapterId, block.position);
  }

  static async reorderBlock(blockId: string, newPosition: number, userId: string): Promise<BlockData> {
    // Get block to check chapter access
    const block = await db.query.blocks.findFirst({
      where: eq(blocks.id, blockId),
    });

    if (!block) {
      throw new Error('Block not found');
    }

    // Check if user can edit the chapter's book
    const canEdit = await this.canUserEditChapter(block.chapterId, userId);
    if (!canEdit) {
      throw new Error('Access denied');
    }

    const oldPosition = block.position;

    if (oldPosition === newPosition) {
      return {
        id: block.id,
        type: block.type,
        content: block.content,
        style: block.style,
        position: block.position,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
      };
    }

    // Update positions based on movement direction
    if (newPosition > oldPosition) {
      // Moving down: shift blocks between old and new position up
      await db
        .update(blocks)
        .set({
          position: sql`${blocks.position} - 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(blocks.chapterId, block.chapterId),
            sql`${blocks.position} > ${oldPosition} AND ${blocks.position} <= ${newPosition}`
          )
        );
    } else {
      // Moving up: shift blocks between new and old position down
      await db
        .update(blocks)
        .set({
          position: sql`${blocks.position} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(blocks.chapterId, block.chapterId),
            sql`${blocks.position} >= ${newPosition} AND ${blocks.position} < ${oldPosition}`
          )
        );
    }

    // Update the block's position
    const [updatedBlock] = await db
      .update(blocks)
      .set({
        position: newPosition,
        updatedAt: new Date(),
      })
      .where(eq(blocks.id, blockId))
      .returning();

    return {
      id: updatedBlock.id,
      type: updatedBlock.type,
      content: updatedBlock.content,
      style: updatedBlock.style,
      position: updatedBlock.position,
      createdAt: updatedBlock.createdAt,
      updatedAt: updatedBlock.updatedAt,
    };
  }

  static async bulkUpdateBlocks(chapterId: string, blocksInput: BulkUpdateBlockInput[], userId: string): Promise<BlockData[]> {
    // Check if user can edit the chapter's book
    const canEdit = await this.canUserEditChapter(chapterId, userId);
    if (!canEdit) {
      throw new Error('Access denied');
    }

    const updatedBlocks: BlockData[] = [];

    // Process each block update
    for (const blockInput of blocksInput) {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (blockInput.content !== undefined) updateData.content = blockInput.content;
      if (blockInput.style !== undefined) updateData.style = blockInput.style;
      if (blockInput.position !== undefined) updateData.position = blockInput.position;

      const [updatedBlock] = await db
        .update(blocks)
        .set(updateData)
        .where(and(
          eq(blocks.id, blockInput.id),
          eq(blocks.chapterId, chapterId)
        ))
        .returning();

      if (updatedBlock) {
        updatedBlocks.push({
          id: updatedBlock.id,
          type: updatedBlock.type,
          content: updatedBlock.content,
          style: updatedBlock.style,
          position: updatedBlock.position,
          createdAt: updatedBlock.createdAt,
          updatedAt: updatedBlock.updatedAt,
        });
      }
    }

    return updatedBlocks;
  }

  private static async canUserEditChapter(chapterId: string, userId: string): Promise<boolean> {
    const chapter = await db.query.chapters.findFirst({
      where: eq(chapters.id, chapterId),
      with: {
        book: true,
      },
    });

    if (!chapter) return false;

    // Owner can always edit
    if (chapter.book.ownerId === userId) return true;

    // Check if user is a collaborator with edit permissions
    const collaboration = await db.query.bookCollaborators.findFirst({
      where: and(
        eq(bookCollaborators.bookId, chapter.bookId),
        eq(bookCollaborators.userId, userId)
      ),
    });

    return collaboration?.role === 'editor' || collaboration?.role === 'admin';
  }

  private static async shiftBlocksAfterPosition(chapterId: string, position: number): Promise<void> {
    await db
      .update(blocks)
      .set({
        position: sql`${blocks.position} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(blocks.chapterId, chapterId),
          sql`${blocks.position} >= ${position}`
        )
      );
  }

  private static async reorderBlocksAfterDeletion(chapterId: string, deletedPosition: number): Promise<void> {
    await db
      .update(blocks)
      .set({
        position: sql`${blocks.position} - 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(blocks.chapterId, chapterId),
          sql`${blocks.position} > ${deletedPosition}`
        )
      );
  }
}