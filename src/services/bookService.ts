import { eq, and, or, desc, asc, ilike, count, sql } from 'drizzle-orm';
import { db } from '../config/database';
import { books, chapters, blocks, bookCollaborators, users } from '../models/schema';
import { UserRole } from '../types/auth';

export interface CreateBookInput {
  title: string;
  author?: string;
  authors?: string[];
  class?: string;
  grade?: number;
  description?: string;
  coverImageUrl?: string;
  isPublic?: boolean;
  visibility?: 'private' | 'school' | 'public';
  settings?: Record<string, any>;
  ownerId: string;
  schoolId?: string;
  isbn?: string;
  year?: number;
  publisher?: string;
  edition?: string;
  subject?: string;
  language?: string;
}

export interface UpdateBookInput {
  title?: string;
  author?: string;
  authors?: string[];
  class?: string;
  grade?: number;
  description?: string;
  coverImageUrl?: string;
  isPublic?: boolean;
  visibility?: 'private' | 'school' | 'public';
  settings?: Record<string, any>;
  isbn?: string;
  year?: number;
  publisher?: string;
  edition?: string;
  subject?: string;
  language?: string;
}

export interface BookFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  visibility?: 'private' | 'school' | 'public';
  isPublic?: boolean;
}

export interface BookWithDetails {
  id: string;
  title: string;
  author: string | null;
  authors?: any;
  class: string | null;
  grade?: number | null;
  description: string | null;
  coverImageUrl: string | null;
  isPublic: boolean | null;
  visibility: string | null;
  settings: any;
  createdAt: Date | null;
  updatedAt: Date | null;
  owner: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  school?: {
    id: string;
    name: string;
  } | null;
  chaptersCount: number;
  collaborators?: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
    createdAt: Date | null;
  }>;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  isbn?: string | null;
  year?: number | null;
  publisher?: string | null;
  edition?: string | null;
  subject?: string | null;
  language?: string | null;
}

export class BookService {
  static async createBook(input: CreateBookInput): Promise<BookWithDetails> {
    const [book] = await db.insert(books).values({
      title: input.title,
      author: input.author,
      authors: input.authors,
      class: input.class,
      grade: input.grade,
      description: input.description,
      coverImageUrl: input.coverImageUrl,
      isPublic: input.isPublic || false,
      visibility: input.visibility || 'private',
      settings: input.settings || {},
      ownerId: input.ownerId,
      schoolId: input.schoolId,
      isbn: input.isbn,
      year: input.year,
      publisher: input.publisher,
      edition: input.edition,
      subject: input.subject,
      language: input.language,
    }).returning();

    return this.getBookById(book.id, input.ownerId);
  }

  static async getUserBooks(userId: string, filters: BookFilters = {}): Promise<{
    books: BookWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 50);
    const offset = (page - 1) * limit;

    let whereConditions: any[] = [];

    if (filters.search) {
      whereConditions.push(
        or(
          ilike(books.title, `%${filters.search}%`),
          ilike(books.description, `%${filters.search}%`)
        )
      );
    }

    if (filters.visibility) {
      whereConditions.push(eq(books.visibility, filters.visibility));
    }

    if (filters.isPublic !== undefined) {
      whereConditions.push(eq(books.isPublic, filters.isPublic));
    }

    const orderBy = filters.sortBy === 'title' ? books.title :
                   filters.sortBy === 'updatedAt' ? books.updatedAt :
                   books.createdAt;

    const sortDirection = filters.sortOrder === 'asc' ? asc : desc;

    const booksWithDetails = await db
      .select({
        book: books,
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        chaptersCount: sql<number>`(
          SELECT COUNT(*) FROM ${chapters}
          WHERE ${chapters.bookId} = ${books.id}
        )`,
      })
      .from(books)
      .leftJoin(users, eq(books.ownerId, users.id))
      .where(and(...whereConditions))
      .orderBy(sortDirection(orderBy))
      .limit(limit)
      .offset(offset);

    const totalQuery = await db
      .select({ count: count() })
      .from(books)
      .where(and(...whereConditions));

    const total = totalQuery[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    const booksList: BookWithDetails[] = booksWithDetails
      .filter(row => row.owner) // Filter out books without owners
      .map(row => ({
        id: row.book.id,
        title: row.book.title,
        author: row.book.author,
        authors: row.book.authors,
        class: row.book.class,
        grade: row.book.grade,
        description: row.book.description,
        coverImageUrl: null, // Не отправляем base64 изображения для списка книг (оптимизация)
        isPublic: row.book.isPublic,
        visibility: row.book.visibility,
        settings: row.book.settings,
        createdAt: row.book.createdAt,
        updatedAt: row.book.updatedAt,
        owner: row.owner!,
        chaptersCount: row.chaptersCount,
        permissions: {
          canEdit: row.book.ownerId === userId,
          canDelete: row.book.ownerId === userId,
          canShare: row.book.ownerId === userId,
        },
        // Метаданные
        isbn: row.book.isbn,
        year: row.book.year,
        publisher: row.book.publisher,
        edition: row.book.edition,
        subject: row.book.subject,
        language: row.book.language,
      }));

    return {
      books: booksList,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  static async getBookById(bookId: string, userId: string): Promise<BookWithDetails> {
    const bookQuery = await db
      .select({
        book: books,
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(books)
      .leftJoin(users, eq(books.ownerId, users.id))
      .where(eq(books.id, bookId))
      .limit(1);

    if (!bookQuery.length) {
      throw new Error('Book not found');
    }

    const bookData = bookQuery[0];

    // Check if user has access to this book
    const hasAccess = bookData.book.ownerId === userId ||
                     bookData.book.isPublic ||
                     await this.isCollaborator(bookId, userId);

    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Get chapters
    const chaptersData = await db
      .select({
        id: chapters.id,
        title: chapters.title,
        description: chapters.description,
        position: chapters.position,
        createdAt: chapters.createdAt,
        blocksCount: sql<number>`(
          SELECT COUNT(*) FROM ${blocks}
          WHERE ${blocks.chapterId} = ${chapters.id}
        )`,
      })
      .from(chapters)
      .where(eq(chapters.bookId, bookId))
      .orderBy(asc(chapters.position));

    // Get collaborators
    const collaboratorsData = await db
      .select({
        id: bookCollaborators.id,
        role: bookCollaborators.role,
        createdAt: bookCollaborators.createdAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(bookCollaborators)
      .leftJoin(users, eq(bookCollaborators.userId, users.id))
      .where(eq(bookCollaborators.bookId, bookId));

    const isOwner = bookData.book.ownerId === userId;
    const userCollaboration = collaboratorsData.find(c => c.user?.id === userId);
    const isEditor = userCollaboration?.role === 'editor' || userCollaboration?.role === 'admin';

    if (!bookData.owner) {
      throw new Error('Book owner not found');
    }

    return {
      id: bookData.book.id,
      title: bookData.book.title,
      author: bookData.book.author,
      authors: bookData.book.authors,
      class: bookData.book.class,
      grade: bookData.book.grade,
      description: bookData.book.description,
      coverImageUrl: bookData.book.coverImageUrl,
      isPublic: bookData.book.isPublic,
      visibility: bookData.book.visibility,
      settings: bookData.book.settings,
      createdAt: bookData.book.createdAt,
      updatedAt: bookData.book.updatedAt,
      owner: bookData.owner,
      chaptersCount: chaptersData.length,
      collaborators: collaboratorsData
        .filter(c => c.user) // Filter out collaborators without user data
        .map(c => ({
          id: c.id,
          role: c.role,
          user: c.user!,
          createdAt: c.createdAt,
        })),
      permissions: {
        canEdit: isOwner || isEditor,
        canDelete: isOwner,
        canShare: isOwner,
      },
      isbn: bookData.book.isbn,
      year: bookData.book.year,
      publisher: bookData.book.publisher,
      edition: bookData.book.edition,
      subject: bookData.book.subject,
      language: bookData.book.language,
    };
  }

  static async updateBook(bookId: string, userId: string, input: UpdateBookInput): Promise<BookWithDetails> {
    // Check if user can edit this book
    const canEdit = await this.canUserEditBook(bookId, userId);
    if (!canEdit) {
      throw new Error('Access denied');
    }

    const [updatedBook] = await db
      .update(books)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(books.id, bookId))
      .returning();

    if (!updatedBook) {
      throw new Error('Book not found');
    }

    return this.getBookById(bookId, userId);
  }

  static async deleteBook(bookId: string, userId: string): Promise<void> {
    // Check if user owns this book
    const book = await db.query.books.findFirst({
      where: eq(books.id, bookId),
    });

    if (!book) {
      throw new Error('Book not found');
    }

    if (book.ownerId !== userId) {
      throw new Error('Access denied');
    }

    // Delete book (cascading deletes will handle chapters, blocks, collaborators)
    await db.delete(books).where(eq(books.id, bookId));
  }

  static async getPublicBook(bookId: string): Promise<BookWithDetails | null> {
    const book = await db.query.books.findFirst({
      where: and(eq(books.id, bookId), eq(books.isPublic, true)),
      with: {
        owner: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        chapters: {
          orderBy: [asc(chapters.position)],
          with: {
            blocks: {
              orderBy: [asc(blocks.position)],
            },
          },
        },
      },
    });

    if (!book) return null;

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      authors: book.authors,
      class: book.class,
      grade: book.grade,
      description: book.description,
      coverImageUrl: book.coverImageUrl,
      isPublic: book.isPublic,
      visibility: book.visibility,
      settings: book.settings,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
      owner: book.owner,
      chaptersCount: book.chapters.length,
      permissions: {
        canEdit: false,
        canDelete: false,
        canShare: false,
      },
      isbn: book.isbn,
      year: book.year,
      publisher: book.publisher,
      edition: book.edition,
      subject: book.subject,
      language: book.language,
    };
  }

  private static async isCollaborator(bookId: string, userId: string): Promise<boolean> {
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
}