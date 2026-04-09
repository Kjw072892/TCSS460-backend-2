import { Router } from 'express';
import { usersRouter } from '@/routes/v1/users';
import { messagesRouter } from '@/routes/v1/messages';

const v1Routes = Router();

v1Routes.use('/users', usersRouter);
v1Routes.use('/messages', messagesRouter);

export { v1Routes };
