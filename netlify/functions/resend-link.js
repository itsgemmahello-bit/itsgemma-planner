const A = require('./_lib/auth');
const S0 = require('./_lib/store');
const U = require('./_lib/users');
const K = require('./_lib/klaviyo');
const { json, parseBody } = require('./_lib/http');

const SAME = 'If that email has a planner, a fresh link is on its way. Check spam too.';

// POST { email } -> emails a fresh personal link. Same reply whether or not the email exists.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  if (A.rateLimited('resend:' + A.ip(event), 5)) return json(200, { ok: true, message: SAME });
  const email = A.normEmail(parseBody(event).email);
  if (!A.validEmail(email)) return json(200, { ok: true, message: SAME });
  try {
    const S = S0.open(event);
    const user = await U.findByEmail(S, email);
    if (user) await K.sendLink({ email, name: user.name, link: await U.newLink(S, user), isNew: false });
  } catch (e) { console.error('resend', e.message); }
  return json(200, { ok: true, message: SAME });
};
