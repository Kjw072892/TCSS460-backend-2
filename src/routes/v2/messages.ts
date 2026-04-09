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

const messagesRouter = Router();

messagesRouter.get('/', getMessages);
messagesRouter.get('/:id', validateNumericId, getMessageById);
messagesRouter.post('/', validateMessageBody, createMessage);
messagesRouter.put('/:id', validateNumericId, validateMessageBody, updateMessage);
messagesRouter.patch('/:id', validateNumericId, validatePatchMessageBody, patchMessage);
messagesRouter.delete('/:id', validateNumericId, deleteMessage);

export { messagesRouter };
