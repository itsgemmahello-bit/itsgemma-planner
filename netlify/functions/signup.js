import * as A from './_lib/auth.js';
import * as S0 from './_lib/store.js';
import * as U from './_lib/users.js';
import * as K from './_lib/klaviyo.js';
import * as P from './_lib/planner.js';
import { json, parseBody, safe, v2 } from './_lib/http.js';

const CHECK = 'You already have a planner with that email. Your personal link is on its way to your inbox (check spam too).';

// POST { name, email, news, website } -> new email: create the planner and sign straight in, then email the link
// for other devices. Known email: never sign in (that would open someone else's planner), just email their link.
const handler = safe(async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  if (A.rateLimited('signup:' + A.ip(event), 8)) return json(429, { error: 'Too many tries. Give it a few minutes.' });
  const d = parseBody(event);
  if (d.website) return json(200, { ok: true, status: 'check-email', message: CHECK }); // honeypot field, bots fill it
  const name = String(d.name || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 40);
  const email = A.normEmail(d.email);
  if (!name) return json(400, { error: 'Add your first name.' });
  if (!A.validEmail(email)) return json(400, { error: 'That email does not look right. Check it and try again.' });

  const S = S0.open(event);
  const existing = await U.findByEmail(S, email);
  if (existing) {
    const link = await U.newLink(S, existing);
    await K.sendLink({ email, name: existing.name, link, isNew: false });
    return json(200, { ok: true, status: 'check-email', message: CHECK });
  }

  const now = new Date().toISOString();
  const user = { id: A.newId(), name, email, created: now, lastSeen: now, news: Boolean(d.news), tokenHash: null };
  await S.set(`email/${A.hash(email)}`, { id: user.id });
  await S.set(`planner/${user.id}`, P.empty());
  const link = await U.newLink(S, user);
  await K.sendLink({ email, name, link, isNew: true });
  if (user.news) await K.subscribe({ email });
  return json(200, { ok: true, status: 'in' }, { 'Set-Cookie': A.setCookie(user.id) });
});

export { handler };
export default v2(handler);
export const config = { path: '/api/signup' };
