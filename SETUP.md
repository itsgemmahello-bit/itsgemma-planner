# Christmas planner: putting it live

The free @itsgemma__ Christmas planner. Anyone signs up with their first name and email, gets their own planner straight away, and is emailed a personal link so they can open it on any other device. Each person only ever sees their own planner. The other tabs show in the sidebar as "Coming soon".

Everything is on @itsgemma__ accounts: its own GitHub, Netlify and Klaviyo.

## What's in this folder
- `public/index.html` the sign-up page and the planner
- `public/privacy.html` how details are used (contact email: itsgemma.hello@gmail.com)
- `netlify/functions/` the behind-the-scenes jobs: sign up, sign in by link, load, save, send the link again, sign out, delete my data
- `tests/run.js` proves people can only see their own planner (run `npm test`)

Planners are saved in Netlify Blobs, the storage that comes free with every Netlify site. Nothing extra to set up.

## Step 8: Netlify (about 15 minutes, no Terminal)
1. Go to app.netlify.com and log in with itsgemma.hello@gmail.com. The free plan is fine to start.
2. Click **Add new project**, then **Import an existing project**, then **GitHub**. Allow Netlify to see GitHub when it asks.
3. Sign in to GitHub as **itsgemmahello-bit** (the @itsgemma__ GitHub) and pick the repository **itsgemma-planner**.
4. On the settings screen leave everything as Netlify fills it in (branch `main`, no build command). The settings are already in `netlify.toml`.
5. Click **Deploy**. After a minute you get an address ending in `.netlify.app`.
6. Go to **Project configuration**, then **Environment variables**, and add:

| Name | What to put |
|---|---|
| SESSION_SECRET | Any long random string, 40+ characters. Mash the keyboard, or ask Claude for one. Keep it private. |
| SITE_URL | The address from step 5, e.g. `https://itsgemma-christmas.netlify.app` (no slash at the end) |
| KLAVIYO_PRIVATE_KEY | From step 9 |
| KLAVIYO_NEWS_LIST_ID | From step 9 |

7. Go to **Deploys** and click **Trigger deploy** so it picks up the settings.
8. Optional but sensible: **Project configuration**, **Rate limiting**, add a rule for `/api/*` of 60 requests a minute per visitor.

From then on, every time Claude pushes a change, Netlify puts it live by itself. Still change the project name to something nice under **Project configuration**, **General** (that changes the .netlify.app address; update SITE_URL to match).

## Step 9: Klaviyo (Ross, about 20 minutes)
1. Make the free Klaviyo account for @itsgemma__.
2. **Private key:** Settings, API keys, Create private API key. Name it "Christmas planner", give it **Full access** to Events, Profiles, Lists, Subscriptions and Data privacy. Copy it into Netlify as KLAVIYO_PRIVATE_KEY.
3. **Newsletter list:** Audience, Lists and segments, Create list, call it "Gem's emails". Open it, Settings, copy the **List ID** into Netlify as KLAVIYO_NEWS_LIST_ID. Only people who tick the box go on this list.
4. **The link email (the important one):** this only shows up after the first sign-up, so sign up once yourself on the live page first. Then: Flows, Create flow, Build your own, trigger **Metric**, choose **Christmas planner link**. Add an email:
   - Subject: `Your Christmas planner`
   - Text: `Hi {{ event.first_name }}, here's your own link to your Christmas planner. Open it on any phone or laptop and you'll go straight in: {{ event.link }}` (make the link a button).
   - In the flow's settings, turn off "Skip recently emailed profiles" and set it live. If Klaviyo offers to mark the email as **transactional**, say yes: it's a sign-in link, not marketing.
5. Sign up again with the same email on the live page: the email should arrive within a couple of minutes.

## Step 11: ICO data protection fee (Gemma, 5 minutes)
Anyone who keeps people's details for a business usually has to pay a small yearly fee to the ICO, the UK's data protection body.
1. Go to ico.org.uk and search **"data protection fee self-assessment"**. Answer the questions (about 2 minutes). It will tell you if Gemma needs to pay.
2. If yes, click **Pay the data protection fee**. For a sole trader it's the lowest tier, about £40 to £52 a year (cheaper by direct debit). You get a registration number by email.
3. Add that number to the bottom of `privacy.html` (Claude can do it).

## Before telling anyone (the testing to-dos)
Run through the testing to-dos (kept in Gem's planning notes).

## Fixes (standing permission)
**Ross, 19 Nov 2026:** Claude may commit and push fixes to the planner (this repository) without asking first. Netlify puts each push live within a minute or two. Before every push, run `npm test` and check the page script.

## Notes
- Signing up with an email that already has a planner never opens that planner. It just emails the owner a fresh link. That's on purpose, so nobody can get into someone else's planner by typing their email.
- Every new link replaces the old one. Phones and laptops already signed in stay signed in.
- "Delete my planner" removes everything straight away and asks Klaviyo to delete the email too.
- Before any change goes live, run `npm test` and check the page script (the 4 Nov client hub outage lesson).
