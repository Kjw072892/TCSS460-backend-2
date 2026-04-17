import { Router } from 'express';
import {
  getMessages,
  getMessageById,
  createMessage,
  updateMessage,
  patchMessage,
  deleteMessage,
} from '@/controllers/v2/messages';
import {
  validateNumericId,
  validateMessageBody,
  validatePatchMessageBody,
} from '@/middleware/validation';
import { requireAuth } from '@/middleware/requireAuth';

const messagesRouter = Router();

messagesRouter.get('/', getMessages);
messagesRouter.get('/:id', validateNumericId, getMessageById);
messagesRouter.post('/', requireAuth, validateMessageBody, createMessage);
messagesRouter.put('/:id', requireAuth, validateNumericId, validateMessageBody, updateMessage);
messagesRouter.patch(
  '/:id',
  requireAuth,
  validateNumericId,
  validatePatchMessageBody,
  patchMessage,
);
messagesRouter.delete('/:id', requireAuth, validateNumericId, deleteMessage);

export { messagesRouter };
