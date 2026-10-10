// One avatar part worn by a fixed character, animated in a loop: TalesDB's avatar detail page shows it in place of the
// still Details picture. Needs compose.js (TW); loaded by TalesDB next to it (TWPage assets/app.js).
//
//   TWAvatarPreview.play(canvas, { data, icon | id, char, scale }) -> { stop() } | null (item not in the simulator data)
//     data  where the simulator data lives (the CDN avatar-sim/ folder)
//     icon  TalesDB's list icon path ('투구/토끼귀_밀짚모자1.webp', tdbicons.json) or id: the client item id
//     char  character art name (default 아나이스, the character of the still pictures)
//
// 투구 / 머리 / 몸 / 효과 확장 turn to the left through the 8 facings (index dir_order) in the 기본 motion, or in 앉기 when
// the part only shows seated (its transform has no 기본 motion); 다리 확장 (footprints) runs facing left.
'use strict';
const TWAvatarPreview = (() => {
  const TICK = 60;          // ms per animation tick, as in the simulator
  const TURN = 900;         // ms on each facing before turning on
  let ready = null, iconIds = {};
  function init(base) {
    if (!ready) {
      TW.setBase(base);
      ready = Promise.all([TW.load(base), TW.getJSON(base + 'tdbicons.json').catch(() => null)]).then(([, t]) => {
        if (t) for (const [id, p] of Object.entries(t.icons)) iconIds[p] = +id;
      });
      ready.catch(() => { ready = null; });              // a failed start may be tried again
    }
    return ready;
  }

  async function play(canvas, opts = {}) {
    await init(String(opts.data || 'data/').replace(/\/?$/, '/'));
    const ix = TW.S.index, ci = ix.chars.findIndex(c => c.art === (opts.char || '아나이스'));
    if (ci < 0) return null;
    const c = await TW.loadChar(ci), X = TW.S.extras;
    const id = opts.id || iconIds[opts.icon], it = id && c.byId[id];
    if (!it) return null;
    // which motion and facings
    const foot = it.slot === 'foot' || (X.footprints && X.footprints[id] !== undefined);
    const tr = X.transforms[id], ms = tr ? Object.keys(tr.motions).map(Number) : [];
    let motion = 0;
    if (foot) motion = 3;                                 // 달리기
    else if (ms.length && !ms.includes(0)) motion = ms.includes(14) ? 14 : Math.min(...ms);   // shown seated only: 앉기
    const dirs = foot ? [14] : ix.dir_order;              // 좌 / every facing, turning left
    const pose = dir => ({ char: ci, motion, dir, hair: ix.chars[ci].default_hair, items: [id], hairMode: 'all', hidden: new Set() });
    // a part that draws nothing in 기본 (effects that only play seated): 앉기, as the still pictures do (tw_avatar_details)
    const drawn = async () => { const p = pose(dirs[0]); await TW.prepare(p); const n = TW.maxDuration(p) + 1;
      for (let t = 0; t < n; t += 2) if (TW.compose(p, t).some(L => L.tag !== 'body' && L.tag !== 'hair')) return true;
      return false; };
    if (!foot && motion === 0 && !tr && !(await drawn())) { motion = 14; if (!(await drawn())) motion = 0; }
    await Promise.all(dirs.map(d => TW.prepare(pose(d))));
    // the canvas holds every facing over its whole animation, with the feet at one fixed point so the figure turns in
    // place. Always drawn at 2x so the character is the same size for every item: a long footprint trail (허수아비,
    // 박스냥 ...) is cut TRAIL px behind the figure instead of shrinking the whole picture
    const TRAIL = 110, grow = (b, L) => b ? { x0: Math.min(b.x0, L.x), y0: Math.min(b.y0, L.y), x1: Math.max(b.x1, L.x + L.w), y1: Math.max(b.y1, L.y + L.h) }
                                          : { x0: L.x, y0: L.y, x1: L.x + L.w, y1: L.y + L.h };
    let box = null, trail = null; const dur = {};
    for (const d of dirs) {
      const p = pose(d); dur[d] = TW.maxDuration(p) + 1;
      for (let t = 0; t < dur[d]; t += 3) for (const L of TW.compose(p, t)) { if (String(L.tag).startsWith('foot')) trail = grow(trail, L); else box = grow(box, L); }
    }
    if (!box) return null;
    if (trail) box = { x0: Math.max(Math.min(box.x0, trail.x0), box.x0 - TRAIL), y0: Math.max(Math.min(box.y0, trail.y0), box.y0 - 30),
                       x1: Math.min(Math.max(box.x1, trail.x1), box.x1 + TRAIL), y1: Math.min(Math.max(box.y1, trail.y1), box.y1 + 30) };
    const pad = 6, w = box.x1 - box.x0 + pad * 2, h = box.y1 - box.y0 + pad * 2;
    const sc = opts.scale || 2;
    canvas.width = w * sc; canvas.height = h * sc; canvas.style.width = w * sc + 'px'; canvas.style.height = 'auto';   // a narrower box scales it down whole
    const anchor = [pad - box.x0, pad - box.y0];
    // loop: the animation runs on; the facing changes every TURN ms (a drawn frame per TICK)
    let stopped = false, raf = 0, last = -1;
    const t0 = performance.now();
    const frame = now => {
      if (stopped || !canvas.isConnected) return;
      const el = now - t0, k = Math.floor(el / TURN) % dirs.length, tick = Math.floor(el / TICK);
      if (tick !== last) {
        last = tick; const d = dirs[k];
        try { TW.render(canvas, pose(d), tick % dur[d], { anchor, scale: sc, bg: opts.bg }); } catch (e) { console.error(e); }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); }, id, motion };
  }
  return { play };
})();
window.TWAvatarPreview = TWAvatarPreview;
