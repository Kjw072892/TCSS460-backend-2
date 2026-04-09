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

const mockUser = prisma.user as jest.Mocked<typeof prisma.user>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('v2 Users Routes', () => {
  describe('GET /v2/users', () => {
    it('returns paginated users', async () => {
      (mockUser.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 1, username: 'jchen', email: 'jchen@example.com' },
      ]);
      (mockUser.count as jest.Mock).mockResolvedValueOnce(1);

      const response = await request(app).get('/v2/users');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /v2/users/:id', () => {
    it('returns user with messages', async () => {
      (mockUser.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 1,
        username: 'jchen',
        messages: [{ id: 1, content: 'Hello' }],
      });

      const response = await request(app).get('/v2/users/1');

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe('jchen');
      expect(response.body.data.messages).toHaveLength(1);
    });

    it('returns 404 for non-existent user', async () => {
      (mockUser.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app).get('/v2/users/999');

      expect(response.status).toBe(404);
    });

    it('returns 400 for non-numeric id', async () => {
      const response = await request(app).get('/v2/users/abc');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /v2/users', () => {
    it('creates a user and returns 201', async () => {
      (mockUser.create as jest.Mock).mockResolvedValueOnce({
        id: 1,
        username: 'newuser',
        email: 'new@example.com',
      });

      const response = await request(app).post('/v2/users').send({
        username: 'newuser',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      });

      expect(response.status).toBe(201);
    });

    it('returns 400 for missing required fields', async () => {
      const response = await request(app).post('/v2/users').send({ username: 'partial' });

      expect(response.status).toBe(400);
    });

    it('returns 409 for duplicate username/email (P2002)', async () => {
      const { Prisma } = jest.requireActual('../../src/generated/prisma/client');
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7.0.0',
      });
      (mockUser.create as jest.Mock).mockRejectedValueOnce(error);

      const response = await request(app).post('/v2/users').send({
        username: 'jchen',
        email: 'jchen@example.com',
        firstName: 'Jessica',
        lastName: 'Chen',
      });

      expect(response.status).toBe(409);
    });
  });
});
