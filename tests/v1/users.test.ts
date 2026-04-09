import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/pool';

jest.mock('../../src/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

beforeEach(() => {
  mockQuery.mockReset();
});

describe('v1 Users Routes', () => {
  describe('GET /v1/users', () => {
    it('returns paginated users', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 1, username: 'jchen', email: 'jchen@example.com' }],
        })
        .mockResolvedValueOnce({ rows: [{ count: 1 }] });

      const response = await request(app).get('/v1/users');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /v1/users/:id', () => {
    it('returns user with messages', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 1, username: 'jchen' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, content: 'Hello' }],
        });

      const response = await request(app).get('/v1/users/1');

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe('jchen');
      expect(response.body.data.messages).toHaveLength(1);
    });

    it('returns 404 for non-existent user', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 0, rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app).get('/v1/users/999');

      expect(response.status).toBe(404);
    });

    it('returns 400 for non-numeric id', async () => {
      const response = await request(app).get('/v1/users/abc');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /v1/users', () => {
    it('creates a user and returns 201', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'newuser', email: 'new@example.com' }],
      });

      const response = await request(app).post('/v1/users').send({
        username: 'newuser',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      });

      expect(response.status).toBe(201);
    });

    it('returns 400 for missing required fields', async () => {
      const response = await request(app).post('/v1/users').send({ username: 'partial' });

      expect(response.status).toBe(400);
    });

    it('returns 409 for duplicate username/email', async () => {
      const error = new Error('Unique violation') as Error & { code: string };
      error.code = '23505';
      mockQuery.mockRejectedValueOnce(error);

      const response = await request(app).post('/v1/users').send({
        username: 'jchen',
        email: 'jchen@example.com',
        firstName: 'Jessica',
        lastName: 'Chen',
      });

      expect(response.status).toBe(409);
    });
  });
});
