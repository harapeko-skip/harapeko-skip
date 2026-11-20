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
    var submit = form.querySelector('button[type="submit"]'), adminBtn = document.getElementById('bbs-admin-btn'), noticeText = notice.textContent;
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

    /* 管理モードの表示(お知らせ文・フォームの見た目・ボタンの文字)を切り替える */
    function applyAdminUi() {
      notice.textContent = adminMode ? '管理モードです。書き込むと「管理人」として表示され、各書き込みの「削除」ボタンで消せます。' : noticeText;
      notice.classList.toggle('admin', adminMode);
      form.classList.toggle('is-admin', adminMode);
      if (adminBtn) adminBtn.textContent = adminMode ? '管理モードをやめる' : '管理人用';
    }
    if (adminBtn) adminBtn.hidden = false;
    if (adminMode) askKey();
    applyAdminUi();

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

    /* 「管理人用」ボタン: パスワードを入力 → 正しければ管理モード(削除ボタンが出る)。もう一度押すと元に戻る */
    if (adminBtn) adminBtn.addEventListener('click', function () {
      if (adminMode) {
        adminMode = false; forgetKey();
        try { if (location.hash === '#admin') history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
        try { form.elements.name.value = localStorage.getItem('hs-bbs-name') || ''; } catch (e) {}
        applyAdminUi(); say(''); load(true); return;
      }
      var k = (window.prompt('管理用パスワードを入力してください') || '').trim();
      if (!k) return;
      adminBtn.disabled = true; adminKey = k;
      /* 存在しない書き込み(No.0)の削除を頼んで、パスワードだけを確かめます(何も消えません) */
      request('DELETE', '/posts/0', null, true).then(function () {
        try { sessionStorage.setItem('hs-bbs-admin', k); } catch (e) {}
        adminMode = true; form.elements.name.value = '';
        applyAdminUi(); say(''); load(true);
      }).catch(function (err) {
        forgetKey();
        window.alert(err.status === 401 ? 'パスワードが違います。' : (err.status ? err.message : '確認できませんでした。通信状況を確認して、もう一度お試しください。'));
      }).then(function () { adminBtn.disabled = false; });
    });

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

  /* ---- 演出(トップのキャラの後光・魔法陣・流れ星 / 画面全体のキラキラ) ----
     どちらも「canvas を1枚だけ使い、時刻から位置を計算して、単純な図形で描く」方式です。
     ・CSSアニメーションで大きな半透明レイヤーを何枚も動かすのをやめました(これが重さの原因でした)
     ・毎秒30回(キラキラは24回)までしか描かず、画面に見えていない・タブが裏のときは完全に止まります
     ・後光は「1つのパスを1回塗る」、魔法陣は「作っておいた線の形(Path2D)を回して描くだけ」、
       キラキラは「作っておいた星・ハートの小さな絵を並べるだけ」なので、1コマの処理がとても軽いです。 */
  var TAU = Math.PI * 2;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }
  function isDarkNow() { return root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function cssVar(n, d) { return (getComputedStyle(root).getPropertyValue(n) || '').trim() || d; }
  function rgba(h, a) { var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h) || [0, 'e8', 'a2', '1f']; return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')'; }

  (function stageFx() {
    var cv = document.getElementById('stage-fx'); if (!cv) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, cx = 0, cy = 0, R = 0;
    var gold = '#e8a21f', sky = '#46aee6', pink = '#ff7fae', dark = false;
    var T0 = performance.now(), lastDraw = 0, last = T0;
    var parts = [], meteors = [], ripples = [], nextMeteor = 7;
    var haloGrad = null, P = null;          /* haloGrad: 後光の塗り / P: 魔法陣の線の形(Path2D) */
    var running = true, raf = 0;

    function readColors() {
      gold = cssVar('--fx-a', gold); sky = cssVar('--fx-b', sky); pink = cssVar('--pink', pink); dark = isDarkNow();
      build();
    }
    /* 後光と魔法陣の「形」を作っておく(大きさと色が変わったときだけ作り直す) */
    function build() {
      if (!R) return;
      var L = R * 1.45, w = .09, i, d = new Path2D();
      for (i = 0; i < 14; i++) { var a = i * TAU / 14; d.moveTo(0, 0); d.lineTo(Math.cos(a - w) * L, Math.sin(a - w) * L); d.lineTo(Math.cos(a + w) * L, Math.sin(a + w) * L); d.closePath(); }
      haloGrad = { path: d, fill: (function () { var g = ctx.createRadialGradient(0, 0, 0, 0, 0, L); g.addColorStop(0, rgba(gold, 1)); g.addColorStop(.34, rgba(gold, 1)); g.addColorStop(1, rgba(gold, 0)); return g; })() };
      var s = R / 100, base = new Path2D(), ticks = new Path2D(), star = new Path2D(), dots = new Path2D(), dash = new Path2D();
      base.arc(0, 0, 100 * s, 0, TAU); base.moveTo(94 * s, 0); base.arc(0, 0, 94 * s, 0, TAU);
      for (i = 0; i < 48; i++) { var b = (i + 1) * Math.PI / 24, o = i % 4 ? 92 : 86; ticks.moveTo(88 * s * Math.cos(b), 88 * s * Math.sin(b)); ticks.lineTo(o * s * Math.cos(b), o * s * Math.sin(b)); }
      for (var h = 0; h < 2; h++) { for (var v = 0; v < 3; v++) { var c = v * 2.094 + h * Math.PI, x = Math.cos(c) * 80 * s, y = Math.sin(c) * 80 * s; if (v) star.lineTo(x, y); else star.moveTo(x, y); } star.closePath(); }
      for (i = 0; i < 6; i++) { var e = i * Math.PI / 3, dx = Math.cos(e) * 80 * s, dy = Math.sin(e) * 80 * s; dots.moveTo(dx + 1.8 * s, dy); dots.arc(dx, dy, 1.8 * s, 0, TAU); }
      dash.arc(0, 0, 60 * s, 0, TAU);
      P = { s: s, base: base, ticks: ticks, star: star, dots: dots, dash: dash };
    }
    function size() {
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W; cv.height = H;
      cx = W / 2; cy = H * .55; R = Math.min(W, H) * .4; build(); if (!running || reduce) paint(performance.now());
    }
    function burst(n, power) {
      var cols = [gold, sky, pink, '#ffffff'];
      for (var i = 0; i < n; i++) { var a = rnd(0, TAU), v = rnd(.35, 1) * power; parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: rnd(1.1, 1.9), r: rnd(4, 9), c: cols[i % 4] }); }
    }
    function ripple(delay) { ripples.push({ t: -delay }); }
    function meteor(delay) { meteors.push({ t: -delay, x: rnd(W * .55, W), y: rnd(-10, H * .25), len: rnd(110, 170) }); }
    function star5(x, y, r) {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5 - Math.PI / 2, d = i % 2 ? r * .38 : r; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
      ctx.closePath(); ctx.fill();
    }

    /* 後光(1回塗るだけ)と魔法陣(作っておいた形を回して描くだけ) */
    function drawRings(t) {
      var kh = ease(t / 1.1), kc = ease(t / 1.3), ks = ease(t / 1.8), ra = dark ? .75 : .54, ha = (dark ? .26 : .3) * .85;
      if (!P) return;
      ctx.save(); ctx.translate(cx, cy);
      ctx.save(); ctx.rotate(t * TAU / 105); ctx.globalAlpha = ha * kh; ctx.fillStyle = haloGrad.fill; ctx.fill(haloGrad.path); ctx.restore();
      var sc = .35 + .65 * kc; ctx.scale(sc, sc * .9); ctx.globalAlpha = ra * kc; ctx.lineWidth = .9 * P.s;
      ctx.strokeStyle = gold; ctx.stroke(P.base);
      var spin = 343.8 * Math.PI / 180 * (1 - ks);
      ctx.save(); ctx.rotate(t * TAU / 52.4 + spin); ctx.strokeStyle = sky; ctx.stroke(P.ticks); ctx.restore();
      ctx.save(); ctx.rotate(-t * TAU / 34.9 - spin); ctx.strokeStyle = gold; ctx.stroke(P.star); ctx.fillStyle = sky; ctx.fill(P.dots); ctx.restore();
      ctx.save(); ctx.rotate(t * TAU / 25.1 + spin); ctx.strokeStyle = sky; ctx.lineWidth = 1.2 * P.s; ctx.setLineDash([1 * P.s, 4.5 * P.s]); ctx.stroke(P.dash); ctx.restore();
      ctx.restore();
    }
    function paint(now) {
      var t = reduce ? 99 : (now - T0) / 1000, dt = Math.min(.1, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, W, H);
      drawRings(t);
      if (reduce) return;
      if (t > nextMeteor) { meteor(0); nextMeteor = t + rnd(6, 10); }
      ripples = ripples.filter(function (r) { r.t += dt; return r.t < 1.5; });
      ripples.forEach(function (r) {
        if (r.t < 0) return; var q = r.t / 1.5;
        ctx.globalAlpha = (1 - q) * .9; ctx.lineWidth = 5 * (1 - q) + 1; ctx.strokeStyle = 'hsl(' + ((q * 300 + t * 60) % 360) + ',90%,' + (dark ? 72 : 62) + '%)';
        ctx.beginPath(); ctx.arc(cx, cy, q * Math.min(R * 1.9, H * .43), 0, TAU); ctx.stroke();
      });
      parts = parts.filter(function (p) { p.life += dt; return p.life < p.max; });
      parts.forEach(function (p) {
        p.vx *= (1 - 1.8 * dt); p.vy = p.vy * (1 - 1.8 * dt) + 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = p.c; star5(p.x, p.y, p.r);
      });
      meteors = meteors.filter(function (m) { m.t += dt; return m.t < 1.1; });
      meteors.forEach(function (m) {
        if (m.t < 0) return; var q = m.t / 1.1, x = m.x - q * W * .9, y = m.y + q * H * .8, ang = Math.atan2(H * .8, -W * .9);
        var g = ctx.createLinearGradient(x, y, x - Math.cos(ang) * m.len, y - Math.sin(ang) * m.len);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = Math.sin(q * Math.PI); ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * m.len, y - Math.sin(ang) * m.len); ctx.stroke();
      });
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    }
    /* 毎秒30回まで。画面に見えていない・タブが裏のときは止まる */
    function loop(now) {
      raf = 0; if (document.hidden || !running) return;
      raf = requestAnimationFrame(loop);
      if (now - lastDraw < 32) return;
      lastDraw = now; paint(now);
    }
    function kick() { if (!raf && running && !document.hidden && !reduce) { last = performance.now(); raf = requestAnimationFrame(loop); } }
    readColors(); size(); window.addEventListener('resize', size);
    window.addEventListener('stage-burst', function () { burst(12, 260); ripple(0); kick(); });
    document.addEventListener('visibilitychange', kick);
    document.addEventListener('click', function (e) { if (e.target.closest('.theme-btn')) setTimeout(function () { readColors(); if (reduce) paint(performance.now()); }, 0); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { running = en[0].isIntersecting; if (running) kick(); }).observe(cv);
    if (reduce) { paint(performance.now()); return; }
    ripple(.1); ripple(.4); ripple(.7); burst(26, 380); meteor(.5); meteor(.85); meteor(1.2);
    kick();
  })();

  /* ---- キラキラ(星とハート)がゆっくり降る ----
     小さな星とハートの絵を作っておき、半分の解像度の canvas に毎秒24回並べるだけです。
     色は --sparkle(ライト/ダークで自動で切り替わります)。 */
  (function sparkles() {
    var old = document.getElementById('sparkles'); if (old) old.hidden = true;
    if (reduce) return;
    var cv = document.createElement('canvas'); cv.className = 'sparkles'; cv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(cv, document.body.firstChild);
    var ctx = cv.getContext('2d'), SC = .5, W = 0, H = 0, ps = [], t0 = performance.now(), last = t0, lastDraw = 0, raf = 0;
    var N = window.innerWidth < 600 ? 22 : 40;
    function sprite(r, heart, col, a) {
      var k = Math.ceil(r * 2.4), c = document.createElement('canvas'), g; c.width = c.height = k * 2; g = c.getContext('2d');
      g.translate(k, k); g.globalAlpha = a; g.fillStyle = col; g.beginPath();
      if (heart) { var q = r * 1.1; g.moveTo(0, .9 * q); g.bezierCurveTo(-1.5 * q, -.2 * q, -.6 * q, -1.2 * q, 0, -.4 * q); g.bezierCurveTo(.6 * q, -1.2 * q, 1.5 * q, -.2 * q, 0, .9 * q); }
      else { var pts = [[1, .5], [.6131, .6131], [.5, 1], [.3869, .6131], [0, .5], [.3869, .3869], [.5, 0], [.6131, .3869]]; pts.forEach(function (p) { g.lineTo((p[0] - .5) * r * 2, (p[1] - .5) * r * 2); }); }
      g.closePath(); g.fill(); return { c: c, k: k };
    }
    function build() {
      var col = cssVar('--sparkle', '#ff9cc4'); ps = [];
      for (var i = 0; i < N; i++) {
        var depth = Math.random(), r = (4 + depth * 8) * SC;
        ps.push({ x: Math.random(), y: Math.random(), sp: (14 + depth * 26) * SC, amp: 14 * SC, ph: rnd(0, TAU), spr: sprite(r, Math.random() < .3, col, .3 + depth * .5) });
      }
    }
    function size() { W = Math.round(innerWidth * SC); H = Math.round(innerHeight * SC); cv.width = W; cv.height = H; }
    function paint(now) {
      var t = (now - t0) / 1000, dt = Math.min(.1, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i], k = p.spr.k; p.y += p.sp * dt / H; if (p.y > 1.05) { p.y = -.05; p.x = Math.random(); }
        ctx.drawImage(p.spr.c, p.x * W + Math.sin(t * .4 + p.ph) * p.amp - k, p.y * H - k);
      }
    }
    function loop(now) { raf = 0; if (document.hidden) return; raf = requestAnimationFrame(loop); if (now - lastDraw < 40) return; lastDraw = now; paint(now); }
    function kick() { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
    size(); build(); kick();
    window.addEventListener('resize', size);
    document.addEventListener('visibilitychange', kick);
    document.addEventListener('click', function (e) { if (e.target.closest('.theme-btn')) setTimeout(build, 0); });
    if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { setTimeout(build, 0); }); } catch (e) {} }
  })();
})();
