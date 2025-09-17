import request from 'supertest';
import app from '../../src/app';
import { generateTestJWT, createMockUser, expectSuccessResponse, expectErrorResponse } from '../helpers/testUtils';
import { UserRole } from '../../src/types/auth';

describe('Chapter Controller', () => {
  let adminToken: string;
  let userToken: string;
  let testBookId: string;
  let testChapterId: string;

  beforeAll(async () => {
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

    // Create a test book for chapter operations
    const bookResponse = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Test Book for Chapters' });

    testBookId = bookResponse.body.data.book.id;
  });

  describe('POST /api/books/:bookId/chapters', () => {
    it('should create a new chapter with valid data', async () => {
      const chapterData = {
        title: 'Chapter 1: Introduction',
        description: 'The first chapter of our book',
        settings: { theme: 'default' },
      };

      const response = await request(app)
        .post(`/api/books/${testBookId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(chapterData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.chapter).toBeDefined();
      expect(response.body.data.chapter.title).toBe(chapterData.title);
      expect(response.body.data.chapter.description).toBe(chapterData.description);
      expect(response.body.data.chapter.position).toBe(0);
      expect(response.body.data.chapter.book).toBeDefined();
      expect(response.body.data.chapter.blocks).toEqual([]);

      // Store chapter ID for other tests
      testChapterId = response.body.data.chapter.id;
    });

    it('should create chapter with auto-assigned position', async () => {
      const chapterData = {
        title: 'Chapter 2: Getting Started',
        description: 'The second chapter',
      };

      const response = await request(app)
        .post(`/api/books/${testBookId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(chapterData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.chapter.position).toBe(1); // Auto-assigned next position
    });

    it('should create chapter with specific position', async () => {
      const chapterData = {
        title: 'Chapter 0: Preface',
        description: 'The preface chapter',
        position: 0, // Insert at beginning
      };

      const response = await request(app)
        .post(`/api/books/${testBookId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(chapterData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.chapter.position).toBe(0);
    });

    it('should fail to create chapter without authentication', async () => {
      const chapterData = {
        title: 'Unauthorized Chapter',
      };

      const response = await request(app)
        .post(`/api/books/${testBookId}/chapters`)
        .send(chapterData);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });

    it('should fail to create chapter without permission', async () => {
      const chapterData = {
        title: 'Forbidden Chapter',
      };

      const response = await request(app)
        .post(`/api/books/${testBookId}/chapters`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(chapterData);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail to create chapter with invalid data', async () => {
      const chapterData = {
        description: 'Chapter without title',
      };

      const response = await request(app)
        .post(`/api/books/${testBookId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(chapterData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail to create chapter with title too long', async () => {
      const chapterData = {
        title: 'A'.repeat(256), // Exceeds max length
      };

      const response = await request(app)
        .post(`/api/books/${testBookId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(chapterData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail to create chapter in non-existent book', async () => {
      const chapterData = {
        title: 'Chapter in Non-existent Book',
      };

      const response = await request(app)
        .post('/api/books/00000000-0000-0000-0000-000000000000/chapters')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(chapterData);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });
  });

  describe('GET /api/books/:bookId/chapters', () => {
    it('should get all chapters in a book', async () => {
      const response = await request(app)
        .get(`/api/books/${testBookId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.chapters).toBeDefined();
      expect(Array.isArray(response.body.data.chapters)).toBe(true);
      expect(response.body.data.chapters.length).toBeGreaterThan(0);

      // Check chapter structure
      const chapter = response.body.data.chapters[0];
      expect(chapter.id).toBeDefined();
      expect(chapter.title).toBeDefined();
      expect(chapter.position).toBeDefined();
      expect(chapter.blocksCount).toBeDefined();
    });

    it('should get chapters ordered by position', async () => {
      const response = await request(app)
        .get(`/api/books/${testBookId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      const chapters = response.body.data.chapters;

      for (let i = 1; i < chapters.length; i++) {
        expect(chapters[i].position).toBeGreaterThan(chapters[i - 1].position);
      }
    });

    it('should fail to get chapters without authentication', async () => {
      const response = await request(app)
        .get(`/api/books/${testBookId}/chapters`);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });

    it('should fail to get chapters without permission', async () => {
      const response = await request(app)
        .get(`/api/books/${testBookId}/chapters`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });
  });

  describe('GET /api/chapters/:chapterId', () => {
    it('should get specific chapter with blocks', async () => {
      if (!testChapterId) {
        // Create a chapter first if not available
        const createResponse = await request(app)
          .post(`/api/books/${testBookId}/chapters`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Test Chapter for Get' });
        testChapterId = createResponse.body.data.chapter.id;
      }

      const response = await request(app)
        .get(`/api/chapters/${testChapterId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.chapter).toBeDefined();
      expect(response.body.data.chapter.id).toBe(testChapterId);
      expect(response.body.data.chapter.book).toBeDefined();
      expect(response.body.data.chapter.blocks).toBeDefined();
      expect(Array.isArray(response.body.data.chapter.blocks)).toBe(true);
    });

    it('should fail to get non-existent chapter', async () => {
      const response = await request(app)
        .get('/api/chapters/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('should fail to get chapter without authentication', async () => {
      const response = await request(app)
        .get(`/api/chapters/${testChapterId}`);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });

    it('should fail to get chapter without permission', async () => {
      const response = await request(app)
        .get(`/api/chapters/${testChapterId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });
  });

  describe('PUT /api/chapters/:chapterId', () => {
    it('should update chapter with valid data', async () => {
      if (!testChapterId) {
        const createResponse = await request(app)
          .post(`/api/books/${testBookId}/chapters`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Test Chapter for Update' });
        testChapterId = createResponse.body.data.chapter.id;
      }

      const updateData = {
        title: 'Updated Chapter Title',
        description: 'Updated chapter description',
        settings: { theme: 'dark' },
      };

      const response = await request(app)
        .put(`/api/chapters/${testChapterId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.data.chapter.title).toBe(updateData.title);
      expect(response.body.data.chapter.description).toBe(updateData.description);
      expect(response.body.data.chapter.settings.theme).toBe(updateData.settings.theme);
    });

    it('should update chapter with partial data', async () => {
      const updateData = {
        title: 'Partially Updated Chapter',
      };

      const response = await request(app)
        .put(`/api/chapters/${testChapterId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.data.chapter.title).toBe(updateData.title);
    });

    it('should fail to update non-existent chapter', async () => {
      const response = await request(app)
        .put('/api/chapters/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title' });

      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('should fail to update chapter without permission', async () => {
      const response = await request(app)
        .put(`/api/chapters/${testChapterId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Unauthorized Update' });

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail to update chapter with invalid data', async () => {
      const response = await request(app)
        .put(`/api/chapters/${testChapterId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '' }); // Empty title

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('PUT /api/chapters/:chapterId/reorder', () => {
    let chaptersForReorder: string[] = [];

    beforeAll(async () => {
      // Create multiple chapters for reordering tests
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post(`/api/books/${testBookId}/chapters`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: `Reorder Chapter ${i}` });
        chaptersForReorder.push(response.body.data.chapter.id);
      }
    });

    it('should reorder chapter to new position', async () => {
      const chapterId = chaptersForReorder[0];
      const newPosition = 2;

      const response = await request(app)
        .put(`/api/chapters/${chapterId}/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPosition });

      expectSuccessResponse(response);
      expect(response.body.data.chapter.position).toBe(newPosition);
    });

    it('should handle reordering to same position', async () => {
      const chapterId = chaptersForReorder[1];

      // Get current position
      const getResponse = await request(app)
        .get(`/api/chapters/${chapterId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const currentPosition = getResponse.body.data.chapter.position;

      const response = await request(app)
        .put(`/api/chapters/${chapterId}/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPosition: currentPosition });

      expectSuccessResponse(response);
      expect(response.body.data.chapter.position).toBe(currentPosition);
    });

    it('should fail to reorder with invalid position', async () => {
      const chapterId = chaptersForReorder[0];

      const response = await request(app)
        .put(`/api/chapters/${chapterId}/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPosition: -1 });

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail to reorder without permission', async () => {
      const chapterId = chaptersForReorder[0];

      const response = await request(app)
        .put(`/api/chapters/${chapterId}/reorder`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ newPosition: 1 });

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail to reorder non-existent chapter', async () => {
      const response = await request(app)
        .put('/api/chapters/00000000-0000-0000-0000-000000000000/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPosition: 1 });

      expectErrorResponse(response, 404, 'NOT_FOUND');
    });
  });

  describe('DELETE /api/chapters/:chapterId', () => {
    let chapterToDeleteId: string;

    beforeEach(async () => {
      // Create a chapter to delete
      const createResponse = await request(app)
        .post(`/api/books/${testBookId}/chapters`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Chapter to Delete' });
      chapterToDeleteId = createResponse.body.data.chapter.id;
    });

    it('should delete chapter successfully', async () => {
      const response = await request(app)
        .delete(`/api/chapters/${chapterToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.message).toBe('Chapter deleted successfully');

      // Verify chapter is deleted by trying to get it
      const getResponse = await request(app)
        .get(`/api/chapters/${chapterToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(getResponse, 404, 'NOT_FOUND');
    });

    it('should fail to delete non-existent chapter', async () => {
      const response = await request(app)
        .delete('/api/chapters/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('should fail to delete chapter without permission', async () => {
      const response = await request(app)
        .delete(`/api/chapters/${chapterToDeleteId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail to delete chapter without authentication', async () => {
      const response = await request(app)
        .delete(`/api/chapters/${chapterToDeleteId}`);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });
  });
});