const A = require('./_lib/auth');
const S0 = require('./_lib/store');
const U = require('./_lib/users');
const K = require('./_lib/klaviyo');
const { json, parseBody } = require('./_lib/http');

// POST { confirm: "DELETE" } -> deletes the signed-in person's planner, account, link and email record,
// asks Klaviyo to delete their profile, and signs the device out. Cannot be undone.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  const S = S0.open(event);
  const user = await U.current(S, event);
  if (!user) return json(401, { error: 'Not signed in.' });
  if (parseBody(event).confirm !== 'DELETE') return json(400, { error: 'Confirm first.' });
  await S.del(`planner/${user.id}`);
  if (user.tokenHash) await S.del(`token/${user.tokenHash}`);
  await S.del(`email/${A.hash(user.email)}`);
  await S.del(`users/${user.id}`);
  await K.forget({ email: user.email }).catch(() => false);
  return json(200, { ok: true }, { 'Set-Cookie': A.clearCookie() });
};
