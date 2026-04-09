import { Router } from 'express';
import { usersRouter } from '@/routes/v2/users';
import { messagesRouter } from '@/routes/v2/messages';

const v2Routes = Router();

v2Routes.use('/users', usersRouter);
v2Routes.use('/messages', messagesRouter);

export { v2Routes };
