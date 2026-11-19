// Where everything is saved: Netlify Blobs, a simple key/value store that comes with every Netlify site.
//   users/<id>        { id, name, email, created, lastSeen, news, tokenHash }
//   email/<sha256>    { id }            find a person by email
//   token/<sha256>    { id }            find a person by their personal link
//   planner/<id>      { people, gifts, updatedAt }
// Tests swap in a memory store with useMemoryStore().
let memory = null;

function useMemoryStore() {
  const m = new Map();
  memory = {
    get: async (k) => (m.has(k) ? JSON.parse(m.get(k)) : null),
    set: async (k, v) => { m.set(k, JSON.stringify(v)); },
    del: async (k) => { m.delete(k); },
    _map: m,
  };
  return memory;
}

function open(event) {
  if (memory) return memory;
  const { getStore, connectLambda } = require('@netlify/blobs');
  if (event && event.blobs) connectLambda(event);
  const s = getStore({ name: 'christmas', consistency: 'strong' });
  return {
    get: (k) => s.get(k, { type: 'json' }),
    set: (k, v) => s.setJSON(k, v),
    del: (k) => s.delete(k),
  };
}

module.exports = { open, useMemoryStore };
