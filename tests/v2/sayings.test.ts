import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/prisma';
import { authHeader } from '../helpers';

jest.mock('../../src/prisma', () => ({
  prisma: {
    message: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    saying: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockSaying = prisma.saying as any;

const asUser = authHeader({ sub: 1, role: 'user' });
const asOtherUser = authHeader({ sub: 2, role: 'user' });
const asAdmin = authHeader({ sub: 99, role: 'admin' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('v2 Sayings Routes', () => {
  describe('GET /v2/sayings', () => {
    it('returns paginated sayings with defaults (public)', async () => {
      mockSaying.findMany.mockResolvedValueOnce([
        {
          id: 1,
          content: 'Hello world',
          authorId: 1,
          author: { firstName: 'Jessica', lastName: 'Chen' },
        },
      ]);
      mockSaying.count.mockResolvedValueOnce(1);

      const response = await request(app).get('/v2/sayings');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1,
      });
    });

    it('filters by authorId', async () => {
      mockSaying.findMany.mockResolvedValueOnce([]);
      mockSaying.count.mockResolvedValueOnce(0);

      await request(app).get('/v2/sayings?authorId=5');

      expect(mockSaying.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ authorId: 5 }),
        })
      );
    });

    it('clamps limit to max 100', async () => {
      mockSaying.findMany.mockResolvedValueOnce([]);
      mockSaying.count.mockResolvedValueOnce(0);

      const response = await request(app).get('/v2/sayings?limit=999');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(100);
    });
  });

  describe('GET /v2/sayings/:id', () => {
    it('returns a saying by id (public)', async () => {
      mockSaying.findUnique.mockResolvedValueOnce({
        id: 1,
        content: 'Hello world',
        author: { id: 1, username: 'jchen' },
      });

      const response = await request(app).get('/v2/sayings/1');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(1);
    });

    it('returns 404 for non-existent saying', async () => {
      mockSaying.findUnique.mockResolvedValueOnce(null);

      const response = await request(app).get('/v2/sayings/999');

      expect(response.status).toBe(404);
    });

    it('returns 400 for non-numeric id', async () => {
      const response = await request(app).get('/v2/sayings/abc');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /v2/sayings', () => {
    it('creates a saying for the authenticated user', async () => {
      mockSaying.create.mockResolvedValueOnce({
        id: 1,
        content: 'New saying',
        authorId: 1,
        author: { id: 1, username: 'jchen' },
      });

      const response = await request(app)
        .post('/v2/sayings')
        .set(asUser)
        .send({ content: 'New saying' });

      expect(response.status).toBe(201);
      expect(mockSaying.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ authorId: 1, content: 'New saying' }),
        })
      );
    });

    it('returns 401 without a token', async () => {
      const response = await request(app).post('/v2/sayings').send({ content: 'Hello' });

      expect(response.status).toBe(401);
    });

    it('returns 400 for missing content', async () => {
      const response = await request(app).post('/v2/sayings').set(asUser).send({});

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /v2/sayings/:id', () => {
    it('owner can update', async () => {
      mockSaying.findUnique.mockResolvedValueOnce({ authorId: 1 });
      mockSaying.update.mockResolvedValueOnce({
        id: 1,
        content: 'Updated',
        author: { id: 1, username: 'jchen' },
      });

      const response = await request(app)
        .put('/v2/sayings/1')
        .set(asUser)
        .send({ content: 'Updated' });

      expect(response.status).toBe(200);
    });

    it('non-owner gets 403', async () => {
      mockSaying.findUnique.mockResolvedValueOnce({ authorId: 1 });

      const response = await request(app)
        .put('/v2/sayings/1')
        .set(asOtherUser)
        .send({ content: 'Updated' });

      expect(response.status).toBe(403);
    });

    it('returns 404 for non-existent saying', async () => {
      mockSaying.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/v2/sayings/999')
        .set(asUser)
        .send({ content: 'Updated' });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /v2/sayings/:id', () => {
    it('owner can partially update', async () => {
      mockSaying.findUnique.mockResolvedValueOnce({ authorId: 1 });
      mockSaying.update.mockResolvedValueOnce({
        id: 1,
        content: 'Updated partially',
        author: { id: 1, username: 'jchen' },
      });

      const response = await request(app)
        .patch('/v2/sayings/1')
        .set(asUser)
        .send({ content: 'Updated partially' });

      expect(response.status).toBe(200);
    });

    it('non-owner gets 403', async () => {
      mockSaying.findUnique.mockResolvedValueOnce({ authorId: 1 });

      const response = await request(app)
        .patch('/v2/sayings/1')
        .set(asOtherUser)
        .send({ content: 'Updated partially' });

      expect(response.status).toBe(403);
    });

    it('returns 400 when no valid fields provided', async () => {
      const response = await request(app)
        .patch('/v2/sayings/1')
        .set(asUser)
        .send({ invalid: 'field' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /v2/sayings/:id', () => {
    it('owner can delete own saying', async () => {
      mockSaying.findUnique.mockResolvedValueOnce({ authorId: 1 });
      mockSaying.delete.mockResolvedValueOnce({ id: 1 });

      const response = await request(app).delete('/v2/sayings/1').set(asUser);

      expect(response.status).toBe(200);
    });

    it('non-owner non-admin gets 403', async () => {
      mockSaying.findUnique.mockResolvedValueOnce({ authorId: 1 });

      const response = await request(app).delete('/v2/sayings/1').set(asOtherUser);

      expect(response.status).toBe(403);
    });

    it('admin can delete any saying', async () => {
      mockSaying.findUnique.mockResolvedValueOnce({ authorId: 1 });
      mockSaying.delete.mockResolvedValueOnce({ id: 1 });

      const response = await request(app).delete('/v2/sayings/1').set(asAdmin);

      expect(response.status).toBe(200);
    });

    it('returns 404 for non-existent saying', async () => {
      mockSaying.findUnique.mockResolvedValueOnce(null);

      const response = await request(app).delete('/v2/sayings/999').set(asUser);

      expect(response.status).toBe(404);
    });

    it('returns 401 without a token', async () => {
      const response = await request(app).delete('/v2/sayings/1');

      expect(response.status).toBe(401);
    });
  });
});
