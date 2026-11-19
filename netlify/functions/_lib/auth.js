const crypto = require('crypto');

// Same pattern as the FM client hub: a personal link swaps for a year-long signed cookie.
const SECRET = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET missing or shorter than 32 characters');
  return s;
};
const COOKIE = 'xmas';
const DAYS = 365;

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sign = (data) => b64u(crypto.createHmac('sha256', SECRET()).update(data).digest());

// Cookie value: userId.expiry.signature. Nothing secret inside, useless without SESSION_SECRET.
function makeSession(userId) {
  const exp = Date.now() + DAYS * 864e5;
  const data = `${userId}.${exp}`;
  return `${data}.${sign(data)}`;
}
function readSession(cookieHeader) {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const [id, exp, sig] = m[1].split('.');
  if (!id || !exp || !sig) return null;
  const expect = sign(`${id}.${exp}`);
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  if (Number(exp) < Date.now()) return null;
  return { userId: id };
}
const setCookie = (userId) => `${COOKIE}=${makeSession(userId)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS * 86400}`;
const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

// Personal-link token: 32 url-safe characters from 24 random bytes. Only its hash is stored.
const newToken = () => b64u(crypto.randomBytes(24));
const newId = () => b64u(crypto.randomBytes(12));
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const normEmail = (e) => String(e || '').trim().toLowerCase();
const validEmail = (e) => e.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

// Best-effort rate limit per function instance. Turn on Netlify's rate limiting rule too (SETUP.md).
const buckets = new Map();
function rateLimited(key, max = 10, windowMs = 10 * 60e3) {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, t: now };
  if (now - b.t > windowMs) { b.n = 0; b.t = now; }
  b.n += 1; buckets.set(key, b);
  return b.n > max;
}
const ip = (event) => (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

module.exports = { makeSession, readSession, setCookie, clearCookie, newToken, newId, hash, normEmail, validEmail, rateLimited, ip, COOKIE };
