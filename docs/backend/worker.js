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
 *
 * Actions (POST JSON body):
 *   { action: "ping" }
 *   { action: "createPage", parentId, title, markdown }
 *   { action: "appendBlocks", pageId, markdown }
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
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405, cors);

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
};

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
