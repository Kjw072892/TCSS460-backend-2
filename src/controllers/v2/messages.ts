import { Request, Response } from 'express';
import { prisma } from '@/prisma';
import { Prisma } from '@/generated/prisma/client';

const ALLOWED_SORT_FIELDS = ['id', 'content', 'createdAt', 'read'];
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export const getMessages = async (request: Request, response: Response) => {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(request.query.limit) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const sort = ALLOWED_SORT_FIELDS.includes(String(request.query.sort))
    ? String(request.query.sort)
    : 'id';
  const order = request.query.order === 'desc' ? 'desc' : 'asc';

  const { authorId, read } = request.query;

  const where = {
    ...(authorId ? { authorId: Number(authorId) } : {}),
    ...(read !== undefined ? { read: read === 'true' } : {}),
  };

  try {
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where, // look to see where we have our authorId
        skip, // our pagination 
        take: limit, // more pagination
        orderBy: { [sort]: order }, // ordering the data
        include: { author: { select: { id: true, username: true } } },
      }),
      prisma.message.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    response.json({
      data: messages,
      pagination: { page, limit, total, totalPages },
    });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to retrieve messages' });
  }
};

export const getMessageById = async (request: Request, response: Response) => {
  const id = Number(request.params.id);

  try {
    const message = await prisma.message.findUnique({
      where: { id },
      include: { author: { select: { id: true, username: true } } },
    });

    if (!message) {
      response.status(404).json({ error: 'Message not found' });
      return;
    }

    response.json({ data: message });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to retrieve message' });
  }
};

export const createMessage = async (request: Request, response: Response) => {
  const { content, subject } = request.body;
  const authorId = request.user!.sub;

  try {
    const message = await prisma.message.create({
      data: { content, subject: subject || null, authorId },
      include: { author: { select: { id: true, username: true } } },
    });

    response.status(201).json({ data: message });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
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
    const existing = await prisma.message.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      response.status(404).json({ error: 'Message not found' });
      return;
    }
    if (existing.authorId !== authorId) {
      response.status(403).json({ error: 'You can only update your own messages' });
      return;
    }

    const message = await prisma.message.update({
      where: { id },
      data: { content, subject: subject || null },
      include: { author: { select: { id: true, username: true } } },
    });

    response.json({ data: message });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to update message' });
  }
};

export const patchMessage = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  const { content, subject, read } = request.body;
  const authorId = request.user!.sub;

  try {
    const existing = await prisma.message.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      response.status(404).json({ error: 'Message not found' });
      return;
    }
    if (existing.authorId !== authorId) {
      response.status(403).json({ error: 'You can only update your own messages' });
      return;
    }

    const data: Record<string, unknown> = {};
    if (content !== undefined) data.content = content;
    if (subject !== undefined) data.subject = subject;
    if (read !== undefined) data.read = read;

    const message = await prisma.message.update({
      where: { id },
      data,
      include: { author: { select: { id: true, username: true } } },
    });

    response.json({ data: message });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to update message' });
  }
};

export const deleteMessage = async (request: Request, response: Response) => {
  const id = Number(request.params.id);
  const { sub: authorId, role } = request.user!;

  try {
    const existing = await prisma.message.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!existing) {
      response.status(404).json({ error: 'Message not found' });
      return;
    }
    if (role !== 'admin' && existing.authorId !== authorId) {
      response.status(403).json({ error: 'You can only delete your own messages' });
      return;
    }

    await prisma.message.delete({ where: { id } });

    response.json({ data: { message: 'Message deleted successfully' } });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to delete message' });
  }
};
