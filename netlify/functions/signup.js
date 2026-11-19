const A = require('./_lib/auth');
const S0 = require('./_lib/store');
const U = require('./_lib/users');
const K = require('./_lib/klaviyo');
const P = require('./_lib/planner');
const { json, parseBody } = require('./_lib/http');

const CHECK = 'You already have a planner with that email. Your personal link is on its way to your inbox (check spam too).';

// POST { name, email, news, website } -> new email: create the planner and sign straight in, then email the link
// for other devices. Known email: never sign in (that would open someone else's planner), just email their link.
exports.handler = async (event) => {
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
};
