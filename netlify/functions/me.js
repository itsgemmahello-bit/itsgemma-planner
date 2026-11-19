const S0 = require('./_lib/store');
const U = require('./_lib/users');
const P = require('./_lib/planner');
const { json } = require('./_lib/http');

// GET -> the signed-in person's name and their own planner. Nobody else's, ever.
exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'GET only' });
  const S = S0.open(event);
  const user = await U.current(S, event);
  if (!user) return json(401, { error: 'Not signed in.' });
  const planner = (await S.get(`planner/${user.id}`)) || P.empty();
  return json(200, { name: user.name, email: user.email, planner });
};
