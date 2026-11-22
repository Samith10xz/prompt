/* Graphix Prompt Studio — hero fish, v1.2.
   Dorothy's feedback on v1.1: the fish was too cartoon, and she does not
   want a framed canvas. This version is a SUBTLE BACKGROUND: no border,
   no frame, no caption, no solid body. A soft, semi-transparent fish
   silhouette glides slowly across the right side of the hero, behind the
   hero content, with faint flow lines — low-key, realistic in feel, not
   cartoonish. The canvas itself is positioned by CSS (.fish-bg) as an
   absolutely-positioned background layer; it never takes clicks.
   The loop is time-based and continuous, and prefers-reduced-motion
   draws one still, very faint frame and stops. */
'use strict';
(function () {
  var canvas = document.getElementById('fishCanvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    W = Math.max(200, rect.width || 600);
    H = Math.max(180, rect.height || 320);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // One soft silhouette: a simple, realistic fish outline — body as a
  // faint wash, fins as slightly warmer washes. No eye, no mouth, no
  // cartoon details; the shape reads as a fish from its outline alone.
  function drawSilhouette(t, x, y, dir, scale, alpha) {
    var wag = Math.sin(t * 1.8) * 0.22; // slow, gentle tail sway
    var bob = Math.sin(t * 0.7) * 5;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(dir * scale, scale);
    ctx.globalAlpha = alpha;
    // Tail — soft orange wash
    ctx.fillStyle = 'rgba(255,92,0,0.20)';
    ctx.beginPath();
    ctx.moveTo(-58, 0);
    ctx.quadraticCurveTo(-86, -24 - wag * 22, -100, -26 - wag * 26);
    ctx.quadraticCurveTo(-76, 0, -100, 26 + wag * 26);
    ctx.quadraticCurveTo(-86, 24 + wag * 22, -58, 0);
    ctx.closePath(); ctx.fill();
    // Body — faint cream wash, tapered
    ctx.fillStyle = 'rgba(245,239,230,0.10)';
    ctx.beginPath();
    ctx.moveTo(-62, 0);
    ctx.quadraticCurveTo(-20, -30, 34, -16);
    ctx.quadraticCurveTo(66, -6, 70, 0);
    ctx.quadraticCurveTo(66, 6, 34, 16);
    ctx.quadraticCurveTo(-20, 30, -62, 0);
    ctx.closePath(); ctx.fill();
    // Back fin — faint orange wash
    ctx.fillStyle = 'rgba(255,92,0,0.14)';
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
    // Main silhouette: glides slowly right-to-left, wraps seamlessly.
    var span = W + 360;
    var fx = span - (((t * 16) % span) + span) % span + 180;
    var fy = H * 0.42 + Math.sin(t * 0.5) * 14;
    drawSilhouette(t, fx, fy, -1, 1, 1);
    // A second, smaller silhouette further back — fainter, offset in phase.
    var span2 = W + 300;
    var fx2 = (((t * 9 + 200) % span2) + span2) % span2 - 150;
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
