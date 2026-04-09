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

describe('v1 Messages Routes', () => {
  describe('GET /v1/messages', () => {
    it('returns paginated messages with defaults', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              content: 'Hello',
              subject: null,
              read: false,
              authorId: 1,
              authorUsername: 'jchen',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ count: 1 }] });

      const response = await request(app).get('/v1/messages');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1,
      });
    });

    it('respects page and limit query params', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 50 }] });

      const response = await request(app).get('/v1/messages?page=3&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(3);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('clamps limit to max 100', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: 0 }] });

      const response = await request(app).get('/v1/messages?limit=999');

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(100);
    });
  });

  describe('GET /v1/messages/:id', () => {
    it('returns a message by id', async () => {
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, content: 'Hello', authorUsername: 'jchen' }],
      });

      const response = await request(app).get('/v1/messages/1');

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(1);
    });

    it('returns 404 for non-existent message', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const response = await request(app).get('/v1/messages/999');

      expect(response.status).toBe(404);
    });

    it('returns 400 for non-numeric id', async () => {
      const response = await request(app).get('/v1/messages/abc');

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/id/i);
    });
  });

  describe('POST /v1/messages', () => {
    it('creates a message and returns 201', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, content: 'New message', subject: null, read: false, authorId: 1 }],
      });

      const response = await request(app)
        .post('/v1/messages')
        .send({ content: 'New message', authorId: 1 });

      expect(response.status).toBe(201);
      expect(response.body.data.content).toBe('New message');
    });

    it('returns 400 for missing content', async () => {
      const response = await request(app).post('/v1/messages').send({ authorId: 1 });

      expect(response.status).toBe(400);
    });

    it('returns 400 for missing authorId', async () => {
      const response = await request(app).post('/v1/messages').send({ content: 'Hello' });

      expect(response.status).toBe(400);
    });

    it('returns 400 for non-existent author (FK violation)', async () => {
      const error = new Error('FK violation') as Error & { code: string };
      error.code = '23503';
      mockQuery.mockRejectedValueOnce(error);

      const response = await request(app)
        .post('/v1/messages')
        .send({ content: 'Hello', authorId: 999 });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/author/i);
    });
  });

  describe('PUT /v1/messages/:id', () => {
    it('updates a message', async () => {
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, content: 'Updated', subject: null, read: false, authorId: 1 }],
      });

      const response = await request(app)
        .put('/v1/messages/1')
        .send({ content: 'Updated', authorId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data.content).toBe('Updated');
    });

    it('returns 404 for non-existent message', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const response = await request(app)
        .put('/v1/messages/999')
        .send({ content: 'Updated', authorId: 1 });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /v1/messages/:id', () => {
    it('partially updates a message', async () => {
      mockQuery.mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, content: 'Hello', subject: null, read: true, authorId: 1 }],
      });

      const response = await request(app).patch('/v1/messages/1').send({ read: true });

      expect(response.status).toBe(200);
    });

    it('returns 400 when no valid fields provided', async () => {
      const response = await request(app).patch('/v1/messages/1').send({ invalid: 'field' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /v1/messages/:id', () => {
    it('deletes a message', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

      const response = await request(app).delete('/v1/messages/1');

      expect(response.status).toBe(200);
    });

    it('returns 404 for non-existent message', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const response = await request(app).delete('/v1/messages/999');

      expect(response.status).toBe(404);
    });
  });
});
