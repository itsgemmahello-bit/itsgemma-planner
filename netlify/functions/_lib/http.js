const json = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extraHeaders },
  body: JSON.stringify(body),
});
const parseBody = (event) => {
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  if (raw.length > 200000) return {};
  try { return JSON.parse(raw || '{}') || {}; } catch { return {}; }
};
export { json, parseBody };

// Wraps a function so an unexpected error comes back as a readable message (and lands in Netlify's function log)
// instead of a blank failure. The detail line helps diagnose problems during set-up.
const safe = (handler) => async (event, context) => {
  try { return await handler(event, context); }
  catch (e) {
    console.error('function error', e && e.stack ? e.stack : e);
    return json(500, { error: 'Something went wrong on our side. Try again in a minute.', detail: `${(e && e.name) || 'Error'}: ${(e && e.message) || e}`.slice(0, 300) });
  }
};

// Netlify's newer function style hands over a Request and wants a Response back. This turns it into the
// simple { httpMethod, headers, body } shape the handlers here use, and turns their answer back.
const v2 = (handler) => async (req, context) => {
  const headers = Object.fromEntries(req.headers);
  if (context && context.ip) headers['x-nf-client-connection-ip'] = context.ip;
  const body = req.method === 'GET' || req.method === 'HEAD' ? '' : await req.text();
  const r = await handler({ httpMethod: req.method, headers, body }, context);
  return new Response(r.body, { status: r.statusCode, headers: r.headers });
};
export { safe, v2 };
