// Graphix Prompt Studio backend (v1.5). Plain Node, no dependencies.
//   POST /api/refine    { prompt, provider?, reference?, researchUrl?, researchText? } -> { text, provider }
//   GET  /api/research?url=...                                                         -> { research: { title, description, text } }
//   GET  /api/health                                                                   -> { ok, providers }
// Keys come only from environment variables and are never sent to the browser.
import http from 'node:http';
import dns from 'node:dns/promises';
import net from 'node:net';

const env = process.env;
const PORT = Number(env.PORT) || 3000;
const GEMINI_MODEL = env.GEMINI_MODEL || 'gemini-3.6-flash';
const ANTHROPIC_MODEL = env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const ORIGINS = (env.ALLOWED_ORIGINS || 'https://prompt.graphixdesign.agency').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_BODY = 64 * 1024;

const SYSTEM = `You are a senior prompt engineer at a creative agency. Rewrite the user's prompt so it is clearer, more specific and ready to paste into the target tool.
Keep every fact, name, product rule, language and constraint the user gave. Do not invent brands, people or claims.
If a reference block is given, the result must match the reference exactly: same person, product and location, no redesign, no added effects, people or actions.
Return only the improved prompt, as plain text with short labelled sections. No preamble.`;

const providers = () => ({ gemini: Boolean(env.GEMINI_API_KEY), claude: Boolean(env.ANTHROPIC_API_KEY) });

// ---------- tiny rate limit: 30 requests / 10 min per IP ----------
const hits = new Map();
function limited(ip) {
  const now = Date.now(), w = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < w);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < w)) hits.delete(k);
  return list.length > 30;
}

function send(res, status, data, origin) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' };
  if (origin && ORIGINS.includes(origin)) { h['Access-Control-Allow-Origin'] = origin; h['Access-Control-Allow-Headers'] = 'Content-Type'; h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'; }
  res.writeHead(status, h); res.end(status === 204 ? undefined : JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const parts = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(new Error('too_large')); req.destroy(); } else parts.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch { reject(new Error('bad_json')); } });
    req.on('error', reject);
  });
}

const clip = (s, n) => String(s || '').slice(0, n);

async function callGemini(user) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, {
    method: 'POST', signal: AbortSignal.timeout(60000),
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: 0.6 } }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('gemini_' + r.status);
  const text = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
  if (!text) throw new Error('gemini_empty');
  return text;
}

async function callClaude(user) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(60000),
    headers: { 'Content-Type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 2000, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('claude_' + r.status);
  const text = (d.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!text) throw new Error('claude_empty');
  return text;
}

async function refine(body) {
  const prompt = clip(body.prompt, 20000).trim();
  if (!prompt) throw Object.assign(new Error('prompt_required'), { status: 400 });
  let user = `PROMPT TO IMPROVE:\n${prompt}`;
  if (body.reference) user += `\n\nREFERENCE (must be matched exactly):\n${clip(body.reference, 4000)}`;
  if (body.researchUrl || body.researchText) user += `\n\nRESEARCH CONTEXT${body.researchUrl ? ' from ' + clip(body.researchUrl, 500) : ''}:\n${clip(body.researchText, 4000)}`;
  const want = String(body.provider || '').toLowerCase();
  const order = want.includes('claude') || want.includes('anthropic') ? ['claude', 'gemini'] : ['gemini', 'claude'];
  const p = providers(); let last = 'no_provider_configured';
  for (const name of order) {
    if (!p[name]) continue;
    try { return { text: name === 'claude' ? await callClaude(user) : await callGemini(user), provider: name }; }
    catch (e) { last = e.message; console.error('refine', name, e.message); }
  }
  throw Object.assign(new Error(last), { status: 502 });
}

// ---------- research: fetch a public page safely ----------
function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const x = ip.toLowerCase();
  if (x.startsWith('::ffff:')) return privateIp(x.slice(7));
  return x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80');
}
async function assertPublic(u) {
  if (!['http:', 'https:'].includes(u.protocol)) throw Object.assign(new Error('only_http_urls'), { status: 400 });
  if (u.port && !['80', '443'].includes(u.port)) throw Object.assign(new Error('port_not_allowed'), { status: 400 });
  const addrs = net.isIP(u.hostname) ? [{ address: u.hostname }] : await dns.lookup(u.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => privateIp(a.address))) throw Object.assign(new Error('address_not_allowed'), { status: 400 });
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const meta = (html, name) => {
  const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i'));
  const c = m && m[0].match(/content=["']([^"']*)["']/i);
  return c ? decode(c[1]).trim() : '';
};
async function research(raw) {
  let u; try { u = new URL(String(raw || '')); } catch { throw Object.assign(new Error('bad_url'), { status: 400 }); }
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(u);
    const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'GraphixPromptStudio/1.5 (+https://prompt.graphixdesign.agency)', Accept: 'text/html' } });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = new URL(r.headers.get('location'), u); continue; }
    if (!r.ok) throw Object.assign(new Error('fetch_' + r.status), { status: 502 });
    if (!/html|text/i.test(r.headers.get('content-type') || '')) throw Object.assign(new Error('not_a_web_page'), { status: 415 });
    // read at most 1.5 MB
    const reader = r.body.getReader(); const chunks = []; let n = 0;
    while (n < 1_500_000) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); n += value.length; }
    reader.cancel().catch(() => {});
    const html = Buffer.concat(chunks).toString('utf8');
    const title = meta(html, 'og:title') || decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
    const description = meta(html, 'description') || meta(html, 'og:description');
    const text = decode(html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 4000);
    return { url: u.href, title: title.slice(0, 300), description: description.slice(0, 1000), text };
  }
  throw Object.assign(new Error('too_many_redirects'), { status: 502 });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url, 'http://x');
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  try {
    if (req.method === 'OPTIONS') return send(res, 204, null, origin);
    if (origin && !ORIGINS.includes(origin)) return send(res, 403, { error: 'origin_not_allowed' }, origin);
    if (url.pathname === '/api/health') return send(res, 200, { ok: true, providers: providers() }, origin);
    if (limited(ip)) return send(res, 429, { error: 'too_many_requests' }, origin);
    if (url.pathname === '/api/refine' && req.method === 'POST') return send(res, 200, await refine(await readJson(req)), origin);
    if (url.pathname === '/api/research' && req.method === 'GET') return send(res, 200, { research: await research(url.searchParams.get('url')) }, origin);
    return send(res, 404, { error: 'not_found' }, origin);
  } catch (e) {
    return send(res, e.status || (e.message === 'too_large' || e.message === 'bad_json' ? 400 : 500), { error: e.message || 'error' }, origin);
  }
});
server.listen(PORT, () => console.log(`Prompt Studio backend on :${PORT} — gemini:${providers().gemini} claude:${providers().claude}`));
