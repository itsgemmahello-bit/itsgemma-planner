// Klaviyo (free account, Ross sets it up). Three jobs, each silent if the keys are not set yet:
//  1. sendLink: records a "Christmas planner link" event. A Klaviyo flow triggered by that event emails the link.
//  2. subscribe: only when the person ticked "send me Gem's emails", adds them to the newsletter list.
//  3. forget: when someone deletes their data, asks Klaviyo to delete their profile too.
const REV = '2024-10-15';
const headers = () => ({
  Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`,
  'Content-Type': 'application/json',
  accept: 'application/json',
  revision: REV,
});
const ready = () => Boolean(process.env.KLAVIYO_PRIVATE_KEY);

async function sendLink({ email, name, link, isNew }) {
  if (!ready() || !email) return false;
  const r = await fetch('https://a.klaviyo.com/api/events/', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ data: { type: 'event', attributes: {
      properties: { link, first_name: name || '', new_signup: Boolean(isNew) },
      metric: { data: { type: 'metric', attributes: { name: 'Christmas planner link' } } },
      profile: { data: { type: 'profile', attributes: { email, first_name: name || undefined } } },
    } } }),
  });
  if (!r.ok) { console.error('klaviyo event', r.status, await r.text()); return false; }
  return true;
}

async function subscribe({ email }) {
  const list = process.env.KLAVIYO_NEWS_LIST_ID;
  if (!ready() || !list || !email) return false;
  const r = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ data: { type: 'profile-subscription-bulk-create-job',
      attributes: { custom_source: 'Christmas planner sign-up', profiles: { data: [{ type: 'profile', attributes: { email, subscriptions: { email: { marketing: { consent: 'SUBSCRIBED' } } } } }] } },
      relationships: { list: { data: { type: 'list', id: list } } } } }),
  });
  if (!r.ok && r.status !== 202) { console.error('klaviyo subscribe', r.status, await r.text()); return false; }
  return true;
}

async function forget({ email }) {
  if (!ready() || !email) return false;
  const r = await fetch('https://a.klaviyo.com/api/data-privacy-deletion-jobs/', {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ data: { type: 'data-privacy-deletion-job', attributes: { profile: { data: { type: 'profile', attributes: { email } } } } } }),
  });
  if (!r.ok && r.status !== 202) { console.error('klaviyo delete', r.status, await r.text()); return false; }
  return true;
}

const plannerLink = (token) => `${(process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '')}/?t=${token}`;

module.exports = { sendLink, subscribe, forget, plannerLink };
