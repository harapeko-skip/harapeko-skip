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

  /* ---- 掲示板 ----
     assets/js/bbs-config.js の window.HS_BBS_API に、掲示板サーバー(Cloudflare Worker)のURLを書くと、
     みんなの書き込みが保存・表示されます。空のままのときは「見た目の確認用」で、投稿は保存されません。
     管理人: ページのURLの末尾に #admin を付けて開くと、管理用パスワードで返信(管理人マーク)・削除ができます。 */
  (function bbs() {
    var form = document.getElementById('bbs-form'); if (!form) return;
    var msg = document.getElementById('bbs-msg'), notice = document.getElementById('bbs-notice'), status = document.getElementById('bbs-status');
    var samples = document.getElementById('bbs-samples'), feed = document.getElementById('bbs-feed');
    var moreBtn = document.getElementById('bbs-more'), reloadBtn = document.getElementById('bbs-reload'), count = document.getElementById('bbs-count');
    var submit = form.querySelector('button[type="submit"]');
    var api = String(window.HS_BBS_API || '').replace(/\/+$/, '');
    var faces = ['face_01', 'face_02', 'face_03', 'face_04', 'face_05', 'face_07', 'face_12'];
    var adminMode = !!api && location.hash === '#admin', adminKey = '';
    var oldest = 0, loading = false;
    try { adminKey = sessionStorage.getItem('hs-bbs-admin') || ''; } catch (e) {}
    try { var nm = localStorage.getItem('hs-bbs-name'); if (nm && !adminMode) form.elements.name.value = nm; } catch (e) {}

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function fmt(t) { var d = new Date(t); return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    function say(text, isErr) { msg.textContent = text; msg.className = 'bbs-msg' + (isErr ? ' err' : ''); }
    function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

    /* 書き込み1件ぶんの表示を作る(文字は textContent で入れるので、HTMLとして実行されません) */
    function makePost(p, isNew) {
      var art = el('article', 'post' + (p.admin ? ' by-admin' : '') + (isNew ? ' new' : ''));
      art.setAttribute('data-id', p.id);
      var img = el('img', 'av'); img.alt = ''; img.width = 64; img.height = 64; img.decoding = 'async';
      img.src = p.admin ? 'assets/img/chibi/harapan.webp' : 'assets/img/faces/' + faces[Math.abs(p.id) % faces.length] + '.webp';
      var box = el('div'), top = el('div', 'post-top');
      top.appendChild(el('b', '', p.name));
      var tag = el('span', 'tag', p.cat); tag.setAttribute('data-cat', p.cat); top.appendChild(tag);
      if (p.admin) top.appendChild(el('span', 'tag admin', '管理人'));
      top.appendChild(el('span', 'no', 'No.' + p.id));
      top.appendChild(el('span', '', fmt(p.t)));
      if (adminMode) { var del = el('button', 'btn-mini del', '削除'); del.type = 'button'; top.appendChild(del); }
      box.appendChild(top); box.appendChild(el('p', '', p.body));
      art.appendChild(img); art.appendChild(box);
      return art;
    }

    count.textContent = '0 / ' + form.elements.body.maxLength;
    form.elements.body.addEventListener('input', function () { count.textContent = form.elements.body.value.length + ' / ' + form.elements.body.maxLength; });

    /* ---- 見た目の確認用(掲示板サーバー未設定) ---- */
    if (!api) {
      notice.textContent = '【仮】この掲示板は見た目の確認用です。投稿はまだ保存されず、ページを閉じると消えます。下の投稿はサンプルです。';
      reloadBtn.hidden = true;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var body = form.elements.body.value.trim();
        if (!body) { say('本文を入力してください。', true); form.elements.body.focus(); return; }
        var p = { id: Math.floor(Math.random() * 900) + 100, name: form.elements.name.value.trim() || '名無しさん', cat: form.elements.cat.value, body: body, t: Date.now(), admin: false };
        feed.insertBefore(makePost(p, true), feed.firstChild);
        form.elements.body.value = ''; count.textContent = '0 / ' + form.elements.body.maxLength;
        say('表示を確認しました（仮表示のため、ページを閉じると消えます）。');
      });
      return;
    }

    /* ---- 本番(掲示板サーバーにつながる) ---- */
    samples.parentNode.removeChild(samples);
    function request(method, path, payload, useKey) {
      var headers = {}, opt = { method: method, headers: headers };
      if (payload) { headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(payload); }
      if (useKey && adminKey) headers['X-Admin-Key'] = adminKey;
      return fetch(api + path, opt).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var err = new Error(j.error || '通信に失敗しました。'); err.status = r.status; throw err; }
          return j;
        });
      });
    }
    function askKey() {
      if (adminKey) return true;
      adminKey = (window.prompt('管理用パスワードを入力してください') || '').trim();
      try { if (adminKey) sessionStorage.setItem('hs-bbs-admin', adminKey); } catch (e) {}
      return !!adminKey;
    }
    function forgetKey() { adminKey = ''; try { sessionStorage.removeItem('hs-bbs-admin'); } catch (e) {} }

    if (adminMode) {
      notice.textContent = '管理モードです。書き込むと「管理人」として表示され、各書き込みの「削除」ボタンで消せます。';
      notice.classList.add('admin');
      form.classList.add('is-admin');
      askKey();
    }

    function setStatus(text) { status.textContent = text || ''; status.hidden = !text; }
    function load(reset) {
      if (loading) return; loading = true;
      moreBtn.disabled = true; reloadBtn.disabled = true;
      if (reset) { feed.textContent = ''; oldest = 0; moreBtn.hidden = true; setStatus('読み込み中…'); }
      return request('GET', '/posts?limit=20' + (!reset && oldest ? '&before=' + oldest : '')).then(function (j) {
        j.posts.forEach(function (p) { feed.appendChild(makePost(p, false)); });
        if (j.posts.length) oldest = j.posts[j.posts.length - 1].id;
        moreBtn.hidden = !j.more;
        setStatus(feed.children.length ? '' : 'まだ書き込みはありません。最初の書き込みをどうぞ。');
      }).catch(function () {
        setStatus('書き込みを読み込めませんでした。しばらくしてから「最新にする」を押してください。');
      }).then(function () { loading = false; moreBtn.disabled = false; reloadBtn.disabled = false; });
    }
    moreBtn.addEventListener('click', function () { load(false); });
    reloadBtn.addEventListener('click', function () { load(true); });
    load(true);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var body = form.elements.body.value.trim();
      if (!body) { say('本文を入力してください。', true); form.elements.body.focus(); return; }
      if (adminMode && !askKey()) { say('管理用パスワードが必要です。', true); return; }
      var name = form.elements.name.value.trim();
      submit.disabled = true; say('送信中…');
      request('POST', '/posts', { name: name, cat: form.elements.cat.value, body: body, website: form.elements.website.value }, adminMode).then(function (j) {
        if (j.post) { feed.insertBefore(makePost(j.post, true), feed.firstChild); setStatus(''); }
        form.elements.body.value = ''; count.textContent = '0 / ' + form.elements.body.maxLength;
        try { if (!adminMode) localStorage.setItem('hs-bbs-name', name); } catch (e2) {}
        say('書き込みました。ありがとうございます！');
      }).catch(function (err) {
        if (err.status === 401) forgetKey();
        say(err.status ? err.message : '送信できませんでした。通信状況を確認して、もう一度お試しください。', true);
      }).then(function () { submit.disabled = false; });
    });

    feed.addEventListener('click', function (e) {
      var b = e.target.closest('.del'); if (!b || !adminMode) return;
      var art = b.closest('.post'), id = art.getAttribute('data-id');
      if (!askKey() || !window.confirm('No.' + id + ' を削除します。元に戻せません。よろしいですか？')) return;
      b.disabled = true;
      request('DELETE', '/posts/' + id, null, true).then(function () {
        art.parentNode.removeChild(art);
        if (!feed.children.length) setStatus('まだ書き込みはありません。最初の書き込みをどうぞ。');
      }).catch(function (err) {
        if (err.status === 401) forgetKey();
        b.disabled = false; window.alert(err.message || '削除できませんでした。');
      });
    });
  })();

  /* ---- トップのキャラ演出（開いた時に1回 + ずっと続く） ----
     1回: 波紋の輪 / 流れ星 / 星のはじけ / 魔法陣が回りながら現れる(キャラをタップした時にも、はじけと波紋)
     ずっと: 後光と魔法陣のゆっくりした回転 / ときどき流れ星
     ※ 回り続ける大きな図形(後光・魔法陣)は、ブラウザの描画担当(GPU)に任せるCSSアニメーションにしています。
        JavaScriptで描くのは、流れ星・波紋・はじけだけで、動いていない間は描画も待機もしません(CPUの負担を減らすため)。 */
  (function stageFx() {
    var cv = document.getElementById('stage-fx'); if (!cv) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, cx = 0, cy = 0, R = 0;
    var T0 = performance.now(), last = T0, lastDraw = 0, parts = [], meteors = [], ripples = [];
    var gold = '#e8a21f', sky = '#46aee6', pink = '#ff7fae', dark = false, tick = 0;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function rgba(h, a) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h) || [0, 'e8', 'a2', '1f']; return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')'; }
    function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }

    /* 後光と魔法陣(SVGとCSSアニメーション) */
    function svgEl(name, attrs) { var e = document.createElementNS('http://www.w3.org/2000/svg', name); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
    function layer(draw) { var s = svgEl('svg', { viewBox: '-100 -100 200 200', 'class': 'fx-svg', focusable: 'false' }); draw(s); return s; }
    function f2(n) { return n.toFixed(2); }
    function buildRings(canvas) {
      var box = document.createElement('div'); box.className = 'fx-rings' + (reduce ? '' : ' live'); box.setAttribute('aria-hidden', 'true');
      var center = document.createElement('div'); center.className = 'fx-center'; box.appendChild(center);
      var halo = document.createElement('div'); halo.className = 'fx-halo'; center.appendChild(halo);
      for (var i = 0; i < 14; i++) { var ray = document.createElement('i'); ray.className = 'fx-ray'; ray.style.setProperty('--i', i); ray.style.transform = 'rotate(' + (i * 360 / 14) + 'deg)'; halo.appendChild(ray); }
      var circle = document.createElement('div'); circle.className = 'fx-circle'; center.appendChild(circle);
      var base = document.createElement('div'); base.className = 'fx-flat';
      base.appendChild(layer(function (s) { s.appendChild(svgEl('circle', { r: 100 })); s.appendChild(svgEl('circle', { r: 94 })); }));
      circle.appendChild(base);
      function rot(cls, draw) { var r = document.createElement('div'); r.className = 'fx-rot ' + cls; r.appendChild(layer(draw)); circle.appendChild(r); }
      rot('r1', function (s) {
        var d = ''; for (var k = 0; k < 48; k++) { var a = (k + 1) * Math.PI / 24, o = k % 4 ? 92 : 86; d += 'M' + f2(88 * Math.cos(a)) + ' ' + f2(88 * Math.sin(a)) + 'L' + f2(o * Math.cos(a)) + ' ' + f2(o * Math.sin(a)); }
        s.appendChild(svgEl('path', { d: d, 'class': 'sky' }));
      });
      rot('r2', function (s) {
        var d = ''; for (var h = 0; h < 2; h++) { for (var v = 0; v < 3; v++) { var a = v * 2.094 + h * Math.PI; d += (v ? 'L' : 'M') + f2(Math.cos(a) * 80) + ' ' + f2(Math.sin(a) * 80); } d += 'Z'; }
        s.appendChild(svgEl('path', { d: d }));
        for (var n = 0; n < 6; n++) { var b = n * Math.PI / 3; s.appendChild(svgEl('circle', { cx: f2(Math.cos(b) * 80), cy: f2(Math.sin(b) * 80), r: 1.8, 'class': 'dot' })); }
      });
      rot('r3', function (s) { s.appendChild(svgEl('circle', { r: 60, 'class': 'sky dash' })); });
      canvas.parentNode.insertBefore(box, canvas);
      return box;
    }
    var rings = buildRings(cv);

    function readColors() {
      var cs = getComputedStyle(document.documentElement);
      gold = cs.getPropertyValue('--fx-a').trim() || gold; sky = cs.getPropertyValue('--fx-b').trim() || sky; pink = cs.getPropertyValue('--pink').trim() || pink;
      dark = root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function size() {
      var dpr = 1;
      W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2; cy = H * .55; R = Math.min(W, H) * .4;
      rings.style.setProperty('--R', R.toFixed(1) + 'px');
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
      ripple(.1); ripple(.4); ripple(.7); burst(26, 380); meteor(.5); meteor(.85); meteor(1.2);
    }
    function draw(now) {
      var t = (now - T0) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
      if (++tick % 60 === 1) readColors();
      ctx.clearRect(0, 0, W, H);
      /* 波紋の輪 */
      ripples = ripples.filter(function (r) { r.t += dt; return r.t < 1.5; });
      ripples.forEach(function (r) {
        if (r.t < 0) return; var q = r.t / 1.5;
        ctx.globalAlpha = (1 - q) * .9; ctx.lineWidth = 5 * (1 - q) + 1; ctx.strokeStyle = 'hsl(' + ((q * 300 + t * 60) % 360) + ',90%,' + (dark ? 72 : 62) + '%)';
        ctx.beginPath(); ctx.arc(cx, cy, q * Math.min(R * 1.9, H * .43), 0, 6.283); ctx.stroke();
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
    /* 動いている演出がある間だけ描き(多くても毎秒30回)、何もない間は止まって待ちます */
    var running = true, raf = 0, wake = 0, nextMeteor = 7;
    function active() { return ripples.length || parts.length || meteors.length; }
    function loop(now) {
      raf = 0;
      if (document.hidden || !running) return;
      if (now - lastDraw >= 30) { lastDraw = now; draw(now); }
      if (active()) raf = requestAnimationFrame(loop);
      else { ctx.clearRect(0, 0, W, H); sleep(); }
    }
    function kick() { if (!raf && running && !document.hidden) { last = performance.now(); lastDraw = 0; raf = requestAnimationFrame(loop); } }
    function sleep() {
      clearTimeout(wake);
      wake = setTimeout(function () { meteor(0); nextMeteor += rnd(6, 10); kick(); }, Math.max(0, nextMeteor * 1000 - (performance.now() - T0)));
    }
    readColors(); size(); window.addEventListener('resize', size);
    window.addEventListener('stage-burst', function () { burst(12, 260); ripple(0); kick(); });
    document.addEventListener('visibilitychange', kick);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { running = en[0].isIntersecting; rings.classList.toggle('paused', !running); if (running) { if (active()) kick(); else sleep(); } }).observe(cv);
    if (reduce) return;
    intro(); kick();
  })();

  /* ---- キラキラ(星とハート)がゆっくり降る ----
     星とハートを1つずつ動かすのをやめ、模様を描いた透明な「タイル」3枚を重ねて、1枚ずつ流しています。
     動くものが80個以上から6個ほどに減るので、画面の描き直しがとても少なくなります。
     色は --sparkle(ライト/ダークで自動で切り替わります)。 */
  (function sparkles() {
    var old = document.getElementById('sparkles'); if (old) old.hidden = true;
    if (reduce) return;
    var box = document.createElement('div'); box.className = 'sparkles'; box.setAttribute('aria-hidden', 'true');
    var styleEl = document.createElement('style');
    var TW = Math.min(Math.max(window.screen.width || 0, window.innerWidth), 2560), VH = Math.max(window.screen.height || 0, window.innerHeight, 600);
    var narrow = window.innerWidth < 600;
    var layers = [
      { th: 800, speed: 38, r: [8, 12], a: [.5, .85] },
      { th: 1000, speed: 26, r: [6, 9], a: [.4, .75] },
      { th: 1200, speed: 16, r: [4, 7], a: [.3, .6] }
    ];
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function tile(L, col) {
      var n = Math.max(3, Math.round(TW * L.th / (narrow ? 380000 : 190000))), d = '';
      for (var i = 0; i < n; i++) {
        var r = rnd(L.r[0], L.r[1]), x = rnd(r * 2, TW - r * 2), y = rnd(r * 2, L.th - r * 2), a = rnd(L.a[0], L.a[1]).toFixed(2);
        if (Math.random() < .3) {
          d += '<path transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (r * 1.1).toFixed(2) + ')" fill="' + col + '" fill-opacity="' + a + '" d="M0 .9C-1.5 -.2 -.6 -1.2 0 -.4C.6 -1.2 1.5 -.2 0 .9Z"/>';
        } else {
          var k = r * 2, p = [[1, .5], [.6131, .6131], [.5, 1], [.3869, .6131], [0, .5], [.3869, .3869], [.5, 0], [.6131, .3869]].map(function (q) { return (x + (q[0] - .5) * k).toFixed(1) + ',' + (y + (q[1] - .5) * k).toFixed(1); }).join(' ');
          d += '<polygon fill="' + col + '" fill-opacity="' + a + '" points="' + p + '"/>';
        }
      }
      return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + TW + '" height="' + L.th + '" viewBox="0 0 ' + TW + ' ' + L.th + '">' + d + '</svg>') + '")';
    }
    function build() {
      var col = (getComputedStyle(root).getPropertyValue('--sparkle') || '').trim() || '#ff9cc4', css = '';
      box.textContent = '';
      layers.forEach(function (L, i) {
        var el = document.createElement('div'); el.className = 'sl';
        el.style.cssText = 'top:-' + L.th + 'px;height:' + (VH + L.th) + 'px;background-image:' + tile(L, col) + ';background-size:' + TW + 'px ' + L.th + 'px';
        var dur = L.th / L.speed, steps = Math.round(dur * 24);
        el.style.animation = 'sl-fall' + i + ' ' + dur.toFixed(1) + 's steps(' + steps + ') infinite, sl-sway ' + (7 + i * 2) + 's steps(80) ' + (-i * 2.3) + 's infinite alternate';
        css += '@keyframes sl-fall' + i + '{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,' + L.th + 'px,0)}}';
        box.appendChild(el);
      });
      styleEl.textContent = css;
    }
    build();
    document.head.appendChild(styleEl);
    document.body.insertBefore(box, document.body.firstChild);
    document.addEventListener('click', function (e) { if (e.target.closest('.theme-btn')) setTimeout(build, 0); });
    if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { setTimeout(build, 0); }); } catch (e) {} }
  })();
})();
