import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/pool';
import { authHeader } from '../helpers';

jest.mock('../../src/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

const asUser = authHeader({ sub: 1, role: 'user' });
const asOtherUser = authHeader({ sub: 2, role: 'user' });
const asAdmin = authHeader({ sub: 99, role: 'admin' });

beforeEach(() => {
  mockQuery.mockReset();
});

describe('v1 Messages Routes', () => {
  describe('GET /v1/messages', () => {
    it('returns paginated messages with defaults (public)', async () => {
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
    it('returns a message by id (public)', async () => {
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
    it('creates a message for the authenticated user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, content: 'New message', subject: null, read: false, authorId: 1 }],
      });

      const response = await request(app)
        .post('/v1/messages')
        .set(asUser)
        .send({ content: 'New message' });

      expect(response.status).toBe(201);
      expect(response.body.data.authorId).toBe(1);
      // authorId is derived from JWT sub, never from the request body
      const [, params] = mockQuery.mock.calls[0];
      expect(params[2]).toBe(1);
    });

    it('returns 401 without a token', async () => {
      const response = await request(app).post('/v1/messages').send({ content: 'Hello' });

      expect(response.status).toBe(401);
    });

    it('returns 400 for missing content', async () => {
      const response = await request(app).post('/v1/messages').set(asUser).send({});

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /v1/messages/:id', () => {
    it('owner can update', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ authorId: 1 }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 1, content: 'Updated', subject: null, read: false, authorId: 1 }],
        });

      const response = await request(app)
        .put('/v1/messages/1')
        .set(asUser)
        .send({ content: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.content).toBe('Updated');
    });

    it('non-owner gets 403', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ authorId: 1 }] });

      const response = await request(app)
        .put('/v1/messages/1')
        .set(asOtherUser)
        .send({ content: 'Updated' });

      expect(response.status).toBe(403);
    });

    it('returns 404 for non-existent message', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const response = await request(app)
        .put('/v1/messages/999')
        .set(asUser)
        .send({ content: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('returns 401 without a token', async () => {
      const response = await request(app).put('/v1/messages/1').send({ content: 'Updated' });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /v1/messages/:id', () => {
    it('owner can partially update', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ authorId: 1 }] })
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 1, content: 'Hello', subject: null, read: true, authorId: 1 }],
        });

      const response = await request(app).patch('/v1/messages/1').set(asUser).send({ read: true });

      expect(response.status).toBe(200);
    });

    it('non-owner gets 403', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ authorId: 1 }] });

      const response = await request(app)
        .patch('/v1/messages/1')
        .set(asOtherUser)
        .send({ read: true });

      expect(response.status).toBe(403);
    });

    it('returns 400 when no valid fields provided', async () => {
      const response = await request(app)
        .patch('/v1/messages/1')
        .set(asUser)
        .send({ invalid: 'field' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /v1/messages/:id', () => {
    it('owner can delete own message', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ authorId: 1 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

      const response = await request(app).delete('/v1/messages/1').set(asUser);

      expect(response.status).toBe(200);
    });

    it('non-owner non-admin gets 403', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ authorId: 1 }] });

      const response = await request(app).delete('/v1/messages/1').set(asOtherUser);

      expect(response.status).toBe(403);
    });

    it('admin can delete any message', async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ authorId: 1 }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

      const response = await request(app).delete('/v1/messages/1').set(asAdmin);

      expect(response.status).toBe(200);
    });

    it('returns 404 for non-existent message', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const response = await request(app).delete('/v1/messages/999').set(asUser);

      expect(response.status).toBe(404);
    });

    it('returns 401 without a token', async () => {
      const response = await request(app).delete('/v1/messages/1');

      expect(response.status).toBe(401);
    });
  });
});
