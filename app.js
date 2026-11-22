/* Graphix Prompt Studio — standalone, no server needed.
   Library & History live in localStorage. Generate is fully client-side. */
'use strict';

const KINDS = {
  image:     { label: 'Image', desc: 'Ads, hero shots & lifestyle photos', tools: ['Midjourney','DALL·E','Firefly','Stable Diffusion','Imagen'] },
  video:     { label: 'Video & UGC', desc: 'UGC ads, social video & demos', tools: ['Runway','Veo','Kling','Pika','Sora'] },
  social:    { label: 'Social Copy', desc: 'Captions, carousels & ad copy', tools: ['ChatGPT','Claude','Gemini','Copy.ai'] },
  seo:       { label: 'SEO & Content', desc: 'Briefs, pages & content calendars', tools: ['ChatGPT','Claude','Gemini','Surfer'] },
  brand:     { label: 'Brand & Logo', desc: 'Logos, identity & naming', tools: ['Midjourney','DALL·E','ChatGPT','Claude','Looka'] },
  chat:      { label: 'Chat Prompt', desc: 'Assistant & workflow prompts', tools: ['ChatGPT','Claude','Gemini','Perplexity'] },
};

const DIRECTIONS = {
  image:  [['Style',['Photorealistic','Cinematic','Studio','Editorial','Minimal','Vibrant']],['Format',['1:1 square','9:16 vertical','16:9 landscape','4:5 portrait']],['Mood',['Bold','Warm','Premium','Playful','Calm','Luxury']],['Lighting',['Natural','Studio softbox','Golden hour','Dramatic']]],
  video:  [['Hook',['Problem first','Bold claim','Question','Before / after','Story']],['Camera',['iPhone selfie','Handheld','Tripod','Drone','Close-up']],['Duration',['10 seconds','15 seconds','30 seconds','60 seconds']],['Lighting',['Natural imperfect','Bright home','Golden hour','Studio']],['Style',['UGC realistic','Cinematic','Documentary','Playful']]],
  social: [['Goal',['Clicks','Shares','Sign-ups','Sales','Awareness']],['Tone',['Friendly','Bold','Funny','Premium','Urgent']],['Format',['Single post','Carousel','Reel caption','Story']],['Language',['English','Sinhala','Tamil','Tanglish']]],
  seo:    [['Goal',['Rank on Google','Answer AI search','Convert visitors','Build authority']],['Format',['Service page','Blog post','Landing page','FAQ']],['Tone',['Helpful expert','Bold','Friendly','Technical']],['Language',['English','Sinhala','Tamil']]],
  brand:  [['Style',['Minimal','Bold','Playful','Luxury','Retro']],['Format',['Logo mark','Wordmark','Full identity','Mascot']],['Mood',['Trustworthy','Energetic','Premium','Friendly']],['Colour',['Black & orange','Cream & black','Monochrome','Vibrant']]],
  chat:   [['Role',['Assistant','Analyst','Writer','Coach']],['Output',['Step-by-step','Table','Bullet list','Short answer']],['Tone',['Helpful','Precise','Creative','Concise']],['Language',['English','Sinhala','Tamil']]],
};

const TEMPLATES = {
  parcel: {
    name: 'Parcel LK — social post', kind: 'social', tool: 'ChatGPT',
    brief: 'Write a Facebook and Instagram post for Parcel LK, the Sri Lankan international courier that delivers to all 25 districts and overseas, with real-time tracking and ISO 9001:2015 certification. Announce fast, reliable delivery from Colombo to anywhere in the world.',
    company: 'Parcel LK', audience: 'Sri Lankan customers sending parcels overseas',
    picks: { Goal: 'Sales', Tone: 'Friendly', Format: 'Single post', Language: 'English' },
  },
  maharaja: {
    name: 'Tamil Maharaja UGC video', kind: 'video', tool: 'Veo',
    brief: 'A 10-second Tamil UGC video. Jeewa, a realistic young Tamil woman with long dark hair and natural makeup, films herself iPhone selfie-style in natural, imperfect light. She shows ONLY the given Maharaja Roasted Red Rice Flour packet — do not change the packet design, do not show any cooking or making. She says in Tamil "Maharaja varuththa sivappu arisi maa", that dinner will be pittu, and how the taste is.',
    company: 'Maharaja Food Products', audience: 'Tamil-speaking home cooks',
    picks: { Hook: 'Story', Camera: 'iPhone selfie', Duration: '10 seconds', Lighting: 'Natural imperfect', Style: 'UGC realistic' },
  },
  seo: {
    name: 'SEO service-page brief', kind: 'seo', tool: 'Claude',
    brief: 'Write an SEO content brief for a Graphix Design Agency service page about SEO services in Colombo, Sri Lanka — targeting businesses that want to rank on Google and be found in AI search.',
    company: 'Graphix Design Agency', audience: 'Sri Lankan business owners',
    picks: { Goal: 'Rank on Google', Format: 'Service page', Tone: 'Helpful expert', Language: 'English' },
  },
  hero: {
    name: 'Product hero shot', kind: 'image', tool: 'Midjourney',
    brief: 'A premium product hero shot of a courier parcel box on a warm cream background, with soft shadows and a bold orange accent, shot like a high-end e-commerce campaign.',
    company: 'Parcel LK', audience: 'Online shoppers',
    picks: { Style: 'Studio', Format: '1:1 square', Mood: 'Premium', Lighting: 'Studio softbox' },
  },
  logo: {
    name: 'Brand & logo concept', kind: 'brand', tool: 'Midjourney',
    brief: 'Design a bold, minimal logo mark for a Colombo design studio called Graphix — black, cream and hot orange, a mark that suggests motion and flow, and works at tiny sizes.',
    company: 'Graphix Design Agency', audience: 'The studio team',
    picks: { Style: 'Minimal', Format: 'Logo mark', Mood: 'Energetic', Colour: 'Black & orange' },
  },
  chatprompt: {
    name: 'Chat prompt — weekly planner', kind: 'chat', tool: 'ChatGPT',
    brief: 'Act as my weekly content planner. Ask me for my three priorities, then build a 5-day posting plan for Facebook and Instagram with one post idea per day, a hook for each, and the best time to post in Sri Lanka.',
    company: 'Graphix Design Agency', audience: 'The marketing team',
    picks: { Role: 'Coach', Output: 'Table', Tone: 'Helpful', Language: 'English' },
  },
};

const state = {
  kind: 'video', tool: 'Veo', picks: {},
  lastPrompt: '', lastTitle: '',
};

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function renderKinds() {
  $('kindList').innerHTML = Object.entries(KINDS).map(([k, v]) =>
    `<button class="kind-btn ${state.kind === k ? 'active' : ''}" data-kind="${k}" role="tab" aria-selected="${state.kind === k}">${esc(v.label)}<small>${esc(v.desc)}</small></button>`).join('');
  document.querySelectorAll('.kind-btn').forEach(b => b.onclick = () => { state.kind = b.dataset.kind; state.tool = KINDS[state.kind].tools[0]; state.picks = {}; renderAll(); updatePreview(); });
}
function renderTools() {
  $('toolList').innerHTML = KINDS[state.kind].tools.map(t =>
    `<button class="chip ${state.tool === t ? 'active' : ''}" data-tool="${esc(t)}">${esc(t)}</button>`).join('');
  document.querySelectorAll('#toolList .chip').forEach(b => b.onclick = () => { state.tool = b.dataset.tool; renderTools(); updatePreview(); });
}
function renderDirections() {
  $('directionGroups').innerHTML = DIRECTIONS[state.kind].map(([group, opts]) =>
    `<div class="dir-group"><h3>${esc(group)}</h3><div class="chip-row">${opts.map(o =>
      `<button class="chip ${state.picks[group] === o ? 'active' : ''}" data-group="${esc(group)}" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`).join('');
  document.querySelectorAll('#directionGroups .chip').forEach(b => b.onclick = () => {
    state.picks[b.dataset.group] = b.dataset.opt; renderDirections(); updatePreview();
  });
}
function renderTemplates() {
  $('templateList').innerHTML = Object.entries(TEMPLATES).map(([k, t]) =>
    `<button class="template-btn" data-tpl="${k}"><strong>${esc(t.name)}</strong><span>${esc(KINDS[t.kind].label)} · ${esc(t.tool)}</span></button>`).join('');
  document.querySelectorAll('.template-btn').forEach(b => b.onclick = () => loadTemplate(b.dataset.tpl));
}
function loadTemplate(key) {
  const t = TEMPLATES[key]; if (!t) return;
  state.kind = t.kind; state.tool = t.tool; state.picks = { ...t.picks };
  $('brief').value = t.brief; $('company').value = t.company; $('audience').value = t.audience;
  renderAll(); updatePreview();
  $('statusLine').textContent = `Loaded template: ${t.name} — hit Generate.`;
  document.getElementById('builder').scrollIntoView({ behavior: 'smooth' });
}

function directionText() {
  return Object.entries(state.picks).map(([g, o]) => `${g}: ${o}`).join(' · ');
}
function livePreview() {
  const brief = $('brief').value.trim();
  const company = $('company').value.trim();
  const audience = $('audience').value.trim();
  const dir = directionText();
  let s = '';
  if (brief) s += brief;
  if (company) s += `\n\nFor: ${company}.`;
  if (audience) s += ` Audience: ${audience}.`;
  if (dir) s += `\nDirection — ${dir}.`;
  return s;
}
function updatePreview() {
  if (!state.lastPrompt) {
    const p = livePreview();
    if (p) { $('output').textContent = p + '\n\n— Live preview. Hit Generate for the full compiled prompt.'; }
  }
  updateCounts();
}
function updateCounts() {
  const text = $('output').textContent || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  $('wordCount').textContent = `${words} words`;
  const filled = [$('brief').value, $('company').value, $('audience').value].filter(Boolean).length + Object.keys(state.picks).length;
  $('completeness').textContent = `Completeness: ${Math.min(100, Math.round((filled / 7) * 100))}%`;
}

function generatePrompt() {
  const brief = $('brief').value.trim();
  if (!brief) { $('statusLine').textContent = 'Write a brief first — one sentence is enough.'; $('brief').focus(); return null; }
  const kind = KINDS[state.kind];
  const company = $('company').value.trim();
  const audience = $('audience').value.trim();
  const dir = directionText();
  const title = company ? `${kind.label} prompt — ${company}` : `${kind.label} prompt`;

  let prompt = `You are a world-class ${kind.label.toLowerCase()} specialist working for ${company || 'this project'}${audience ? `, for ${audience}` : ''}.\n\nTASK\n${brief}\n\nTARGET TOOL\n${state.tool} — write the output so it can be pasted straight into ${state.tool} with no editing.`;
  if (dir) prompt += `\n\nDIRECTION\n${dir}`;
  if (state.kind === 'video') {
    prompt += `\n\nCONTINUITY\nKeep the same person, same location and same look across every clip. No transitions between clips — each clip must continue seamlessly from the one before it, as one continuous video.`;
  }
  if (state.kind === 'image') {
    prompt += `\n\nQUALITY\nPhotorealistic, sharp, correctly exposed, no distorted hands, no garbled text, no watermark.`;
  }
  prompt += `\n\nOUTPUT\nGive the finished ${kind.label.toLowerCase()} result only, ready to use. Keep it tight, specific and on-brand: black, cream and hot orange where visuals are involved.`;

  const variations = [
    `Shorter, punchier version: ${brief} Keep the same direction (${dir || 'as briefed'}), but cut every unnecessary word and lead with the strongest line.`,
    `Bolder version: ${brief} Turn the energy up — stronger hook, bolder claim, more contrast — while keeping the facts and the product exactly as briefed.`,
    `Warmer, story-led version: ${brief} Open with a small human moment, then the product, then the payoff. Same direction (${dir || 'as briefed'}), softer tone.`,
  ];
  const tips = [];
  if (state.kind === 'video') tips.push('Say the product name exactly as written — in the Maharaja video that is "Maharaja varuththa sivappu arisi maa".', 'Show the packet exactly as it is; never redesign it in the prompt.', 'One clear action per clip keeps the joins seamless.');
  if (state.kind === 'social') tips.push('Put the hook in the first line — most people never read past it.', 'One call to action per post.', 'Add the tracking or contact detail at the end, not the start.');
  if (state.kind === 'seo') tips.push('Answer the searcher’s question in the first paragraph.', 'Use the exact service + place phrase ("SEO services in Colombo") in the title and first heading.', 'Add one FAQ that matches how people actually ask the question.');
  if (state.kind === 'image') tips.push('Name the background colour and the light — vague prompts give vague images.', 'Ask for no text in the image unless the wording is exact.');
  if (state.kind === 'brand') tips.push('Test the mark at 16px — if it is unreadable there, simplify it.', 'Keep it to two colours plus one accent.');
  if (state.kind === 'chat') tips.push('Give the assistant a role, an output format and a stopping rule.', 'Ask it to ask you one clarifying question before it starts.');
  tips.push('If the first result is close but not right, change one direction at a time and regenerate.');

  const negative = state.kind === 'video'
    ? 'No cooking or making shown unless the brief asks for it. No changed packet design, no extra people, no perfect studio lighting, no AI-looking face, no transitions, no subtitles, no watermark.'
    : state.kind === 'image'
    ? 'No distorted hands or faces, no garbled text, no watermark, no extra objects, no washed-out colours.'
    : 'No generic filler, no clichés, no exaggerated claims, no irrelevant hashtags, no off-brand tone.';

  state.lastPrompt = prompt; state.lastTitle = title;
  $('output').textContent = prompt;
  $('extraOutput').innerHTML =
    `<div class="extra"><h3>Negative prompt / avoid</h3><p>${esc(negative)}</p>` +
    `<h3>3 variations</h3><ul>${variations.map(v => `<li>${esc(v)}</li>`).join('')}</ul>` +
    `<h3>Tips</h3><ul>${tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  $('statusLine').textContent = 'Generated. Copy it, or save it to your Library.';
  addHistory(title, prompt);
  updateCounts();
  return prompt;
}

function improvePrompt() {
  const rough = $('brief').value.trim();
  if (!rough) { $('statusLine').textContent = 'Paste your rough prompt in the brief box first, then hit Improve.'; $('brief').focus(); return; }
  const improved = `IMPROVED PROMPT\n\nYou are a ${KINDS[state.kind].label.toLowerCase()} specialist. Rewrite and sharpen this rough prompt, keeping every fact and product detail exactly as written, and removing vagueness:\n\n"${rough}"\n\nMake it specific: name the audience${$('audience').value.trim() ? ` (${$('audience').value.trim()})` : ''}, the setting, the action and the desired outcome. ${directionText() ? `Direction: ${directionText()}. ` : ''}Target tool: ${state.tool}. Return only the improved prompt, ready to paste into ${state.tool}.`;
  state.lastPrompt = improved; state.lastTitle = `Improved — ${$('company').value.trim() || KINDS[state.kind].label}`;
  $('output').textContent = improved;
  $('extraOutput').innerHTML = `<div class="extra"><h3>What changed</h3><ul><li>Added a clear role and target tool.</li><li>Kept every product fact exactly as you wrote it.</li><li>Made the audience, setting and outcome explicit.</li></ul></div>`;
  $('statusLine').textContent = 'Improved. Copy it, or save it to your Library.';
  addHistory(state.lastTitle, improved);
  updateCounts();
}

function getLibrary() { return store.get('gps_library', []); }
function getHistory() { return store.get('gps_history', []); }
function saveToLibrary() {
  const prompt = state.lastPrompt || $('output').textContent.trim();
  if (!prompt || prompt.startsWith('Your compiled prompt')) { $('statusLine').textContent = 'Generate a prompt first, then save it.'; return; }
  const lib = getLibrary();
  lib.unshift({ id: Date.now(), title: state.lastTitle || 'Untitled prompt', kind: state.kind, tool: state.tool, prompt, fav: false, savedAt: new Date().toISOString() });
  store.set('gps_library', lib); renderLibrary(); $('statusLine').textContent = 'Saved to Library.';
}
function addHistory(title, prompt) {
  const h = getHistory();
  h.unshift({ id: Date.now(), title, prompt, at: new Date().toISOString() });
  store.set('gps_history', h.slice(0, 30)); renderHistory();
}
function renderLibrary() {
  const q = ($('librarySearch').value || '').toLowerCase();
  const lib = getLibrary().filter(i => !q || (i.title + ' ' + i.prompt).toLowerCase().includes(q));
  $('savedCount').textContent = getLibrary().length;
  $('libraryList').innerHTML = lib.length ? lib.map(i =>
    `<div class="saved-item"><strong>${esc(i.title)}</strong><span class="meta">${esc(i.kind)} · ${esc(i.tool)} · ${new Date(i.savedAt).toLocaleString()}</span><div class="actions"><button class="mini-btn" data-copy="${i.id}">Copy</button><button class="mini-btn ${i.fav ? 'fav' : ''}" data-fav="${i.id}">${i.fav ? '★ Favourite' : '☆ Favourite'}</button><button class="mini-btn" data-del="${i.id}">Delete</button></div></div>`).join('')
    : '<p class="empty">Nothing saved yet. Generate a prompt and hit “Save to Library”.</p>';
  bindSavedList($('libraryList'), getLibrary(), (v) => store.set('gps_library', v), renderLibrary);
}
function renderHistory() {
  const h = getHistory();
  $('historyList').innerHTML = h.length ? h.map(i =>
    `<div class="saved-item"><strong>${esc(i.title)}</strong><span class="meta">${new Date(i.at).toLocaleString()}</span><div class="actions"><button class="mini-btn" data-copy="${i.id}">Copy</button><button class="mini-btn" data-load="${i.id}">Load</button></div></div>`).join('')
    : '<p class="empty">No generations yet.</p>';
  $('historyList').querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copyText(getHistory().find(i => i.id == b.dataset.copy)?.prompt || ''));
  $('historyList').querySelectorAll('[data-load]').forEach(b => b.onclick = () => {
    const item = getHistory().find(i => i.id == b.dataset.load); if (!item) return;
    state.lastPrompt = item.prompt; state.lastTitle = item.title; $('output').textContent = item.prompt; $('extraOutput').innerHTML = ''; updateCounts();
  });
}
function bindSavedList(el, list, saveFn, rerender) {
  el.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copyText(list.find(i => i.id == b.dataset.copy)?.prompt || ''));
  el.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => { const it = list.find(i => i.id == b.dataset.fav); if (it) it.fav = !it.fav; saveFn(list); rerender(); });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { saveFn(list.filter(i => i.id != b.dataset.del)); rerender(); });
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); $('statusLine').textContent = 'Copied to clipboard.'; }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); $('statusLine').textContent = 'Copied to clipboard.'; }
}

function renderAll() { renderKinds(); renderTools(); renderDirections(); renderTemplates(); }

document.addEventListener('DOMContentLoaded', () => {
  renderAll(); renderLibrary(); renderHistory(); updateCounts();
  ['brief', 'company', 'audience'].forEach(id => $(id).addEventListener('input', updatePreview));
  $('generateBtn').onclick = generatePrompt;
  $('improveBtn').onclick = improvePrompt;
  $('clearBtn').onclick = () => { $('brief').value = ''; $('company').value = ''; $('audience').value = ''; state.picks = {}; state.lastPrompt = ''; $('output').textContent = 'Your compiled prompt will appear here.'; $('extraOutput').innerHTML = ''; renderDirections(); updatePreview(); $('statusLine').textContent = ''; };
  $('copyBtn').onclick = () => copyText(state.lastPrompt || $('output').textContent);
  $('saveBtn').onclick = saveToLibrary;
  $('librarySearch').addEventListener('input', renderLibrary);
  $('clearHistoryBtn').onclick = () => { store.set('gps_history', []); renderHistory(); };
});

/* Exported for local verification (node): */
if (typeof module !== 'undefined') module.exports = { KINDS, TEMPLATES };
