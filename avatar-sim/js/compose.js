// TW avatar compositor for the browser: a port of src/avatarlib.py (plan / compose_layers / render) that works on
// the files written by src/tw_webexport.py.  No framework; everything is plain functions on a shared `TW` object.
//
//   TW.load(baseUrl)                         -> index.json + extras.json
//   TW.loadChar(ci)                          -> chars/<ci>.json (cached)
//   TW.prepare(pose)                         -> fetches every animation and texture the pose needs
//   TW.compose(pose, tick)                   -> [{z, pri, ei, img, sx, sy, w, h, x, y, flip, tag, blend}]
//   TW.render(canvas, pose, tick, opts)      -> draws one frame (centered like the desktop app)
//   TW.maxDuration(pose), TW.frameTimes(pose)
//
// pose = {char, motion, dir, hair, dye (0 = none, 1-6), items: [...], hairMode: 'all'|'front'|'back'|'none', hidden: Set}
'use strict';
const TW = (() => {
  const S = { base: '', ver: 0, index: null, extras: null, chars: {}, anims: {}, texs: {}, pending: {}, dye: { styles: {}, tex: [] }, dyeTex: new Set(), cdye: { items: {}, tex: [] } };
  const v = () => '?v=' + S.ver;            // data version (version.json): changes on every TW_WebExport run
  const ext = () => (S.index && S.index.img_ext) || '.png';   // image format of atlases / icon sheets (index.json img_ext)

  async function getJSON(url) {
    // animations / textures never change once exported -> cache hard; the small index files are revalidated
    const r = await fetch(url, { cache: /\/(anim|tex)\//.test(url) ? 'force-cache' : 'no-cache' });
    if (!r.ok) throw new Error(url + ': ' + r.status);
    return r.json();
  }
  function once(key, fn) {                     // one in-flight promise per resource
    if (!S.pending[key]) S.pending[key] = fn().finally(() => { delete S.pending[key]; });
    return S.pending[key];
  }

  // every start-up file in one round trip (they used to come one after another: 6 round trips before the first
  // animation). Only the animations / textures carry ?v= (force-cached); these small files are revalidated (no-cache),
  // so they need no version and need not wait for version.json. setBase() lets loadChar() start alongside load().
  function setBase(base) { S.base = base.replace(/\/?$/, '/'); }
  async function load(base) {
    setBase(base);
    const [ver, index, extras, dye, cdye] = await Promise.all([
      getJSON(S.base + 'version.json').catch(() => ({})), getJSON(S.base + 'index.json'), getJSON(S.base + 'extras.json'),
      getJSON(S.base + 'hairdye.json').catch(() => null), getJSON(S.base + 'costumedye.json').catch(() => null)]);
    S.ver = ver.stamp || 0; S.index = index; S.extras = extras;
    if (dye) { S.dye = dye; S.dyeTex = new Set(dye.tex); }               // no dye data: hair undyed
    if (cdye) { S.cdye = cdye; for (const t of cdye.tex) S.dyeTex.add(t); }   // no costume dye data
    return S.index;
  }
  async function loadChar(ci) {
    if (S.chars[ci]) return S.chars[ci];
    return once('char' + ci, async () => {
      const [c, map] = await Promise.all([getJSON(S.base + 'chars/' + ci + '.json'), getJSON(S.base + 'icons/' + ci + '/map.json').catch(() => null)]);
      c.iconMap = map || { i: {}, h: {}, stamp: 0 };
      c.byId = {}; c.items.forEach((it, i) => { it.index = i; c.byId[it.id] = it; });
      c.hairById = {}; c.hair.forEach((h, i) => { h.index = i; c.hairById[h.id] = h; });
      S.chars[ci] = c; return c;
    });
  }
  async function loadAnim(id) {
    if (S.anims[id] !== undefined) return S.anims[id];
    return once('anim' + id, async () => {
      let a = null;
      try { a = await getJSON(S.base + 'anim/' + id + '.json' + v()); } catch (e) { a = null; }
      if (a) unmirror(a);
      S.anims[id] = a; return a;
    });
  }
  // effect animations shown the same in every facing (always their reference direction): 4449 삐약삐약 젤리삐 - the chick
  // of direction 0 everywhere (in game); its other facings hold unrelated pieces (a purple spark at 2, no chick at 14 / 6).
  // Not a rule for every reference other than 2: 수호 부적 (also 0) has a real back view at 2. Same list in avatarlib.py
  const FX_FIXED_DIR = new Set([4449]);
  // right-facing directions written as 'M' are the mirror image of the left-facing one (tw_webexport MIRROR_PAIRS):
  // frame keys get the mirror flag flipped and the x offset negated, everything else is the same
  const MIRROR_PAIRS = [['0', '4'], ['14', '6'], ['12', '8']];
  function unmirror(a) {
    for (const m of Object.values(a.m)) for (const [l, r] of MIRROR_PAIRS) {
      if (m[r] !== 'M') continue;
      const src = m[l];
      m[r] = { mt: src.mt, e: src.e.map(el => el.map(k => k[0] === 0 ? [0, k[1], k[2], k[3], k[4] ^ 8, -k[5], k[6], k[7]] : k)) };
    }
  }
  function loadImage(url) {
    // crossOrigin: the atlases are read back with getImageData (dyes, additive layers), which a CDN-hosted image
    // only allows when it was requested with CORS (jsDelivr / R2 answer with Access-Control-Allow-Origin: *)
    return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error(url)); im.src = url; });
  }
  async function loadTex(tid) {
    if (S.texs[tid] !== undefined) return S.texs[tid];
    return once('tex' + tid, async () => {
      let t = null;
      try {
        const [meta, img, idx] = await Promise.all([getJSON(S.base + 'tex/' + tid + '.json' + v()), loadImage(S.base + 'tex/' + tid + ext() + v()),
                                                    S.dyeTex.has(+tid) ? loadImage(S.base + 'tex/' + tid + '.idx' + ext() + v()).catch(() => null) : null]);
        t = { id: +tid, meta, img, idx, lum: null, dyed: {} };
      } catch (e) { t = null; }
      S.texs[tid] = t; return t;
    });
  }
  // additive layers: on a transparent canvas a black pixel must stay see-through, so the sprite's alpha becomes
  // max(r, g, b) (same trick as avatarlib.draw_layer); computed once per atlas on demand
  function lumImage(t) {
    if (t.lum) return t.lum;
    const cv = document.createElement('canvas'); cv.width = t.img.width; cv.height = t.img.height;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(t.img, 0, 0);
    const d = g.getImageData(0, 0, cv.width, cv.height), p = d.data;
    // colour stored un-premultiplied (light / brightness): drawn with 'lighter' the canvas then gains exactly the light,
    // and a transparent canvas shown over the page adds it to the background instead of tinting it darker
    for (let i = 0; i < p.length; i += 4) {
      const a = p[i + 3] / 255, r = p[i] * a, gg = p[i + 1] * a, b = p[i + 2] * a, m = Math.max(r, gg, b);
      if (m > 0) { p[i] = r * 255 / m; p[i + 1] = gg * 255 / m; p[i + 2] = b * 255 / m; }
      p[i + 3] = m;
    }
    g.putImageData(d, 0, 0); t.lum = cv; return cv;
  }

  // hair dyes (hairdye.json): the game swaps palette entries; tex/<id>.idx.png holds each pixel's palette index as grey,
  // so the dyed atlas is the original with the pixels of the ramp's indices recoloured (computed once per style / dye)
  function dyes(sid) { return S.dye.styles[sid] || []; }
  // the atlas with the pixels of the given palette indices recoloured (lut[index] = [r, g, b]); cached per key
  function lutImage(t, key, lut) {
    if (t.dyed[key]) return t.dyed[key];
    if (!t.idx) return (t.dyed[key] = t.img);
    const w = t.img.width, h = t.img.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(t.idx, 0, 0);
    const ix = g.getImageData(0, 0, w, h).data; g.clearRect(0, 0, w, h); g.drawImage(t.img, 0, 0);
    const d = g.getImageData(0, 0, w, h), p = d.data;
    for (let k = 0; k < p.length; k += 4) {
      if (!p[k + 3]) continue; const c = lut[ix[k]]; if (c) { p[k] = c[0]; p[k + 1] = c[1]; p[k + 2] = c[2]; }
    }
    g.putImageData(d, 0, 0); return (t.dyed[key] = cv);
  }
  function dyedImage(t, sid, dye) {
    const key = sid + ':' + dye; if (t.dyed[key]) return t.dyed[key];
    const ramp = (dyes(sid)[dye - 1] || [])[2]; if (!ramp || !Object.keys(ramp).length) return (t.dyed[key] = t.img);
    const lut = new Array(256).fill(null);
    for (const i in ramp) { const c = parseInt(ramp[i], 16); lut[+i] = [c >> 16 & 255, c >> 8 & 255, c & 255]; }
    return lutImage(t, key, lut);
  }
  // 확장 의상 염색 (costumedye.json / DB 0351): a part is a run of palette indices with a base ramp (the look of white
  // dye, mostly greys); the chosen colour plus the ramp entry minus the part's first entry, per channel (avatarlib.costume_dye_palette; measured on a game capture)
  function costumeDyes(iid) { return (S.cdye.items || {})[iid] || []; }
  function costumeImage(t, iid, colours) {
    const parts = costumeDyes(iid), ks = Object.keys(colours || {}).filter(k => colours[k] && parts[k]).sort();
    if (!ks.length) return t.img;
    const key = 'c' + iid + ':' + ks.map(k => k + '=' + colours[k]).join(','); if (t.dyed[key]) return t.dyed[key];
    const old = Object.keys(t.dyed).filter(k => k[0] === 'c'); if (old.length > 24) for (const k of old.slice(0, 12)) delete t.dyed[k];   // colour-wheel dragging
    const lut = new Array(256).fill(null);
    for (const k of ks) {
      const c = parseInt(colours[k].replace('#', ''), 16), cr = c >> 16 & 255, cg = c >> 8 & 255, cb = c & 255, [, idx, base] = parts[k];
      const b0 = parseInt(base[0] || '000000', 16), cl = v => v < 0 ? 0 : v > 255 ? 255 : v;   // the part's first ramp entry = the chosen colour
      idx.forEach((pi, i) => { const b = parseInt(base[i] || 'ffffff', 16); lut[pi] = [cl(cr + (b >> 16 & 255) - (b0 >> 16 & 255)), cl(cg + (b >> 8 & 255) - (b0 >> 8 & 255)), cl(cb + (b & 255) - (b0 & 255))]; });
    }
    return lutImage(t, key, lut);
  }

  // ------------------------------------------------------------------ animation sampling
  function motionsOf(a) { return a ? Object.keys(a.m).map(Number) : []; }
  function resolveMotion(a, ...wanted) {
    const ids = motionsOf(a);
    for (const m of wanted) {
      if (m === 'any') { if (ids.length) return ids[0]; }
      else if (m !== null && m !== undefined && ids.includes(m)) return m;
    }
    return null;
  }
  // an animation whose motions all hold a single direction (effect auras made for direction 2 only) is the same in every
  // facing (avatarlib.AvatarData._dirs)
  function dirData(a, motion, dir) {
    const m = a && a.m[motion]; if (!m) return null;
    if (m[dir]) return m[dir];
    if (a.anyDir === undefined) a.anyDir = Object.values(a.m).every(x => Object.keys(x).length === 1);
    return a.anyDir ? Object.values(m)[0] : null;
  }
  function duration(a, motion, dir) { const d = dirData(a, motion, dir); return d ? d.mt : 0; }

  // {element: opacity 0..255} at tick tt (avatarlib.element_alpha): alpha key [9, elem, target, tick, fade ticks, from 0]
  // moves the element's opacity to `target` from `tick` over `fade ticks` (255 or missing: at once); from 0 = fade in
  function elementAlpha(akeys, tt) {
    const seg = {};
    const at = (s, t) => s[3] <= 0 ? s[1] : s[0] + (s[1] - s[0]) * Math.min(1, Math.max(0, t - s[2]) / s[3]);
    for (const k of akeys.slice().sort((a, b) => (a[3] || 0) - (b[3] || 0))) {
      const t0 = k[3] || 0; if (t0 > tt) break;
      const dur = k[4] === undefined ? 255 : k[4];
      const start = k[5] === 1 ? 0 : (seg[k[1]] ? at(seg[k[1]], t0) : 255);
      seg[k[1]] = [start, k[2], t0, dur >= 255 ? 0 : dur];
    }
    const out = {}; for (const c in seg) out[c] = Math.round(at(seg[c], tt)); return out;
  }

  // [(img, sx, sy, w, h, x, y, flip, layer, ei, blend)] of one animation at motion/dir/tick.
  // parent: {attachName: [x, y, ofsx, ofsy]} (un-mirrored attach points of what was drawn before);
  // attachOut: receives this animation's attach points; loose: draw attach keys at their own offset when no parent.
  // an attached frame turned / scaled about its attach point: the box it ends up in (compose.js draws it with a canvas transform)
  const ROT_SIGN = 1;                                        // avatarlib.ATTACH_ROT_SIGN
  const pv0 = attr => attr ? attr.p[0] : 0, pv1 = attr => attr ? attr.p[1] : 0;
  function spinBox(w, h, pv, deg, scx, scy) {
    const cx = -pv[0], cy = -pv[1], t = deg * ROT_SIGN * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
    const xs = [], ys = [];
    for (const x of [0, w]) for (const y of [0, h]) { const X = (x - cx) * scx, Y = (y - cy) * scy; xs.push(X * c - Y * s); ys.push(X * s + Y * c); }
    const minx = Math.floor(Math.min(...xs)), miny = Math.floor(Math.min(...ys));
    return { minx, miny, w: Math.max(1, Math.ceil(Math.max(...xs)) - minx), h: Math.max(1, Math.ceil(Math.max(...ys)) - miny), cx, cy, scx, scy };
  }
  function animLayers(a, motion, dir, t, parent, attachOut, loose) {
    const d = dirData(a, motion, dir); if (!d) return [];
    const out = []; let layer = 1; const blend = {}, akeys = [];
    for (const e of d.e) for (const k of e) { if (k[0] === 6) layer = k[1]; else if (k[0] === 10) blend[k[1]] = k[2]; else if (k[0] === 9) akeys.push(k); }
    const tt = d.mt > 0 ? t % (d.mt + 1) : 0;
    const alpha = elementAlpha(akeys, tt);
    d.e.forEach((e, ei) => {
      let cur = null;
      for (const k of e) {
        if (k[0] === 0 && k[1] <= tt) cur = k;
        else if (k[0] === 12 && k[1] <= tt) cur = null;           // end key: hidden from this tick on
      }
      if (!cur) return;
      const hidden = alpha[ei] === 0;                                // an effect's origin marker: not drawn, but its attach points count
      const tex = S.texs[cur[2]]; if (!tex) return;
      const fr = tex.meta.f[cur[3]]; if (!fr) return;
      let ux = fr[4], uy = fr[5], ox = cur[5], oy = cur[6];
      const attr = fr[6] || null;
      let rot = null, rotDeg = 0;
      if (cur[7]) {                                                // attach-point key
        const name = attr ? attr.n : '';
        if (parent && parent[name]) {
          const p = parent[name], pv = attr ? attr.p : [0, 0]; ux = p[0] + pv[0]; uy = p[1] + pv[1]; ox = p[2]; oy = p[3];
          const ang = p[4] || 0, scx = p[5] || 1, scy = p[6] || 1;        // scale 0 = not set (예프넨 잠옷 'Head'), not invisible
          if (ang || scx !== 1 || scy !== 1) { rot = spinBox(fr[2], fr[3], pv, ang, scx, scy); rotDeg = ang * ROT_SIGN; }   // the point's rotation / scale (예프넨 소드셰이프 beam)
        }
        else if (!loose || name.startsWith('Effect')) return;   // no such point: not shown; loose (icons) only for parts hanging on the body
      }
      if (attachOut && attr && attr.s) for (const n in attr.s) { const s = attr.s[n]; attachOut[n] = [ux + s[0], uy + s[1], ox, oy, s[2] || 0, s[3] || 1, s[4] || 1]; }
      if (hidden) return;
      if (rot) {                                                   // drawn with a transform (drawLayers); x / y / w / h = its box
        const flip = (cur[4] & 8) !== 0, bx = ux - pv0(attr) + rot.minx;    // ux - pivot = the parent point
        const x = flip ? -(bx + rot.w) + ox : bx + ox;
        out.push({ img: tex.img, tex, sx: fr[0], sy: fr[1], w: rot.w, h: rot.h, x, y: uy - pv1(attr) + rot.miny + oy, flip, layer, ei,
                   blend: blend[ei] || 0, alpha: alpha[ei] !== undefined ? alpha[ei] / 255 : 1,
                   rot: { deg: rotDeg, scx: rot.scx, scy: rot.scy, cx: rot.cx, cy: rot.cy, px: (flip ? -(ux - pv0(attr)) : ux - pv0(attr)) + ox, py: uy - pv1(attr) + oy, fw: fr[2], fh: fr[3] } });
        return;
      }
      const flip = (cur[4] & 8) !== 0;
      const x = flip ? -(ux + fr[2]) + ox : ux + ox;
      out.push({ img: tex.img, tex, sx: fr[0], sy: fr[1], w: fr[2], h: fr[3], x, y: uy + oy, flip, layer, ei, blend: blend[ei] || 0, alpha: alpha[ei] !== undefined ? alpha[ei] / 255 : 1 });
    });
    return out;
  }

  // ------------------------------------------------------------------ plan: what takes part in a pose
  function hairLayersOf(a) {
    const keys = new Set();
    for (const m in a.m) for (const dv in a.m[m]) for (const e of a.m[m][dv].e) for (const k of e) if (k[0] === 6) keys.add(k[1]);
    const F = S.index.hair_front_layers, B = S.index.hair_back_layers;
    if (keys.size && [...keys].every(k => F.includes(k))) return 'front';
    if (keys.size && [...keys].every(k => B.includes(k))) return 'back';
    return 'mixed';
  }
  function plan(pose) {
    const c = S.chars[pose.char], ix = S.index.chars[pose.char], X = S.extras;
    const items = (pose.items || []).filter(i => !(pose.hidden && pose.hidden.has(i)));
    let body = ix.body, bm = pose.motion, drawBody = true;
    // DB 0298 col 8 row 12: the body that holds a weapon (벤야 only: 38281 draws the shaft her 사이드 / 해머 skins leave out)
    const wb12 = c.weapon_body && c.weapon_body['12'];
    if (wb12 && wb12 !== 65535 && wb12 !== ix.body && items.some(i => (c.byId[i] || {}).slot === 'weapon')) body = wb12;
    const hairRec = pose.hair >= 0 ? c.hairById[pose.hair] : null;
    let drawHair = !!hairRec; let rest = items.slice(); const extra = [];
    // pose.raw (cloak screen): pose.motion is the cloak animation's own motion id, not a character motion to map
    const tf = items.map(i => [i, X.transforms[i]]).find(([i, tr]) => tr && (pose.raw || tr.motions[pose.motion] !== undefined));
    const veh = items.map(i => [i, X.vehicles[i]]).find(([i, v]) => v);
    if (tf) {
      const [iid, tr] = tf;
      body = tr.anim; bm = pose.raw ? pose.motion : tr.motions[pose.motion];
      // an outfit with the hair painted in: a chosen hair style is drawn on the hairless body (DB 0293 alt 0, avatarlib.bald_body)
      if (tr.costume && tr.hair_baked && drawHair && tr.bald) body = tr.bald;
      else if (!tr.costume || tr.hair_baked) drawHair = false;
      rest = !tr.costume ? [] : rest.filter(i => i !== iid && ['head', 'face', 'body', 'back', 'foot', 'weapon', 'sub'].includes((c.byId[i] || {}).slot));
      if (tr.effect) extra.push([tr.effect, [bm], 3, 'transform' + iid + '_fx']);   // only in the motions the overlay was made for
    } else if (veh) {
      let [iid, v] = veh;
      const alt = v.alt && v.alt[pose.char]; if (alt) v = X.vehicles[alt];   // generic old vehicle -> this character's painted row
      const gi = Math.min(S.index.vehicle_group[pose.motion] || 0, v.groups.length - 1), g = v.groups[gi];
      if (g.vehicle[0] === 65535) drawBody = drawHair = false;           // painted row: the rider anim already holds the seated character
      else if (g.motion) bm = g.motion;
      else if (motionsOf(S.anims[body]).includes(14)) bm = 14;          // no rider motion given: sit (a guess)
      for (const key of ['rider', 'vehicle', 'effect']) { const [a, m] = g[key]; if (a && a !== 65535) extra.push([a, [m, bm, 0, 'any'], 3, 'vehicle' + iid + '_' + key]); }
      rest = rest.filter(i => i !== iid);
    }
    const out = [[body, drawBody ? [bm] : null, 0, 'body']];
    if (drawHair && pose.hairMode !== 'none') {
      for (const a of hairRec.anims) {
        const A = S.anims[a]; if (!A) continue;
        const part = hairLayersOf(A);
        if (pose.hairMode === 'front' && part === 'back') continue;
        if (pose.hairMode === 'back' && part === 'front') continue;
        out.push([a, [bm, 0], 2, 'hair']);
      }
    }
    out.push(...extra);
    rest.forEach((iid, n) => {
      const it = c.byId[iid]; if (!it) return;
      if (X.footprints[iid]) { out.push([X.footprints[iid], 'foot', 4 + n, 'foot' + iid]); return; }
      if (it.src === 'transform' || it.src === 'vehicle') return;   // not active in this motion: draws nothing (avatarlib.plan)
      it.anims.forEach((a, k) => out.push([a, it.fxm ? [it.fxm[k], 'any'] : [bm, 0], 4 + n, 'item' + iid, !!(it.fxh && it.fxh[k]), it.fxd ? it.fxd[k] : null, it.fxl ? it.fxl[k] : null]));   // effect / pet items: one fixed motion (skill-effect skins that only have the cast motion: that one)
    });
    // resolve motions now that we know the animations
    return out.map(([a, want, pri, tag, head, fd, fl]) => {
      const A = S.anims[a];
      let m = null;
      if (want === 'foot') m = 'foot';
      else if (want && A) m = resolveMotion(A, ...want);
      return { a, m, pri, tag, head: !!head, fd: fd ?? null, fl: fl ?? null };   // fd / fl: an effect's own direction / default layer (avatarlib.fx_dir / fx_layer)
    });
  }
  function animIds(pose) {                                   // every animation id a pose may touch (for prefetch)
    const c = S.chars[pose.char], ix = S.index.chars[pose.char], X = S.extras, ids = new Set([ix.body]);
    if (c.weapon_body && c.weapon_body['12'] && c.weapon_body['12'] !== 65535) ids.add(c.weapon_body['12']);   // weapon-holding body (벤야)
    const h = pose.hair >= 0 ? c.hairById[pose.hair] : null; if (h) h.anims.forEach(a => ids.add(a));
    for (const i of pose.items || []) {
      const it = c.byId[i]; if (it) it.anims.forEach(a => ids.add(a));
      const tr = X.transforms[i]; if (tr) { ids.add(tr.anim); if (tr.bald) ids.add(tr.bald); if (tr.effect) ids.add(tr.effect); }
      let v = X.vehicles[i]; if (v && v.alt && v.alt[pose.char]) v = X.vehicles[v.alt[pose.char]];
      if (v) for (const g of v.groups) for (const k of ['rider', 'vehicle', 'effect']) if (g[k][0] && g[k][0] !== 65535) ids.add(g[k][0]);
      if (X.footprints[i]) ids.add(X.footprints[i]);
    }
    return [...ids];
  }
  function animBottom(A, motion, dir) {                       // lowest row any frame of the motion reaches (avatarlib.anim_bottom)
    const d = dirData(A, motion, dir); let low = 0;
    if (d) for (const e of d.e) for (const k of e) { if (k[0] !== 0) continue; const t = S.texs[k[2]], fr = t && t.meta.f[k[3]]; if (fr) low = Math.max(low, fr[5] + k[6] + fr[3]); }
    return low;
  }
  function texIds(animList) {
    const t = new Set();
    for (const a of animList) { const A = S.anims[a]; if (!A) continue; for (const m in A.m) for (const dv in A.m[m]) for (const e of A.m[m][dv].e) for (const k of e) if (k[0] === 0) t.add(k[2]); }
    return [...t];
  }
  async function prepare(pose, onProgress) {
    await loadChar(pose.char);
    const ids = animIds(pose);
    await Promise.all(ids.map(loadAnim));
    const tids = texIds(ids); let n = 0;
    await Promise.all(tids.map(t => loadTex(t).then(() => { n++; if (onProgress) onProgress(n, tids.length); })));
  }

  // ------------------------------------------------------------------ compose
  const BODY_Z = 0;
  function z(a) { if (S.index.marker_layers.includes(a)) return -1000; return S.index.layer_pos[a] || 0; }
  function compose(pose, t) {
    const P = plan(pose), body = P[0], layers = [], attach = {};
    // loose: a costume standing in for the body may be made of attach keys (리체 잠옷) - no parent exists for the body itself
    // 확장 의상 염색: pose.cdye = {part index: 'rrggbb'} of the worn outfit, applied only while that outfit is the body
    const cdi = pose.cdye && Object.keys(pose.cdye).length ? (pose.items || []).find(i => S.extras.transforms[i] && [S.extras.transforms[i].anim, S.extras.transforms[i].bald].includes(body.a) && costumeDyes(i).length) : undefined;
    // on the hairless body the chosen hair style shows instead: the outfit's '머리' part is not dyed
    let cdye = pose.cdye;
    if (cdi !== undefined && body.a !== S.extras.transforms[cdi].anim) {
      cdye = {}; costumeDyes(cdi).forEach(([n], k) => { if (pose.cdye[k] && !n.startsWith('머리')) cdye[k] = pose.cdye[k]; });
    }
    if (body.m !== null) for (const L of animLayers(S.anims[body.a], body.m, pose.dir, t, null, attach, true)) {
      if (cdi !== undefined) L.img = costumeImage(L.tex, cdi, cdye);
      layers.push(Object.assign(L, { z: BODY_Z, pri: 0, tag: 'body' }));
    }
    for (const p of P.slice(1)) {
      if (p.m === null) continue;
      if (p.m === 'foot') { layers.push(...footprintLayers(p, body.m, pose.dir, t)); continue; }
      // DB 0199 vehicles have no layer keys: 'rider' = the part behind the character, 'vehicle' = the part in front of it
      const zv = p.tag.endsWith('_vehicle') ? 40 : p.tag.endsWith('_rider') ? -40 : null;
      const dye = p.tag === 'hair' && pose.dye > 0 ? pose.dye : 0;
      // kind-0 attached effect (통통 농구공, 열혈 축구공): its bounce lands on the top of the head (avatarlib.fx_on_head)
      let dx = 0, dy = 0;
      if (p.head && attach.Head) { dx = attach.Head[0]; dy = attach.Head[1] - 8 - animBottom(S.anims[p.a], p.m, pose.dir); }
      const F = S.index.hair_front_layers, B = S.index.hair_back_layers;
      // an effect without frames for this facing draws its reference's direction; a few always draw it (FX_FIXED_DIR)
      const dv = p.fd !== null && dirData(S.anims[p.a], p.m, p.fd) && (FX_FIXED_DIR.has(p.a) || !dirData(S.anims[p.a], p.m, pose.dir)) ? p.fd : pose.dir;
      // an effect animation without layer keys: in front / behind by its kind (avatarlib.fx_layer: 하트 뿅뿅 in front)
      const dd = p.fl !== null ? dirData(S.anims[p.a], p.m, dv) : null;
      const fl = dd && !dd.e.some(e => e.some(k => k[0] === 6)) ? p.fl : null;
      for (const L of animLayers(S.anims[p.a], p.m, dv, t, attach, attach, false)) {
        if (fl !== null) L.layer = fl;
        if (p.tag === 'hair' && ((pose.hairMode === 'front' && B.includes(L.layer)) || (pose.hairMode === 'back' && F.includes(L.layer)))) continue;   // a hair animation can hold both pieces
        if (dye) L.img = dyedImage(L.tex, pose.hair, dye);
        L.x += dx; L.y += dy;
        layers.push(Object.assign(L, { z: zv ?? z(L.layer), pri: p.pri, tag: p.tag }));
      }
    }
    layers.sort((A, B) => (A.z - B.z) || (A.pri - B.pri) || (A.ei - B.ei));
    return layers;
  }
  function footprintLayers(p, bodyMotion, dir, t) {
    const WM = S.index.walk_motions[bodyMotion]; if (!WM) return [];
    const A = S.anims[p.a]; if (!A) return [];
    const ms = motionsOf(A).filter(m => m === 0 || m === 1); const out = [];
    const [dx, dy] = S.index.move_dir[dir] || [0, 1];
    for (const m of ms) {
      const dur = duration(A, m, 2); let [step, speed] = WM;
      const first = animLayers(A, m, 2, 0, null, null, true);
      if (first.length) { const w = Math.max(...first.map(L => L.x + L.w)) - Math.min(...first.map(L => L.x)); step = Math.max(step, Math.floor(w * (Math.abs(dx) > Math.abs(dy) ? 1.2 : 0.7))); }
      const phase = (t * speed + (m === 1 ? step / 2 : 0)) % step;
      const n = dur > 8 ? Math.max(4, Math.min(8, Math.floor(dur * speed / step) + 2)) : 4;
      for (let k = 0; k < n; k++) {
        const dist = phase + k * step, age = Math.floor(dist / speed); let frames, alpha = 1;
        if (dur > 8) { if (age > dur) continue; frames = animLayers(A, m, 2, age, null, null, true); }
        else { frames = animLayers(A, m, 2, Math.min(age, dur), null, null, true); alpha = Math.max(0, 1 - dist / (step * 4)); if (alpha <= 0.05) continue; }
        for (const L of frames) out.push(Object.assign(L, { z: -999, pri: p.pri, ei: L.ei * 10 + k, x: Math.round(L.x - dx * dist), y: Math.round(L.y - dy * dist), tag: p.tag, alpha: alpha * (L.alpha ?? 1) }));
      }
    }
    return out;
  }
  function maxDuration(pose) {
    let mx = 0;
    for (const p of plan(pose)) { if (p.m === null || p.m === 'foot') continue; mx = Math.max(mx, duration(S.anims[p.a], p.m, pose.dir)); }
    return mx;
  }
  function frameTimes(pose) {
    const times = new Set([0]);
    for (const p of plan(pose)) {
      if (p.m === null || p.m === 'foot') continue;
      const d = dirData(S.anims[p.a], p.m, pose.dir); if (!d) continue;
      for (const e of d.e) for (const k of e) if (k[0] === 0 || k[0] === 12) times.add(k[1]);
    }
    return [...times].sort((a, b) => a - b);
  }
  function bounds(layers) {
    const L = layers.filter(l => !l.tag.startsWith('foot'));
    if (!L.length) return null;
    return { minx: Math.min(...L.map(l => l.x)), maxx: Math.max(...L.map(l => l.x + l.w)), miny: Math.min(...L.map(l => l.y)), maxy: Math.max(...L.map(l => l.y + l.h)) };
  }
  // anchor (feet) that centers the tick-0 figure in a w x h box; the same anchor is used for every tick so the
  // animation does not jitter
  function centeredAnchor(pose, w, h) {
    const b = bounds(compose(pose, 0));
    if (!b) return [w >> 1, h - 40];
    return [(w >> 1) - ((b.minx + b.maxx) >> 1), (h >> 1) - ((b.miny + b.maxy) >> 1)];
  }
  function drawLayers(ctx, layers, ax, ay) {
    for (const L of layers) {
      ctx.save();
      if (L.alpha !== undefined && L.alpha < 1) ctx.globalAlpha = L.alpha;
      let img = L.img;
      if (L.blend === 1) { ctx.globalCompositeOperation = 'lighter'; img = lumImage(L.tex); }
      const x = ax + L.x, y = ay + L.y;
      if (L.rot) {                                             // turned / scaled about its attach point, then mirrored like the rest
        const r = L.rot; ctx.translate(ax + r.px, ay + r.py); if (L.flip) ctx.scale(-1, 1);
        ctx.rotate(r.deg * Math.PI / 180); ctx.scale(r.scx, r.scy); ctx.drawImage(img, L.sx, L.sy, r.fw, r.fh, -r.cx, -r.cy, r.fw, r.fh);
      }
      else if (L.flip) { ctx.translate(x + L.w, y); ctx.scale(-1, 1); ctx.drawImage(img, L.sx, L.sy, L.w, L.h, 0, 0, L.w, L.h); }
      else ctx.drawImage(img, L.sx, L.sy, L.w, L.h, x, y, L.w, L.h);
      ctx.restore();
    }
  }
  // opts: {anchor: [x, y] | null (centered), bg: css colour | null, scale}
  function render(canvas, pose, t, opts = {}) {
    const ctx = canvas.getContext('2d'); const sc = opts.scale || 1;
    const w = canvas.width / sc, h = canvas.height / sc;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    // additive layers (glows, 3D effects) can only add their light exactly onto an opaque picture: paint the stage
    // colour (the canvas's own CSS background) first; off-screen canvases (PNG export) stay transparent
    let bg = opts.bg;
    if (!bg && canvas.isConnected) { const c = getComputedStyle(canvas).backgroundColor; if (c && !/rgba\(.*,\s*0\)|transparent/.test(c)) bg = c; }
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.imageSmoothingEnabled = false; ctx.scale(sc, sc);
    const [ax, ay] = opts.anchor || centeredAnchor(pose, w, h);
    drawLayers(ctx, compose(pose, t), ax, ay);
    return [ax, ay];
  }

  // ------------------------------------------------------------------ icons (sheets written by the exporter)
  // where an item id (kind 'i') or hair id (kind 'h') sits in the character's icon sheets; null if not in the sheets
  function iconSheet(ci, kind, id) { const c = S.chars[ci]; return c ? sheetCell(c.iconMap, String(ci), kind, id) : null; }
  function sheetCell(map, dir, kind, id) {
    const m = map && map[kind]; const index = m ? m[id] : undefined;
    if (index === undefined) return null;
    const per = S.index.icon.per_sheet, cols = S.index.icon.cols, cell = kind === 'h' ? S.index.icon.hair : [S.index.icon.size, S.index.icon.size];
    const k = Math.floor(index / per), i = index % per;
    return { url: S.base + 'icons/' + dir + '/' + kind + k + ext() + '?v=' + (map.stamp || 0), x: (i % cols) * cell[0], y: Math.floor(i / cols) * cell[1], w: cell[0], h: cell[1] };
  }
  // the transform cloak list (one for all characters) and its icon sheets
  async function loadTransforms() {
    if (S.tlist) return S.tlist;
    return once('tlist', async () => {
      const [t, map] = await Promise.all([getJSON(S.base + 'transforms.json' + v()), getJSON(S.base + 'icons/t/map.json' + v()).catch(() => null)]);
      t.iconMap = map || { i: {}, stamp: 0 };
      t.byId = {}; t.items.forEach((it, i) => { it.index = i; it.slot = 'transform'; t.byId[it.id] = it; });
      S.tlist = t; return t;
    });
  }
  function transformIcon(id) { return S.tlist ? sheetCell(S.tlist.iconMap, 't', 'i', id) : null; }
  // hair icon drawn in the browser (same window as the exporter: head + chest, 60x76)
  async function hairIcon(ci, sid, dye = 0) {
    const pose = { char: ci, motion: 0, dir: 10, hair: sid, dye, items: [], hairMode: 'all' }; await prepare(pose);
    const layers = compose(pose, 0); if (!layers.some(l => l.tag === 'hair')) return null;
    const body = layers.filter(l => l.tag !== 'hair'); const top = Math.min(...(body.length ? body : layers).map(l => l.y)) - 12;
    const [w, h] = S.index.icon.hair, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    drawLayers(cv.getContext('2d'), layers.filter(l => !(l.y + l.h < top || l.y > top + h)), w >> 1, -top); return cv;
  }

  function trimCanvas(cv) {
    const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return cv;
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(cv, -x0, -y0); return o;
  }
  // 벤야: her 사이드 / 해머 skins draw only the blade and the pommel; the shaft is painted into the weapon-holding body
  // (0298 col 8 row 12). For the icons it is the pixels that body has and the base body has not (avatarlib.weapon_shaft)
  function shaftLayer(c, ix, motion, dir, t) {
    const wb = c.weapon_body && c.weapon_body['12']; if (!wb || wb === 65535 || wb === ix.body) return null;
    const A = S.anims[wb], B = S.anims[ix.body]; if (!A || !B || !dirData(A, motion, dir) || !dirData(B, motion, dir)) return null;
    const la = animLayers(A, motion, dir, t, {}, {}, true).map(l => Object.assign(l, { tag: '' }));
    const lb = animLayers(B, motion, dir, t, {}, {}, true).map(l => Object.assign(l, { tag: '' }));
    if (!la.length || !lb.length) return null;
    const b = bounds(la.concat(lb)), w = Math.max(1, b.maxx - b.minx), h = Math.max(1, b.maxy - b.miny);
    const ca = document.createElement('canvas'), cb = document.createElement('canvas'); ca.width = cb.width = w; ca.height = cb.height = h;
    drawLayers(ca.getContext('2d'), la, -b.minx, -b.miny); drawLayers(cb.getContext('2d'), lb, -b.minx, -b.miny);
    const ga = ca.getContext('2d'), da = ga.getImageData(0, 0, w, h), p = da.data, q = cb.getContext('2d').getImageData(0, 0, w, h).data;
    let n = 0;
    for (let i = 0; i < p.length; i += 4) {
      const same = Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]), Math.abs(p[i + 3] - q[i + 3])) <= 8;
      if (same || !p[i + 3]) p[i] = p[i + 1] = p[i + 2] = p[i + 3] = 0; else n++;
    }
    if (!n) return null;
    ga.putImageData(da, 0, 0);
    return { img: ca, sx: 0, sy: 0, w, h, x: b.minx, y: b.miny, flip: false, layer: 0, ei: -1, blend: 0, alpha: 1, tag: '' };
  }
  // one-off single-item preview (the item's first frame, like the desktop icon) for anything not in a sheet
  async function itemIcon(ci, iid) {
    const c = await loadChar(ci); const it = c.byId[iid] || (S.tlist && S.tlist.byId[iid]); if (!it) return null;
    const tc = S.extras.transforms[iid];
    if (tc && tc.costume && !tc.hair_baked && it.slot === 'costume') {        // outfit without painted hair: add the default hair
      const pose = { char: ci, motion: 0, dir: 10, hair: S.index.chars[ci].default_hair, items: [iid], hairMode: 'all' }; await prepare(pose);
      const L = compose(pose, 0); if (L.length) {
        const b = bounds(L.map(l => Object.assign(l, { tag: '' }))), cv = document.createElement('canvas');
        cv.width = Math.max(1, b.maxx - b.minx); cv.height = Math.max(1, b.maxy - b.miny); drawLayers(cv.getContext('2d'), L, -b.minx, -b.miny); return trimCanvas(cv);
      }
    }
    await Promise.all(it.anims.map(loadAnim)); await Promise.all(texIds(it.anims).map(loadTex));
    const ix = S.index.chars[ci], wb = it.slot === 'weapon' && c.weapon_body && c.weapon_body['12'];   // 벤야: the shaft comes from the body
    const shaft = wb && wb !== 65535 && wb !== ix.body;
    if (shaft) { await Promise.all([wb, ix.body].map(loadAnim)); await Promise.all(texIds([wb, ix.body]).map(loadTex)); }
    // idle, or what a transform maps idle to (some cloaks have no front view in motion 0), then any motion / direction
    const tr = S.extras.transforms[iid], want = [...(tr && tr.motions[0] !== undefined ? [tr.motions[0]] : []), 0, 1, 14];
    for (const a of it.anims) for (const m of motionsOf(S.anims[a])) if (!want.includes(m)) want.push(m);   // then every motion
    const draw = layers => {
      const b = bounds(layers.map(l => Object.assign(l, { tag: '' }))), cv = document.createElement('canvas');
      cv.width = Math.max(1, b.maxx - b.minx); cv.height = Math.max(1, b.maxy - b.miny);
      drawLayers(cv.getContext('2d'), layers, -b.minx, -b.miny);
      return trimCanvas(cv);   // faint wide glow layers must not push the item into a corner
    };
    const visible = cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 24) n++; return n; };
    for (const m0 of want) {
      let best = null;                                           // 보조 (shields): the facing that shows the most of it (avatarlib.icon_image)
      for (const dv of [10, 2, 12, 8]) {
        const attach = {}; let layers = [], pose = null;
        for (const [k, a] of it.anims.entries()) {
          const A = S.anims[a]; if (!A) continue; const m = it.fxm ? resolveMotion(A, it.fxm[k], 'any') : resolveMotion(A, m0, ...want); if (m === null) continue;   // each anim falls back to its own first motion
          const dd = dirData(A, m, dv), ts = dd ? dd.e.flat().filter(k => k[0] === 0).map(k => k[1]) : [];   // first frame may start after tick 0
          const t = ts.length ? Math.min(...ts) : 0; if (!pose) pose = [m, t];
          layers.push(...animLayers(A, m, dv, t, attach, attach, true));
        }
        if (!layers.length) continue;
        if (shaft) { const sl = shaftLayer(c, ix, pose[0], dv, pose[1]); if (sl) layers.unshift(sl); }
        const cv = draw(layers);
        if (it.slot !== 'sub') return cv;
        const n = visible(cv); if (!best || n > best[0]) best = [n, cv];
      }
      if (best) return best[1];
    }
    return null;
  }

  return { S, setBase, load, loadChar, loadAnim, loadTex, prepare, plan, compose, render, drawLayers, centeredAnchor, bounds,
           maxDuration, frameTimes, iconSheet, itemIcon, hairIcon, dyes, costumeDyes, loadTransforms, transformIcon, resolveMotion, motionsOf };
})();
