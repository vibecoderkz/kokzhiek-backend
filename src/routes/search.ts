import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { books, chapters, blocks, users } from '../models/schema';
import { authenticateToken } from '../middleware/auth';
import { eq, or, and, like, ilike, sql } from 'drizzle-orm';

const router = Router();

// Extend Request type to include user from auth middleware
interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

/**
 * Global search endpoint
 * Searches across books, chapters, and blocks
 * GET /api/search?q=query&limit=10&type=all
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = (req.query.q as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const searchType = (req.query.type as string) || 'all'; // 'all', 'books', 'chapters', 'blocks'

    if (!query || query.trim().length < 2) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: 'Search query must be at least 2 characters'
        }
      });
      return;
    }

    const userId = req.user?.userId;
    const searchPattern = `%${query.toLowerCase()}%`;

    const results = {
      books: [] as any[],
      chapters: [] as any[],
      blocks: [] as any[],
      total: 0
    };

    // Search in books (title, description, author)
    if (searchType === 'all' || searchType === 'books') {
      const bookResults = await db
        .select({
          id: books.id,
          title: books.title,
          description: books.description,
          author: books.author,
          grade: books.grade,
          coverImageUrl: books.coverImageUrl,
          ownerId: books.ownerId,
          ownerEmail: users.email,
          createdAt: books.createdAt,
        })
        .from(books)
        .leftJoin(users, eq(books.ownerId, users.id))
        .where(
          and(
            or(
              ilike(books.title, searchPattern),
              ilike(books.description, searchPattern),
              ilike(books.author, searchPattern)
            ),
            // User can only search their own books or public books
            or(
              eq(books.ownerId, userId!),
              eq(books.isPublic, true)
            )
          )
        )
        .limit(limit);

      results.books = bookResults.map(book => ({
        type: 'book',
        id: book.id,
        title: book.title,
        description: book.description,
        author: book.author,
        grade: book.grade,
        coverImageUrl: book.coverImageUrl,
        ownerId: book.ownerId,
        ownerEmail: book.ownerEmail,
        createdAt: book.createdAt,
        // Highlight matched text
        matchedIn: getMatchedFields(query, {
          title: book.title,
          description: book.description,
          author: book.author
        })
      }));
    }

    // Search in chapters (title, description)
    if (searchType === 'all' || searchType === 'chapters') {
      const chapterResults = await db
        .select({
          chapterId: chapters.id,
          chapterTitle: chapters.title,
          chapterDescription: chapters.description,
          chapterPosition: chapters.position,
          bookId: books.id,
          bookTitle: books.title,
          ownerId: books.ownerId,
          createdAt: chapters.createdAt,
        })
        .from(chapters)
        .innerJoin(books, eq(chapters.bookId, books.id))
        .where(
          and(
            or(
              ilike(chapters.title, searchPattern),
              ilike(chapters.description, searchPattern)
            ),
            // User can only search in their own books or public books
            or(
              eq(books.ownerId, userId!),
              eq(books.isPublic, true)
            )
          )
        )
        .limit(limit);

      results.chapters = chapterResults.map(ch => ({
        type: 'chapter',
        id: ch.chapterId,
        title: ch.chapterTitle,
        description: ch.chapterDescription,
        position: ch.chapterPosition,
        bookId: ch.bookId,
        bookTitle: ch.bookTitle,
        ownerId: ch.ownerId,
        createdAt: ch.createdAt,
        matchedIn: getMatchedFields(query, {
          title: ch.chapterTitle,
          description: ch.chapterDescription
        })
      }));
    }

    // Search in blocks (content - JSONB field)
    if (searchType === 'all' || searchType === 'blocks') {
      // Search in text blocks content
      const blockResults = await db
        .select({
          blockId: blocks.id,
          blockType: blocks.type,
          blockContent: blocks.content,
          blockPosition: blocks.position,
          chapterId: chapters.id,
          chapterTitle: chapters.title,
          bookId: books.id,
          bookTitle: books.title,
          ownerId: books.ownerId,
          createdAt: blocks.createdAt,
        })
        .from(blocks)
        .innerJoin(chapters, eq(blocks.chapterId, chapters.id))
        .innerJoin(books, eq(chapters.bookId, books.id))
        .where(
          and(
            // Search in JSONB content field (looking for 'text' property)
            sql`LOWER(CAST(${blocks.content}->>'text' AS TEXT)) LIKE ${searchPattern}`,
            // User can only search in their own books or public books
            or(
              eq(books.ownerId, userId!),
              eq(books.isPublic, true)
            )
          )
        )
        .limit(limit);

      results.blocks = blockResults.map(bl => {
        const content = bl.blockContent as any;
        const textContent = content?.text || '';

        return {
          type: 'block',
          id: bl.blockId,
          blockType: bl.blockType,
          textSnippet: getTextSnippet(textContent, query, 150),
          position: bl.blockPosition,
          chapterId: bl.chapterId,
          chapterTitle: bl.chapterTitle,
          bookId: bl.bookId,
          bookTitle: bl.bookTitle,
          ownerId: bl.ownerId,
          createdAt: bl.createdAt,
        };
      });
    }

    results.total = results.books.length + results.chapters.length + results.blocks.length;

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: {
        query,
        results,
        total: results.total
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Failed to perform search'
      }
    });
  }
});

// Helper function to find which fields matched
function getMatchedFields(query: string, fields: Record<string, string | null | undefined>): string[] {
  const matched: string[] = [];
  const lowerQuery = query.toLowerCase();

  for (const [key, value] of Object.entries(fields)) {
    if (value && value.toLowerCase().includes(lowerQuery)) {
      matched.push(key);
    }
  }

  return matched;
}

// Helper function to extract snippet around matched text
function getTextSnippet(text: string, query: string, maxLength: number = 150): string {
  if (!text) return '';

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text.substring(0, maxLength) + '...';

  // Get text around the match
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + query.length + 100);

  let snippet = text.substring(start, end);

  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  return snippet;
}

export default router;
