import request from 'supertest';
import app from '../../src/app';
import { expectSuccessResponse, expectErrorResponse } from '../helpers/testUtils';

describe('Real Authentication Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    // Login as admin using real credentials
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'balinteegor@gmail.com',
        password: 'Tomiris2004!'
      });

    expect(response.status).toBe(200);
    adminToken = response.body.data.token;
  });

  describe('Books CRUD with Real Auth', () => {
    let testBookId: string;

    it('should create a book with real admin token', async () => {
      const response = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Real Auth Test Book',
          description: 'Testing with real authentication'
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data.book).toBeDefined();
      expect(response.body.data.book.title).toBe('Real Auth Test Book');
      testBookId = response.body.data.book.id;
    });

    it('should get the created book', async () => {
      const response = await request(app)
        .get(`/api/books/${testBookId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.book.id).toBe(testBookId);
    });

    it('should list books', async () => {
      const response = await request(app)
        .get('/api/books')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.books).toBeDefined();
      expect(Array.isArray(response.body.data.books)).toBe(true);
    });

    it('should update the book', async () => {
      const response = await request(app)
        .put(`/api/books/${testBookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Real Auth Test Book'
        });

      expectSuccessResponse(response);
      expect(response.body.data.book.title).toBe('Updated Real Auth Test Book');
    });

    it('should delete the book', async () => {
      const response = await request(app)
        .delete(`/api/books/${testBookId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
    });
  });

  describe('Registration Keys with Real Auth', () => {
    let testKeyCode: string;

    it('should create a registration key', async () => {
      const response = await request(app)
        .post('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'author',
          description: 'Test key for real auth'
        });

      expectSuccessResponse(response, 201);
      expect(response.body.data.keyInfo.keyCode).toBeDefined();
      testKeyCode = response.body.data.keyInfo.keyCode;
    });

    it('should get all registration keys', async () => {
      const response = await request(app)
        .get('/api/admin/registration-keys')
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.keys).toBeDefined();
      expect(Array.isArray(response.body.data.keys)).toBe(true);
    });

    it('should get specific registration key', async () => {
      const response = await request(app)
        .get(`/api/admin/registration-keys/${testKeyCode}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expectSuccessResponse(response);
      expect(response.body.data.keyInfo.keyCode).toBe(testKeyCode);
    });
  });
});