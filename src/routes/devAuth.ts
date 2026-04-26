import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/prisma';

const router = Router();

/**
 * POST /auth/dev-login
 *
 * TEMPORARY — Sprint 2 demo. Accepts a username, find-or-creates a user row
 * with role='user', and returns a signed JWT. This endpoint does NOT validate
 * a password. It is a local-development stand-in for the real Auth-Squared
 * integration coming in Sprint 3.
 *
 * DO NOT deploy this router to a public URL.
 */
router.post('/dev-login', async (request: Request, response: Response): Promise<void> => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    response.status(500).json({ error: 'JWT_SECRET is not configured' });
    return;
  }

  const { username, email } = request.body as { username?: string; email?: string };
  if (!username || typeof username !== 'string') {
    response.status(400).json({ error: 'username is required' });
    return;
  }

  const user = await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      email: email ?? `${username}@dev.local`,
      firstName: username,
      lastName: 'Dev',
      role: 'user',
    },
  });

  const token = jwt.sign(
  //The body
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    //The secret key
    secret,
    { expiresIn: '24h' }
  );

  response.json({ token });
});

export { router as devAuthRouter };
