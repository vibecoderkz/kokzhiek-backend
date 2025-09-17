import request from 'supertest';
import app from '../../src/app';
import { generateTestJWT, createMockUser, expectSuccessResponse, expectErrorResponse } from '../helpers/testUtils';
import { UserRole } from '../../src/types/auth';

describe('Book Controller', () => {
  let adminToken: string;
  let userToken: string;
  let testBookId: string;

  beforeAll(() => {
    // Create test tokens
    adminToken = generateTestJWT({
      userId: 'admin-user-id',
      email: 'admin@test.com',
      role: 'admin' as UserRole,
    });

    userToken = generateTestJWT({
      userId: 'regular-user-id',
      email: 'user@test.com',
      role: 'author' as UserRole,
    });
  });

  describe('POST /api/books', () => {
    it('should create a new book with valid data', async () => {
      const bookData = {
        title: 'Test Book',
        description: 'A test book for unit testing',
        isPublic: false,
        visibility: 'private',
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bookData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.book).toBeDefined();
      expect(response.body.data.book.title).toBe(bookData.title);
      expect(response.body.data.book.description).toBe(bookData.description);
      expect(response.body.data.book.owner).toBeDefined();
      expect(response.body.data.book.permissions.canEdit).toBe(true);

      // Store book ID for other tests
      testBookId = response.body.data.book.id;
    });

    it('should fail to create book without authentication', async () => {
      const bookData = {
        title: 'Unauthorized Book',
        description: 'This should fail',
      };

      const response = await request(app)
        .post('/api/books')
        .send(bookData);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });

    it('should fail to create book with invalid data', async () => {
      const bookData = {
        description: 'Book without title',
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bookData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail to create book with title too long', async () => {
      const bookData = {
        title: 'A'.repeat(256), // Exceeds max length
        description: 'Valid description',
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bookData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should create book with minimal required data', async () => {
      const bookData = {
        title: 'Minimal Book',
      };

      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(bookData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.book.title).toBe(bookData.title);
      expect(response.body.data.book.description).toBeNull();
      expect(response.body.data.book.isPublic).toBe(false);
    });
  });

  describe('GET /api/books', () => {
    it('should get user books with default pagination', async () => {
      const response = await request(app)
        .get('/api/books')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.books).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(Array.isArray(response.body.data.books)).toBe(true);
    });

    it('should get user books with custom pagination', async () => {
      const response = await request(app)
        .get('/api/books?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should get user books with search filter', async () => {
      const response = await request(app)
        .get('/api/books?search=Test')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.books).toBeDefined();
    });

    it('should get user books with sorting', async () => {
      const response = await request(app)
        .get('/api/books?sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.books).toBeDefined();
    });

    it('should fail to get books without authentication', async () => {
      const response = await request(app)
        .get('/api/books');

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/books?page=0&limit=100')
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/books/:bookId', () => {
    it('should get specific book details', async () => {
      if (!testBookId) {
        // Create a book first if not available
        const createResponse = await request(app)
          .post('/api/books')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Test Book for Get' });
        testBookId = createResponse.body.data.book.id;
      }

      const response = await request(app)
        .get(`/api/books/${testBookId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.book).toBeDefined();
      expect(response.body.data.book.id).toBe(testBookId);
      expect(response.body.data.book.owner).toBeDefined();
      expect(response.body.data.book.chaptersCount).toBeDefined();
      expect(response.body.data.book.collaborators).toBeDefined();
      expect(response.body.data.book.permissions).toBeDefined();
    });

    it('should fail to get non-existent book', async () => {
      const response = await request(app)
        .get('/api/books/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('should fail to get book without authentication', async () => {
      const response = await request(app)
        .get(`/api/books/${testBookId}`);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });

    it('should fail to access book without permission', async () => {
      // Create a book with admin user
      const createResponse = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Private Book', visibility: 'private' });

      const privateBookId = createResponse.body.data.book.id;

      // Try to access with different user
      const response = await request(app)
        .get(`/api/books/${privateBookId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });
  });

  describe('PUT /api/books/:bookId', () => {
    it('should update book with valid data', async () => {
      if (!testBookId) {
        const createResponse = await request(app)
          .post('/api/books')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Test Book for Update' });
        testBookId = createResponse.body.data.book.id;
      }

      const updateData = {
        title: 'Updated Test Book',
        description: 'Updated description',
        isPublic: true,
        visibility: 'public',
      };

      const response = await request(app)
        .put(`/api/books/${testBookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.data.book.title).toBe(updateData.title);
      expect(response.body.data.book.description).toBe(updateData.description);
      expect(response.body.data.book.isPublic).toBe(updateData.isPublic);
      expect(response.body.data.book.visibility).toBe(updateData.visibility);
    });

    it('should update book with partial data', async () => {
      const updateData = {
        title: 'Partially Updated Book',
      };

      const response = await request(app)
        .put(`/api/books/${testBookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.data.book.title).toBe(updateData.title);
    });

    it('should fail to update non-existent book', async () => {
      const response = await request(app)
        .put('/api/books/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title' });

      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('should fail to update book without permission', async () => {
      const response = await request(app)
        .put(`/api/books/${testBookId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Unauthorized Update' });

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail to update book with invalid data', async () => {
      const response = await request(app)
        .put(`/api/books/${testBookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '' }); // Empty title

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/books/:bookId', () => {
    let bookToDeleteId: string;

    beforeEach(async () => {
      // Create a book to delete
      const createResponse = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Book to Delete' });
      bookToDeleteId = createResponse.body.data.book.id;
    });

    it('should delete book successfully', async () => {
      const response = await request(app)
        .delete(`/api/books/${bookToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.message).toBe('Book deleted successfully');

      // Verify book is deleted by trying to get it
      const getResponse = await request(app)
        .get(`/api/books/${bookToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(getResponse, 404, 'NOT_FOUND');
    });

    it('should fail to delete non-existent book', async () => {
      const response = await request(app)
        .delete('/api/books/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('should fail to delete book without permission', async () => {
      const response = await request(app)
        .delete(`/api/books/${bookToDeleteId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail to delete book without authentication', async () => {
      const response = await request(app)
        .delete(`/api/books/${bookToDeleteId}`);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });
  });

  describe('Book Chapters Integration', () => {
    let bookWithChaptersId: string;

    beforeAll(async () => {
      // Create a book for chapter tests
      const createResponse = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Book with Chapters' });
      bookWithChaptersId = createResponse.body.data.book.id;
    });

    it('should get book chapters', async () => {
      const response = await request(app)
        .get(`/api/books/${bookWithChaptersId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.chapters).toBeDefined();
      expect(Array.isArray(response.body.data.chapters)).toBe(true);
    });

    it('should create chapter in book', async () => {
      const chapterData = {
        title: 'Test Chapter',
        description: 'A test chapter',
      };

      const response = await request(app)
        .post(`/api/books/${bookWithChaptersId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(chapterData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.chapter).toBeDefined();
      expect(response.body.data.chapter.title).toBe(chapterData.title);
      expect(response.body.data.chapter.position).toBe(0);
    });

    it('should fail to create chapter in non-existent book', async () => {
      const response = await request(app)
        .post('/api/books/00000000-0000-0000-0000-000000000000/chapters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Test Chapter' });

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail to access chapters without permission', async () => {
      const response = await request(app)
        .get(`/api/books/${bookWithChaptersId}/chapters`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });
  });
});