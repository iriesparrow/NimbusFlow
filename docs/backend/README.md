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

> The app already targets these page IDs:
> - Well-Being OS: `3240ac6c9de1815abad8fcad66654830`
> - Limiting Beliefs: `3240ac6c9de1810db4b1d6ecc814f85d`
>
> If those aren't your pages anymore, open the correct page in Notion, copy its
> URL, take the 32-character id at the end, and update `NOTION_OS` /
> `NOTION_BELIEFS` at the top of `docs/index.html`.

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
