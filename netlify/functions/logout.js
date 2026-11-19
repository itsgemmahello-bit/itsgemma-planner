import * as A from './_lib/auth.js';
import { json, safe, v2 } from './_lib/http.js';

// POST -> signs this device out. The planner stays saved; their personal link still works.
const handler = safe(async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  return json(200, { ok: true }, { 'Set-Cookie': A.clearCookie() });
});

export { handler };
export default v2(handler);
export const config = { path: '/api/logout' };
