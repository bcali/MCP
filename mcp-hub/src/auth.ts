import type { NextFunction, Request, Response } from 'express';

export function apiKeyAuth(expectedKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const headerKey =
      (typeof req.headers['x-mcp-hub-key'] === 'string' ? req.headers['x-mcp-hub-key'] : undefined) ??
      (typeof req.headers['authorization'] === 'string'
        ? req.headers['authorization'].replace(/^Bearer\s+/i, '').trim()
        : undefined);

    const queryKey = typeof req.query.key === 'string' ? req.query.key : undefined;
    const key = headerKey ?? queryKey;

    if (!key || key !== expectedKey) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  };
}


