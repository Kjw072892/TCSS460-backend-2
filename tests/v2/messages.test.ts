import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/prisma';

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('v2 Messages Routes', () => {
  describe('GET /v2/messages', () => {
    it('returns paginated messages with defaults', async () => {
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
        '/v2/messages?page=2&limit=10&sort=createdAt&order=desc'
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
        })
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
    it('returns a message by id', async () => {
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
    it('creates a message and returns 201', async () => {
      (mockMessage.create as jest.Mock).mockResolvedValueOnce({
        id: 1,
        content: 'New message',
        author: { id: 1, username: 'jchen' },
      });

      const response = await request(app)
        .post('/v2/messages')
        .send({ content: 'New message', authorId: 1 });

      expect(response.status).toBe(201);
    });

    it('returns 400 for missing content', async () => {
      const response = await request(app).post('/v2/messages').send({ authorId: 1 });

      expect(response.status).toBe(400);
    });

    it('returns 400 for non-existent author (P2003)', async () => {
      const { Prisma } = jest.requireActual('../../src/generated/prisma/client');
      const error = new Prisma.PrismaClientKnownRequestError('FK violation', {
        code: 'P2003',
        clientVersion: '7.0.0',
      });
      (mockMessage.create as jest.Mock).mockRejectedValueOnce(error);

      const response = await request(app)
        .post('/v2/messages')
        .send({ content: 'Hello', authorId: 999 });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /v2/messages/:id', () => {
    it('updates a message', async () => {
      (mockMessage.update as jest.Mock).mockResolvedValueOnce({
        id: 1,
        content: 'Updated',
        author: { id: 1, username: 'jchen' },
      });

      const response = await request(app)
        .put('/v2/messages/1')
        .send({ content: 'Updated', authorId: 1 });

      expect(response.status).toBe(200);
    });

    it('returns 404 for non-existent message (P2025)', async () => {
      const { Prisma } = jest.requireActual('../../src/generated/prisma/client');
      const error = new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '7.0.0',
      });
      (mockMessage.update as jest.Mock).mockRejectedValueOnce(error);

      const response = await request(app)
        .put('/v2/messages/999')
        .send({ content: 'Updated', authorId: 1 });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /v2/messages/:id', () => {
    it('partially updates a message', async () => {
      (mockMessage.update as jest.Mock).mockResolvedValueOnce({
        id: 1,
        content: 'Hello',
        read: true,
        author: { id: 1, username: 'jchen' },
      });

      const response = await request(app).patch('/v2/messages/1').send({ read: true });

      expect(response.status).toBe(200);
    });

    it('returns 400 when no valid fields provided', async () => {
      const response = await request(app).patch('/v2/messages/1').send({ invalid: 'field' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /v2/messages/:id', () => {
    it('deletes a message', async () => {
      (mockMessage.delete as jest.Mock).mockResolvedValueOnce({ id: 1 });

      const response = await request(app).delete('/v2/messages/1');

      expect(response.status).toBe(200);
    });

    it('returns 404 for non-existent message (P2025)', async () => {
      const { Prisma } = jest.requireActual('../../src/generated/prisma/client');
      const error = new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '7.0.0',
      });
      (mockMessage.delete as jest.Mock).mockRejectedValueOnce(error);

      const response = await request(app).delete('/v2/messages/999');

      expect(response.status).toBe(404);
    });
  });
});
