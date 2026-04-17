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
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockMessage = prisma.message as jest.Mocked<typeof prisma.message>;

const asUser = authHeader({ sub: 1, role: 'user' });
const asOtherUser = authHeader({ sub: 2, role: 'user' });
const asAdmin = authHeader({ sub: 99, role: 'admin' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('v2 Messages Routes', () => {
  describe('GET /v2/messages', () => {
    it('returns paginated messages with defaults (public)', async () => {
      (mockMessage.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, content: 'Hello', author: { id: 1, username: 'jchen' } },
      ]);
      (mockMessage.count as jest.Mock).mockResolvedValueOnce(1);

      const response = await request(app).get('/v2/messages');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1,
      });
    });

    it('respects page, limit, sort, and order params', async () => {
      (mockMessage.findMany as jest.Mock).mockResolvedValueOnce([]);
      (mockMessage.count as jest.Mock).mockResolvedValueOnce(50);

      const response = await request(app).get(
        '/v2/messages?page=2&limit=10&sort=createdAt&order=desc',
      );

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('filters by authorId', async () => {
      (mockMessage.findMany as jest.Mock).mockResolvedValueOnce([]);
      (mockMessage.count as jest.Mock).mockResolvedValueOnce(0);

      await request(app).get('/v2/messages?authorId=5');

      expect(mockMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ authorId: 5 }),
        }),
      );
    });

    it('clamps limit to max 100', async () => {
      (mockMessage.findMany as jest.Mock).mockResolvedValueOnce([]);
      (mockMessage.count as jest.Mock).mockResolvedValueOnce(0);

      const response = await request(app).get('/v2/messages?limit=999');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(100);
    });
  });

  describe('GET /v2/messages/:id', () => {
    it('returns a message by id (public)', async () => {
      (mockMessage.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 1,
        content: 'Hello',
        author: { id: 1, username: 'jchen' },
      });

      const response = await request(app).get('/v2/messages/1');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(1);
    });

    it('returns 404 for non-existent message', async () => {
      (mockMessage.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app).get('/v2/messages/999');

      expect(response.status).toBe(404);
    });

    it('returns 400 for non-numeric id', async () => {
      const response = await request(app).get('/v2/messages/abc');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /v2/messages', () => {
    it('creates a message for the authenticated user', async () => {
      (mockMessage.create as jest.Mock).mockResolvedValueOnce({
        id: 1,
        content: 'New message',
        authorId: 1,
        author: { id: 1, username: 'jchen' },
      });

      const response = await request(app)
        .post('/v2/messages')
        .set(asUser)
        .send({ content: 'New message' });

      expect(response.status).toBe(201);
      // authorId comes from JWT sub, never from the request body
      expect(mockMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ authorId: 1 }),
        }),
      );
    });

    it('returns 401 without a token', async () => {
      const response = await request(app).post('/v2/messages').send({ content: 'Hello' });

      expect(response.status).toBe(401);
    });

    it('returns 400 for missing content', async () => {
      const response = await request(app).post('/v2/messages').set(asUser).send({});

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /v2/messages/:id', () => {
    it('owner can update', async () => {
      (mockMessage.findUnique as jest.Mock).mockResolvedValueOnce({ authorId: 1 });
      (mockMessage.update as jest.Mock).mockResolvedValueOnce({
        id: 1,
        content: 'Updated',
        author: { id: 1, username: 'jchen' },
      });

      const response = await request(app)
        .put('/v2/messages/1')
        .set(asUser)
        .send({ content: 'Updated' });

      expect(response.status).toBe(200);
    });

    it('non-owner gets 403', async () => {
      (mockMessage.findUnique as jest.Mock).mockResolvedValueOnce({ authorId: 1 });

      const response = await request(app)
        .put('/v2/messages/1')
        .set(asOtherUser)
        .send({ content: 'Updated' });

      expect(response.status).toBe(403);
    });

    it('returns 404 for non-existent message', async () => {
      (mockMessage.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/v2/messages/999')
        .set(asUser)
        .send({ content: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('returns 401 without a token', async () => {
      const response = await request(app).put('/v2/messages/1').send({ content: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /v2/messages/:id', () => {
    it('owner can partially update', async () => {
      (mockMessage.findUnique as jest.Mock).mockResolvedValueOnce({ authorId: 1 });
      (mockMessage.update as jest.Mock).mockResolvedValueOnce({
        id: 1,
        content: 'Hello',
        read: true,
        author: { id: 1, username: 'jchen' },
      });

      const response = await request(app)
        .patch('/v2/messages/1')
        .set(asUser)
        .send({ read: true });

      expect(response.status).toBe(200);
    });

    it('non-owner gets 403', async () => {
      (mockMessage.findUnique as jest.Mock).mockResolvedValueOnce({ authorId: 1 });

      const response = await request(app)
        .patch('/v2/messages/1')
        .set(asOtherUser)
        .send({ read: true });

      expect(response.status).toBe(403);
    });

    it('returns 400 when no valid fields provided', async () => {
      const response = await request(app)
        .patch('/v2/messages/1')
        .set(asUser)
        .send({ invalid: 'field' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /v2/messages/:id', () => {
    it('owner can delete own message', async () => {
      (mockMessage.findUnique as jest.Mock).mockResolvedValueOnce({ authorId: 1 });
      (mockMessage.delete as jest.Mock).mockResolvedValueOnce({ id: 1 });

      const response = await request(app).delete('/v2/messages/1').set(asUser);

      expect(response.status).toBe(200);
    });

    it('non-owner non-admin gets 403', async () => {
      (mockMessage.findUnique as jest.Mock).mockResolvedValueOnce({ authorId: 1 });

      const response = await request(app).delete('/v2/messages/1').set(asOtherUser);

      expect(response.status).toBe(403);
    });

    it('admin can delete any message', async () => {
      (mockMessage.findUnique as jest.Mock).mockResolvedValueOnce({ authorId: 1 });
      (mockMessage.delete as jest.Mock).mockResolvedValueOnce({ id: 1 });

      const response = await request(app).delete('/v2/messages/1').set(asAdmin);

      expect(response.status).toBe(200);
    });

    it('returns 404 for non-existent message', async () => {
      (mockMessage.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app).delete('/v2/messages/999').set(asUser);

      expect(response.status).toBe(404);
    });

    it('returns 401 without a token', async () => {
      const response = await request(app).delete('/v2/messages/1');

      expect(response.status).toBe(401);
    });
  });
});
