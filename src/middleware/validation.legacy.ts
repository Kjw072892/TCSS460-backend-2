import { Request, Response, NextFunction } from 'express';

/**
 * Validates that :id route parameter is a positive integer.
 */
export const validateNumericId = (request: Request, response: Response, next: NextFunction) => {
  const id = Number(request.params.id);

  if (!Number.isInteger(id) || id < 1) {
    response.status(400).json({ error: 'id must be a positive integer' });
    return;
  }

  next();
};

/**
 * Validates required fields for creating/updating a message (POST/PUT).
 * Requires: content (string), authorId (positive integer).
 */
export const validateMessageBody = (request: Request, response: Response, next: NextFunction) => {
  const errors: string[] = [];

  if (typeof request.body.content !== 'string' || request.body.content.trim().length === 0) {
    errors.push('content is required and must be a non-empty string');
  }

  if (!Number.isInteger(request.body.authorId) || request.body.authorId < 1) {
    errors.push('authorId is required and must be a positive integer');
  }

  if (errors.length > 0) {
    response.status(400).json({ error: 'Validation failed', details: errors });
    return;
  }

  next();
};

/**
 * Validates that a PATCH request has at least one valid field to update.
 * Valid fields: content, subject, read.
 */
export const validatePatchMessageBody = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const validFields = ['content', 'subject', 'read'];
  const providedFields = Object.keys(request.body).filter((key) => validFields.includes(key));

  if (providedFields.length === 0) {
    response.status(400).json({
      error: 'At least one field is required',
      details: `Valid fields: ${validFields.join(', ')}`,
    });
    return;
  }

  if (request.body.content !== undefined) {
    if (typeof request.body.content !== 'string' || request.body.content.trim().length === 0) {
      response.status(400).json({ error: 'content must be a non-empty string' });
      return;
    }
  }

  if (request.body.read !== undefined) {
    if (typeof request.body.read !== 'boolean') {
      response.status(400).json({ error: 'read must be a boolean' });
      return;
    }
  }

  next();
};

/**
 * Validates required fields for creating a user (POST).
 * Requires: username, email, firstName, lastName.
 */
export const validateUserBody = (request: Request, response: Response, next: NextFunction) => {
  const requiredFields = ['username', 'email', 'firstName', 'lastName'];
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (typeof request.body[field] !== 'string' || request.body[field].trim().length === 0) {
      errors.push(`${field} is required and must be a non-empty string`);
    }
  }

  if (errors.length > 0) {
    response.status(400).json({ error: 'Validation failed', details: errors });
    return;
  }

  next();
};
