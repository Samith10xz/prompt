/* Graphix Prompt Studio — Member area (v1.1, local demo).
   No real accounts: a member "signs in" with a name + email that are
   stored only in this browser's localStorage, clearly labelled as a
   local demo. Image generation is HONEST: it only calls a provider when
   the member has linked their own image API key; otherwise it shows the
   prompt ready to paste and links to open it in an image tool. It never
   fakes a generated image. */
'use strict';
var $ = function (id) { return document.getElementById(id); };
var store = {
  get: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

function renderMember() {
  var m = store.get('gps_member', null);
  var signedIn = $('signedIn'), signedOut = $('signedOut');
  if (m) {
    if (signedIn) { signedIn.style.display = 'block'; signedOut.style.display = 'none'; $('memberName').textContent = m.name; $('memberEmail').textContent = m.email; }
  } else {
    if (signedIn) { signedIn.style.display = 'none'; signedOut.style.display = 'block'; }
  }
  var last = store.get('gps_last_prompt', null);
  var box = $('lastPromptBox');
  if (box) {
    if (last && last.prompt) { box.textContent = last.prompt; $('imagePrompt').value = last.prompt; }
    else box.textContent = 'No prompt generated yet in this browser. Go to the Builder, generate a prompt, then come back here.';
  }
  var k = store.get('gps_ai_key', null);
  var ks = $('imgKeyStatus');
  if (ks) ks.textContent = k ? 'Image key linked: ' + k.provider + ' (stored in this browser only).' : 'No image API key linked. You can still check the result by pasting the prompt into an image tool — see the links below.';
}

async function generateImage() {
  var prompt = ($('imagePrompt').value || '').trim();
  var status = $('imgStatus'), out = $('imgResult');
  if (!prompt) { status.textContent = 'Paste or load a prompt first.'; return; }
  var k = store.get('gps_ai_key', null);
  if (!k || !k.key) {
    status.textContent = 'No image API key linked — no image was generated. Your prompt is ready below: copy it and open it in an image tool.';
    out.innerHTML = '<p class="notice"><strong>Check it yourself:</strong> copy the prompt, then open it in one of these tools and paste it in.</p>' +
      '<p><a class="btn btn-orange" href="https://chat.openai.com/" target="_blank" rel="noopener">Open in ChatGPT / DALL·E ↗</a> ' +
      '<a class="btn btn-ghost" href="https://gemini.google.com/" target="_blank" rel="noopener">Open in Gemini ↗</a> ' +
      '<a class="btn btn-ghost" href="https://firefly.adobe.com/" target="_blank" rel="noopener">Open in Adobe Firefly ↗</a></p>';
    return;
  }
  status.textContent = 'Calling ' + k.provider + ' with your linked key…';
  try {
    if (k.provider === 'openai') {
      var res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + k.key },
        body: JSON.stringify({ model: 'dall-e-3', prompt: prompt, size: '1024x1024', n: 1 }),
      });
      if (!res.ok) throw new Error('OpenAI returned ' + res.status);
      var data = await res.json();
      var url = data && data.data && data.data[0] && data.data[0].url;
      if (!url) throw new Error('No image URL returned.');
      out.innerHTML = '<img class="result-img" src="' + esc(url) + '" alt="Image generated from your prompt by the linked provider">';
      status.textContent = 'Image generated with your linked OpenAI key. Does it match the prompt? If not, tighten one detail in the prompt and try again.';
      return;
    }
    // Gemini / Claude do not offer a direct browser image-generation call
    // from a static site — say so honestly instead of faking one.
    status.textContent = 'Your linked provider (' + k.provider + ') does not offer a direct browser image call from a static site, so no image was generated. Use the links below to check the prompt in that provider’s own tool.';
    out.innerHTML = '<p><a class="btn btn-orange" href="https://gemini.google.com/" target="_blank" rel="noopener">Open in Gemini ↗</a> ' +
      '<a class="btn btn-ghost" href="https://firefly.adobe.com/" target="_blank" rel="noopener">Open in Adobe Firefly ↗</a></p>';
  } catch (e) {
    status.textContent = 'Image generation did not work (' + e.message + '). No image was faked — check your key, then try again, or use the paste-into-a-tool links above.';
  }
}


/* ---- Reference upload + style match (v1.2) ----
   Files are previewed in this browser only (object URLs / data URLs in
   memory) and are never uploaded anywhere. The description fields are
   saved to localStorage (gps_reference_desc) so the block survives a
   reload; the files themselves are not stored. The block follows the
   reference-fidelity rules: lock the reference, same person/product/
   location, no redesign, no added effects, people or actions. */
var refFiles = { images: [], video: null };

function renderRefPreview() {
  var host = $('refPreview'); if (!host) return;
  host.innerHTML = '';
  refFiles.images.forEach(function (f, i) {
    var img = document.createElement('img');
    img.className = 'ref-thumb'; img.alt = 'Reference image ' + (i + 1) + ': ' + f.name;
    img.src = f.dataUrl; host.appendChild(img);
  });
  if (refFiles.video) {
    var v = document.createElement('video');
    v.className = 'ref-thumb'; v.controls = true; v.src = refFiles.video.url;
    v.setAttribute('aria-label', 'Reference video: ' + refFiles.video.name);
    host.appendChild(v);
  }
  var st = $('refStatus');
  if (st) st.textContent = refFiles.images.length + ' reference image(s)' + (refFiles.video ? ', 1 reference video (' + refFiles.video.name + ')' : '') + ' loaded — preview only, in this browser.';
}

function readFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.onerror = reject; r.readAsDataURL(file);
  });
}

function buildRefBlock() {
  var subject = ($('refSubject').value || '').trim();
  var product = ($('refProduct').value || '').trim();
  var colours = ($('refColours').value || '').trim();
  var lighting = ($('refLighting').value || '').trim();
  var camera = ($('refCamera').value || '').trim();
  var mood = ($('refMood').value || '').trim();
  var files = [];
  refFiles.images.forEach(function (f) { files.push('image: ' + f.name); });
  if (refFiles.video) files.push('video: ' + refFiles.video.name);
  if (!subject && !product && !files.length) {
    $('refBlock').textContent = 'Upload a reference image or video and fill in at least the subject or the product first.';
    return null;
  }
  var block = 'REFERENCE MATCH — lock this reference exactly.\n'
    + (files.length ? 'Reference file(s): ' + files.join(', ') + '.\n' : '')
    + (subject ? 'Subject / person: ' + subject + '. Keep the same face, hair, outfit and expression — do not change the person.\n' : '')
    + (product ? 'Product: ' + product + '. Show it exactly as in the reference — do not redesign the packet, bottle or label, do not change its colours or text.\n' : '')
    + (mood ? 'Setting / location: ' + mood + '. Keep the same location — do not move the scene.\n' : '')
    + (colours ? 'Colours: ' + colours + '.\n' : '')
    + (lighting ? 'Lighting: ' + lighting + '.\n' : '')
    + (camera ? 'Camera: ' + camera + '.\n' : '')
    + 'Style match: match the reference\'s look exactly. No added effects — no colour grade, beauty filter, cinematic styling, noise or overexposure. No extra people, no extra products, no extra actions. If the output differs from the reference, fix only the difference named and keep everything else unchanged.';
  $('refBlock').textContent = block;
  try {
    localStorage.setItem('gps_reference', JSON.stringify({ block: block, desc: { subject: subject, product: product, colours: colours, lighting: lighting, camera: camera, mood: mood }, at: new Date().toISOString() }));
    localStorage.setItem('gps_reference_desc', JSON.stringify({ subject: subject, product: product, colours: colours, lighting: lighting, camera: camera, mood: mood }));
  } catch (e) {}
  return block;
}

function restoreRefDesc() {
  var d = store.get('gps_reference_desc', null); if (!d) return;
  ['Subject', 'Product', 'Colours', 'Lighting', 'Camera', 'Mood'].forEach(function (k) {
    var el = $('ref' + k); if (el && d[k.toLowerCase()]) el.value = d[k.toLowerCase()];
  });
  var saved = store.get('gps_reference', null);
  if (saved && saved.block) $('refBlock').textContent = saved.block;
}

/* ---- Research URL (v1.2) ----
   A static page cannot fetch an arbitrary URL from the browser (CORS),
   so this uses the backend's /api/research when one is configured
   (window.GPS_BACKEND_URL or localStorage gps_backend_url). Without a
   backend it says so honestly and the member pastes title/description. */
function getBackendUrl() {
  try { return (window.GPS_BACKEND_URL || '') || (JSON.parse(localStorage.getItem('gps_backend_url') || '""') || ''); } catch (e) { return ''; }
}

async function fetchResearch() {
  var url = ($('researchUrl').value || '').trim();
  var st = $('researchStatus');
  if (!url) { st.textContent = 'Paste a page URL first.'; return; }
  var backend = getBackendUrl();
  if (!backend) {
    st.textContent = 'No backend is configured, so this page cannot fetch the URL (browser rules block it — CORS). The backend does the fetching: see backend/README.md. For now, paste the page title and description below — they will be used as research context.';
    return;
  }
  st.textContent = 'Fetching via the backend…';
  try {
    var res = await fetch(backend.replace(/\/$/, '') + '/api/research?url=' + encodeURIComponent(url));
    var data = await res.json();
    if (!res.ok || !data.research) throw new Error(data.error || 'research_failed');
    $('researchTitle').value = data.research.title || '';
    $('researchDesc').value = (data.research.description ? data.research.description + '\n\n' : '') + (data.research.text || '').slice(0, 800);
    st.textContent = 'Research fetched from ' + url + ' — title and description filled in. Edit them before using.';
    saveResearch();
  } catch (e) {
    st.textContent = 'Research fetch did not work (' + e.message + '). Paste the title and description yourself below.';
  }
}

function saveResearch() {
  try {
    localStorage.setItem('gps_research', JSON.stringify({
      url: ($('researchUrl').value || '').trim(),
      title: ($('researchTitle').value || '').trim(),
      description: ($('researchDesc').value || '').trim(),
      at: new Date().toISOString(),
    }));
  } catch (e) {}
}

function restoreResearch() {
  var r = store.get('gps_research', null); if (!r) return;
  if ($('researchUrl') && r.url) $('researchUrl').value = r.url;
  if ($('researchTitle') && r.title) $('researchTitle').value = r.title;
  if ($('researchDesc') && r.description) $('researchDesc').value = r.description;
}

document.addEventListener('DOMContentLoaded', function () {
  renderMember();
  var signin = $('memberSignin');
  if (signin) signin.onclick = function () {
    var name = ($('memberNameInput').value || '').trim();
    var email = ($('memberEmailInput').value || '').trim();
    if (!name || !email) { $('memberStatus').textContent = 'Add your name and email to join the local member area.'; return; }
    store.set('gps_member', { name: name, email: email, at: new Date().toISOString() });
    renderMember();
    $('memberStatus').textContent = 'Welcome, ' + name + ' — signed in locally in this browser.';
  };
  var signout = $('memberSignout');
  if (signout) signout.onclick = function () { try { localStorage.removeItem('gps_member'); } catch (e) {} renderMember(); };
  var gen = $('generateImageBtn');
  if (gen) gen.onclick = generateImage;
  // Reference upload + style match (v1.2)
  restoreRefDesc(); restoreResearch();
  var refImg = $('refImages');
  if (refImg) refImg.addEventListener('change', function () {
    var files = Array.prototype.slice.call(refImg.files || []).slice(0, 6);
    Promise.all(files.map(function (f) { return readFileAsDataUrl(f).then(function (d) { return { name: f.name, dataUrl: d }; }); }))
      .then(function (loaded) { refFiles.images = loaded; renderRefPreview(); });
  });
  var refVid = $('refVideo');
  if (refVid) refVid.addEventListener('change', function () {
    var f = (refVid.files || [])[0]; if (!f) return;
    refFiles.video = { name: f.name, url: URL.createObjectURL(f) };
    renderRefPreview();
    $('refStatus').textContent += ' Tip: pause the video on the frame you want to match and describe that frame in the fields below.';
  });
  var buildBtn = $('buildRefBtn');
  if (buildBtn) buildBtn.onclick = function () { buildRefBlock(); };
  var clearRef = $('clearRefBtn');
  if (clearRef) clearRef.onclick = function () {
    refFiles = { images: [], video: null };
    ['refSubject', 'refProduct', 'refColours', 'refLighting', 'refCamera', 'refMood'].forEach(function (id) { var el = $(id); if (el) el.value = ''; });
    renderRefPreview(); $('refBlock').textContent = 'No reference block yet.';
    try { localStorage.removeItem('gps_reference'); localStorage.removeItem('gps_reference_desc'); } catch (e) {}
  };
  var addRef = $('addRefToPromptBtn');
  if (addRef) addRef.onclick = function () {
    var block = buildRefBlock(); if (!block) return;
    var ta = $('imagePrompt');
    ta.value = (ta.value.trim() ? ta.value.trim() + '\n\n' : '') + block;
    $('imgStatus').textContent = 'Reference block added to your prompt — it now locks the reference in.';
  };
  // Research URL (v1.2)
  var fetchBtn = $('fetchResearchBtn');
  if (fetchBtn) fetchBtn.onclick = fetchResearch;
  ['researchUrl', 'researchTitle', 'researchDesc'].forEach(function (id) {
    var el = $(id); if (el) el.addEventListener('input', saveResearch);
  });
  var copyBtn = $('copyImagePromptBtn');
  if (copyBtn) copyBtn.onclick = function () {
    var t = $('imagePrompt').value || '';
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { $('imgStatus').textContent = 'Prompt copied — paste it into your image tool.'; });
  };
});
