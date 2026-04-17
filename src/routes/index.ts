import { Router } from 'express';
import { v1Routes } from '@/routes/v1';
import { v2Routes } from '@/routes/v2';
import { devAuthRouter } from '@/routes/devAuth';

const routes = Router();

routes.use('/auth', devAuthRouter);
routes.use('/v1', v1Routes);
routes.use('/v2', v2Routes);

export { routes };
