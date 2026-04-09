import { Request, Response } from 'express';
import { prisma } from '@/prisma';
import { Prisma } from '@/generated/prisma/client';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export const getUsers = async (request: Request, response: Response) => {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(request.query.limit) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      prisma.user.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    response.json({
      data: users,
      pagination: { page, limit, total, totalPages },
    });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to retrieve users' });
  }
};

export const getUserById = async (request: Request, response: Response) => {
  const id = Number(request.params.id);

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            subject: true,
            read: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      response.status(404).json({ error: 'User not found' });
      return;
    }

    response.json({ data: user });
  } catch (_error) {
    response.status(500).json({ error: 'Failed to retrieve user' });
  }
};

export const createUser = async (request: Request, response: Response) => {
  const { username, email, firstName, lastName } = request.body;

  try {
    const user = await prisma.user.create({
      data: { username, email, firstName, lastName },
    });

    response.status(201).json({ data: user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        response.status(409).json({ error: 'A user with this username or email already exists' });
        return;
      }
    }
    response.status(500).json({ error: 'Failed to create user' });
  }
};
