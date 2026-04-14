import { RequestHandler } from 'express';
import { z } from 'zod';

/**
 * Request validation middleware.
 *
 * Schemas act as a single source of truth: they validate at runtime and
 * produce TypeScript types via z.infer, so the runtime check and compile-time
 * type cannot drift apart. See validation.legacy.ts for the hand-rolled
 * equivalent kept for comparison.
 */

// --- Schemas ---

const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const MessageBodySchema = z.object({
  content: z.string().trim().min(1),
  authorId: z.number().int().positive(),
});

const PatchMessageBodySchema = z
  .object({
    content: z.string().trim().min(1).optional(),
    subject: z.string().optional(),
    read: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required (content, subject, read)',
  });

const UserBodySchema = z.object({
  username: z.string().trim().min(1),
  email: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

/**
 * Generic middleware factory. Parses `request[source]` against `schema`;
 * on failure responds 400 with issue details, on success replaces the
 * source with the parsed (and coerced) value so downstream handlers get
 * properly typed data.
 */
const validate =
  (source: 'body' | 'params', schema: z.ZodType): RequestHandler =>
  (request, response, next) => {
    const result = schema.safeParse(request[source]);
    if (!result.success) {
      response.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }
    request[source] = result.data;
    next();
  };

// --- Middleware ---

export const validateNumericId = validate('params', IdParamSchema);
export const validateMessageBody = validate('body', MessageBodySchema);
export const validatePatchMessageBody = validate('body', PatchMessageBodySchema);
export const validateUserBody = validate('body', UserBodySchema);

// --- Types inferred from schemas (no hand-written interfaces needed) ---

export type MessageBody = z.infer<typeof MessageBodySchema>;
export type PatchMessageBody = z.infer<typeof PatchMessageBodySchema>;
export type UserBody = z.infer<typeof UserBodySchema>;
