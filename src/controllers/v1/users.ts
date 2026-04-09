import { Request, Response } from 'express';
import { pool } from '@/pool';

export const getUsers = async (request: Request, response: Response) => {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 25));
  const offset = (page - 1) * limit;

  try {
    const dataQuery = `
      SELECT id, username, email, first_name AS "firstName", last_name AS "lastName",
             active, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM users
      ORDER BY id ASC
      LIMIT $1 OFFSET $2
    `;
    const countQuery = `SELECT COUNT(*)::int AS count FROM users`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, [limit, offset]),
      pool.query(countQuery),
    ]);

    const total = countResult.rows[0].count;
    const totalPages = Math.ceil(total / limit);

    response.json({
      data: dataResult.rows,
      pagination: { page, limit, total, totalPages },
    });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to retrieve users' });
  }
};

export const getUserById = async (request: Request, response: Response) => {
  const id = Number(request.params.id);

  try {
    const userQuery = `
      SELECT id, username, email, first_name AS "firstName", last_name AS "lastName",
             active, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM users
      WHERE id = $1
    `;
    const messagesQuery = `
      SELECT id, content, subject, read, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM messages
      WHERE author_id = $1
      ORDER BY created_at DESC
    `;

    const [userResult, messagesResult] = await Promise.all([
      pool.query(userQuery, [id]),
      pool.query(messagesQuery, [id]),
    ]);

    if (userResult.rowCount === 0) {
      response.status(404).json({ error: 'User not found' });
      return;
    }

    response.json({
      data: {
        ...userResult.rows[0],
        messages: messagesResult.rows,
      },
    });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to retrieve user' });
  }
};

export const createUser = async (request: Request, response: Response) => {
  const { username, email, firstName, lastName } = request.body;

  try {
    const query = `
      INSERT INTO users (username, email, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, email, first_name AS "firstName", last_name AS "lastName",
                active, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const result = await pool.query(query, [username, email, firstName, lastName]);

    response.status(201).json({ data: result.rows[0] });
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const pgError = error as { code: string };
      if (pgError.code === '23505') {
        response.status(409).json({ error: 'A user with this username or email already exists' });
        return;
      }
    }
    response.status(500).json({ error: 'Failed to create user' });
  }
};
