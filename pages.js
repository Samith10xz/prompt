/* Graphix Prompt Studio — shared interactivity for the supporting pages
   (v1.2). Every page has a working interactive element, not just static
   text: tabs, accordions, filters, direction chips with a live preview,
   and a contact form with live validation. Plain JS, no dependencies. */
'use strict';

function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* Tabs: buttons with data-tab, panels with data-panel. */
function initTabs() {
  document.querySelectorAll('[data-tabs]').forEach(function (wrap) {
    var btns = wrap.querySelectorAll('[data-tab]');
    var panels = wrap.querySelectorAll('[data-panel]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
        panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== b.getAttribute('data-tab'); });
      });
    });
  });
}

/* Accordions: <button class="acc-btn" aria-expanded> + next .acc-body. */
function initAccordions() {
  document.querySelectorAll('.acc-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      var body = b.nextElementSibling;
      if (body) body.hidden = open;
    });
  });
}

/* News filter: buttons with data-filter, articles with data-cat. */
function initNewsFilter() {
  var btns = document.querySelectorAll('[data-filter]');
  if (!btns.length) return;
  var items = document.querySelectorAll('.news-item');
  var count = document.getElementById('newsCount');
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      btns.forEach(function (x) { x.classList.toggle('active', x === b); });
      var f = b.getAttribute('data-filter');
      var shown = 0;
      items.forEach(function (it) {
        var show = f === 'all' || it.getAttribute('data-cat') === f;
        it.style.display = show ? '' : 'none';
        if (show) shown++;
      });
      if (count) count.textContent = shown + (shown === 1 ? ' story' : ' stories') + ' shown.';
    });
  });
}

/* Direction chips + live preview (video & image pages).
   The page defines window.PAGE_CHIPS = { groups: [[label, [options]]], kind: 'video'|'image' }.
   Clicking chips builds a live preview and a "Send to Builder" link. */
function initDirectionBuilder() {
  var host = document.getElementById('directionBuilder');
  if (!host || !window.PAGE_CHIPS) return;
  var picks = {};
  var preview = document.getElementById('directionPreview');
  var briefEl = document.getElementById('pageBrief');
  function render() {
    host.innerHTML = window.PAGE_CHIPS.groups.map(function (g) {
      return '<div class="dir-group"><h3>' + esc(g[0]) + '</h3><div class="chip-row">' +
        g[1].map(function (o) {
          return '<button type="button" class="chip' + (picks[g[0]] === o ? ' active' : '') + '" data-group="' + esc(g[0]) + '" data-opt="' + esc(o) + '">' + esc(o) + '</button>';
        }).join('') + '</div></div>';
    }).join('');
    host.querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () {
        picks[b.getAttribute('data-group')] = b.getAttribute('data-opt');
        render();
      });
    });
    var dir = Object.keys(picks).map(function (k) { return k + ': ' + picks[k]; }).join(' · ');
    var brief = briefEl ? briefEl.value.trim() : '';
    if (preview) {
      preview.textContent = (brief ? brief + '\n' : 'Write your one sentence above, then click the chips.\n') +
        (dir ? 'Direction — ' + dir + '.' : '') +
        '\n\nSend this to the Builder to get the full detailed prompt.';
    }
  }
  if (briefEl) briefEl.addEventListener('input', render);
  render();
  var goBtn = document.getElementById('goBuilderBtn');
  if (goBtn) goBtn.addEventListener('click', function () {
    var brief = briefEl ? briefEl.value.trim() : '';
    var dir = Object.keys(picks).map(function (k) { return k + ': ' + picks[k]; }).join(' · ');
    var full = brief + (dir ? ' (' + dir + ')' : '');
    try { localStorage.setItem('gps_pending_brief', JSON.stringify(full)); } catch (e) {}
    location.href = 'index.html?kind=' + (window.PAGE_CHIPS.kind || 'video') + (full ? '&brief=' + encodeURIComponent(full) : '');
  });
}

/* Contact form: live validation + character count, honest sample note. */
function initContactForm() {
  var form = document.getElementById('contactForm');
  if (!form) return;
  var name = document.getElementById('cName'), email = document.getElementById('cEmail'), msg = document.getElementById('cMsg');
  var count = document.getElementById('cCount'), note = document.getElementById('cNote');
  function check() {
    var okName = name.value.trim().length >= 2;
    var okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    var okMsg = msg.value.trim().length >= 10;
    if (count) count.textContent = msg.value.length + ' characters — at least 10 to send.';
    return { okName: okName, okEmail: okEmail, okMsg: okMsg, all: okName && okEmail && okMsg };
  }
  [name, email, msg].forEach(function (el) { el.addEventListener('input', check); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var c = check();
    if (!c.all) {
      note.textContent = 'Please check: ' + (!c.okName ? 'a name (2+ letters). ' : '') + (!c.okEmail ? 'a valid email. ' : '') + (!c.okMsg ? 'a message of at least 10 characters.' : '');
      return;
    }
    note.textContent = 'Sample form — nothing was sent. Please email hello@graphixdesign.agency instead — your message is ready to copy: "' + msg.value.trim().slice(0, 120) + (msg.value.trim().length > 120 ? '…' : '') + '"';
  });
  var copyBtn = document.getElementById('copyEmailBtn');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var t = 'hello@graphixdesign.agency';
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { note.textContent = 'Email copied: hello@graphixdesign.agency'; });
  });
}

/* Copy buttons: [data-copy-text] copies that text. */
function initCopyButtons() {
  document.querySelectorAll('[data-copy-text]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy-text');
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () {
        b.textContent = 'Copied ✓';
        setTimeout(function () { b.textContent = 'Copy'; }, 1500);
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initTabs();
  initAccordions();
  initNewsFilter();
  initDirectionBuilder();
  initContactForm();
  initCopyButtons();
});

if (typeof module !== 'undefined') module.exports = {};
