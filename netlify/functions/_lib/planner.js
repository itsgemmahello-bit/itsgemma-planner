import * as A from './auth.js';

const LIMITS = { people: 60, gifts: 600, name: 40, item: 120, link: 500, price: 100000 };
const str = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const money = (v) => {
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) && n >= 0 && n <= LIMITS.price ? n : 0;
};
const id = (v) => (/^[A-Za-z0-9_-]{4,40}$/.test(String(v || '')) ? String(v) : A.newId());
const safeLink = (v) => {
  const s = str(v, LIMITS.link);
  if (!s) return '';
  try { const u = new URL(s.startsWith('http') ? s : `https://${s}`); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : ''; } catch { return ''; }
};

const empty = () => ({ people: [], gifts: [], updatedAt: null });

// Everything a browser sends is cleaned here before it is saved: lengths capped, links checked, unknown fields dropped.
function clean(input) {
  const p = input && typeof input === 'object' ? input : {};
  const people = (Array.isArray(p.people) ? p.people : []).slice(0, LIMITS.people)
    .map((x) => ({ id: id(x && x.id), name: str(x && x.name, LIMITS.name), budget: money(x && x.budget) }))
    .filter((x) => x.name);
  const ids = new Set(people.map((x) => x.id));
  const gifts = (Array.isArray(p.gifts) ? p.gifts : []).slice(0, LIMITS.gifts)
    .map((g) => ({
      id: id(g && g.id), personId: String((g && g.personId) || ''), item: str(g && g.item, LIMITS.item),
      price: money(g && g.price), link: safeLink(g && g.link), ordered: Boolean(g && g.ordered), received: Boolean(g && g.received),
    }))
    .filter((g) => g.item && ids.has(g.personId));
  return { people, gifts };
}

export { clean, empty, LIMITS };
