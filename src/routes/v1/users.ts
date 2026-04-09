import { Router } from 'express';
import { getUsers, getUserById, createUser } from '@/controllers/v1/users';
import { validateNumericId, validateUserBody } from '@/middleware/validation';

const usersRouter = Router();

usersRouter.get('/', getUsers);
usersRouter.get('/:id', validateNumericId, getUserById);
usersRouter.post('/', validateUserBody, createUser);

export { usersRouter };
