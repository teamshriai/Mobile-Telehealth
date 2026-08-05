import morgan from 'morgan';
import { env } from '../config/env.config';

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Request Logger (Morgan)
//
// SECURITY: Morgan's built-in tokens never log request headers or cookies.
// The Authorization header and Set-Cookie are NOT captured by any token below.
//
// Production format: machine-parseable, no User-Agent (can leak sensitive info)
// Development format: 'dev' — colorized, concise
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCTION_FORMAT =
  ':remote-addr :method :url :status :res[content-length] - :response-time ms';

export const httpLogger = morgan(env.NODE_ENV === 'production' ? PRODUCTION_FORMAT : 'dev', {
  skip: (_req, res) => {
    // In production, skip logging successful health checks (reduce noise)
    if (env.NODE_ENV === 'production' && res.statusCode === 200) {
      return false;
    }
    return false;
  },
  stream: {
    write: (message: string): void => {
      process.stdout.write(message.trimEnd() + '\n');
    },
  },
});
