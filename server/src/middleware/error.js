export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, res, next) {
  next(new HttpError(404, `Not found: ${req.method} ${req.path}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = { error: err.message || 'Internal error' };
  if (err.details) payload.details = err.details;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json(payload);
}
