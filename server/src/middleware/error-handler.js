export function errorHandler(err, _req, res, _next) {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';

  // логирую только серверные ошибки (5xx)
  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({ error: message });
}