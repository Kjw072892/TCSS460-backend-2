//  delete
import { request as _request, Request, Response } from 'express';
import { prisma } from '@/prisma';
import { Prisma } from '@/generated/prisma/client';

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
        select: {
          id: true, content: true, authorId: true, author: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        },
      }),
      prisma.saying.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    response.json({
      data: content,
      pagination: { page, limit, total, totalPages },
    });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to retrieve sayings' });
  }
};

export const getSayingById = async (request: Request, response: Response) => {
  const id = Number(request.params.id);

  try {
    const saying = await prisma.saying.findUnique({
      where: { id },
      include: { author: { select: { id: true, username: true } } },
    });

    if (!saying) {
      response.status(404).json({ error: 'Saying not found' });
      return;
    }

    response.json({ data: saying });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to retrieve saying' });
  }
};

// Create
export const createSaying = async (request: Request, response: Response) => {
  const { content } = request.body;
  const authorId = request.user!.sub;

  try {
    const saying = await prisma.saying.create({
      data: { content, authorId },
      include: { author: { select: { id: true, username: true } } },

    });
    response.status(201).json({ data: saying });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        response.status(400).json({ error: 'Author not found' });
        return;
      }
    }
    response.status(500).json({ error: 'Failed to create saying' });
  }
};


// Update
export const updateSaying = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  const { content } = request.body;
  const { sub: authorId } = request.user!;

  try {
    const existing = await prisma.saying.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      response.status(404).json({ error: 'Saying not found' });
      return;
    }
    if (existing.authorId !== authorId) {
      response.status(403).json({ error: 'You can only update your own saying' });
      return;
    }

    const saying = await prisma.saying.update({
      where: { id },
      data: { content },
      include: { author: { select: { id: true, username: true } } },
    });

    response.json({ data: saying });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to update saying' });
  }
};

// Patch
export const patchSaying = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  const { content } = request.body;
  const authorId = request.user!.sub;

  try {
    const existing = await prisma.saying.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      response.status(404).json({ error: 'Saying not found' });
      return;
    }

    if (existing.authorId !== authorId) {
      response.status(403).json({ error: 'You can only update your own saying' });
      return;
    }
    const data: Record<string, unknown> = {};
    if (content !== undefined) data.content = content;

    const saying = await prisma.saying.update({
      where: { id },
      data,
      include: { author: { select: { id: true, username: true } } },
    });

    response.json({ data: saying });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to update saying' });
  }
};

// delete
export const deleteSaying = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  const { sub: authorId, role } = request.user!;

  try {
    const existing = await prisma.saying.findUnique({
      where: { id },
      select: { authorId: true },
    });

    if (!existing) {
      response.status(404).json({ error: 'Saying not found' });
      return;
    }
    if (role !== 'admin' && existing.authorId !== authorId) {
      response.status(403).json({ error: 'You can only delete your own saying' });
      return;
    }

    await prisma.saying.delete({ where: { id } });

    response.json({ data: { message: 'Saying deleted successfully' } })

  } catch (_error) {
    response.status(500).json({ error: 'Failed to delete saying' });
  }

}
