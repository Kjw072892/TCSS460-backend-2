import { Router } from 'express';
import { createSaying, getContents, updateSaying, patchSaying, deleteSaying, getSayingById } from '@/controllers/v2/sayings'

import { validateSayingBody, validateNumericId, validatePatchSayingBody} from '@/middleware/validation';
import { requireAuth } from '@/middleware/requireAuth';


const sayingRouter = Router();

sayingRouter.get('/', getContents);
sayingRouter.get('/:id', validateNumericId, getSayingById)
sayingRouter.post('/', requireAuth, validateSayingBody, createSaying);
sayingRouter.put('/:id', requireAuth, validateNumericId, validateSayingBody, updateSaying);

sayingRouter.patch('/:id',
    requireAuth,
    validateNumericId,
    validatePatchSayingBody,
    patchSaying
);

sayingRouter.delete('/:id', requireAuth, validateNumericId, deleteSaying

);

export {sayingRouter};