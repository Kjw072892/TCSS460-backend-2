import { Router } from 'express';
import { usersRouter } from '@/routes/v2/users';
import { messagesRouter } from '@/routes/v2/messages';
import { sayingRouter } from '@/routes/v2/sayings';

const v2Routes = Router();

v2Routes.use('/users', usersRouter);
v2Routes.use('/messages', messagesRouter);
v2Routes.use('/sayings', sayingRouter);

export { v2Routes };
