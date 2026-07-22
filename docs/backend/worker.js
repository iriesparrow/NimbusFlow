/**
 * Well-Being OS — Notion sync backend (Cloudflare Worker)
 * --------------------------------------------------------
 * A tiny proxy that lets the static PWA write to your Notion pages without
 * exposing your Notion token in the browser. It holds the token server-side
 * and converts a small Markdown subset into Notion blocks.
 *
 * Required secrets/vars (set in the Cloudflare dashboard → Settings → Variables,
 * or via `wrangler secret put`):
 *   NOTION_TOKEN  — your Notion internal integration secret (starts with "ntn_" / "secret_")
 *   APP_SECRET    — any random string; the app must send it in the X-WB-Token header
 * Optional:
 *   ALLOW_ORIGIN  — restrict CORS to your Pages URL, e.g. https://iriesparrow.github.io
 *                   (defaults to "*", which is fine because APP_SECRET gates writes)
 * For background push (optional — see README):
 *   VAPID_PRIVATE_JWK — private VAPID key (JWK string); public half ships in the app
 *   VAPID_SUBJECT     — mailto: contact for the push service
 *   SUBS (KV binding) — stores push subscriptions; a cron trigger sends due reminders
 *
 * Actions (POST JSON body):
 *   { action: "ping" }
 *   { action: "createPage", parentId, title, markdown }
 *   { action: "appendBlocks", pageId, markdown }
 *   { action: "logEntry", databaseId, date, category, name, completed, total, completion, notes, markdown }
 *   { action: "saveSub" | "deleteSub" | "testPush", subscription, tz, schedule }
 */

const NOTION_VERSION = '2022-06-28';

export default {
  async fetch(request, env) {
    const origin = env.ALLOW_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-WB-Token',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    // The version marker makes deploys verifiable: open the worker URL in a
    // browser — seeing this version number confirms which code is live.
    if (request.method !== 'POST') return json({ error: 'Use POST', version: 'v2-coach-logs-push' }, 405, cors);

    // Shared-secret gate — fail CLOSED. If the secret isn't configured on the
    // server, refuse everything (otherwise an open-CORS worker with a valid
    // NOTION_TOKEN would let anyone who finds the URL write to your Notion).
    if (!env.APP_SECRET) {
      return json({ error: 'Server not configured: set APP_SECRET on the worker before use.' }, 503, cors);
    }
    if (request.headers.get('X-WB-Token') !== env.APP_SECRET) {
      return json({ error: 'Unauthorized — bad or missing X-WB-Token' }, 401, cors);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400, cors); }

    const action = body.action;
    if (action === 'ping') return json({ ok: true, time: new Date().toISOString() }, 200, cors);

    // Web Push actions don't need the Notion token.
    if (action === 'saveSub' || action === 'deleteSub' || action === 'testPush') {
      try { return await handlePush(action, body, env, cors); }
      catch (err) { return json({ error: String(err && err.message || err) }, 502, cors); }
    }

    // Green Room coach: proxies a coaching conversation to the Claude API.
    // Requires the ANTHROPIC_API_KEY secret; the key never reaches the client.
    if (action === 'coach') {
      if (!env.ANTHROPIC_API_KEY) return json({ error: 'Coach not configured: set the ANTHROPIC_API_KEY secret on the worker.' }, 503, cors);
      const msgs = Array.isArray(body.messages) ? body.messages.slice(-24)
        .map((m) => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user', content: trunc(String((m && m.content) || ''), 4000) }))
        .filter((m) => m.content) : [];
      if (!msgs.length || msgs[0].role !== 'user') return json({ error: 'coach needs messages starting with a user turn' }, 400, cors);
      const beats = body.beats && typeof body.beats === 'object' ? body.beats : {};
      const beatTxt = Object.keys(beats).filter((k) => beats[k] && String(beats[k]).trim())
        .map((k) => k.toUpperCase() + ': ' + trunc(String(beats[k]), 1500)).join('\n\n');
      const context = trunc(String(body.context || '').trim(), 8000);
      const system = 'You are a seasoned executive and founder-story coach in a private rehearsal room. '
        + 'Style: warm, direct, concise. Briefly mirror what you heard, then push deeper with exactly ONE probing question or ONE concrete suggestion per reply — never more than one question. '
        + 'Keep replies under 110 words of plain spoken language; they may be read aloud by a voice, so no markdown, lists, or headers. '
        + 'Never invent facts about the founder — work only from what they tell you, their draft story beats, and any background notes below. If a beat is weak or generic, say which one and why. '
        + 'When they have shared background notes, be attentive to the tensions, fears, and edges they name (e.g. discomfort with visibility, money, self-promotion) and gently press exactly there — that is usually where the real story is stuck.'
        + (beatTxt ? '\n\nTheir current draft beats:\n' + beatTxt : '\n\nThey have not written any beats yet — help them find the story first.')
        + (context ? '\n\nBackground notes the founder wrote about themselves (private; use to ground and sharpen your questions, never quote back verbatim):\n' + context : '');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ model: env.COACH_MODEL || 'claude-opus-4-8', max_tokens: 400, system, messages: msgs }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return json({ error: 'Coach API ' + res.status + ': ' + ((data.error && data.error.message) || 'unavailable') }, 502, cors);
      if (data.stop_reason === 'refusal') return json({ ok: true, reply: 'I can’t coach on that one. Bring it back to your story — try a different angle.' }, 200, cors);
      const reply = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(' ').trim();
      return json({ ok: true, reply: reply || '…' }, 200, cors);
    }

    if (!env.NOTION_TOKEN) return json({ error: 'Server missing NOTION_TOKEN' }, 500, cors);

    try {
      if (action === 'createPage') {
        const { parentId, title, markdown } = body;
        if (!parentId || !title) return json({ error: 'createPage needs parentId and title' }, 400, cors);
        const blocks = mdToBlocks(markdown || '');
        const page = await notion(env, 'POST', '/v1/pages', {
          parent: { page_id: clean(parentId) },
          properties: { title: { title: [{ text: { content: trunc(title, 2000) } }] } },
          children: blocks.slice(0, 100),
        });
        if (blocks.length > 100) await appendInChunks(env, page.id, blocks.slice(100));
        return json({ ok: true, id: page.id, url: page.url }, 200, cors);
      }

      if (action === 'appendBlocks') {
        const { pageId, markdown } = body;
        if (!pageId) return json({ error: 'appendBlocks needs pageId' }, 400, cors);
        const blocks = mdToBlocks(markdown || '');
        await appendInChunks(env, clean(pageId), blocks);
        return json({ ok: true, appended: blocks.length }, 200, cors);
      }

      if (action === 'logEntry') {
        // Upsert a row in the Well-Being Logs database (one per date+category).
        const { databaseId, date, category, name, completed, total, completion, notes, markdown } = body;
        if (!databaseId || !date || !category) {
          return json({ error: 'logEntry needs databaseId, date, category' }, 400, cors);
        }
        const props = {
          Name: { title: [{ text: { content: trunc(name || (date + ' ' + category), 2000) } }] },
          Date: { date: { start: date } },
          Category: { select: { name: category } },
        };
        if (typeof completed === 'number') props.Completed = { number: completed };
        if (typeof total === 'number') props.Total = { number: total };
        if (typeof completion === 'number') props.Completion = { number: completion };
        if (notes) props.Notes = { rich_text: [{ text: { content: trunc(notes, 2000) } }] };

        // Find an existing row for this date + category (best-effort: if the
        // lookup fails for any reason, fall through to creating a new row so a
        // save is never blocked by the dedupe step).
        try {
          const found = await notion(env, 'POST', '/v1/databases/' + clean(databaseId) + '/query', {
            page_size: 1,
            filter: { and: [
              { property: 'Date', date: { equals: date } },
              { property: 'Category', select: { equals: category } },
            ] },
          });
          if (found.results && found.results.length) {
            const id = found.results[0].id;
            await notion(env, 'PATCH', '/v1/pages/' + id, { properties: props });
            return json({ ok: true, id, updated: true }, 200, cors);
          }
        } catch (e) { /* dedupe unavailable — create a fresh row below */ }
        const page = await notion(env, 'POST', '/v1/pages', {
          parent: { database_id: clean(databaseId) },
          properties: props,
          children: mdToBlocks(markdown || '').slice(0, 100),
        });
        return json({ ok: true, id: page.id, url: page.url, created: true }, 200, cors);
      }

      return json({ error: 'Unknown action: ' + action }, 400, cors);
    } catch (err) {
      return json({ error: String(err && err.message || err) }, 502, cors);
    }
  },

  // Cron trigger (configure e.g. "*/5 * * * *"): sends due reminders as push.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runSchedule(env, new Date()));
  },
};

/* ============================================================
   WEB PUSH — subscription storage, scheduling, and crypto
   (VAPID per RFC 8292 + aes128gcm payload per RFC 8291)
   ============================================================ */

async function handlePush(action, body, env, cors) {
  const sub = body.subscription;
  if (!sub || !sub.endpoint) return json({ error: action + ' needs a subscription' }, 400, cors);

  if (action === 'testPush') {
    if (!env.VAPID_PRIVATE_JWK) return json({ error: 'Push not configured: set the VAPID_PRIVATE_JWK secret on the worker.' }, 503, cors);
    const status = await sendPush(sub, JSON.stringify({ title: '🧬 Well-Being OS', body: 'Background push works — alerts reach you even when the app is closed.' }), env);
    return json({ ok: status >= 200 && status < 300, status }, 200, cors);
  }

  if (!env.SUBS) return json({ error: 'Push not configured: bind a KV namespace named SUBS to the worker.' }, 503, cors);
  const id = await subId(sub.endpoint);
  if (action === 'deleteSub') { await env.SUBS.delete('sub:' + id); return json({ ok: true, removed: true }, 200, cors); }
  await env.SUBS.put('sub:' + id, JSON.stringify({ sub, tz: body.tz || 'UTC', schedule: body.schedule || [] }));
  return json({ ok: true, id, scheduled: (body.schedule || []).length }, 200, cors);
}

async function runSchedule(env, now) {
  if (!env.SUBS || !env.VAPID_PRIVATE_JWK) return;
  const list = await env.SUBS.list({ prefix: 'sub:' });
  for (const k of list.keys) {
    const v = await env.SUBS.get(k.name);
    if (!v) continue;
    let rec; try { rec = JSON.parse(v); } catch { continue; }
    const { wd, min, localDate } = localNow(rec.tz || 'UTC', now);
    for (const r of (rec.schedule || [])) {
      if (r.wd !== wd) continue;
      if (r.min > min || r.min < min - 4) continue; // due within the last 5-minute tick
      const sentKey = 'sent:' + k.name.slice(4) + ':' + localDate + ':' + r.min;
      if (await env.SUBS.get(sentKey)) continue; // already fired today
      let status = 0;
      try { status = await sendPush(rec.sub, JSON.stringify({ title: r.title || '🧬 Well-Being OS', body: r.body || '' }), env); } catch { status = 0; }
      if (status === 404 || status === 410) { await env.SUBS.delete(k.name); }
      else { await env.SUBS.put(sentKey, '1', { expirationTtl: 3600 }); }
    }
  }
}

function localNow(tz, date) {
  let p = {};
  try {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' });
    for (const part of f.formatToParts(date)) p[part.type] = part.value;
  } catch { return { wd: -1, min: -1, localDate: '' }; }
  const wdMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  let hour = parseInt(p.hour, 10); if (hour === 24) hour = 0;
  return { wd: wdMap[p.weekday], min: hour * 60 + parseInt(p.minute, 10), localDate: p.year + '-' + p.month + '-' + p.day };
}

async function subId(endpoint) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return bufToB64url(new Uint8Array(h)).slice(0, 22);
}

async function sendPush(sub, payload, env) {
  const endpoint = sub.endpoint;
  const body = await encryptPayload(sub, payload);
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const jwt = await vapidJWT(new URL(endpoint).origin, env, jwk);
  const k = bufToB64url(concat(new Uint8Array([4]), b64urlToBuf(jwk.x), b64urlToBuf(jwk.y)));
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '300',
      'Authorization': 'vapid t=' + jwt + ', k=' + k,
    },
    body,
  });
  return res.status;
}

async function vapidJWT(audience, env, jwk) {
  const enc = (o) => bufToB64url(new TextEncoder().encode(JSON.stringify(o)));
  const header = enc({ typ: 'JWT', alg: 'ES256' });
  const payload = enc({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:admin@wellbeing.app' });
  const unsigned = header + '.' + payload;
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  return unsigned + '.' + bufToB64url(new Uint8Array(sig));
}

async function encryptPayload(sub, payload) {
  const uaPublic = b64urlToBuf(sub.keys.p256dh);
  const authSecret = b64urlToBuf(sub.keys.auth);
  const asKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256));

  const hkdf = async (salt, ikm, info, len) => {
    const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
  };
  const te = (s) => new TextEncoder().encode(s);
  const keyInfo = concat(te('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdh, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te('Content-Encoding: nonce\0'), 12);

  const data = te(payload);
  const record = concat(data, new Uint8Array([2])); // 0x02 = last-record delimiter
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, record));

  const rs = new Uint8Array(4); new DataView(rs.buffer).setUint32(0, 4096);
  const head = concat(salt, rs, new Uint8Array([asPublic.length]), asPublic);
  return concat(head, ct);
}

function b64urlToBuf(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s); const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}
function bufToB64url(buf) {
  const b = new Uint8Array(buf); let bin = '';
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function concat(...arrs) {
  let len = 0; for (const a of arrs) len += a.length;
  const out = new Uint8Array(len); let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

// Named exports for local testing (ignored by the Workers runtime).
export { vapidJWT, encryptPayload, sendPush, localNow, runSchedule };

/* ---------- Notion API helpers ---------- */
async function notion(env, method, path, payload) {
  const res = await fetch('https://api.notion.com' + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + env.NOTION_TOKEN,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('Notion ' + res.status + ': ' + (data.message || JSON.stringify(data)));
  return data;
}

async function appendInChunks(env, blockId, blocks) {
  for (let i = 0; i < blocks.length; i += 100) {
    await notion(env, 'PATCH', '/v1/blocks/' + blockId + '/children', { children: blocks.slice(i, i + 100) });
  }
}

/* ---------- Markdown → Notion blocks (small subset) ---------- */
function mdToBlocks(md) {
  const out = [];
  for (const raw of String(md).split('\n')) {
    const line = raw.replace(/\r$/, '');
    const t = line.trim();
    if (t === '') continue;
    if (t === '---') { out.push({ object: 'block', type: 'divider', divider: {} }); continue; }
    if (line.startsWith('### ')) { out.push(block('heading_3', line.slice(4))); continue; }
    if (line.startsWith('## ')) { out.push(block('heading_2', line.slice(3))); continue; }
    if (line.startsWith('# ')) { out.push(block('heading_1', line.slice(2))); continue; }
    if (line.startsWith('> ')) { out.push(block('quote', line.slice(2))); continue; }
    if (line.startsWith('- ')) { out.push(block('bulleted_list_item', line.slice(2))); continue; }
    if (/^\d+\.\s/.test(line)) { out.push(block('numbered_list_item', line.replace(/^\d+\.\s/, ''))); continue; }
    out.push(block('paragraph', line));
  }
  return out;
}

function block(type, text) {
  return { object: 'block', type, [type]: { rich_text: richText(text) } };
}

// Inline **bold** support; everything else is plain text.
function richText(text) {
  const parts = String(text).split('**');
  const rt = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '') continue;
    rt.push({ type: 'text', text: { content: trunc(parts[i], 2000) }, annotations: { bold: i % 2 === 1 } });
  }
  if (rt.length === 0) rt.push({ type: 'text', text: { content: '' } });
  return rt;
}

/* ---------- misc ---------- */
function clean(id) { return String(id).replace(/-/g, ''); }
function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n) : s; }
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
