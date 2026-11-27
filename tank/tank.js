/* Tankscaper website: the hero's live tank.
   The game's own fish models (the files the game loads, three.js r128) swim in front of a still of a tank built in the game.
   Poster first: the page shows the stage's own <img>. After the page has loaded this script fetches three.js, the fish and
   the still without fish, builds a layer over the poster (div.tank__live: the still, then the canvas) and fades it in.
   The poster stays, and nothing is fetched, under reduced motion, with data saver on and without WebGL; it comes back after
   an error or a lost context. A click or tap on the water, or a [data-tank-feed] button, drops food and the fish come for
   it (the buttons are written hidden and shown only where the tank can run). button.loop-pause in the stage, or a [data-tank-pause] button anywhere on the page, freezes it.

     <div class="hero__stage" data-tank="tank/" data-tank-back="img/hero-back.jpg" data-tank-h="46" data-tank-fog="#123a4c">
       <img src="img/hero-poster.jpg" alt="...">
       <button class="loop-pause" type="button" hidden></button>
     </div>
   data-tank-h: the centimetres of tank the still shows from top to bottom (it sets how big the fish are against it). */
(function () {
  'use strict';
  /* v4: every [data-tank] on the page gets its own tank. Its buttons are the ones beside it (in the same parent). A tank whose
     host carries data-held does not load until that is taken off, and stops drawing whenever it is put back. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-tank]'), function (host) {
  var near = host.parentNode || document;
  var feeders = Array.prototype.slice.call(near.querySelectorAll('[data-tank-feed]'));
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null, conn = navigator.connection;
  if (!window.requestAnimationFrame || !window.WebGLRenderingContext || !window.Promise || (mq && mq.matches) || (conn && conn.saveData)) return;
  var BASE = host.getAttribute('data-tank') || 'tank/', OPT = {};
  try { OPT = JSON.parse(host.getAttribute('data-tank-opts') || '{}'); } catch (e) {}
  var tank = null, queued = false, dead = false, pauseBtn = near.querySelector('[data-tank-pause]') || host.querySelector('.loop-pause');
  function fail() { dead = true; tank = null; host.classList.remove('is-live'); feeders.forEach(function (b) { b.hidden = true; }); if (pauseBtn) pauseBtn.hidden = true; }
  feeders.forEach(function (b) {
    b.hidden = false;
    b.addEventListener('click', function (e) { e.preventDefault(); if (dead) return; if (tank) tank.feedHere(); else queued = true; });
  });

  /* the cast: length in cm, how many (wide screen, phone), cruise in cm/s, tail beat in rad/s (the game's values for the big
     fish), how much of the body wave shows, turn rate, and the band of the view it keeps to (0 the foot, 1 the top) */
  var CAST = [
    { k: 'cardinal',  len: 4.2, n: [24, 14], v: 8.5, beat: 11,  amp: 1,    turn: 2.8, band: [0.44, 0.8],  shoal: true },
    { k: 'guppy',     len: 4.6, n: [5, 3],   v: 5,   beat: 9,   amp: 0.9,  turn: 2.4, band: [0.66, 0.9] },
    { k: 'discus',    len: 12,  n: [2, 1],   v: 3,   beat: 2.6, amp: 0.42, turn: 0.9, band: [0.42, 0.7] },
    { k: 'angelfish', len: 9.5, n: [2, 1],   v: 3.2, beat: 3,   amp: 0.5,  turn: 1.0, band: [0.5, 0.82] },
    { k: 'ram',       len: 6.2, n: [2, 2],   v: 2.6, beat: 4,   amp: 0.6,  turn: 1.4, band: [0.2, 0.34], near: true },   /* low, at the front, over the carpet */
    /* v4: the reef. A pair of clowns, a little shoal of damsels up in the flow, the two tangs cruising, an angel and a gramma
       round the rock, firefish hovering low, banggai hanging still, and the mandarin picking over the sand at the front */
    { k: 'clown', m: 'r_clown',      len: 8,   n: [2, 2], v: 4,   beat: 7,   amp: 0.75, turn: 2.2, band: [0.36, 0.62], reef: true },
    { k: 'damsel', m: 'r_damsel',     len: 5.5, n: [9, 6], v: 7,   beat: 10,  amp: 0.9,  turn: 2.6, band: [0.55, 0.86], shoal: true, reef: true },
    { k: 'bluetang', m: 'r_bluetang',   len: 13,  n: [1, 1], v: 5.2, beat: 3.6, amp: 0.5,  turn: 1.1, band: [0.48, 0.8], reef: true },
    { k: 'yellowtang', m: 'r_yellowtang', len: 11,  n: [1, 1], v: 4.6, beat: 3.8, amp: 0.5,  turn: 1.1, band: [0.5, 0.84], reef: true },
    { k: 'flameangel', m: 'r_flameangel', len: 9,   n: [1, 1], v: 3,   beat: 4.4, amp: 0.55, turn: 1.4, band: [0.26, 0.5], reef: true },
    { k: 'gramma', m: 'r_gramma',     len: 6,   n: [1, 1], v: 2.8, beat: 6,   amp: 0.7,  turn: 1.7, band: [0.24, 0.44], reef: true },
    { k: 'firefish', m: 'r_firefish',   len: 6,   n: [2, 1], v: 2.4, beat: 7,   amp: 0.7,  turn: 1.8, band: [0.14, 0.3], near: true, reef: true },
    { k: 'banggai', m: 'r_banggai',    len: 6.5, n: [2, 1], v: 1.8, beat: 3.6, amp: 0.45, turn: 1.0, band: [0.4, 0.62], reef: true },
    { k: 'mandarin', m: 'r_mandarin',   len: 6.5, n: [1, 1], v: 1.4, beat: 4,   amp: 0.5,  turn: 1.2, band: [0.07, 0.16], near: true, reef: true }
  ];
  if (OPT.cast) CAST = CAST.filter(function (c) { return OPT.cast.indexOf(c.k) >= 0; });
  else CAST = CAST.filter(function (c) { return !c.reef; });

  function script(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = src; s.async = true; s.onload = function () { ok(); }; s.onerror = function () { no(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function picture(src) {
    return new Promise(function (ok, no) { var im = new Image(); im.decoding = 'async'; im.onload = function () { ok(im); }; im.onerror = function () { no(new Error('load ' + src)); }; im.src = src; });
  }
  function texOf(L, THREE, url, colour) {   /* the game's own texture settings: its uvs are for an unflipped picture */
    return new Promise(function (ok, no) {
      L.load(url, function (t) { t.flipY = false; t.anisotropy = 4; if (colour) t.encoding = THREE.sRGBEncoding; ok(t); }, undefined, function () { if (colour) no(new Error('load ' + url)); else ok(null); });
    });
  }
  function idle(fn) { if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 1500 }); else setTimeout(fn, 250); }
  function start() {
    if (host.hasAttribute('data-held') && window.MutationObserver) {   /* not looked at yet: load nothing until it is */
      var mo = new MutationObserver(function () { if (!host.hasAttribute('data-held')) { mo.disconnect(); idle(function () { boot().catch(fail); }); } });
      mo.observe(host, { attributes: true, attributeFilter: ['data-held'] }); return;
    }
    idle(function () { boot().catch(fail); });
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });

  function boot() {
    var backSrc = host.getAttribute('data-tank-back'), poster = host.querySelector('img');
    var back = picture(backSrc || (poster && (poster.currentSrc || poster.src)));
    var lib = window.THREE ? Promise.resolve() : script(BASE + 'three.r128.min.js');
    var models = Promise.all(CAST.map(function (c) { return (window.TS_FISH_MODELS || {})[c.m || c.k] ? null : script(BASE + 'fish-' + c.k + '.js'); }));
    return Promise.all([lib, models, back]).then(function (r) {
      var THREE = window.THREE, L = new THREE.TextureLoader();
      return Promise.all(CAST.map(function (c) {
        return Promise.all([texOf(L, THREE, BASE + 'm-' + c.k + '.jpg', true), texOf(L, THREE, BASE + 'm-' + c.k + '-n.jpg', false)]);
      })).then(function (tex) { if (!dead) run(THREE, tex, r[2]); });
    });
  }

  /* light under ripples: three folded travelling waves, bright where they cancel (used on the fish's backs and on the floor) */
  var CAUSTIC = [
    'float tkCa(vec2 p, float t) {',
    '  vec2 q = p; float a = 0.0;',
    '  for (int i = 0; i < 3; i++) {',
    '    float f = float(i);',
    '    q += 0.55 * vec2(sin(q.y * 1.7 + t * (0.62 + 0.17 * f) + f * 1.3), cos(q.x * 1.5 - t * (0.54 + 0.13 * f) + f * 2.1));',
    '    a += abs(sin(q.x * 1.25 + f * 0.7) * cos(q.y * 1.1 - f * 0.9));',
    '  }',
    '  return pow(clamp(1.0 - a / 2.1, 0.0, 1.0), 4.0);',
    '}'
  ].join('\n');

  function run(THREE, textures, backImg) {
    var layer = document.createElement('div'); layer.className = 'tank__live'; layer.setAttribute('aria-hidden', 'true');
    backImg.alt = ''; backImg.className = 'tank__back'; layer.appendChild(backImg);
    var canvas = document.createElement('canvas'); layer.appendChild(canvas);
    var poster = host.querySelector('img');
    if (poster && window.getComputedStyle) backImg.style.objectPosition = getComputedStyle(poster).objectPosition;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' }); }
    catch (e) { fail(); return; }
    host.insertBefore(layer, pauseBtn && pauseBtn.parentNode === host ? pauseBtn : null);
    renderer.setClearColor(0x000000, 0);
    var phone = Math.min(window.innerWidth, window.innerHeight) < 640;
    var DPR = Math.min(window.devicePixelRatio || 1, OPT.dpr || 2);
    renderer.setPixelRatio(DPR);

    var scene = new THREE.Scene();
    var FOV = 26, TAN = Math.tan(FOV * Math.PI / 360), camera = new THREE.PerspectiveCamera(FOV, 2, 1, 600);
    scene.fog = new THREE.Fog(new THREE.Color(host.getAttribute('data-tank-fog') || '#123a4c'), 100, 300);
    scene.add(new THREE.HemisphereLight(0xdff4ff, 0x1c3f52, 0.8));
    var sun = new THREE.DirectionalLight(0xfff3d6, 0.9); sun.position.set(0.2, 1, 0.5); scene.add(sun);
    var rim = new THREE.DirectionalLight(0x7fd0ff, 0.35); rim.position.set(-0.5, 0.25, -1); scene.add(rim);

    /* the view. The still is laid cover and a touch large (ZOOM), so it can slide a few pixels behind the fish as the camera
       drifts; IMG_H cm of tank from its top to its bottom, so a wide stage shows less of its height */
    var IMG_H = +(host.getAttribute('data-tank-h') || 46), IMG_AR = (backImg.naturalWidth / backImg.naturalHeight) || 16 / 9, ZOOM = 1.04, PAR = 0.5;
    var V = { w: 1, h: 1, visH: IMG_H, visW: IMG_H, dist: 100, depth: 26, ppc: 10 };
    var U = { time: { value: 0 } };

    function dec(b64, T) { var t = atob(b64), u = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return new T(u.buffer); }
    function geoOf(M) {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(dec(M.pos, Float32Array), 3));
      if (M.nrm8) g.setAttribute('normal', new THREE.BufferAttribute(dec(M.nrm8, Int8Array), 3, true));
      if (M.uv16) g.setAttribute('uv', new THREE.BufferAttribute(dec(M.uv16, Uint16Array), 2, true));
      g.setIndex(new THREE.BufferAttribute(dec(M.idx, Uint16Array), 1));
      if (!g.attributes.normal) g.computeVertexNormals();
      return g;
    }
    /* the game's fish material with its swimming wave (head at +z, length 2: the wave grows toward the tail), a bend into
       each turn, and the water's light moving on the fish's back. aSwim = tail phase, wave size, bend */
    function matOf(tex, nrm) {
      var m = new THREE.MeshStandardMaterial({ map: tex, normalMap: nrm || null, roughness: 0.36, metalness: 0.08, side: THREE.DoubleSide,
        emissive: new THREE.Color(0xffffff), emissiveMap: tex, emissiveIntensity: OPT.glow != null ? OPT.glow : 0.7 });
      m.onBeforeCompile = function (sh) {
        sh.uniforms.uTime = U.time;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute vec3 aSwim;\nvarying vec3 vTkW;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n  float tkS = clamp((1.0 - position.z) * 0.5, 0.0, 1.0);\n  transformed.x += aSwim.y * sin(aSwim.x - tkS * 4.6) * (0.194 * tkS * tkS - 0.021 * (1.0 - tkS)) + aSwim.z * tkS * tkS * 0.5;')
          .replace('#include <project_vertex>', '#include <project_vertex>\n  vec4 tkP = vec4(transformed, 1.0);\n  #ifdef USE_INSTANCING\n    tkP = instanceMatrix * tkP;\n  #endif\n  vTkW = (modelMatrix * tkP).xyz;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vTkW;\n' + CAUSTIC)
          .replace('#include <tonemapping_fragment>', '  gl_FragColor.rgb += vec3(0.8, 1.0, 0.95) * tkCa(vTkW.xz * 0.2, uTime) * 0.34 * smoothstep(0.0, 0.85, vNormal.y);\n  #include <tonemapping_fragment>');
      };
      return m;
    }

    /* one instanced mesh per species */
    var fish = [], groups = [], shoals = [], MODELS = window.TS_FISH_MODELS || {};
    CAST.forEach(function (c, ci) {
      var M = MODELS[c.m || c.k]; if (!M) return;
      var n = c.n[phone ? 1 : 0], geo = geoOf(M);
      var swim = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); swim.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('aSwim', swim);
      var mesh = new THREE.InstancedMesh(geo, matOf(textures[ci][0], textures[ci][1]), n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; scene.add(mesh);
      var shoal = c.shoal ? { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, dir: Math.random() < 0.5 ? -1 : 1, v: c.v * 0.72, c: c } : null;
      if (shoal) shoals.push(shoal);
      groups.push({ c: c, mesh: mesh, swim: swim, scale: c.len / 2 * (M.size || 1) });
      for (var i = 0; i < n; i++) fish.push({ c: c, g: groups.length - 1, i: i, shoal: shoal, home: 0,
        x: 0, y: 0, z: 0, th: Math.random() < 0.5 ? 0 : Math.PI, ph: 0, v: c.v, tph: Math.random() * 6.28, amp: 0.7, bend: 0,
        tx: 0, ty: 0, tz: 0, wt: 0, ox: 0, oy: 0, oz: 0, ot: 0, size: 0.9 + Math.random() * 0.22, food: null, ft: Math.random() * 0.4, gulp: 0 });
    });
    if (!fish.length) { fail(); return; }
    /* the fish that swim alone each keep to their own part of the tank, so they never bunch in the middle */
    (function () {
      var solo = fish.filter(function (f) { return !f.shoal; }), order = solo.map(function (f, i) { return i; });
      for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
      solo.forEach(function (f, i) { f.home = ((order[i] + 0.5) / solo.length - 0.5) * 0.86; });
    })();

    function grad(w, h, draw) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); return new THREE.CanvasTexture(cv); }
    /* the floor: light moving on the ground, fading out toward the back */
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: { uTime: U.time, uCol: { value: new THREE.Color(0xc8f2dc) }, uAmt: { value: OPT.floor != null ? OPT.floor : 0.3 }, uNear: { value: 0 }, uFar: { value: -80 }, uHalf: { value: 50 } },
      vertexShader: 'varying vec3 vW;\nvoid main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float uTime; uniform vec3 uCol; uniform float uAmt; uniform float uNear; uniform float uFar; uniform float uHalf;\nvarying vec3 vW;\n' + CAUSTIC +
        '\nvoid main() { float k = (vW.z - uFar) / (uNear - uFar); float c = tkCa(vW.xz * 0.17, uTime * 0.8) + 0.5 * tkCa(vW.xz * 0.31 + 4.0, uTime * 0.6);\n  float a = c * uAmt * smoothstep(0.0, 1.0, k) * (1.0 - smoothstep(uHalf * 0.75, uHalf, abs(vW.x)));\n  gl_FragColor = vec4(uCol, a); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    floor.rotation.x = -Math.PI / 2; floor.renderOrder = 1; scene.add(floor);
    /* soft shafts of light, motes, one line of bubbles */
    var shaftTex = grad(64, 256, function (x, w, h) {
      var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      var m = x.createLinearGradient(0, 0, w, 0); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(0.5, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = m; x.fillRect(0, 0, w, h);
    });
    var shafts = [], NS = phone ? 4 : 6;
    for (var s = 0; s < NS; s++) {
      var sm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.08, fog: false, color: 0xcdeeff }));
      sm.userData = { x: ((s + 0.5) / NS - 0.5) * 1.15 + (Math.random() - 0.5) * 0.1, w: 0.08 + Math.random() * 0.1, p: Math.random() * 6.28, z: -3 - (s % 3) * 9 - Math.random() * 3 };
      sm.renderOrder = 2; scene.add(sm); shafts.push(sm);
    }
    var dotTex = grad(32, 32, function (x) { var g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });
    var NM = phone ? 50 : 90, mp = new Float32Array(NM * 3), ms = [];
    for (var m0 = 0; m0 < NM; m0++) ms.push({ x: Math.random(), y: Math.random(), z: Math.random(), p: Math.random() * 6.28, v: 0.3 + Math.random() * 0.6 });
    var motesGeo = new THREE.BufferGeometry(); motesGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    var motes = new THREE.Points(motesGeo, new THREE.PointsMaterial({ map: dotTex, size: 0.4, transparent: true, opacity: 0.42, depthWrite: false, color: 0xd6eef8, sizeAttenuation: true }));
    motes.frustumCulled = false; scene.add(motes);
    var ringTex = grad(64, 64, function (x) {
      x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3; x.beginPath(); x.arc(32, 32, 26, 0, 6.3); x.stroke();
      var g = x.createRadialGradient(24, 22, 0, 32, 32, 28); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.4, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(32, 32, 26, 0, 6.3); x.fill();
    });
    var bubMat = new THREE.SpriteMaterial({ map: ringTex, transparent: true, depthWrite: false, opacity: 0.7, fog: false });
    var bubbles = [], BX = OPT.bubbles != null ? OPT.bubbles : 0.3;
    for (var b = 0; b < (phone ? 9 : 14); b++) { var sp = new THREE.Sprite(bubMat); sp.userData = { y: Math.random(), p: Math.random() * 6.28, v: 11 + Math.random() * 8, s: 0.4 + Math.random() * 0.7 }; scene.add(sp); bubbles.push(sp); }
    var foodMat = new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthWrite: false, color: 0xe8963c, fog: false });
    var food = [], rings = [];

    var INSET = OPT.inset || 0;   /* for drawing the poster: keep the fish inside the part of a tall view that a wide stage shows */
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function spot(f) {   /* somewhere to swim to: in its species' band, near its own part of the tank, now and then right across it */
      var c = f.c, far = Math.random() < 0.16;
      f.tx = Math.max(-0.6, Math.min(0.6, far ? rnd(-0.55, 0.55) : f.home + rnd(-0.2, 0.2))) * V.visW;
      f.ty = (INSET + rnd(c.band[0], c.band[1]) * (1 - 2 * INSET) - 0.5) * V.visH; f.tz = -(c.near ? rnd(0.08, 0.36) : rnd(0.12, 1)) * V.depth; f.wt = rnd(4, 9);
    }
    function aim(s) {   /* the shoal crosses the tank, turns at the far side and comes back */
      s.dir = -s.dir; s.tx = s.dir * rnd(0.26, 0.6) * V.visW; s.ty = (INSET + rnd(s.c.band[0] + 0.05, s.c.band[1] - 0.05) * (1 - 2 * INSET) - 0.5) * V.visH; s.tz = -rnd(0.3, 0.85) * V.depth;
    }
    function place() {
      shoals.forEach(function (s) { aim(s); s.x = -s.tx * 0.5; s.y = s.ty; s.z = s.tz; });
      fish.forEach(function (f) {
        spot(f); f.x = f.tx; f.y = f.ty; f.z = f.tz; spot(f);
        if (f.shoal) { f.x = f.shoal.x + rnd(-10, 10); f.y = f.shoal.y + rnd(-4, 4); f.z = f.shoal.z + rnd(-5, 5); }
      });
    }
    function fit() {
      var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
      V.w = w; V.h = h; renderer.setSize(w, h, false);
      var ar = w / h;
      V.visH = (ar > IMG_AR ? IMG_H * IMG_AR / ar : IMG_H) / ZOOM; V.visW = V.visH * ar; V.ppc = h / V.visH;
      V.dist = V.visH / (2 * TAN); V.depth = Math.min(30, V.visH * 0.8);
      camera.aspect = ar; camera.position.z = V.dist; camera.near = Math.max(1, V.dist - 16); camera.far = V.dist + 200; camera.updateProjectionMatrix();
      scene.fog.near = V.dist + V.depth * 0.25; scene.fog.far = V.dist + V.depth * 2.7;
      shafts.forEach(function (m) { var d = m.userData, k = (V.dist - d.z) / V.dist; m.scale.set(V.visW * d.w * k, V.visH * 1.5 * k, 1); m.position.set(d.x * V.visW * k, V.visH * 0.1 * k, d.z); });
      var near = 10, far = -V.dist * 1.1, fm = floor.material.uniforms;   /* it ends well short of the horizon, where it would read as a line across the plants */
      floor.scale.set(V.visW * 3.4, near - far, 1); floor.position.set(0, -V.visH * (OPT.ground != null ? OPT.ground : 0.4), (near + far) / 2);
      fm.uNear.value = -V.dist * 0.15; fm.uFar.value = far; fm.uHalf.value = V.visW * 1.7;
    }
    fit(); place();

    /* where a click lands in the water, on a plane a little way in */
    function toWorld(cx, cy, z) {
      var r = canvas.getBoundingClientRect(), nx = ((cx - r.left) / r.width) * 2 - 1, ny = 1 - ((cy - r.top) / r.height) * 2, hh = (V.dist - z) * TAN;
      return { x: nx * hh * (V.w / V.h) + camera.position.x, y: ny * hh + camera.position.y, z: z };
    }
    function feed(x, y, z) {
      var ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, transparent: true, depthWrite: false, opacity: 0.8, fog: false }));
      ring.position.set(x, y, z); ring.userData = { t: 0 }; scene.add(ring); rings.push(ring);
      for (var i = 0; i < 9 && food.length < 36; i++) {
        var sp = new THREE.Sprite(foodMat), s = rnd(0.5, 0.8); sp.scale.set(s, s, 1);
        sp.userData = { x: x + rnd(-3.2, 3.2), y: y + rnd(-1.2, 1.2), z: z + rnd(-3, 3), p: Math.random() * 6.28, v: rnd(3, 4.6), rest: 0, by: 0 };
        sp.position.set(sp.userData.x, sp.userData.y, sp.userData.z); scene.add(sp); food.push(sp);
      }
      wake();
    }
    function feedHere() {
      if (paused) setPaused(false);
      feed(rnd(-0.2, 0.2) * V.visW, V.visH * 0.36, -V.depth * 0.35);
      var r = host.getBoundingClientRect();
      if (r.top > window.innerHeight - 140 && host.scrollIntoView) host.scrollIntoView({ block: 'center' });
    }
    layer.addEventListener('click', function (e) { if (paused) return; var p = toWorld(e.clientX, e.clientY, -V.depth * 0.35); feed(p.x, Math.min(p.y, V.visH * 0.42), p.z); });

    var M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ'), P = new THREE.Vector3(), S = new THREE.Vector3();
    function step(dt) {
      var i, j, f, c, t = U.time.value;
      for (i = 0; i < shoals.length; i++) {
        var s = shoals[i], dx = s.tx - s.x, dy = s.ty - s.y, dz = s.tz - s.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, mv = s.v * dt;
        if (d < 2.5) aim(s); else { s.x += dx / d * mv; s.y += dy / d * mv; s.z += dz / d * mv; }
      }
      /* food sinks, sways, rests on the floor for a while, then is gone */
      var bed = -V.visH * 0.44;
      for (i = food.length - 1; i >= 0; i--) {
        var p = food[i], u = p.userData;
        if (u.y > bed) { u.y -= u.v * dt; u.p += dt * 2; u.x += Math.sin(u.p) * 0.9 * dt; } else u.rest += dt;
        p.position.set(u.x, u.y, u.z); u.by = 0;
        if (u.rest > 5) { scene.remove(p); food.splice(i, 1); }
      }
      for (i = rings.length - 1; i >= 0; i--) {
        var rg = rings[i]; rg.userData.t += dt; var rk = rg.userData.t / 0.7, rs = 1.5 + 6 * (1 - Math.pow(1 - Math.min(1, rk), 3));
        rg.scale.set(rs, rs, 1); rg.material.opacity = 0.8 * (1 - Math.min(1, rk));
        if (rk >= 1) { scene.remove(rg); rg.material.dispose(); rings.splice(i, 1); }
      }
      var ox = Math.min(12, V.visW * 0.17);
      for (i = 0; i < fish.length; i++) {
        f = fish[i]; c = f.c;
        /* look for food now and then: the nearest piece that not too many others are after */
        f.ft -= dt;
        if (f.ft <= 0) {
          f.ft = 0.35; f.food = null; var best = 1e9;
          for (j = 0; j < food.length; j++) { var q = food[j].userData, w = Math.abs(q.x - f.x) + Math.abs(q.y - f.y) * 1.2 + Math.abs(q.z - f.z); w *= 1 + 0.5 * q.by; if (w < best) { best = w; f.food = food[j]; } }
          if (f.food) f.food.userData.by++;
        }
        var tx, ty, tz, vt = c.v;
        if (f.food && f.food.parent) {
          var fu = f.food.userData; tx = fu.x; ty = fu.y; tz = fu.z; vt = c.v * 2.4;
          var ex = tx - f.x, ey = ty - f.y, ez = tz - f.z;
          if (ex * ex + ey * ey + ez * ez < Math.pow(c.len * 0.42 + 0.9, 2)) { scene.remove(f.food); food.splice(food.indexOf(f.food), 1); f.food = null; f.gulp = 0.45; f.ft = 0.5; }
        } else if (f.shoal) {
          f.ot -= dt; if (f.ot <= 0) { f.ox = rnd(-ox, ox); f.oy = rnd(-4.5, 4.5); f.oz = rnd(-6, 6); f.ot = rnd(1.5, 4); }
          tx = f.shoal.x + f.ox; ty = f.shoal.y + f.oy; tz = f.shoal.z + f.oz;
          vt = c.v * (0.72 + Math.min(1.3, (Math.abs(tx - f.x) + Math.abs(ty - f.y)) / 14));
        } else {
          f.wt -= dt;
          if (f.wt <= 0 || Math.abs(f.tx - f.x) + Math.abs(f.ty - f.y) + Math.abs(f.tz - f.z) < c.len) spot(f);
          tx = f.tx; ty = f.ty; tz = f.tz;
        }
        if (f.gulp > 0) { f.gulp -= dt; vt = c.v * 0.35; }
        var ddx = tx - f.x, ddy = ty - f.y, ddz = tz - f.z;
        /* keep clear of the others: the smaller fish gives way, mostly into the depth, where it shows least */
        for (j = 0; j < fish.length; j++) {
          if (j === i) continue; var o = fish[j], rr = (c.len + o.c.len) * 0.4, ax = f.x - o.x, ay = f.y - o.y, az = f.z - o.z;
          if (ax > rr || ax < -rr || ay > rr || ay < -rr) continue;
          var d2 = ax * ax + ay * ay * 1.8 + az * az * 2.2;
          if (d2 < rr * rr) { var dd = Math.sqrt(d2) || 0.01, give = (rr - dd) / rr * (o.c.len / (c.len + o.c.len)) * 2.2; ax /= dd; ay /= dd; az = (az / dd) || (i < j ? 0.5 : -0.5);
            ddx += ax * give * rr; ddy += ay * give * rr; ddz += az * give * rr * 1.6; f.x += ax * give * c.v * 0.5 * dt; f.y += ay * give * c.v * 0.4 * dt; f.z += az * give * c.v * 1.4 * dt; }
        }
        var dh = Math.sqrt(ddx * ddx + ddz * ddz) || 1e-3;
        var want = Math.atan2(ddz * 0.55, ddx), max = c.turn * (vt > c.v * 1.5 ? 1.9 : 1) * dt, da = want - f.th;
        while (da > Math.PI) da -= 6.2832; while (da < -Math.PI) da += 6.2832;
        da = Math.max(-max, Math.min(max, da)); f.th += da;
        f.bend += (Math.max(-0.55, Math.min(0.55, -da / dt * 0.42)) - f.bend) * Math.min(1, dt * 5);
        var wp = Math.max(-0.6, Math.min(0.6, Math.atan2(ddy, dh)));
        f.ph += Math.max(-1.4 * dt, Math.min(1.4 * dt, wp - f.ph));
        f.v += (vt - f.v) * Math.min(1, dt * 2.2);
        var cp = Math.cos(f.ph);
        f.x += cp * Math.cos(f.th) * f.v * dt; f.y += Math.sin(f.ph) * f.v * dt; f.z += cp * Math.sin(f.th) * f.v * dt * 0.7;
        if (f.z > -1.5) f.z = -1.5; else if (f.z < -V.depth * 1.15) f.z = -V.depth * 1.15;
        var r = f.v / c.v; f.tph += dt * c.beat * (0.45 + 0.75 * Math.min(3, r)); f.amp += ((0.55 + 0.45 * Math.min(1.4, r)) * c.amp - f.amp) * Math.min(1, dt * 4);
        var g = groups[f.g], sc = g.scale * f.size;
        E.set(-f.ph, Math.PI / 2 - f.th, 0); Q.setFromEuler(E); P.set(f.x, f.y, f.z); S.set(sc, sc, sc);
        M4.compose(P, Q, S); g.mesh.setMatrixAt(f.i, M4);
        g.swim.array[f.i * 3] = f.tph % 6.2832; g.swim.array[f.i * 3 + 1] = f.amp; g.swim.array[f.i * 3 + 2] = f.bend;
      }
      for (i = 0; i < groups.length; i++) { groups[i].mesh.instanceMatrix.needsUpdate = true; groups[i].swim.needsUpdate = true; }
      /* the camera drifts a centimetre or so; the still slides the other way, less, as the far wall would. The drift starts
         from rest when the tank first shows, where the still sits exactly as the poster does */
      var td = live && !OPT.still ? t - T0 : 0, cx = Math.sin(td * 0.13) * 1.1 + Math.sin(td * 0.071) * 0.5, cy = Math.sin(td * 0.097) * 0.4;
      camera.position.x = cx; camera.position.y = cy;
      backImg.style.transform = 'translate3d(' + (-cx * PAR * V.ppc).toFixed(2) + 'px,' + (cy * PAR * V.ppc).toFixed(2) + 'px,0) scale(' + ZOOM + ')';
      for (i = 0; i < shafts.length; i++) { var sd = shafts[i].userData; shafts[i].material.opacity = 0.05 + 0.07 * (0.5 + 0.5 * Math.sin(t * 0.33 + sd.p)); shafts[i].rotation.z = 0.15 + 0.035 * Math.sin(t * 0.21 + sd.p); }
      var mw = V.visW * 1.3, mh = V.visH * 1.1;
      for (i = 0; i < NM; i++) { var mo = ms[i]; mo.y += mo.v * dt / mh; if (mo.y > 1) mo.y -= 1; mp[i * 3] = (mo.x - 0.5) * mw + Math.sin(t * 0.4 + mo.p) * 1.2; mp[i * 3 + 1] = (mo.y - 0.5) * mh; mp[i * 3 + 2] = -mo.z * V.depth * 1.3; }
      motesGeo.attributes.position.needsUpdate = true;
      for (i = 0; i < bubbles.length; i++) { var bu = bubbles[i].userData; bu.y += bu.v * dt / V.visH; if (bu.y > 1.08) { bu.y = -0.08; bu.p = Math.random() * 6.28; } bubbles[i].position.set(BX * V.visW + Math.sin(t * 2.2 + bu.p) * 0.9 + (bu.p - 3.14) * 0.5, (bu.y - 0.5) * V.visH, -V.depth * 0.55); var bs = bu.s * (0.7 + 0.5 * bu.y); bubbles[i].scale.set(bs, bs, 1); }
    }

    var paused = false, held = false, seen = true, live = false, last = 0, raf = 0, slow = 0, frames = 0, T0 = 0;
    function frame(now) {
      raf = 0; if (paused || held || !seen || document.hidden || dead) return;
      var raw = (now - last) / 1000, dt = Math.min(0.05, Math.max(0.001, raw)); last = now;
      U.time.value += dt; step(dt); renderer.render(scene, camera);
      if (!live) { live = true; T0 = U.time.value; host.classList.add('is-live'); if (pauseBtn) pauseBtn.hidden = false; if (queued) { queued = false; feedHere(); } }
      /* a slow device gets a lighter picture: fewer pixels first */
      if (frames < 240) { frames++; if (frames > 30) slow += raw; if (frames === 120 || frames === 240) { if (slow / (frames === 120 ? 90 : 120) > 0.03 && DPR > 1) { DPR = Math.max(1, DPR - 0.5); renderer.setPixelRatio(DPR); fit(); } slow = 0; } }
      raf = requestAnimationFrame(frame);
    }
    function wake() { if (!raf && !paused && !held && seen && !document.hidden && !dead) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    var PAUSE = '<svg viewBox="0 0 14 14" aria-hidden="true"><rect x="3" y="2.5" width="3" height="9" rx=".8"/><rect x="8" y="2.5" width="3" height="9" rx=".8"/></svg>';
    var PLAY = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M4 2.6v8.8a.6.6 0 0 0 .9.5l7-4.4a.6.6 0 0 0 0-1l-7-4.4a.6.6 0 0 0-.9.5z"/></svg>';
    function setPaused(on) {
      paused = on;
      if (pauseBtn) { var l = (on ? 'Play' : 'Pause') + ' animation'; pauseBtn.innerHTML = on ? PLAY : PAUSE; pauseBtn.setAttribute('aria-label', l); pauseBtn.title = l; pauseBtn.classList.toggle('is-paused', on); }
      if (!on) wake();
    }
    if (pauseBtn) pauseBtn.addEventListener('click', function () { setPaused(!paused); });
    setPaused(false);
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; wake(); }, { rootMargin: '80px' }).observe(host);
    document.addEventListener('visibilitychange', wake);
    var rz = 0;
    function refit() { clearTimeout(rz); rz = setTimeout(function () { if (dead) return; fit(); if (paused || !seen) { step(0.001); renderer.render(scene, camera); } }, 120); }
    if (window.ResizeObserver) new ResizeObserver(refit).observe(host); else window.addEventListener('resize', refit);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fail(); });
    if (mq) { var onMq = function () { if (mq.matches) fail(); }; if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq); }
    /* a few seconds of swimming before the first frame shows, so the tank opens settled, the shoal together */
    for (var w0 = 0; w0 < 260; w0++) { U.time.value += 0.05; step(0.05); }
    tank = { feed: feed, feedHere: feedHere, pause: function () { setPaused(true); }, resume: function () { setPaused(false); },
      hold: function (on) { on = !!on; if (on === held) return; held = on; if (!on) wake(); },   /* the page stops the tank while it is out of sight (the dive has passed it) */
      state: function () { return { fish: fish.length, food: food.length, live: live, paused: paused, dpr: DPR, visH: V.visH, visW: V.visW }; } };
    host.tank = tank;
    if (window.MutationObserver) new MutationObserver(function () { tank.hold(host.hasAttribute('data-held')); }).observe(host, { attributes: true, attributeFilter: ['data-held'] });
    if (host.hasAttribute('data-held')) held = true;
    wake();
  }
  });
})();
