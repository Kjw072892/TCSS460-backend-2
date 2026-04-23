import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import YAML from 'yaml';
import type { RequestHandler } from 'express';
import { routes } from '@/routes';
import { logger } from '@/middleware/logger';

const app = express();
const importEsm = new Function('specifier', 'return import(specifier);') as (
  specifier: string
) => Promise<{ apiReference: (config: { url: string }) => RequestHandler }>;
let apiDocsHandler: RequestHandler | undefined;

// Application-level middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// OpenAPI documentation
const specFile = fs.readFileSync('./openapi.yaml', 'utf8');
const spec = YAML.parse(specFile);
app.get('/openapi.json', (_request: Request, response: Response) => {
  response.json(spec);
});
app.use('/api-docs', async (request, response, next) => {
  try {
    if (!apiDocsHandler) {
      const { apiReference } = await importEsm('@scalar/express-api-reference');
      apiDocsHandler = apiReference({ url: '/openapi.json' });
    }

    const handler = apiDocsHandler;
    handler(request, response, next);
  } catch (error) {
    next(error);
  }
});

// Routes
app.use(routes);

// 404 handler — must be after all routes
app.use((_request: Request, response: Response) => {
  response.status(404).json({ error: 'Route not found' });
});

export { app };
