import * as S0 from './_lib/store.js';
import * as U from './_lib/users.js';
import * as P from './_lib/planner.js';
import * as A from './_lib/auth.js';
import { json, parseBody, safe, v2 } from './_lib/http.js';

// POST { planner, base } -> saves the signed-in person's planner.
// base = the updatedAt the page last loaded. If another device saved since, reply 409 with the newer copy
// so the page can show it instead of overwriting it.
const handler = safe(async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  const S = S0.open(event);
  const user = await U.current(S, event);
  if (!user) return json(401, { error: 'Not signed in.' });
  if (A.rateLimited('save:' + user.id, 240, 10 * 60e3)) return json(429, { error: 'Saving too fast. Give it a minute.' });
  const d = parseBody(event);
  const stored = (await S.get(`planner/${user.id}`)) || P.empty();
  if (d.base !== undefined && stored.updatedAt && d.base !== stored.updatedAt) return json(409, { error: 'Changed on another device.', planner: stored });
  const next = { ...P.clean(d.planner), updatedAt: new Date().toISOString() };
  await S.set(`planner/${user.id}`, next);
  return json(200, { ok: true, updatedAt: next.updatedAt });
});

export { handler as run };
export default v2(handler);
