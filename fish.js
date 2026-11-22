/* Graphix Prompt Studio — hero fish, v1.2, loop + resize fixed in v1.4.
   Dorothy's feedback on v1.1: the fish was too cartoon, and she does not
   want a framed canvas. This version is a SUBTLE BACKGROUND: no border,
   no frame, no caption, no solid body. A soft, semi-transparent fish
   silhouette glides slowly across the right side of the hero, behind the
   hero content, with faint flow lines — low-key, realistic in feel, not
   cartoonish. The canvas itself is positioned by CSS (.fish-bg) as an
   absolutely-positioned background layer; it never takes clicks.
   The loop is time-based and continuous, and prefers-reduced-motion
   draws one still, very faint frame and stops.
   v1.4: the loop now travels edge to edge (off-screen right to off-screen
   left) so the fish is on screen ~93% of the cycle on phones — the old
   loop left it absent ~60% of the time on a 360px screen. Resize now
   only reallocates the canvas when its size really changed, so scrolling
   on a phone (toolbar show/hide fires resize) no longer flickers it. */
'use strict';
(function () {
  var canvas = document.getElementById('fishCanvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1, washBoost = 1;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // v1.4: only reallocate the canvas when its CSS size actually changed.
  // On phones, scrolling shows/hides the browser toolbar and fires resize
  // events constantly; reallocating a DPR-scaled canvas on every one of
  // those caused flicker and jank while scrolling. The rAF flag coalesces
  // bursts of resize events into a single check.
  var lastW = 0, lastH = 0, resizeQueued = false;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(200, Math.round(rect.width) || 600);
    var h = Math.max(180, Math.round(rect.height) || 320);
    if (w === lastW && h === lastH) return; // size did not change: keep the canvas
    lastW = w; lastH = h; W = w; H = h;
    washBoost = (W <= 480) ? 1.9 : 1; // v1.4: phone canvases get stronger washes
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', function () {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () { resizeQueued = false; resize(); });
  });

  // One soft silhouette: a simple, realistic fish outline — body as a
  // faint wash, fins as slightly warmer washes. No eye, no mouth, no
  // cartoon details; the shape reads as a fish from its outline alone.
  // v1.4: on a narrow (phone) canvas the washes are boosted — the CSS
  // dims the whole canvas to ~0.3 on phones, so the un-boosted washes
  // (body 0.10) came out at ~1–3% on screen and the fish was effectively
  // invisible. The boost keeps the silhouette faint but actually visible.
  // (washBoost is declared at the top and set in resize().)
  function drawSilhouette(t, x, y, dir, scale, alpha) {
    var wag = Math.sin(t * 1.8) * 0.22; // slow, gentle tail sway
    var bob = Math.sin(t * 0.7) * 5;
    var tailA = Math.min(0.45, 0.20 * washBoost);
    var bodyA = Math.min(0.30, 0.10 * washBoost);
    var finA = Math.min(0.36, 0.14 * washBoost);
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(dir * scale, scale);
    ctx.globalAlpha = alpha;
    // Tail — soft orange wash
    ctx.fillStyle = 'rgba(255,92,0,' + tailA + ')';
    ctx.beginPath();
    ctx.moveTo(-58, 0);
    ctx.quadraticCurveTo(-86, -24 - wag * 22, -100, -26 - wag * 26);
    ctx.quadraticCurveTo(-76, 0, -100, 26 + wag * 26);
    ctx.quadraticCurveTo(-86, 24 + wag * 22, -58, 0);
    ctx.closePath(); ctx.fill();
    // Body — faint cream wash, tapered
    ctx.fillStyle = 'rgba(245,239,230,' + bodyA + ')';
    ctx.beginPath();
    ctx.moveTo(-62, 0);
    ctx.quadraticCurveTo(-20, -30, 34, -16);
    ctx.quadraticCurveTo(66, -6, 70, 0);
    ctx.quadraticCurveTo(66, 6, 34, 16);
    ctx.quadraticCurveTo(-20, 30, -62, 0);
    ctx.closePath(); ctx.fill();
    // Back fin — faint orange wash
    ctx.fillStyle = 'rgba(255,92,0,' + finA + ')';
    ctx.beginPath();
    ctx.moveTo(-14, -24);
    ctx.quadraticCurveTo(6, -36 - wag * 5, 28, -18);
    ctx.quadraticCurveTo(4, -22, -14, -24);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    // Faint flow lines drifting slowly — barely visible.
    ctx.strokeStyle = 'rgba(245,239,230,0.05)';
    ctx.lineWidth = 1;
    for (var l = 0; l < 3; l++) {
      var y0 = H * (0.25 + l * 0.25);
      ctx.beginPath();
      for (var x = 0; x <= W; x += 18) {
        var y = y0 + Math.sin(x * 0.01 + t * 0.4 + l * 1.9) * 7;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Main silhouette: glides slowly right-to-left and wraps seamlessly.
    // v1.4: the old loop ran fx from W+540 down to 180 and then teleported
    // back — on a 360px phone the fish was fully visible when it vanished
    // and then absent for ~60% of its 45s cycle, so the hero animation
    // looked broken or missing. The new loop travels from just off the
    // right edge (W+120) to just off the left edge (-120) before wrapping,
    // so the fish is on screen for ~93% of the cycle on any width.
    var span = W + 240;
    var fx = (W + 120) - (((t * 16) % span) + span) % span;
    var fy = H * 0.42 + Math.sin(t * 0.5) * 14;
    drawSilhouette(t, fx, fy, -1, 1, 1);
    // A second, smaller silhouette further back — fainter, offset by half
    // a cycle so one fish is almost always visible.
    var span2 = W + 240;
    var fx2 = (W + 120) - ((((t * 9) + span2 / 2) % span2) + span2) % span2;
    drawSilhouette(t + 3.1, fx2, H * 0.72 + Math.sin(t * 0.6 + 2) * 10, 1, 0.6, 0.7);
  }

  if (reduced) { draw(0); return; }
  var start = null;
  function frame(ts) {
    if (start === null) start = ts;
    draw((ts - start) / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

if (typeof module !== 'undefined') module.exports = {};
