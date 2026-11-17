/* はらぺこskip 共通スクリプト（テーマ切替・キラキラ・キャラのふきだし） */
(function () {
  'use strict';
  var root = document.documentElement;
  /* ---- 演出のオン/オフ（初期値はOSの「アニメーション効果」の設定に合わせる） ---- */
  try { var sm = localStorage.getItem('hs-motion'); if (sm) root.setAttribute('data-motion', sm); } catch (e) {}
  var osReduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var reduce = root.getAttribute('data-motion') ? root.getAttribute('data-motion') === 'off' : osReduce;
  document.querySelectorAll('.motion-btn').forEach(function (b) { b.textContent = reduce ? '演出 OFF' : '演出 ON'; b.setAttribute('aria-pressed', reduce ? 'false' : 'true'); });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.motion-btn')) return;
    var next = reduce ? 'on' : 'off';
    root.setAttribute('data-motion', next);
    try { localStorage.setItem('hs-motion', next); } catch (e2) {}
    location.reload();
  });

  /* ---- ライト/ダーク切替 ---- */
  try { var saved = localStorage.getItem('hs-theme'); if (saved) root.setAttribute('data-theme', saved); } catch (e) {}
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function syncBtn() {
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.textContent = isDark() ? '☀' : '☾';
      b.setAttribute('aria-label', isDark() ? 'ライトモードにする' : 'ダークモードにする');
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.theme-btn'); if (!b) return;
    var next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('hs-theme', next); } catch (e2) {}
    syncBtn();
  });
  syncBtn();

  /* ---- キャラをタップするとふきだし ---- */
  var lines = ['いっしょに行こう！', 'ナビはおまかせ♪', '今日もがんばろうね', 'よろしくね！', 'ダウンロードはこっち！', 'わくわくするね'];
  var li = 0, timer;
  document.addEventListener('click', function (e) {
    var ch = e.target.closest('.stage .ch'); if (!ch) return;
    var stage = ch.closest('.stage'), bub = stage.querySelector('.bubble'); if (!bub) return;
    window.dispatchEvent(new Event('stage-burst'));
    bub.textContent = lines[li++ % lines.length];
    bub.classList.add('show');
    clearTimeout(timer); timer = setTimeout(function () { bub.classList.remove('show'); }, 1900);
  });

  /* ---- ページ切替（プレビュー用。通常のサイトでは何もしません） ---- */
  var views = document.querySelectorAll('[data-view]');
  if (views.length) {
    var show = function () {
      var name = (location.hash || '#top').slice(1);
      if (!document.querySelector('[data-view="' + name + '"]')) {
        var target = document.getElementById(name);
        if (target) { target.scrollIntoView(); return; }
        name = 'top';
      }
      views.forEach(function (v) { v.hidden = v.getAttribute('data-view') !== name; });
      document.querySelectorAll('.site-nav a').forEach(function (a) {
        if (a.getAttribute('href') === '#' + name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', show); show();
  }

  /* ---- 画面イメージをクリックで拡大 ---- */
  var lb = null, lastFocus = null;
  function closeLb() { if (!lb) return; lb.hidden = true; if (lastFocus) lastFocus.focus(); }
  document.addEventListener('click', function (e) {
    var z = e.target.closest('.zoom');
    if (z) {
      if (!lb) {
        lb = document.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', '拡大表示');
        lb.innerHTML = '<button class="lb-close" type="button" aria-label="閉じる">✕</button><img alt="">';
        document.body.appendChild(lb);
      }
      var src = z.querySelector('img'); lb.querySelector('img').src = src.src; lb.querySelector('img').alt = src.alt;
      lastFocus = z; lb.hidden = false; lb.querySelector('.lb-close').focus(); return;
    }
    if (lb && !lb.hidden && e.target.closest('.lb')) closeLb();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });

  /* ---- 掲示板（見た目の確認用。投稿は保存されません） ---- */
  var form = document.getElementById('bbs-form');
  if (form) {
    var list = document.getElementById('bbs-posts'), msg = document.getElementById('bbs-msg');
    var avatars = ['face_01', 'face_02', 'face_03', 'face_04', 'face_05', 'face_07', 'face_12'];
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim() || '名無しさん';
      var body = form.elements.body.value.trim();
      if (!body) { msg.textContent = '本文を入力してください。'; form.elements.body.focus(); return; }
      var cat = form.elements.cat.value;
      var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
      var art = document.createElement('article'); art.className = 'post new';
      var img = document.createElement('img'); img.className = 'av'; img.alt = '';
      img.src = (list.getAttribute('data-av') || 'assets/img/faces/') + avatars[Math.floor(Math.random() * avatars.length)] + '.webp';
      var box = document.createElement('div');
      var top = document.createElement('div'); top.className = 'post-top';
      var b = document.createElement('b'); b.textContent = name;
      var tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = cat;
      var when = document.createElement('span'); when.textContent = d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
      top.appendChild(b); top.appendChild(tag); top.appendChild(when);
      var p = document.createElement('p'); p.textContent = body;
      box.appendChild(top); box.appendChild(p); art.appendChild(img); art.appendChild(box);
      var first = list.querySelector('.post'); list.insertBefore(art, first);
      form.elements.body.value = ''; msg.textContent = '表示を確認しました（仮表示のため、ページを閉じると消えます）。';
    });
  }

  /* ---- トップのキャラ演出（開いた時に1回 + ずっと続く） ----
     1回: 波紋の輪 / 流れ星 / 星のはじけ / 魔法陣が回りながら現れる
     ずっと: 後光 / 魔法陣のゆっくりした回転 / 光の粒の上昇 / きらめき / ときどき流れ星 */
  (function stageFx() {
    var cv = document.getElementById('stage-fx'); if (!cv) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, cx = 0, cy = 0, R = 0;
    var T0 = performance.now(), last = T0, parts = [], rise = [], twinkle = [], meteors = [], ripples = [];
    var gold = '#e8a21f', sky = '#46aee6', pink = '#ff7fae', dark = false, tick = 0;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function rgba(h, a) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h) || [0, 'e8', 'a2', '1f']; return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')'; }
    function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }
    function readColors() {
      var cs = getComputedStyle(document.documentElement);
      gold = cs.getPropertyValue('--fx-a').trim() || gold; sky = cs.getPropertyValue('--fx-b').trim() || sky; pink = cs.getPropertyValue('--pink').trim() || pink;
      dark = root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H * .55; R = Math.min(W, H) * .4;
    }
    function star(x, y, r, spikes) {
      ctx.beginPath();
      for (var i = 0; i < spikes * 2; i++) { var a = i * Math.PI / spikes - Math.PI / 2, d = i % 2 ? r * .38 : r; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
      ctx.closePath(); ctx.fill();
    }
    function burst(n, power) {
      var cols = [gold, sky, pink, '#ffffff'];
      for (var i = 0; i < n; i++) { var a = rnd(0, 6.283), v = rnd(.35, 1) * power; parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: rnd(1.1, 1.9), r: rnd(4, 9), c: cols[i % 4], rot: rnd(0, 6) }); }
    }
    function ripple(delay) { ripples.push({ t: -delay }); }
    function meteor(delay) { meteors.push({ t: -delay, x: rnd(W * .55, W * 1.0), y: rnd(-10, H * .25), len: rnd(110, 170) }); }
    function intro() {
      parts = []; ripples = []; meteors = [];
      ripple(.1); ripple(.4); ripple(.7); burst(40, 380); meteor(.5); meteor(.85); meteor(1.2);
    }
    function initContinuous() {
      rise = []; twinkle = [];
      for (var i = 0; i < 24; i++) rise.push({ x: rnd(.12, .88), y: rnd(0, 1), v: rnd(.04, .09), s: rnd(0, 6), r: rnd(2, 5), k: i % 4 });
      for (var j = 0; j < 14; j++) twinkle.push({ x: rnd(.04, .96), y: rnd(.06, .9), p: rnd(0, 6), sp: rnd(1.2, 2.6), r: rnd(5, 11) });
    }
    function draw(now) {
      var t = (now - T0) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
      if (++tick % 90 === 1) readColors();
      ctx.clearRect(0, 0, W, H);
      var fade = ease(t / 1.1), la = dark ? 1 : .9;
      ctx.save(); ctx.translate(cx, cy);
      /* 後光（外側へ向かって透明になる） */
      var rg = ctx.createRadialGradient(0, 0, R * .5, 0, 0, R * 1.45);
      rg.addColorStop(0, rgba(gold, 1)); rg.addColorStop(1, rgba(gold, 0));
      ctx.save(); ctx.rotate(t * .06); ctx.fillStyle = rg;
      for (var i = 0; i < 14; i++) {
        ctx.globalAlpha = (dark ? .26 : .3) * fade * (.7 + .3 * Math.sin(t * 1.2 + i)); ctx.rotate(Math.PI * 2 / 14);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R * 1.45, -R * .13); ctx.lineTo(R * 1.45, R * .13); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      /* 魔法陣 */
      var sc = .35 + .65 * ease(t / 1.3), spin = (1 - ease(t / 1.8)) * 6;
      ctx.save(); ctx.scale(sc, sc * .9); ctx.globalAlpha = fade * (dark ? .75 : .6) * la; ctx.lineWidth = 1.6;
      ctx.strokeStyle = gold; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R * .94, 0, 6.283); ctx.stroke();
      ctx.save(); ctx.rotate(t * .12 + spin);
      ctx.strokeStyle = sky; for (var k = 0; k < 48; k++) { ctx.rotate(Math.PI / 24); ctx.beginPath(); ctx.moveTo(R * .88, 0); ctx.lineTo(R * (k % 4 ? .92 : .86), 0); ctx.stroke(); }
      ctx.restore();
      ctx.save(); ctx.rotate(-t * .18 - spin); ctx.strokeStyle = gold;
      for (var h = 0; h < 2; h++) { ctx.beginPath(); for (var v = 0; v < 3; v++) { var a = v * 2.094 + h * Math.PI; ctx.lineTo(Math.cos(a) * R * .8, Math.sin(a) * R * .8); } ctx.closePath(); ctx.stroke(); }
      ctx.fillStyle = sky; for (var n = 0; n < 6; n++) { var b = n * Math.PI / 3; ctx.beginPath(); ctx.arc(Math.cos(b) * R * .8, Math.sin(b) * R * .8, 3.5, 0, 6.283); ctx.fill(); }
      ctx.restore();
      ctx.save(); ctx.rotate(t * .25 + spin); ctx.strokeStyle = sky; ctx.setLineDash([2, 9]); ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, R * .6, 0, 6.283); ctx.stroke(); ctx.restore();
      ctx.restore(); ctx.restore();
      /* 波紋の輪 */
      ripples = ripples.filter(function (r) { r.t += dt; return r.t < 1.5; });
      ripples.forEach(function (r) {
        if (r.t < 0) return; var q = r.t / 1.5;
        ctx.globalAlpha = (1 - q) * .9; ctx.lineWidth = 5 * (1 - q) + 1; ctx.strokeStyle = 'hsl(' + ((q * 300 + t * 60) % 360) + ',90%,' + (dark ? 72 : 62) + '%)';
        ctx.beginPath(); ctx.arc(cx, cy, q * Math.min(R * 1.9, H * .43), 0, 6.283); ctx.stroke();
      });
      /* 光の粒の上昇 */
      var cols = [gold, pink, sky, '#ffffff'];
      rise.forEach(function (p) {
        p.y -= p.v * dt; if (p.y < -.05) { p.y = 1.05; p.x = rnd(.12, .88); }
        var al = Math.max(0, Math.min(1, p.y * 3)) * Math.min(1, (1.05 - p.y) * 5);
        ctx.globalAlpha = .75 * al * fade; ctx.fillStyle = cols[p.k];
        ctx.beginPath(); ctx.arc(p.x * W + Math.sin(t + p.s) * 14, p.y * H, p.r, 0, 6.283); ctx.fill();
      });
      /* きらめき */
      ctx.fillStyle = dark ? '#fff' : gold;
      twinkle.forEach(function (w) {
        var q = Math.max(0, Math.sin(t * w.sp + w.p)); ctx.globalAlpha = q * .95 * fade;
        star(w.x * W, w.y * H, w.r * (.5 + q * .7), 4);
      });
      /* はじけた星 */
      parts = parts.filter(function (p) { p.life += dt; return p.life < p.max; });
      parts.forEach(function (p) {
        p.vx *= (1 - 1.8 * dt); p.vy = p.vy * (1 - 1.8 * dt) + 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.c; star(p.x, p.y, p.r, 5);
      });
      /* 流れ星 */
      meteors = meteors.filter(function (m) { m.t += dt; return m.t < 1.1; });
      meteors.forEach(function (m) {
        if (m.t < 0) return; var q = m.t / 1.1, x = m.x - q * W * .9, y = m.y + q * H * .8, ang = Math.atan2(H * .8, -W * .9);
        var g = ctx.createLinearGradient(x, y, x - Math.cos(ang) * m.len, y - Math.sin(ang) * m.len);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = Math.sin(q * Math.PI); ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * m.len, y - Math.sin(ang) * m.len); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    var running = true, nextMeteor = 7;
    function loop(now) {
      if (running && !document.hidden) {
        draw(now);
        if ((now - T0) / 1000 > nextMeteor) { meteor(0); nextMeteor += rnd(6, 10); }
      }
      requestAnimationFrame(loop);
    }
    readColors(); size(); initContinuous(); window.addEventListener('resize', size);
    window.addEventListener('stage-burst', function () { burst(18, 260); ripple(0); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { running = en[0].isIntersecting; }).observe(cv);
    if (reduce) { T0 = performance.now() - 5000; last = performance.now(); draw(performance.now()); return; }
    intro(); requestAnimationFrame(loop);
  })();

  /* ---- キラキラ(星とハート)がゆっくり降る ---- */
  var cv = document.getElementById('sparkles');
  if (!cv || reduce) return;
  var ctx = cv.getContext('2d'), W, H, dpr, items = [];
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function make(init) {
    return { x: Math.random() * W, y: init ? Math.random() * H : -20, r: 4 + Math.random() * 8, v: .25 + Math.random() * .5,
      s: Math.random() * 6.28, w: .01 + Math.random() * .02, kind: Math.random() < .3 ? 'heart' : 'star', a: .35 + Math.random() * .5 };
  }
  function star(x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, d = i % 2 ? r * .32 : r; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
    ctx.closePath(); ctx.fill();
  }
  function heart(x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y + r * .9);
    ctx.bezierCurveTo(x - r * 1.5, y - r * .2, x - r * .6, y - r * 1.2, x, y - r * .4);
    ctx.bezierCurveTo(x + r * .6, y - r * 1.2, x + r * 1.5, y - r * .2, x, y + r * .9);
    ctx.fill();
  }
  size(); window.addEventListener('resize', size);
  var n = W < 600 ? 16 : 28;
  for (var i = 0; i < n; i++) items.push(make(true));
  var color = '';
  function frame() {
    if (document.hidden) { requestAnimationFrame(frame); return; }
    color = getComputedStyle(root).getPropertyValue('--sparkle').trim() || '#ff9cc4';
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = color;
    items.forEach(function (p, i) {
      p.y += p.v; p.s += p.w; var x = p.x + Math.sin(p.s) * 18;
      ctx.globalAlpha = p.a * (.6 + .4 * Math.sin(p.s * 3));
      (p.kind === 'heart' ? heart : star)(x, p.y, p.r);
      if (p.y > H + 20) items[i] = make(false);
    });
    ctx.globalAlpha = 1; requestAnimationFrame(frame);
  }
  frame();
})();
