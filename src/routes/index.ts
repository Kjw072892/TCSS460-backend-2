import { Router } from 'express';
import { v1Routes } from '@/routes/v1';
import { v2Routes } from '@/routes/v2';

const routes = Router();

routes.use('/v1', v1Routes);
routes.use('/v2', v2Routes);

export { routes };
