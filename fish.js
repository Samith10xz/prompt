/* Graphix Prompt Studio — hero fish.
   A stylised fish in the Graphix style: warm cream body, hot orange fins,
   swimming in a smooth, endless loop on a dark "water" canvas, echoing the
   main site's "Scroll to swim" / flow language (graphixdesign.agency).
   The loop is time-based and continuous: the fish's x position wraps with
   its sine phase preserved, so there is no jump at the loop point.
   Respects prefers-reduced-motion: draws one still frame and stops. */
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
    W = Math.max(280, rect.width || 520);
    H = Math.max(220, rect.height || 320);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Bubbles: each has a phase so the loop is seamless.
  var bubbles = [];
  for (var i = 0; i < 14; i++) {
    bubbles.push({ x: Math.random(), y: Math.random(), r: 1.5 + Math.random() * 3, s: 0.15 + Math.random() * 0.35, p: Math.random() * Math.PI * 2 });
  }

  function drawFish(t, x, y, dir, scale) {
    // t in seconds; tail wag is a pure sine of t, so motion never jumps.
    var wag = Math.sin(t * 6) * 0.35;
    var bob = Math.sin(t * 1.6) * 6;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(dir * scale, scale);
    // Tail fin (orange)
    ctx.fillStyle = '#ff5c00';
    ctx.beginPath();
    ctx.moveTo(-52, 0);
    ctx.quadraticCurveTo(-78, -26 - wag * 30, -92, -30 - wag * 34);
    ctx.quadraticCurveTo(-70, 0, -92, 30 + wag * 34);
    ctx.quadraticCurveTo(-78, 26 + wag * 30, -52, 0);
    ctx.closePath(); ctx.fill();
    // Body (cream) — a smooth ellipse with a slight taper
    ctx.fillStyle = '#f5efe6';
    ctx.beginPath();
    ctx.ellipse(0, 0, 62, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    // Belly shading (warm cream)
    ctx.fillStyle = '#e8ddc9';
    ctx.beginPath();
    ctx.ellipse(0, 10, 48, 16, 0, 0, Math.PI);
    ctx.fill();
    // Top fin (orange)
    ctx.fillStyle = '#ff5c00';
    ctx.beginPath();
    ctx.moveTo(-18, -26);
    ctx.quadraticCurveTo(0, -48 - wag * 8, 26, -24);
    ctx.quadraticCurveTo(4, -28, -18, -26);
    ctx.closePath(); ctx.fill();
    // Gill stripe
    ctx.strokeStyle = '#ff5c00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(18, -2, 16, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    // Eye
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath(); ctx.arc(38, -8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(40, -10, 1.8, 0, Math.PI * 2); ctx.fill();
    // Mouth
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(56, 6, 7, Math.PI * 0.15, Math.PI * 0.55);
    ctx.stroke();
    ctx.restore();
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    // Faint flow lines, drifting slowly — phase-locked to t for a seamless loop.
    ctx.strokeStyle = 'rgba(245,239,230,0.08)';
    ctx.lineWidth = 1.5;
    for (var l = 0; l < 4; l++) {
      var y0 = H * (0.2 + l * 0.2);
      ctx.beginPath();
      for (var x = 0; x <= W; x += 16) {
        var y = y0 + Math.sin(x * 0.012 + t * 0.7 + l * 1.7) * 8;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Bubbles rising, wrapping seamlessly (y uses modulo of t).
    ctx.fillStyle = 'rgba(245,239,230,0.35)';
    bubbles.forEach(function (b) {
      var by = (((b.y - t * b.s * 0.12) % 1) + 1) % 1 * H;
      var bx = b.x * W + Math.sin(t + b.p) * 6;
      ctx.beginPath(); ctx.arc(bx, by, b.r, 0, Math.PI * 2); ctx.fill();
    });
    // Main fish: swims left-to-right, wraps with phase preserved.
    // x wraps over W+320; the sine that drives its vertical drift uses the
    // same t, so position and pose are both continuous at the wrap.
    var span = W + 340;
    var fx = ((t * 55) % span + span) % span - 170;
    var fy = H * 0.45 + Math.sin(t * 0.9) * 18;
    drawFish(t, fx, fy, 1, 1);
    // Small fish swimming the other way, offset in phase — same seamless wrap.
    var span2 = W + 260;
    var fx2 = span2 - (((t * 34 + 120) % span2) + span2) % span2 + 130;
    drawFish(t + 2.4, fx2, H * 0.72 + Math.sin(t * 1.1 + 2) * 12, -1, 0.62);
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
