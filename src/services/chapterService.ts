import { eq, and, asc, desc, max, sql } from 'drizzle-orm';
import { db } from '../config/database';
import { chapters, books, blocks, bookCollaborators } from '../models/schema';

export interface CreateChapterInput {
  bookId: string;
  title: string;
  description?: string;
  position?: number;
  settings?: Record<string, any>;
}

export interface UpdateChapterInput {
  title?: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface ChapterWithBlocks {
  id: string;
  title: string;
  description: string | null;
  position: number;
  settings: any;
  createdAt: Date | null;
  updatedAt: Date | null;
  book: {
    id: string;
    title: string;
  };
  blocks: Array<{
    id: string;
    type: string;
    content: any;
    style: any;
    position: number;
    createdAt: Date | null;
    updatedAt: Date | null;
  }>;
}

export interface ChapterSummary {
  id: string;
  title: string;
  description: string | null;
  position: number;
  settings: any;
  blocksCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class ChapterService {
  static async createChapter(input: CreateChapterInput, userId: string): Promise<ChapterWithBlocks> {
    // Check if user can edit the book
    const canEdit = await this.canUserEditBook(input.bookId, userId);
    if (!canEdit) {
      throw new Error('Access denied');
    }

    // Get the next position if not provided
    let position = input.position;
    if (position === undefined) {
      const result = await db
        .select({ maxPosition: max(chapters.position) })
        .from(chapters)
        .where(eq(chapters.bookId, input.bookId));

      position = (result[0]?.maxPosition || -1) + 1;
    } else {
      // Shift existing chapters if needed
      await this.shiftChaptersAfterPosition(input.bookId, position);
    }

    const [chapter] = await db.insert(chapters).values({
      bookId: input.bookId,
      title: input.title,
      description: input.description,
      position,
      settings: input.settings || {},
    }).returning();

    return this.getChapterById(chapter.id, userId);
  }

  static async getBookChapters(bookId: string, userId: string): Promise<ChapterSummary[]> {
    // Check if user has access to the book
    const hasAccess = await this.canUserAccessBook(bookId, userId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const chaptersData = await db
      .select({
        id: chapters.id,
        title: chapters.title,
        description: chapters.description,
        position: chapters.position,
        settings: chapters.settings,
        createdAt: chapters.createdAt,
        updatedAt: chapters.updatedAt,
        blocksCount: sql<number>`(
          SELECT COUNT(*) FROM ${blocks}
          WHERE ${blocks.chapterId} = ${chapters.id}
        )`,
      })
      .from(chapters)
      .where(eq(chapters.bookId, bookId))
      .orderBy(asc(chapters.position));

    return chaptersData.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      position: chapter.position,
      settings: chapter.settings,
      blocksCount: chapter.blocksCount,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
    }));
  }

  static async getChapterById(chapterId: string, userId: string): Promise<ChapterWithBlocks> {
    const chapterData = await db.query.chapters.findFirst({
      where: eq(chapters.id, chapterId),
      with: {
        book: {
          columns: {
            id: true,
            title: true,
          },
        },
        blocks: {
          orderBy: [asc(blocks.position)],
        },
      },
    });

    if (!chapterData) {
      throw new Error('Chapter not found');
    }

    // Check if user has access to the book
    const hasAccess = await this.canUserAccessBook(chapterData.bookId, userId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return {
      id: chapterData.id,
      title: chapterData.title,
      description: chapterData.description,
      position: chapterData.position,
      settings: chapterData.settings,
      createdAt: chapterData.createdAt,
      updatedAt: chapterData.updatedAt,
      book: chapterData.book,
      blocks: chapterData.blocks.map(block => ({
        id: block.id,
        type: block.type,
        content: block.content,
        style: block.style,
        position: block.position,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
      })),
    };
  }

  static async updateChapter(chapterId: string, input: UpdateChapterInput, userId: string): Promise<ChapterWithBlocks> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(chapterId)) {
      throw new Error('Invalid chapter ID format. Please create chapter first.');
    }

    // Get chapter to check book access
    const chapter = await db.query.chapters.findFirst({
      where: eq(chapters.id, chapterId),
    });

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // Check if user can edit the book
    const canEdit = await this.canUserEditBook(chapter.bookId, userId);
    if (!canEdit) {
      throw new Error('Access denied');
    }

    const [updatedChapter] = await db
      .update(chapters)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId))
      .returning();

    if (!updatedChapter) {
      throw new Error('Chapter not found');
    }

    return this.getChapterById(chapterId, userId);
  }

  static async deleteChapter(chapterId: string, userId: string): Promise<void> {
    // Get chapter to check book access
    const chapter = await db.query.chapters.findFirst({
      where: eq(chapters.id, chapterId),
    });

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // Check if user can edit the book
    const canEdit = await this.canUserEditBook(chapter.bookId, userId);
    if (!canEdit) {
      throw new Error('Access denied');
    }

    // Delete chapter (cascading deletes will handle blocks)
    await db.delete(chapters).where(eq(chapters.id, chapterId));

    // Reorder remaining chapters
    await this.reorderChaptersAfterDeletion(chapter.bookId, chapter.position);
  }

  static async reorderChapter(chapterId: string, newPosition: number, userId: string): Promise<ChapterWithBlocks> {
    // Get chapter to check book access
    const chapter = await db.query.chapters.findFirst({
      where: eq(chapters.id, chapterId),
    });

    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // Check if user can edit the book
    const canEdit = await this.canUserEditBook(chapter.bookId, userId);
    if (!canEdit) {
      throw new Error('Access denied');
    }

    const oldPosition = chapter.position;

    if (oldPosition === newPosition) {
      return this.getChapterById(chapterId, userId);
    }

    // Update positions based on movement direction
    if (newPosition > oldPosition) {
      // Moving down: shift chapters between old and new position up
      await db
        .update(chapters)
        .set({
          position: sql`${chapters.position} - 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(chapters.bookId, chapter.bookId),
            sql`${chapters.position} > ${oldPosition} AND ${chapters.position} <= ${newPosition}`
          )
        );
    } else {
      // Moving up: shift chapters between new and old position down
      await db
        .update(chapters)
        .set({
          position: sql`${chapters.position} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(chapters.bookId, chapter.bookId),
            sql`${chapters.position} >= ${newPosition} AND ${chapters.position} < ${oldPosition}`
          )
        );
    }

    // Update the chapter's position
    await db
      .update(chapters)
      .set({
        position: newPosition,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));

    return this.getChapterById(chapterId, userId);
  }

  private static async canUserAccessBook(bookId: string, userId: string): Promise<boolean> {
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    if (!book) return false;

    // Owner can always access
    if (book.ownerId === userId) return true;

    // Public books are accessible
    if (book.isPublic) return true;

    // Check if user is a collaborator
    const collaboration = await db.query.bookCollaborators.findFirst({
      where: and(
        eq(bookCollaborators.bookId, bookId),
        eq(bookCollaborators.userId, userId)
      ),
    });

    return !!collaboration;
  }

  private static async canUserEditBook(bookId: string, userId: string): Promise<boolean> {
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    if (!book) return false;

    // Owner can always edit
    if (book.ownerId === userId) return true;

    // Check if user is a collaborator with edit permissions
    const collaboration = await db.query.bookCollaborators.findFirst({
      where: and(
        eq(bookCollaborators.bookId, bookId),
        eq(bookCollaborators.userId, userId)
      ),
    });

    return collaboration?.role === 'editor' || collaboration?.role === 'admin';
  }

  private static async shiftChaptersAfterPosition(bookId: string, position: number): Promise<void> {
    await db
      .update(chapters)
      .set({
        position: sql`${chapters.position} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chapters.bookId, bookId),
          sql`${chapters.position} >= ${position}`
        )
      );
  }

  private static async reorderChaptersAfterDeletion(bookId: string, deletedPosition: number): Promise<void> {
    await db
      .update(chapters)
      .set({
        position: sql`${chapters.position} - 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(chapters.bookId, bookId),
          sql`${chapters.position} > ${deletedPosition}`
        )
      );
  }
}