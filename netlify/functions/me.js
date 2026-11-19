import * as S0 from './_lib/store.js';
import * as U from './_lib/users.js';
import * as P from './_lib/planner.js';
import { json, safe, v2 } from './_lib/http.js';

// GET -> the signed-in person's name and their own planner. Nobody else's, ever.
const handler = safe(async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'GET only' });
  const S = S0.open(event);
  const user = await U.current(S, event);
  if (!user) return json(401, { error: 'Not signed in.' });
  const planner = (await S.get(`planner/${user.id}`)) || P.empty();
  return json(200, { name: user.name, email: user.email, planner });
});

export { handler };
export default v2(handler);
