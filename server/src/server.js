import app from './app.js';
import config from './config/index.js';
import { healthCheck } from './db/pool.js';

async function bootstrap() {
  try {
    const dbOk = await healthCheck();
    if (!dbOk) console.warn('[startup] DB health check failed, but continuing...');
  } catch (e) {
    console.warn('[startup] DB health check error:', e.message);
  }

  app.listen(config.port, () =>
    console.log(`[server] http://localhost:${config.port} (env=${config.env})`)
  );
}

bootstrap();
