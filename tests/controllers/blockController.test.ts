import request from 'supertest';
import app from '../../src/app';
import { generateTestJWT, createMockUser, expectSuccessResponse, expectErrorResponse } from '../helpers/testUtils';
import { UserRole } from '../../src/types/auth';

describe('Block Controller', () => {
  let adminToken: string;
  let userToken: string;
  let testBookId: string;
  let testChapterId: string;
  let testBlockId: string;

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

    // Create a test book and chapter for block operations
    const bookResponse = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Test Book for Blocks' });

    testBookId = bookResponse.body.data.book.id;

    const chapterResponse = await request(app)
      .post(`/api/books/${testBookId}/chapters`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Test Chapter for Blocks' });

    testChapterId = chapterResponse.body.data.chapter.id;
  });

  describe('POST /api/chapters/:chapterId/blocks', () => {
    it('should create a new block with valid data', async () => {
      const blockData = {
        type: 'text',
        content: { text: 'This is a test block' },
        style: { color: 'black' },
      };

      const response = await request(app)
        .post(`/api/chapters/${testChapterId}/blocks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.block).toBeDefined();
      expect(response.body.data.block.type).toBe(blockData.type);
      expect(response.body.data.block.content).toEqual(blockData.content);
      expect(response.body.data.block.style).toEqual(blockData.style);
      expect(response.body.data.block.position).toBe(0);

      // Store block ID for other tests
      testBlockId = response.body.data.block.id;
    });

    it('should create block with auto-assigned position', async () => {
      const blockData = {
        type: 'image',
        content: { src: 'test.jpg', alt: 'Test image' },
      };

      const response = await request(app)
        .post(`/api/chapters/${testChapterId}/blocks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.block.position).toBe(1); // Auto-assigned next position
    });

    it('should create block with specific position', async () => {
      const blockData = {
        type: 'heading',
        content: { text: 'Test Heading' },
        position: 0, // Insert at beginning
      };

      const response = await request(app)
        .post(`/api/chapters/${testChapterId}/blocks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.block.position).toBe(0);
    });

    it('should fail to create block without authentication', async () => {
      const blockData = {
        type: 'text',
        content: { text: 'Unauthorized block' },
      };

      const response = await request(app)
        .post(`/api/chapters/${testChapterId}/blocks`)
        .send(blockData);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });

    it('should fail to create block without permission', async () => {
      const blockData = {
        type: 'text',
        content: { text: 'Forbidden block' },
      };

      const response = await request(app)
        .post(`/api/chapters/${testChapterId}/blocks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(blockData);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail to create block with invalid data', async () => {
      const blockData = {
        content: { text: 'Block without type' },
      };

      const response = await request(app)
        .post(`/api/chapters/${testChapterId}/blocks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail to create block with type too long', async () => {
      const blockData = {
        type: 'A'.repeat(51), // Exceeds max length
        content: { text: 'Valid content' },
      };

      const response = await request(app)
        .post(`/api/chapters/${testChapterId}/blocks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail to create block in non-existent chapter', async () => {
      const blockData = {
        type: 'text',
        content: { text: 'Block in non-existent chapter' },
      };

      const response = await request(app)
        .post('/api/chapters/00000000-0000-0000-0000-000000000000/blocks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(blockData);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });
  });

  describe('PUT /api/blocks/:blockId', () => {
    it('should update block with valid data', async () => {
      if (!testBlockId) {
        // Create a block first if not available
        const createResponse = await request(app)
          .post(`/api/chapters/${testChapterId}/blocks`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ type: 'text', content: { text: 'Test Block for Update' } });
        testBlockId = createResponse.body.data.block.id;
      }

      const updateData = {
        type: 'paragraph',
        content: { text: 'Updated block content' },
        style: { fontSize: '16px' },
      };

      const response = await request(app)
        .put(`/api/blocks/${testBlockId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.data.block.type).toBe(updateData.type);
      expect(response.body.data.block.content).toEqual(updateData.content);
      expect(response.body.data.block.style).toEqual(updateData.style);
    });

    it('should update block with partial data', async () => {
      const updateData = {
        content: { text: 'Partially updated content' },
      };

      const response = await request(app)
        .put(`/api/blocks/${testBlockId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.data.block.content).toEqual(updateData.content);
    });

    it('should fail to update non-existent block', async () => {
      const response = await request(app)
        .put('/api/blocks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: { text: 'Updated content' } });

      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('should fail to update block without permission', async () => {
      const response = await request(app)
        .put(`/api/blocks/${testBlockId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ content: { text: 'Unauthorized update' } });

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail to update block with invalid data', async () => {
      const response = await request(app)
        .put(`/api/blocks/${testBlockId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: '' }); // Empty type

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('PUT /api/blocks/:blockId/reorder', () => {
    let blocksForReorder: string[] = [];

    beforeAll(async () => {
      // Create multiple blocks for reordering tests
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post(`/api/chapters/${testChapterId}/blocks`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'text',
            content: { text: `Reorder Block ${i}` }
          });
        blocksForReorder.push(response.body.data.block.id);
      }
    });

    it('should reorder block to new position', async () => {
      const blockId = blocksForReorder[0];
      const newPosition = 2;

      const response = await request(app)
        .put(`/api/blocks/${blockId}/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPosition });

      expectSuccessResponse(response);
      expect(response.body.data.block.position).toBe(newPosition);
    });

    it('should handle reordering to same position', async () => {
      const blockId = blocksForReorder[1];

      // Get current position
      const getResponse = await request(app)
        .get(`/api/chapters/${testChapterId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const currentBlock = getResponse.body.data.chapter.blocks.find((b: any) => b.id === blockId);
      const currentPosition = currentBlock.position;

      const response = await request(app)
        .put(`/api/blocks/${blockId}/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPosition: currentPosition });

      expectSuccessResponse(response);
      expect(response.body.data.block.position).toBe(currentPosition);
    });

    it('should fail to reorder with invalid position', async () => {
      const blockId = blocksForReorder[0];

      const response = await request(app)
        .put(`/api/blocks/${blockId}/reorder`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPosition: -1 });

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail to reorder without permission', async () => {
      const blockId = blocksForReorder[0];

      const response = await request(app)
        .put(`/api/blocks/${blockId}/reorder`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ newPosition: 1 });

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail to reorder non-existent block', async () => {
      const response = await request(app)
        .put('/api/blocks/00000000-0000-0000-0000-000000000000/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPosition: 1 });

      expectErrorResponse(response, 404, 'NOT_FOUND');
    });
  });

  describe('PUT /api/chapters/:chapterId/blocks/bulk', () => {
    let bulkUpdateBlocks: any[] = [];

    beforeAll(async () => {
      // Create blocks for bulk update tests
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post(`/api/chapters/${testChapterId}/blocks`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'text',
            content: { text: `Bulk Block ${i}` }
          });
        bulkUpdateBlocks.push(response.body.data.block);
      }
    });

    it('should bulk update blocks successfully', async () => {
      const updateData = {
        blocks: [
          {
            id: bulkUpdateBlocks[0].id,
            content: { text: 'Bulk updated content 1' },
            style: { color: 'red' },
          },
          {
            id: bulkUpdateBlocks[1].id,
            content: { text: 'Bulk updated content 2' },
            position: 10,
          },
        ],
      };

      const response = await request(app)
        .put(`/api/chapters/${testChapterId}/blocks/bulk`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectSuccessResponse(response);
      expect(response.body.data.blocks).toBeDefined();
      expect(Array.isArray(response.body.data.blocks)).toBe(true);
      expect(response.body.data.blocks.length).toBe(2);
    });

    it('should fail bulk update with invalid block ID', async () => {
      const updateData = {
        blocks: [
          {
            id: '00000000-0000-0000-0000-000000000000',
            content: { text: 'Invalid block' },
          },
        ],
      };

      const response = await request(app)
        .put(`/api/chapters/${testChapterId}/blocks/bulk`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail bulk update without permission', async () => {
      const updateData = {
        blocks: [
          {
            id: bulkUpdateBlocks[0].id,
            content: { text: 'Unauthorized bulk update' },
          },
        ],
      };

      const response = await request(app)
        .put(`/api/chapters/${testChapterId}/blocks/bulk`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail bulk update with empty blocks array', async () => {
      const updateData = {
        blocks: [],
      };

      const response = await request(app)
        .put(`/api/chapters/${testChapterId}/blocks/bulk`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });

    it('should fail bulk update with invalid data', async () => {
      const updateData = {
        blocks: [
          {
            id: 'invalid-uuid',
            content: { text: 'Invalid UUID' },
          },
        ],
      };

      const response = await request(app)
        .put(`/api/chapters/${testChapterId}/blocks/bulk`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expectErrorResponse(response, 400, 'VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/blocks/:blockId', () => {
    let blockToDeleteId: string;

    beforeEach(async () => {
      // Create a block to delete
      const createResponse = await request(app)
        .post(`/api/chapters/${testChapterId}/blocks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'text',
          content: { text: 'Block to Delete' }
        });
      blockToDeleteId = createResponse.body.data.block.id;
    });

    it('should delete block successfully', async () => {
      const response = await request(app)
        .delete(`/api/blocks/${blockToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.message).toBe('Block deleted successfully');

      // Verify block is deleted by checking chapter blocks
      const getResponse = await request(app)
        .get(`/api/chapters/${testChapterId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(getResponse);
      const deletedBlock = getResponse.body.data.chapter.blocks.find((b: any) => b.id === blockToDeleteId);
      expect(deletedBlock).toBeUndefined();
    });

    it('should fail to delete non-existent block', async () => {
      const response = await request(app)
        .delete('/api/blocks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);

      expectErrorResponse(response, 404, 'NOT_FOUND');
    });

    it('should fail to delete block without permission', async () => {
      const response = await request(app)
        .delete(`/api/blocks/${blockToDeleteId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expectErrorResponse(response, 403, 'FORBIDDEN');
    });

    it('should fail to delete block without authentication', async () => {
      const response = await request(app)
        .delete(`/api/blocks/${blockToDeleteId}`);

      expectErrorResponse(response, 401, 'AUTHENTICATION_ERROR');
    });
  });

  describe('Block Integration with Chapters', () => {
    it('should include blocks when getting chapter details', async () => {
      const response = await request(app)
        .get(`/api/chapters/${testChapterId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.chapter.blocks).toBeDefined();
      expect(Array.isArray(response.body.data.chapter.blocks)).toBe(true);
      expect(response.body.data.chapter.blocks.length).toBeGreaterThan(0);

      // Check block structure
      const block = response.body.data.chapter.blocks[0];
      expect(block.id).toBeDefined();
      expect(block.type).toBeDefined();
      expect(block.content).toBeDefined();
      expect(block.position).toBeDefined();
    });

    it('should order blocks by position in chapter', async () => {
      const response = await request(app)
        .get(`/api/chapters/${testChapterId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      const blocks = response.body.data.chapter.blocks;

      for (let i = 1; i < blocks.length; i++) {
        expect(blocks[i].position).toBeGreaterThan(blocks[i - 1].position);
      }
    });
  });
});