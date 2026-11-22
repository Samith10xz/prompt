/* Graphix Prompt Studio — mobile navigation (v1.3).
   On phones the 5-item top nav collapses into a hamburger button.
   The menu is a slide-down panel; it closes when a link is chosen,
   when Escape is pressed, when you tap outside it, or when the
   viewport grows back to desktop width. Plain JS, no dependencies. */
'use strict';
(function () {
  var btn = document.getElementById('menuBtn');
  var nav = document.getElementById('mainNav');
  if (!btn || !nav) return;

  function setOpen(open) {
    var isOpen = typeof open === 'boolean' ? open : !nav.classList.contains('nav-open');
    nav.classList.toggle('nav-open', isOpen);
    btn.classList.toggle('is-open', isOpen);
    btn.setAttribute('aria-expanded', String(isOpen));
    btn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  }

  btn.addEventListener('click', function () { setOpen(); });

  nav.addEventListener('click', function (e) {
    if (e.target && e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('nav-open')) {
      setOpen(false);
      btn.focus();
    }
  });

  document.addEventListener('click', function (e) {
    if (!nav.classList.contains('nav-open')) return;
    if (e.target === btn || btn.contains(e.target) || nav.contains(e.target)) return;
    setOpen(false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 768 && nav.classList.contains('nav-open')) setOpen(false);
  });
})();
