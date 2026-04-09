import { Request, Response, NextFunction } from 'express';

/**
 * Verifies a JWT from the Authorization header.
 * NOT currently wired to any routes — prepared for Week 5.
 */
export const verifyToken = (request: Request, response: Response, next: NextFunction) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    response.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const _token = authHeader.split(' ')[1];

  // TODO: Week 5 — verify token with jsonwebtoken
  // const decoded = jwt.verify(token, process.env.JWT_SECRET!);
  // request.claims = decoded;
  next();
};

/**
 * Generates a JWT for a given user ID.
 * NOT currently used — prepared for Week 5.
 */
export const generateToken = (_userId: number): string => {
  // TODO: Week 5 — generate token with jsonwebtoken
  // return jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  return 'placeholder-token';
};
