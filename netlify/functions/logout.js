const A = require('./_lib/auth');
const { json } = require('./_lib/http');

// POST -> signs this device out. The planner stays saved; their personal link still works.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  return json(200, { ok: true }, { 'Set-Cookie': A.clearCookie() });
};
