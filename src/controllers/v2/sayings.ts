//  create, update, delete
import { request as _request, Request, Response } from 'express';
import { prisma } from '@/prisma';
import { Prisma as _Prisma } from '@/generated/prisma/client';

const ALLOWED_SORT_FIELDS = ['id', 'content'];
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * findMany
 *
 * Added sayings to the class.ts file using the same structure as users and messages.
 */
export const getContents = async (request: Request, response: Response) => {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(request.query.limit) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const sort = ALLOWED_SORT_FIELDS.includes(String(request.query.sort))
    ? String(request.query.sort)
    : 'id';

  const order = request.query.order === 'desc' ? 'desc' : 'asc';

  const { authorId } = request.query;

  const where = {
    ...(authorId ? { authorId: Number(authorId) } : {}),
  };

  try {
    const [content, total] = await Promise.all([
      prisma.saying.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: { content: { select: { id: true } } },
      }),
      prisma.saying.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    response.json({
      data: content,
      pagination: { page, limit, total, totalPages },
    });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to retrieve messages' });
  }
};
