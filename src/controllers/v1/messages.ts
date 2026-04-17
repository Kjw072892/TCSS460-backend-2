import { Request, Response } from 'express';
import { pool } from '@/pool';

export const getMessages = async (request: Request, response: Response) => {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
  const offset = (page - 1) * limit;

  const { authorId } = request.query;
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let paramIndex = 1;

  if (authorId) {
    conditions.push(`m.author_id = $${paramIndex++}`);
    params.push(Number(authorId));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const dataQuery = `
      SELECT m.id, m.content, m.subject, m.read, m.author_id AS "authorId",
             m.created_at AS "createdAt", m.updated_at AS "updatedAt",
             u.username AS "authorUsername"
      FROM messages m
      JOIN users u ON m.author_id = u.id
      ${whereClause}
      ORDER BY m.id ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    const countQuery = `SELECT COUNT(*)::int AS count FROM messages m ${whereClause}`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, [...params, limit, offset]),
      pool.query(countQuery, params),
    ]);

    const total = countResult.rows[0].count;
    const totalPages = Math.ceil(total / limit);

    response.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages },
    });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to retrieve messages' });
  }
};

export const getMessageById = async (request: Request, response: Response) => {
  const id = Number(request.params.id);

  try {
    const query = `
      SELECT m.id, m.content, m.subject, m.read, m.author_id AS "authorId",
             m.created_at AS "createdAt", m.updated_at AS "updatedAt",
             u.id AS "authorId", u.username AS "authorUsername"
      FROM messages m
      JOIN users u ON m.author_id = u.id
      WHERE m.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      response.status(404).json({ error: 'Message not found' });
      return;
    }

    response.json({ data: result.rows[0] });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to retrieve message' });
  }
};

export const createMessage = async (request: Request, response: Response) => {
  const { content, subject } = request.body;
  const authorId = request.user!.sub;

  try {
    const query = `
      INSERT INTO messages (content, subject, author_id, updated_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING id, content, subject, read, author_id AS "authorId",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const result = await pool.query(query, [content, subject || null, authorId]);

    response.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const pgError = error as { code: string };
      if (pgError.code === '23503') {
        response.status(400).json({ error: 'Author not found' });
        return;
      }
    }
    response.status(500).json({ error: 'Failed to create message' });
  }
};

export const updateMessage = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  const { content, subject } = request.body;
  const authorId = request.user!.sub;

  try {
    const existing = await pool.query(
      `SELECT author_id AS "authorId" FROM messages WHERE id = $1`,
      [id],
    );
    if (existing.rowCount === 0) {
      response.status(404).json({ error: 'Message not found' });
      return;
    }
    if (existing.rows[0].authorId !== authorId) {
      response.status(403).json({ error: 'You can only update your own messages' });
      return;
    }

    const query = `
      UPDATE messages
      SET content = $1, subject = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, content, subject, read, author_id AS "authorId",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const result = await pool.query(query, [content, subject || null, id]);

    response.json({ data: result.rows[0] });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to update message' });
  }
};

export const patchMessage = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  const authorId = request.user!.sub;

  try {
    const existing = await pool.query(
      `SELECT author_id AS "authorId" FROM messages WHERE id = $1`,
      [id],
    );
    if (existing.rowCount === 0) {
      response.status(404).json({ error: 'Message not found' });
      return;
    }
    if (existing.rows[0].authorId !== authorId) {
      response.status(403).json({ error: 'You can only update your own messages' });
      return;
    }

    const validFields = ['content', 'subject', 'read'];
    const updates: string[] = [];
    const params: (string | boolean | number)[] = [];
    let paramIndex = 1;

    for (const field of validFields) {
      if (request.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(request.body[field]);
      }
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const query = `
      UPDATE messages
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, content, subject, read, author_id AS "authorId",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const result = await pool.query(query, params);

    response.json({ data: result.rows[0] });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to update message' });
  }
};

export const deleteMessage = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  const { sub: authorId, role } = request.user!;

  try {
    const existing = await pool.query(
      `SELECT author_id AS "authorId" FROM messages WHERE id = $1`,
      [id],
    );
    if (existing.rowCount === 0) {
      response.status(404).json({ error: 'Message not found' });
      return;
    }
    if (role !== 'admin' && existing.rows[0].authorId !== authorId) {
      response.status(403).json({ error: 'You can only delete your own messages' });
      return;
    }

    await pool.query(`DELETE FROM messages WHERE id = $1`, [id]);

    response.json({ data: { message: 'Message deleted successfully' } });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to delete message' });
  }
};
