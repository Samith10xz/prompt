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
  var copyBtn = $('copyImagePromptBtn');
  if (copyBtn) copyBtn.onclick = function () {
    var t = $('imagePrompt').value || '';
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { $('imgStatus').textContent = 'Prompt copied — paste it into your image tool.'; });
  };
});
