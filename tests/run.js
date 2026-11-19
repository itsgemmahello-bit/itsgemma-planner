// Proves: sign-up works and signs straight in; a known email never signs anyone in; each person only ever sees
// their own planner; forged cookies and old links get nothing; saving cleans what it is sent; "send my link"
// says the same thing whether or not the email exists; deleting really deletes.
// Runs against a memory store and a fake Klaviyo, so it needs no network and no keys.
import test from 'node:test';
import assert from 'node:assert';

process.env.SESSION_SECRET = 'test-secret-that-is-long-enough-for-hmac-1234';
process.env.KLAVIYO_PRIVATE_KEY = 'pk_test';
process.env.KLAVIYO_NEWS_LIST_ID = 'LIST1';
process.env.SITE_URL = 'https://planner.example';

const S0 = await import('../netlify/functions/_lib/store.js');
const AUTH = await import('../netlify/functions/_lib/auth.js');
const mem = S0.useMemoryStore();
const sent = [];
global.fetch = async (url, opts = {}) => {
  sent.push({ url, body: opts.body ? JSON.parse(opts.body) : {} });
  return { ok: true, status: 202, json: async () => ({}), text: async () => '' };
};
const links = () => sent.filter((s) => s.url.includes('/api/events/')).map((s) => s.body.data.attributes.properties.link);

const mods = {};
for (const n of ['signup', 'session', 'me', 'save', 'resend-link', 'logout', 'delete-me']) mods[n] = await import(`../netlify/functions/${n}.js`);
const fn = (n) => mods[n];
let ipN = 0;
const call = (name, { method = 'POST', body, cookie = '' } = {}) =>
  fn(name).run({ httpMethod: method, headers: { cookie, 'x-nf-client-connection-ip': `10.0.0.${++ipN % 250}` }, body: body ? JSON.stringify(body) : '' });
const cookieOf = (r) => (r.headers['Set-Cookie'] || '').split(';')[0];
const data = (r) => JSON.parse(r.body);

let anna, ben;

test('new sign-up creates a planner, signs straight in and emails the link', async () => {
  const r = await call('signup', { body: { name: 'Anna', email: 'Anna@Example.com ', news: true } });
  assert.equal(r.statusCode, 200);
  assert.equal(data(r).status, 'in');
  anna = cookieOf(r);
  assert.match(anna, /^xmas=/);
  const me = data(await call('me', { method: 'GET', cookie: anna }));
  assert.equal(me.name, 'Anna');
  assert.equal(me.email, 'anna@example.com');
  assert.deepEqual(me.planner.people, []);
  assert.equal(links().length, 1);
  assert.match(links()[0], /^https:\/\/planner\.example\/\?t=[A-Za-z0-9_-]{32}$/);
  assert.ok(sent.some((s) => s.url.includes('profile-subscription-bulk-create-jobs')), 'ticked box subscribes');
});

test('no box ticked, no newsletter subscription', async () => {
  const before = sent.filter((s) => s.url.includes('subscription')).length;
  const r = await call('signup', { body: { name: 'Ben', email: 'ben@example.com', news: false } });
  ben = cookieOf(r);
  assert.equal(sent.filter((s) => s.url.includes('subscription')).length, before);
});

test('signing up again with a known email never signs in, it emails a fresh link', async () => {
  const r = await call('signup', { body: { name: 'Someone else', email: 'anna@example.com' } });
  assert.equal(r.statusCode, 200);
  assert.equal(data(r).status, 'check-email');
  assert.equal(r.headers['Set-Cookie'], undefined);
});

test('the emailed link signs a device in; the replaced link stops working', async () => {
  const all = links().filter((l) => l);
  const first = all[0].split('?t=')[1];
  const latest = all[all.length - 1].split('?t=')[1];
  assert.equal((await call('session', { body: { token: first } })).statusCode, 401, 'old link replaced');
  const ok = await call('session', { body: { token: latest } });
  assert.equal(ok.statusCode, 200);
  assert.equal(data(await call('me', { method: 'GET', cookie: cookieOf(ok) })).email, 'anna@example.com');
});

test('nothing without a valid cookie or link', async () => {
  assert.equal((await call('me', { method: 'GET' })).statusCode, 401);
  assert.equal((await call('me', { method: 'GET', cookie: 'xmas=abc.9999999999999.forged' })).statusCode, 401);
  assert.equal((await call('session', { body: { token: 'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ' } })).statusCode, 401);
  assert.equal((await call('save', { body: { planner: {} } })).statusCode, 401);
});

test('saving cleans what it is sent and each person only sees their own planner', async () => {
  const planner = {
    people: [{ id: 'p-mum-1', name: 'Mum', budget: '50' }, { id: 'p-x', name: '' }],
    gifts: [
      { id: 'g-1111', personId: 'p-mum-1', item: 'Slippers', price: 24.5, link: 'javascript:alert(1)', ordered: true },
      { id: 'g-2222', personId: 'p-mum-1', item: 'Book', price: 12, link: 'shop.example/book' },
      { id: 'g-3333', personId: 'nobody', item: 'Orphan' },
    ],
    sneaky: 'dropped',
  };
  const r = await call('save', { cookie: anna, body: { planner } });
  assert.equal(r.statusCode, 200);
  const mine = data(await call('me', { method: 'GET', cookie: anna })).planner;
  assert.deepEqual(mine.people, [{ id: 'p-mum-1', name: 'Mum', budget: 50 }]);
  assert.equal(mine.gifts.length, 2);
  assert.equal(mine.gifts[0].link, '', 'javascript: link removed');
  assert.equal(mine.gifts[1].link, 'https://shop.example/book');
  assert.equal(mine.sneaky, undefined);
  const bens = data(await call('me', { method: 'GET', cookie: ben })).planner;
  assert.deepEqual(bens.people, [], 'Ben cannot see Anna');
});

test('a save from an out-of-date device is refused with the newer copy', async () => {
  const r = await call('save', { cookie: anna, body: { planner: { people: [], gifts: [] }, base: '2000-01-01T00:00:00.000Z' } });
  assert.equal(r.statusCode, 409);
  assert.equal(data(r).planner.people[0].name, 'Mum');
});

test('send my link again: same reply whether or not the email exists', async () => {
  const a = data(await call('resend-link', { body: { email: 'ben@example.com' } })).message;
  const b = data(await call('resend-link', { body: { email: 'nobody@example.com' } })).message;
  assert.equal(a, b);
});

test('deleting removes everything and the cookie stops working', async () => {
  assert.equal((await call('delete-me', { cookie: ben, body: {} })).statusCode, 400, 'needs confirming');
  const r = await call('delete-me', { cookie: ben, body: { confirm: 'DELETE' } });
  assert.equal(r.statusCode, 200);
  assert.equal((await call('me', { method: 'GET', cookie: ben })).statusCode, 401);
  assert.ok(sent.some((s) => s.url.includes('data-privacy-deletion-jobs')), 'Klaviyo asked to delete');
  const left = [...mem._map.keys()];
  assert.ok(!left.some((k) => k.includes(AUTH.hash('ben@example.com'))), 'email record gone');
  // Ben can sign up fresh afterwards.
  assert.equal(data(await call('signup', { body: { name: 'Ben', email: 'ben@example.com' } })).status, 'in');
});
