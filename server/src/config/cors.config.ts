import type { CorsOptions } from 'cors';
import { env } from './env.config';

const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

/**
 * Hosts on a private network, plus loopback and mDNS names.
 *
 * ⚠️ RFC 1918 ranges only — `10/8`, `172.16/12` and `192.168/16` — plus
 * `127.0.0.0/8`, `169.254/16` (APIPA), IPv6 loopback, IPv6 ULA and
 * link-local, and `*.local`.
 *
 * Note `172\.(1[6-9]|2\d|3[01])`: the private block is 172.16–172.31, so a
 * lazier `172\.\d+` would also match 172.15 and 172.32, which are public
 * addresses on the internet.
 *
 * ⚠️ IPv6 matters here more than it looks. A dual-stack Wi-Fi hands out
 * addresses in `fc00::/7` (unique local) and `fe80::/10` (link-local), and a
 * browser reaching the dev server over IPv6 sends an origin like
 * `http://[fe80::1ff:fe23:4567:890a]:3000`. Without these the LAN would work
 * over IPv4 and mysteriously fail over IPv6 on the same network.
 */
const PRIVATE_IPV4 =
  /^(?:127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2})$/;

const PRIVATE_HOST = /^(?:localhost|[A-Za-z0-9-]+\.local)$/;

/**
 * IPv6 loopback, unique-local (`fc00::/7`) and link-local (`fe80::/10`).
 *
 * ⚠️ `URL.hostname` keeps the square brackets for an IPv6 authority, so they
 * are stripped before matching. The first hextet decides the range: `fc` or
 * `fd` is ULA, and `fe8`–`feb` is link-local.
 */
const PRIVATE_IPV6 = /^(?:::1|[fF][cCdD][0-9a-fA-F]{0,2}:|[fF][eE][89abAB][0-9a-fA-F]?:)/;

/**
 * Is this a browser origin on the developer's own network?
 *
 * ⚠️ Parsed with `URL`, never matched against the raw origin string. A regex
 * run over `http://192.168.1.5.evil.com` would find `192.168.1.5` inside it and
 * pass; reading `url.hostname` cannot be fooled that way, because the host is
 * whatever the browser actually resolved.
 */
export function isPrivateNetworkOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  // http/https only — no `file:`, no custom schemes.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const host = url.hostname;
  if (PRIVATE_HOST.test(host)) return true;
  if (PRIVATE_IPV4.test(host)) return true;
  // Strip the brackets an IPv6 authority carries before range-matching.
  const v6 = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  return v6.includes(':') && PRIVATE_IPV6.test(v6);
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server requests (no Origin header)
    if (origin === undefined) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    /**
     * ⚠️ LAN HOSTING, DEVELOPMENT ONLY.
     *
     * Testing the responsive layouts on a real phone means loading the app
     * from `http://192.168.1.x:3000`, and the API then sees an Origin that is
     * not in `ALLOWED_ORIGINS` — which cannot list it, because the address
     * changes with the network. So private-network origins are accepted, but
     * ONLY outside production.
     *
     * The `NODE_ENV` guard is the whole safety property and must not be
     * softened into "unless ALLOWED_ORIGINS is set" or similar. In production
     * the allowlist above is the only way in, full stop — a deployed API that
     * trusts any RFC 1918 origin is trivially reachable from anything sharing
     * a VPC or a corporate network with it.
     */
    if (env.NODE_ENV !== 'production' && isPrivateNetworkOrigin(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS: Origin '${origin}' is not permitted.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400, // 24-hour preflight cache
};
