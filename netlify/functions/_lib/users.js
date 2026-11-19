import * as A from './auth.js';
import * as K from './klaviyo.js';

const findByEmail = async (S, email) => {
  const hit = await S.get(`email/${A.hash(email)}`);
  return hit ? S.get(`users/${hit.id}`) : null;
};

// The person signed in by cookie, or null. A deleted person's cookie stops working straight away.
async function current(S, event) {
  const s = A.readSession(event.headers.cookie || event.headers.Cookie);
  if (!s) return null;
  return S.get(`users/${s.userId}`);
}

// A fresh personal link. The old link stops working; devices already signed in stay signed in.
async function newLink(S, user) {
  const token = A.newToken();
  if (user.tokenHash) await S.del(`token/${user.tokenHash}`);
  user.tokenHash = A.hash(token);
  await S.set(`token/${user.tokenHash}`, { id: user.id });
  await S.set(`users/${user.id}`, user);
  return K.plannerLink(token);
}

export { findByEmail, current, newLink };
