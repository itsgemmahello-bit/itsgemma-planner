import * as A from './_lib/auth.js';
import * as S0 from './_lib/store.js';
import * as U from './_lib/users.js';
import * as K from './_lib/klaviyo.js';
import { json, parseBody, safe, v2 } from './_lib/http.js';

const SAME = 'If that email has a planner, a fresh link is on its way. Check spam too.';

// POST { email } -> emails a fresh personal link. Same reply whether or not the email exists.
const handler = safe(async (event) => {
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
});

export { handler as run };
export default v2(handler);
