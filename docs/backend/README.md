# Notion Sync backend (free Cloudflare Worker)

This makes the **Save to Notion** buttons actually work. It's a ~120-line proxy
that holds your Notion token server-side (so it's never in the phone/browser) and
writes pages to your Notion.

You set it up **once**. Total time ~10 minutes, no credit card.

---

## Step 1 — Create a Notion integration & get a token
1. Go to <https://www.notion.so/my-integrations> → **New integration**.
2. Name it `Well-Being OS`, pick your workspace, **Internal** type → Save.
3. Copy the **Internal Integration Secret** (starts with `ntn_` or `secret_`). This is your `NOTION_TOKEN`.

## Step 2 — Share your pages with the integration
The integration can only touch pages you explicitly share.
1. Open your **Well-Being OS** page in Notion → top-right **•••** → **Connections / Add connections** → choose `Well-Being OS`.
2. Do the same for your **Limiting Beliefs** page.

> The app reads its target page/database IDs from your device's personal file
> (imported once via ⚙ → Import; the keys are `notionOS`, `notionBeliefs`,
> `notionDB` inside `wb_personal`). No IDs are committed to this repo. To point
> at different pages, open the page in Notion, copy the 32-character id from
> the end of its URL, and update your personal file before importing.

## Step 3 — Deploy the Worker

### Option A — Dashboard (no CLI, easiest)
1. Go to <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it (e.g. `wellbeing-notion`) → **Deploy** (the placeholder code is fine for now).
3. Click **Edit code**, delete everything, paste the full contents of [`worker.js`](./worker.js), then **Deploy**.
4. Go to the worker's **Settings → Variables and Secrets** and add:
   - `NOTION_TOKEN` = your integration secret (mark as **Secret/Encrypt**)
   - `APP_SECRET` = any random string you make up, e.g. `wb-7f3a9c2e` (Secret)
   - *(optional)* `ALLOW_ORIGIN` = `https://iriesparrow.github.io`
5. **Deploy** again so the variables take effect.
6. Copy your worker URL: `https://wellbeing-notion.<your-subdomain>.workers.dev`

### Option B — Wrangler CLI
```bash
cd docs/backend
npm i -g wrangler
wrangler login
wrangler secret put NOTION_TOKEN   # paste the integration secret
wrangler secret put APP_SECRET     # paste any random string
wrangler deploy
```

## Step 4 — Connect the app
1. Open the app on your phone → tap **⚙** (top-right).
2. **Backend URL** = your `workers.dev` URL.
3. **Shared secret** = the `APP_SECRET` you chose.
4. **Save Connection** → **Test Connection**. You should see *"✅ Connected"*.
5. Now the **Save** buttons create/append real Notion pages.

---

## How it works
- The app POSTs JSON to your worker with the `X-WB-Token` header (= `APP_SECRET`).
- The worker checks the secret, converts a small Markdown subset
  (`#`/`##`/`###` headings, `-` bullets, `1.` numbered, `>` quotes, `---`
  dividers, `**bold**`) into Notion blocks, and calls the Notion API with your
  token.
- Actions: `ping` (health check), `createPage` (new dated child page),
  `appendBlocks` (append to an existing page — used by Supps & Beliefs).

## Security notes
- Your Notion token lives only in Cloudflare's encrypted env vars — never in the
  app or in git.
- `APP_SECRET` is **mandatory** — the worker refuses all requests (returns 503)
  until it's set, so a misconfigured deploy can't be written to anonymously.
  It stops strangers from writing to your Notion if they find the URL.
- Set `ALLOW_ORIGIN` to your Pages URL to also lock down which site can call it.
- Treat the `APP_SECRET` like a password; it's stored in your phone's
  localStorage for convenience.

## Updating the worker later
Re-paste `worker.js` in the dashboard editor (or `wrangler deploy`) and Deploy.

---

# Background push (alerts when the app is fully closed) — optional

In-app reminders only fire while the PWA is open (an iOS limitation). To get
notifications even when the app is closed, the worker sends **Web Push** on a
schedule. This needs three extra pieces of setup. It's optional — **Add Week to
Calendar** in the app already gives reliable closed-app alarms without any of this.

### 1. Add the VAPID keys (the push identity)
The app already ships with the matching **public** key. You set the **private**
key on the worker:
1. Worker → **Settings → Variables and Secrets** → add (Encrypt):
   - `VAPID_PRIVATE_JWK` = the private JWK string you were given
   - `VAPID_SUBJECT` = `mailto:your-email@example.com`
2. **Deploy**.

> If you ever need to regenerate keys, the public key in `index.html`
> (`VAPID_PUBLIC`) and the worker's `VAPID_PRIVATE_JWK` must be a matching pair.

### 2. Create a KV namespace to store subscriptions
Dashboard route:
1. Cloudflare → **Storage & Databases → KV** → **Create namespace** → name it `wellbeing-subs`.
2. Back in your worker → **Settings → Bindings → Add → KV namespace**:
   - Variable name: **`SUBS`** (exactly)
   - KV namespace: `wellbeing-subs`
3. **Deploy**.

(CLI route: `wrangler kv:namespace create SUBS`, paste the id into `wrangler.toml`, `wrangler deploy`.)

### 3. Add the cron trigger (the scheduler)
1. Worker → **Settings → Triggers → Cron Triggers → Add Cron Trigger**
2. Schedule: **`*/5 * * * *`** (every 5 minutes) → Save.

(CLI route: uncomment the `[triggers]` block in `wrangler.toml`, `wrangler deploy`.)

### 4. Turn it on in the app
1. Open the installed app → **🔔** → **Enable Reminders** (this also subscribes you to push).
2. Tap **Test Background Push** → you should get a notification. To truly verify
   closed-app delivery, fully close the app first, then tap it from another device
   or just wait for the next scheduled reminder.

### How it works
- The app subscribes via the browser Push API and sends its subscription, your
  timezone, and your weekly reminder schedule to the worker (`saveSub`), stored in KV.
- The cron runs every 5 min, computes the local time per stored subscription, and
  sends any reminder due in that window (deduped so each fires once per day).
- The worker signs a VAPID JWT and encrypts each payload (aes128gcm) before posting
  to Apple/Google's push endpoint; the service worker shows the notification.

---

# Green Room coach (optional)

The Green Room surface has a conversational story coach. It talks to this same
worker (`action: "coach"`), which proxies to the Claude API — your API key
lives only in Cloudflare, never in the browser.

1. Get an Anthropic API key at <https://console.anthropic.com> (Settings → API keys).
2. Worker → **Settings → Variables and Secrets** → add `ANTHROPIC_API_KEY`
   (Encrypt) → **Deploy**. Optional: `COACH_MODEL` to override the default
   (`claude-opus-4-8`) — e.g. `claude-sonnet-5` for lower cost.
3. In Green Room → **The Coach → Backend connection** → paste the same worker
   URL + `APP_SECRET` → Save.

Costs: replies are capped at ~400 tokens with a short conversation window —
typically a cent or two per exchange on the default model.

Privacy: each coach exchange sends your recent messages **and your draft story
beats** to your worker, which forwards them to Anthropic's API. Nothing is
stored server-side by the worker.

---

### Notes & limits
- iOS delivers Web Push only to apps **installed to the Home Screen** (iOS 16.4+).
- Apple may throttle/delay background pushes somewhat; exact-to-the-second delivery
  isn't guaranteed. For hard alarms, the calendar export is still the gold standard.
- Free Cloudflare covers this easily (KV + cron + a handful of pushes/day).
