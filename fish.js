/* Graphix Prompt Studio — interactive koi (v1.5).
   Two koi swim in the hero, seen from above. They are drawn every frame
   from a flexible spine, so they bend and swish like real fish.
   - Move the mouse over the hero: the big koi follows it.
   - Click or tap anywhere in the hero (not on a button): a food pellet
     drops with a ripple and the koi race to eat it.
   - Left alone, they wander slowly, and stay clear of the text on phones.
   The canvas never takes clicks (pointer-events:none); the hero listens
   instead, so buttons, links and page scrolling work as normal.
   It pauses when the hero is off screen or the tab is hidden, and with
   prefers-reduced-motion it draws one still frame. */
'use strict';
(function () {
  var canvas = document.getElementById('fishCanvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var host = canvas.parentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CREAM = '245,239,230', ORANGE = '255,92,0', DEEP = '214,64,0';
  var W = 0, H = 0, dpr = 1, phone = false, softShadow = false;
  var lastW = 0, lastH = 0;

  // ---------- size ----------
  function resize() {
    var r = canvas.getBoundingClientRect();
    var w = Math.max(240, Math.round(r.width)), h = Math.max(200, Math.round(r.height));
    if (w === lastW && h === lastH) return; // phone toolbars fire resize while scrolling
    lastW = w; lastH = h; W = w; H = h; phone = W < 700;
    softShadow = !phone && 'filter' in ctx; // blur is costly on phones and missing in older Safari
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    measureText();
    fish.forEach(function (f) { f.setSize(); });
    if (reduced) draw(0);
  }

  // Where fish wander when nobody is steering them. On phones the text
  // fills the top of the hero, so they keep to the lower band.
  var textBottom = 0;
  function measureText() {
    var top = canvas.getBoundingClientRect().top, b = 0;
    [].forEach.call(host.children, function (el) {
      if (el === canvas || el.classList.contains('koi-hint')) return;
      var r = el.getBoundingClientRect(); if (r.height && r.top - top < H) b = Math.max(b, r.bottom - top);
    });
    textBottom = Math.min(b, H);
  }
  function wanderArea() {
    if (!phone) return { x0: 0.52, x1: 0.94, y0: 0.18, y1: 0.86 };
    var free = H - textBottom;
    // enough room under the text (home hero): swim there; otherwise anywhere, faintly (CSS dims it)
    if (free > 70) return { x0: 0.1, x1: 0.9, y0: Math.min(0.95, (textBottom + 56) / H), y1: Math.min(0.97, (H - 28) / H) };
    return { x0: 0.1, x1: 0.9, y0: 0.3, y1: 0.9 };
  }

  // ---------- a koi ----------
  function Koi(opt) {
    this.opt = opt;
    this.n = 16;
    this.pts = [];
    this.heading = opt.heading || Math.PI;
    this.speed = 0;
    this.phase = Math.random() * 10;
    this.seed = Math.random() * 100;
    for (var i = 0; i < this.n; i++) this.pts.push({ x: 0, y: 0 });
  }
  Koi.prototype.setSize = function () {
    var base = phone ? Math.min(W * 0.36, 150) : Math.min(Math.max(W, H) * 0.2, 250);
    this.len = base * this.opt.scale;
    this.seg = this.len / (this.n - 1);
    this.maxSpeed = (phone ? 2.1 : 2.8) * this.opt.speed;
    if (!this.placed) {
      var a = wanderArea();
      var x = W * (a.x0 + (a.x1 - a.x0) * this.opt.start[0]), y = H * (a.y0 + (a.y1 - a.y0) * this.opt.start[1]);
      for (var i = 0; i < this.n; i++) this.pts[i] = { x: x + i * this.seg, y: y };
      this.placed = true;
    }
  };
  Koi.prototype.update = function (tx, ty, t, urgent) {
    var head = this.pts[0];
    var dx = tx - head.x, dy = ty - head.y, dist = Math.hypot(dx, dy);
    var want = Math.atan2(dy, dx);
    var diff = Math.atan2(Math.sin(want - this.heading), Math.cos(want - this.heading));
    var turn = (urgent ? 0.09 : 0.045) * (0.6 + this.speed / this.maxSpeed);
    this.heading += Math.max(-turn, Math.min(turn, diff));
    var top = this.maxSpeed * (urgent ? 1.9 : 1);
    var target = Math.min(top, dist * 0.035) * (Math.abs(diff) > 2 ? 0.55 : 1);
    this.speed += (Math.max(urgent ? 0.6 : 0.12, target) - this.speed) * 0.05;
    // swimming = a tail-driven wiggle that grows with speed
    this.phase += 0.08 + this.speed * 0.07;
    var wig = Math.sin(this.phase) * 0.05 * (0.4 + this.speed / this.maxSpeed);
    head.x += Math.cos(this.heading + wig) * this.speed;
    head.y += Math.sin(this.heading + wig) * this.speed;
    // each segment follows the one in front, with a limit on how sharply the body can bend
    var prevA = this.heading + Math.PI;
    for (var i = 1; i < this.n; i++) {
      var p = this.pts[i - 1], q = this.pts[i];
      var a = Math.atan2(q.y - p.y, q.x - p.x);
      var d = Math.atan2(Math.sin(a - prevA), Math.cos(a - prevA));
      var lim = 0.17;
      if (d > lim) a = prevA + lim; else if (d < -lim) a = prevA - lim;
      q.x = p.x + Math.cos(a) * this.seg; q.y = p.y + Math.sin(a) * this.seg;
      prevA = a;
    }
    return dist;
  };
  // body width along the spine: round head, full shoulders, thin tail
  function widthAt(u) { return Math.pow(Math.sin(Math.min(1, u * 1.15 + 0.12) * Math.PI), 0.75) * (1 - u * 0.55); }

  Koi.prototype.draw = function (alpha) {
    var P = this.pts, n = this.n, half = this.len * 0.115;
    var L = [], R = [], N = [];
    for (var i = 0; i < n; i++) {
      var a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
      var ang = Math.atan2(b.y - a.y, b.x - a.x), nx = -Math.sin(ang), ny = Math.cos(ang);
      var w = widthAt(i / (n - 1)) * half;
      N.push({ nx: nx, ny: ny, ang: ang });
      L.push({ x: P[i].x + nx * w, y: P[i].y + ny * w });
      R.push({ x: P[i].x - nx * w, y: P[i].y - ny * w });
    }
    ctx.save();
    ctx.globalAlpha = alpha;

    // soft shadow under the fish
    ctx.save();
    ctx.translate(this.len * 0.05, this.len * 0.07);
    if (softShadow) { ctx.filter = 'blur(' + Math.round(this.len * 0.05) + 'px)'; ctx.fillStyle = 'rgba(0,0,0,.35)'; }
    else ctx.fillStyle = 'rgba(0,0,0,.2)';
    path(L, R); ctx.fill();
    ctx.restore();

    var c = this.opt.colors;
    // tail fin: two soft, see-through lobes that trail behind and flutter
    var B = P[n - 1], ta = N[n - 1].ang, flap = Math.sin(this.phase - 1.4) * 0.3;
    var tl = this.len * 0.3, d = ta + flap;
    function at(ang, r) { return { x: B.x + Math.cos(ang) * r, y: B.y + Math.sin(ang) * r }; }
    var T1 = at(d + 0.5, tl), T2 = at(d - 0.5, tl), notch = at(d + flap * 0.4, tl * 0.5);
    var tg = ctx.createRadialGradient(B.x, B.y, 0, B.x, B.y, tl);
    tg.addColorStop(0, 'rgba(' + c.fin + ',.75)'); tg.addColorStop(1, 'rgba(' + c.fin + ',.12)');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(B.x, B.y);
    var c1 = at(d + 0.28, tl * 0.55), c2 = at(d + 0.42, tl * 0.95), c3 = at(d - 0.42, tl * 0.95), c4 = at(d - 0.28, tl * 0.55);
    ctx.quadraticCurveTo(c1.x, c1.y, T1.x, T1.y);
    ctx.quadraticCurveTo(c2.x - (c2.x - notch.x) * 0.6, c2.y - (c2.y - notch.y) * 0.6, notch.x, notch.y);
    ctx.quadraticCurveTo(c3.x - (c3.x - notch.x) * 0.6, c3.y - (c3.y - notch.y) * 0.6, T2.x, T2.y);
    ctx.quadraticCurveTo(c4.x, c4.y, B.x, B.y);
    ctx.fill();
    // fin rays
    ctx.strokeStyle = 'rgba(' + c.fin + ',.28)'; ctx.lineWidth = 1;
    for (var ry = -2; ry <= 2; ry++) {
      var e2 = at(d + ry * 0.2, tl * (0.8 - Math.abs(ry) * 0.04));
      ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.quadraticCurveTo(at(d + ry * 0.12, tl * 0.4).x, at(d + ry * 0.12, tl * 0.4).y, e2.x, e2.y); ctx.stroke();
    }

    // pectoral fins: rounded, see-through, paddling
    var fi = 3, fp = P[fi], fa = N[fi].ang, paddle = Math.sin(this.phase * 0.7) * 0.3, fl = this.len * 0.17;
    ctx.fillStyle = 'rgba(' + c.fin + ',.38)';
    [1, -1].forEach(function (s) {
      var dir = fa + Math.PI + s * (1.15 + paddle);
      var tip = { x: fp.x + Math.cos(dir) * fl, y: fp.y + Math.sin(dir) * fl };
      var back = P[fi + 2];
      ctx.beginPath();
      ctx.moveTo(fp.x, fp.y);
      ctx.bezierCurveTo(fp.x + Math.cos(dir - s * 0.7) * fl * 0.9, fp.y + Math.sin(dir - s * 0.7) * fl * 0.9,
        tip.x + Math.cos(dir - s * 0.4) * fl * 0.3, tip.y + Math.sin(dir - s * 0.4) * fl * 0.3, tip.x, tip.y);
      ctx.quadraticCurveTo(tip.x + Math.cos(dir + s * 1.2) * fl * 0.4, tip.y + Math.sin(dir + s * 1.2) * fl * 0.4, back.x, back.y);
      ctx.fill();
    });

    // body with a light, glossy gradient
    var hx = P[0].x, hy = P[0].y, ex = P[n - 1].x, ey = P[n - 1].y;
    var g = ctx.createLinearGradient(hx, hy, ex, ey);
    g.addColorStop(0, 'rgba(' + c.body + ',1)'); g.addColorStop(1, 'rgba(' + c.body2 + ',1)');
    ctx.fillStyle = g; path(L, R); ctx.fill();

    // koi patches, clipped to the body
    ctx.save(); path(L, R); ctx.clip();
    var self = this;
    c.spots.forEach(function (s) {
      var i = Math.round(s[0] * (n - 1)), p = P[i], k = N[i];
      var off = s[1] * half, r = s[2] * half;
      ctx.fillStyle = 'rgba(' + s[3] + ',' + (s[4] || 0.95) + ')';
      ctx.beginPath();
      ctx.ellipse(p.x + k.nx * off, p.y + k.ny * off, r * 1.5, r, k.ang, 0, Math.PI * 2);
      ctx.fill();
    });
    // a gentle highlight down the back
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = half * 0.35; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(P[1].x, P[1].y);
    for (var j = 2; j < n - 4; j++) ctx.lineTo(P[j].x, P[j].y);
    ctx.stroke();
    ctx.restore();

    // dorsal fin line
    ctx.strokeStyle = 'rgba(' + c.fin + ',.6)'; ctx.lineWidth = Math.max(1.2, half * 0.12);
    ctx.beginPath(); ctx.moveTo(P[4].x, P[4].y);
    for (var k = 5; k < 10; k++) ctx.lineTo(P[k].x, P[k].y);
    ctx.stroke();

    // eyes
    var e = N[1], eo = half * 0.62;
    ctx.fillStyle = 'rgba(20,14,10,.85)';
    [1, -1].forEach(function (s) {
      ctx.beginPath(); ctx.arc(P[1].x + e.nx * eo * s, P[1].y + e.ny * eo * s, Math.max(1.4, half * 0.13), 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    void self;
  };
  function path(L, R) {
    ctx.beginPath();
    ctx.moveTo(L[0].x, L[0].y);
    for (var i = 1; i < L.length; i++) { var m = L[i - 1]; ctx.quadraticCurveTo(m.x, m.y, (m.x + L[i].x) / 2, (m.y + L[i].y) / 2); }
    for (var j = R.length - 1; j >= 0; j--) ctx.lineTo(R[j].x, R[j].y);
    ctx.closePath();
  }

  var fish = [
    new Koi({ scale: 1, speed: 1, start: [0.7, 0.4], heading: Math.PI,
      colors: { body: CREAM, body2: '232,222,206', fin: '255,214,186', spots: [[0.08, 0.1, 0.7, ORANGE], [0.3, -0.35, 0.75, ORANGE], [0.45, 0.4, 0.6, DEEP], [0.62, -0.1, 0.55, ORANGE], [0.36, 0.05, 0.28, '20,14,10', 0.8]] } }),
    new Koi({ scale: 0.68, speed: 1.15, start: [0.25, 0.75], heading: 0,
      colors: { body: ORANGE, body2: '255,140,60', fin: '255,150,80', spots: [[0.2, 0.3, 0.55, CREAM], [0.5, -0.3, 0.5, CREAM], [0.7, 0.2, 0.35, CREAM]] } }),
  ];

  // ---------- pointer, food, ripples, motes ----------
  var pointer = { x: 0, y: 0, at: -1e9 };
  var food = null, ripples = [], bits = [], motes = [];
  for (var m = 0; m < 46; m++) motes.push({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, s: 0.1 + Math.random() * 0.25, vx: 0, vy: 0 });

  function local(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, inside: e.clientY - r.top <= r.height && e.clientY >= r.top }; }
  host.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return; // on touch, moving = scrolling
    var p = local(e); if (!p.inside) return;
    pointer.x = p.x; pointer.y = p.y; pointer.at = performance.now();
  }, { passive: true });
  // a small hint so people know the water is interactive
  var hint = document.createElement('p');
  hint.className = 'koi-hint'; hint.setAttribute('aria-hidden', 'true');
  hint.textContent = (window.matchMedia && matchMedia('(hover: none)').matches ? 'Tap' : 'Click') + ' the water to feed the koi';
  if (!reduced) host.appendChild(hint);
  host.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a,button,input,textarea,select,label')) return;
    var p = local(e); if (!p.inside) return;
    hint.classList.add('done');
    food = { x: p.x, y: p.y, born: performance.now(), sink: 0 };
    ripples.push({ x: p.x, y: p.y, r: 2, a: 0.7 }, { x: p.x, y: p.y, r: 2, a: 0.45, delay: 10 });
    wake();
  }, { passive: true });

  function wanderTarget(f, t) {
    var a = wanderArea(), s = f.seed;
    var u = 0.5 + 0.5 * Math.sin(t * 0.11 + s) * Math.cos(t * 0.07 + s * 1.7);
    var v = 0.5 + 0.5 * Math.sin(t * 0.17 + s * 2.3);
    return { x: W * (a.x0 + (a.x1 - a.x0) * u), y: H * (a.y0 + (a.y1 - a.y0) * v) };
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var now = performance.now();

    // drifting motes, pushed aside by the fish
    for (var i = 0; i < motes.length; i++) {
      var o = motes[i], x = o.x * W, y = o.y * H;
      fish.forEach(function (f) {
        var dx = x - f.pts[0].x, dy = y - f.pts[0].y, d2 = dx * dx + dy * dy, R = f.len * 0.5;
        if (d2 < R * R && d2 > 1) { var k = (1 - Math.sqrt(d2) / R) * f.speed * 0.4; o.vx += dx / Math.sqrt(d2) * k; o.vy += dy / Math.sqrt(d2) * k; }
      });
      o.vx *= 0.94; o.vy *= 0.94;
      o.x += (o.vx + Math.sin(t * 0.3 + i) * 0.05) / W; o.y += (o.vy - o.s) / H;
      if (o.y < -0.02) { o.y = 1.02; o.x = Math.random(); } if (o.x < -0.02) o.x = 1.02; if (o.x > 1.02) o.x = -0.02;
      ctx.fillStyle = 'rgba(' + CREAM + ',' + (0.1 + o.r * 0.06) + ')';
      ctx.beginPath(); ctx.arc(o.x * W, o.y * H, o.r, 0, Math.PI * 2); ctx.fill();
    }

    // ripples
    ripples = ripples.filter(function (r) {
      if (r.delay) { r.delay--; return true; }
      r.r += 1.6; r.a *= 0.965;
      ctx.strokeStyle = 'rgba(' + CREAM + ',' + r.a + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.8, 0, 0, Math.PI * 2); ctx.stroke();
      return r.a > 0.02;
    });

    // food pellet
    if (food) {
      food.sink = Math.min(1, food.sink + 0.02);
      ctx.fillStyle = 'rgba(' + ORANGE + ',' + (0.95 - food.sink * 0.3) + ')';
      ctx.beginPath(); ctx.arc(food.x, food.y, 4.5 - food.sink * 1.5, 0, Math.PI * 2); ctx.fill();
      if (now - food.born > 9000) food = null;
    }

    // steer and draw the koi (small one first, so the big one swims over it)
    var steering = now - pointer.at < 2500;
    for (var f = fish.length - 1; f >= 0; f--) {
      var k = fish[f], tgt, urgent = false;
      if (food) { tgt = food; urgent = true; }
      else if (steering && f === 0) tgt = pointer;
      else if (steering) tgt = { x: fish[0].pts[6].x, y: fish[0].pts[6].y + fish[0].len * 0.35 }; // tags along
      else tgt = wanderTarget(k, t);
      var dist = k.update(tgt.x, tgt.y, t, urgent);
      if (food && tgt === food && dist < k.len * 0.08) {
        for (var b = 0; b < 10; b++) bits.push({ x: food.x, y: food.y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, a: 0.9 });
        ripples.push({ x: food.x, y: food.y, r: 4, a: 0.5 });
        food = null;
      }
      if (k.speed > k.maxSpeed * 1.2 && Math.random() < 0.06) ripples.push({ x: k.pts[0].x, y: k.pts[0].y, r: k.len * 0.06, a: 0.22 });
    }
    for (var d = fish.length - 1; d >= 0; d--) fish[d].draw(d === 0 ? 0.96 : 0.9);

    bits = bits.filter(function (p) {
      p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.a *= 0.93;
      ctx.fillStyle = 'rgba(' + ORANGE + ',' + p.a + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
      return p.a > 0.03;
    });
  }

  // ---------- run only while visible ----------
  var visible = true, running = false, t0 = performance.now();
  function frame(ts) {
    if (!visible || document.hidden) { running = false; return; }
    resize();
    draw((ts - t0) / 1000);
    requestAnimationFrame(frame);
  }
  function wake() { if (!running && !reduced && visible && !document.hidden) { running = true; requestAnimationFrame(frame); } }

  resize();
  if (reduced) { draw(0); window.addEventListener('resize', resize); return; }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; wake(); }).observe(canvas);
  document.addEventListener('visibilitychange', wake);
  wake();
})();
