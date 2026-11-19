import * as A from './_lib/auth.js';
import * as S0 from './_lib/store.js';
import { json, parseBody, safe, v2 } from './_lib/http.js';

// POST { token } -> if it is someone's current personal link, sign this device in for a year.
// The page strips the token from the address bar straight after.
const handler = safe(async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  if (A.rateLimited('session:' + A.ip(event), 15)) return json(429, { error: 'Too many tries. Give it a few minutes.' });
  const token = String(parseBody(event).token || '').trim();
  if (token.length < 20 || token.length > 64) return json(401, { error: 'That link is not valid. Ask for a fresh one below.' });
  const S = S0.open(event);
  const hit = await S.get(`token/${A.hash(token)}`);
  const user = hit && (await S.get(`users/${hit.id}`));
  if (!user || user.tokenHash !== A.hash(token)) return json(401, { error: 'That link has expired or been replaced. Ask for a fresh one below.' });
  user.lastSeen = new Date().toISOString();
  await S.set(`users/${user.id}`, user);
  return json(200, { ok: true }, { 'Set-Cookie': A.setCookie(user.id) });
});

export { handler };
export default v2(handler);
export const config = { path: '/api/session' };
