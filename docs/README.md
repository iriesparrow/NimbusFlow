# Well-Being OS — iPhone PWA

A self-contained installable web app (PWA) version of the Well-Being OS tracker,
with in-app reminders and calendar export. Lives entirely in this `docs/` folder.

## Files
- `index.html` — the app (your original, enhanced)
- `manifest.webmanifest` — makes it installable to the Home Screen
- `sw.js` — service worker (offline caching + notifications)
- `icons/` — app icons

## What was added to your original code
1. **Installable PWA** — meta tags, manifest, icons, service worker. Adds to the
   iPhone Home Screen and runs full-screen with no Safari chrome.
2. **Local persistence** — your checkboxes, weights, doses, gratitudes and belief
   notes now survive reloads (saved in `localStorage`). Checkbox completion resets
   each new calendar day; text/weights persist ongoing.
3. **Reminder engine** (🔔 button, top-right) — asks for notification permission,
   then fires a notification at each timed item in *today's* routine (5:00 am
   practice, 6:00 am supps, 7:00 am training, 8:00 pm skincare, etc.). Includes a
   "Send Test Notification" button.
4. **Add Week to Calendar (.ics)** — exports the full weekly routine as recurring
   calendar events with alarms.

## ⚠️ Important about iPhone notifications
Apple only lets a no-server web app show notifications **while the app is open or
recently backgrounded** — and only once it's **installed to the Home Screen**
(iOS 16.4+). It cannot wake itself at 5 am when fully closed; that requires a push
server (out of scope for a local app).

➡️ For alarms that always fire even when the app is closed, use **Add Week to
Calendar** — those go into the iOS Calendar/Clock and are 100% reliable.

## Install on your iPhone (after it's hosted — see below)
1. Open the hosted URL in **Safari** (must be Safari, not Chrome).
2. Tap the **Share** icon → **Add to Home Screen** → Add.
3. Open the app from the new Home Screen icon.
4. Tap **🔔 Reminders → Enable Reminders** and allow notifications.
5. (Recommended) Tap **Add Week to Calendar** and add the events for reliable alarms.

## Hosting it (free, via GitHub Pages)
GitHub Pages settings can't be toggled from code, so do this once:
1. Push this branch (already done).
2. On GitHub: **Settings → Pages**.
3. **Source: Deploy from a branch**.
4. **Branch:** select this branch (or `main` after you merge) and **folder: `/docs`**. Save.
5. Wait ~1 minute. Your app will be live at:
   **https://iriesparrow.github.io/nimbusflow/**
6. Open that URL in Safari on your iPhone and follow the install steps above.

When you change files, bump `CACHE` in `sw.js` (e.g. `v1` → `v2`) so phones pull
the update.

## Save to Notion (now works — needs a one-time backend)
The **Save** buttons write to your Notion via a tiny free Cloudflare Worker that
holds your Notion token server-side (a browser can't call Notion directly, and a
key in client code would leak). Set it up once:

➡️ **See [`backend/README.md`](./backend/README.md)** — ~10 min, no credit card.

Then in the app tap **⚙ (top-right) → enter your Backend URL + secret → Test
Connection**. After that, every Save button creates/appends real Notion pages.

Until you set that up, the app still works fully offline thanks to localStorage;
the Save buttons just prompt you to configure ⚙ first.

What each button does once connected:
- **Day / Practice / Workout** → create a new dated child page under your Well-Being OS page.
- **Supplements** → append a dated dose-update block to the Well-Being OS page.
- **Beliefs** → append a dated deactivation-work block to your Limiting Beliefs page.
