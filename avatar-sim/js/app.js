// UI of the web avatar simulator (mirrors csharp/TwAvatar/AvatarPanel.cs). Needs compose.js (TW).
'use strict';
// TWAvatarSim.mount(host, opts) draws the simulator into host's shadow root, so its styles and element ids never meet
// the page around it: TalesDB shows it inside its own page (no iframe), web/index.html shows it alone.
//   opts.css   the stylesheet (css/app.css with its ?v=)       opts.data  where the exported data lives (default: data/)
//   opts.tdb   TalesDB's avatar list icon base                 opts.art   TalesDB's character art base
//   opts.embed true inside TalesDB: no page background / padding of its own, TalesDB's font
(() => {
  let root = null;
  const $ = id => root.getElementById(id);
  const MARKUP = `
<div id="pick" class="pick-modal hidden">   <!-- character picker: a small window over the simulator -->
  <div class="pick-box">
    <div class="pick-head"><h1>캐릭터 선택</h1><button id="pickClose" class="pick-close" title="닫기">×</button></div>
    <div id="pickGrid" class="pick-grid"></div>
    <div id="pickStatus" class="status"></div>
  </div>
</div>
<div id="sim" class="screen hidden">
  <div class="left">
    <div class="who">
      <div id="whoCard" class="who-card" title="클릭 = 캐릭터 바꾸기"><img id="whoArt" alt=""><div id="whoTf" class="hidden"></div><div id="whoName" class="nm"></div></div>
      <div class="who-right">
        <div id="cats" class="group"></div>
        <div class="btn-row" style="margin:0">
          <span id="kinds" class="group"></span>
          <input id="search" type="search" placeholder="이름 검색" autocomplete="off">
          <span id="countLabel" class="muted"></span>
        </div>
      </div>
    </div>
    <div id="grid" class="grid"></div>
  </div>
  <div class="right panel">
    <div class="stage">
      <canvas id="view" width="516" height="600"></canvas>
      <div class="ov ov-left"><span class="ov-title">동작</span><div id="motions" class="ov-col"></div></div>
      <div class="ov ov-right"><span class="ov-title">헤어</span><div id="hairModes" class="ov-col"></div></div>
      <div id="cdye" class="ov-dye hidden closed"></div>   <!-- 확장 의상 염색: shown while a dyeable outfit is worn -->
      <button class="arrow ar-up" data-motion="-1" title="이전 동작">▲</button>
      <button class="arrow ar-left" data-step="-1" title="왼쪽으로 한 칸 회전">◀</button>
      <button class="arrow ar-right" data-step="1" title="오른쪽으로 한 칸 회전">▶</button>
      <button class="arrow ar-down" data-motion="1" title="다음 동작">▼</button><span id="dirLabel" class="ar-label"></span>
    </div>
    <div id="slots" class="slots"></div>
    <div class="btn-row hidden" id="playRow">   <!-- zoom / play / tick: kept for scripts, hidden from the page -->
      <span class="lbl">확대</span><span id="zooms" class="group"></span>
      <button id="btnPlay" class="btn">⏸ 정지</button>
      <input id="tick" type="range" min="0" max="0" value="0">
      <span id="tickLabel" class="muted"></span>
    </div>
    <div class="btn-row hidden" id="presetRow">   <!-- presets: hidden from the page, kept for scripts -->
      <span class="lbl">프리셋</span><span id="presets" class="group"></span>
    </div>
    <div class="btn-row hidden" id="exportRow">   <!-- export buttons: hidden from the page, kept for scripts -->
      <button id="btnPng" class="btn">PNG 저장</button>
      <button id="btnSheet" class="btn">8방향 시트</button>
      <button id="btnGif" class="btn">프레임 PNG 묶음</button>
    </div>
    <div id="status" class="status hidden"></div>
  </div>
</div>`;
  const CHUNK = 96, VIEW = [516, 600];
  // category cards and slot boxes, 5 per row. Transform cloaks have their own screen (the '변신 망토' card in the picker).
  const CAT_ORDER = ['head', 'face', 'body', 'back', 'foot', 'hair', 'costume', 'weapon_av', 'weapon_eq', 'sub'];   // the list buttons
  const SLOT_ORDER = ['head', 'face', 'body', 'back', 'foot', 'hair', 'costume', 'weapon', 'sub'];                  // the worn-item slots
  // list buttons that show part of a slot: 확장 무기 = avatar weapons, 일반 무기 = equipment weapons (the ones tagged [장비])
  const CAT_FILTER = { weapon_av: ['weapon', 'avatar'], weapon_eq: ['weapon', 'equip'] };
  const catSlot = c => (CAT_FILTER[c] || [c])[0], catKind = c => (CAT_FILTER[c] || [])[1];
  const NO_KIND_FILTER = new Set(['weapon_av', 'weapon_eq', 'sub']);   // lists that are all one kind: no 전체/아바타/장비 chips, no [장비] tag
  const SUB_LABEL = { '이솔렛': '보조 무기', '조슈아': '보조 무기' };                          // 이솔렛's off-hand is a second sword
  const hasSub = () => st.char.items.some(it => it.slot === 'sub');
  const logical = () => [VIEW[0] / st.zoom, VIEW[1] / st.zoom];   // VIEW = preview canvas in pixels; the zoom only changes the drawing scale
  const st = { ci: -1, char: null, hair: -1, hairHidden: false, hairMode: 'all', equip: {}, hidden: new Set(), dye: 0, dyeBy: {}, cdye: {}, hairNo: {},   // dye: of the worn hair; dyeBy: last dye per style (card previews)
               motion: 0, dir: 10, tick: 0, maxT: 0, zoom: 2, cat: 'head', kind: 'all', q: '', shown: 0, list: [],
               playing: true, loading: 0, timer: null, lastPose: null, mode: 'char', tf: 0 };   // mode 'tf' = transform cloak screen
  const settings = loadLS('tw_avatar_settings', { hatHairModes: {}, presets: {}, lastChar: null });
  function loadLS(k, def) { try { return Object.assign(def, JSON.parse(localStorage.getItem(k) || '{}')); } catch (e) { return def; } }
  function saveLS() { try { localStorage.setItem('tw_avatar_settings', JSON.stringify(settings)); } catch (e) { } }
  const status = s => { $('status').textContent = s; };

  // ---------------------------------------------------------------- start: character picker
  // TalesDB's own list icons for the avatar parts (tdbicons.json: item id -> path on TalesDB's CDN)
  const TDB_SLOTS = new Set(['head', 'face', 'body', 'back', 'foot']);
  let TDB = { base: '', icons: {} };
  const tdbUrl = (slot, id) => TDB_SLOTS.has(slot) && TDB.icons[id] ? TDB.base + TDB.icons[id].split('/').map(encodeURIComponent).join('/') : null;
  const tdbImg = url => `<img class="tdb" src="${url}" alt="" loading="lazy" decoding="async" draggable="false">`;

  // where the exported data lives (opts.data): 'data/' next to this page, or the CDN; images from another origin are
  // loaded with CORS. Inside TalesDB, its own CDN gives the avatar list icons (opts.tdb) and the character art
  // (opts.art) - the same files its other pages use, so the browser already has them.
  let DATA_BASE = 'data/', TDB_BASE = '', ART_BASE = '', cssReady = Promise.resolve();
  const artUrl = name => (ART_BASE || DATA_BASE + 'art/') + encodeURIComponent(name) + '.png';

  async function main() {
    // everything the first screen needs is asked for at once: the data files, TalesDB's icon list and the last
    // character (TW.load and TW.loadChar run side by side; a character's file needs nothing from index.json)
    const q = new URLSearchParams(location.search), tf = q.has('tf'), first = q.has('char') ? +q.get('char') : (settings.lastChar ?? 0);
    TW.setBase(DATA_BASE);
    const tdbP = fetch(DATA_BASE + 'tdbicons.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => null);
    const charP = TW.loadChar(tf ? 0 : first).catch(() => null);   // a wrong ?char= fails again (and reports) in selectChar
    const idx = await TW.load(DATA_BASE);
    TDB = (await tdbP) || TDB;                             // no TalesDB icons: the exported sheets are used
    if (TDB_BASE) TDB.base = TDB_BASE;                     // TalesDB passes its current avatar image address
    await charP;
    const g = $('pickGrid'); g.innerHTML = '';
    for (const c of idx.chars) {
      // the art loads when the picker first opens (19 pictures the first screen does not show)
      const d = document.createElement('div'); d.className = 'pick-card';
      d.innerHTML = `<img data-src="${artUrl(c.art)}" alt=""><div class="nm">${c.name}</div>`; d.title = c.full;
      d.onclick = () => selectChar(c.idx);
      g.appendChild(d);
    }
    const t = document.createElement('div'); t.className = 'pick-card pick-tf';
    t.innerHTML = `<div class="tf-art"></div><div class="nm">변신 망토</div>`; t.title = '모든 캐릭터 공통';
    t.onclick = selectTransforms; g.appendChild(t);
    // the card picture is its own small file (icons/t/card.webp): the cloak sheet (1 MB) loads only on the cloak screen
    { const im = new Image(); im.alt = ''; im.onerror = () => im.remove(); im.src = DATA_BASE + 'icons/t/card' + (idx.img_ext || '.png') + '?v=' + (idx.stamp || 0); t.querySelector('.tf-art').appendChild(im); }
    buildStatic(idx);
    // the picker is a small window over the simulator: close it with ×, Esc or a click outside it
    $('pickClose').onclick = hidePicker;
    $('pick').onclick = e => { if (e.target === $('pick')) hidePicker(); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hidePicker(); });
    await cssReady;                                        // see mount(): the list needs its size first
    if (tf) selectTransforms();
    else selectChar(first);                                // no picker page first: open the last character
  }
  function buildStatic(idx) {
    group($('zooms'), [[1, '1x'], [2, '2x']], v => { st.zoom = v; applyZoom(); }, () => st.zoom);
    buildHairToggles();
    group($('presets'), [['1', '1'], ['2', '2'], ['3', '3']], v => preset(v, false), () => null, v => preset(v, true));
    root.querySelectorAll('.arrow').forEach(b => b.onclick = () => { if (b.dataset.motion) stepMotion(+b.dataset.motion); else stepDir(+b.dataset.step); });
    $('whoCard').onclick = showPicker;
    $('grid').onscroll = () => { const g = $('grid'); if (g.scrollTop + g.clientHeight > g.scrollHeight - 300) appendCards(); };
    $('search').oninput = () => { st.q = $('search').value.trim().toLowerCase(); fillGrid(); };
    $('btnPlay').onclick = togglePlay;
    $('tick').oninput = () => { st.tick = +$('tick').value; drawNow(); };
    $('btnPng').onclick = savePng; $('btnSheet').onclick = saveSheet; $('btnGif').onclick = saveFrames;
    group($('kinds'), [['all', '전체'], ['avatar', '아바타'], ['equip', '장비']], v => { st.kind = v; fillGrid(); }, () => st.kind);
  }
  // hair: two independent toggles (front / back) -> hairMode all | front | back | none
  const hairOn = () => ({ front: st.hairMode === 'all' || st.hairMode === 'front', back: st.hairMode === 'all' || st.hairMode === 'back' });
  function buildHairToggles() {
    const el = $('hairModes'); el.innerHTML = '';
    for (const [k, label] of [['front', '앞머리'], ['back', '뒷머리']]) {
      const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.dataset.k = k; b.title = '켜면 보이고 끄면 숨깁니다';
      b.onclick = () => { const h = hairOn(); h[k] = !h[k]; st.hairMode = h.front && h.back ? 'all' : h.front ? 'front' : h.back ? 'back' : 'none';
                          const hat = st.equip.head; if (hat) { settings.hatHairModes[hat] = st.hairMode; saveLS(); } syncHair(); refresh(); };
      el.appendChild(b);
    }
    syncHair();
  }
  function syncHair() {
    const h = hairOn(), parts = hairParts();
    $('hairModes').querySelectorAll('.btn').forEach(b => {
      const k = b.dataset.k, on = h[k], has = parts[k];
      b.classList.toggle('on', on && has); b.classList.toggle('off', !on || !has); b.disabled = !has;
      b.title = has ? '켜면 보이고 끄면 숨깁니다' : (k === 'back' ? '이 헤어는 뒷머리가 따로 없는 한 장짜리입니다' : '이 헤어에는 앞머리 조각이 없습니다');
    });
  }
  // which pieces the worn style has (layer 8 = main piece, 9-13 = back pieces); unknown until its animations are loaded
  function hairParts() {
    const out = { front: true, back: true }, h = st.char && st.hair >= 0 ? st.char.hairById[st.hair] : null; if (!h) return out;
    const keys = new Set(); let loaded = true;
    for (const a of h.anims) { const A = TW.S.anims[a]; if (!A) { loaded = false; continue; } for (const m in A.m) for (const dv in A.m[m]) for (const e of A.m[m][dv].e) for (const k of e) if (k[0] === 6) keys.add(k[1]); }
    if (!loaded) return out;
    out.front = TW.S.index.hair_front_layers.some(k => keys.has(k)); out.back = TW.S.index.hair_back_layers.some(k => keys.has(k));
    return out;
  }
  // a row of toggle buttons; get() tells which one is on
  function group(el, items, onPick, get, onRight) {
    el.innerHTML = '';
    for (const [v, label, title] of items) {
      const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; if (title) b.title = title;
      b.dataset.v = v; b.onclick = () => { onPick(v); syncGroup(el, get); };
      if (onRight) b.oncontextmenu = e => { e.preventDefault(); onRight(v); };
      el.appendChild(b);
    }
    syncGroup(el, get);
  }
  function syncGroup(el, get) { const cur = get(); el.querySelectorAll('.btn').forEach(b => b.classList.toggle('on', String(b.dataset.v) === String(cur))); }
  function showPicker() {
    $('pickGrid').querySelectorAll('img[data-src]').forEach(im => { im.src = im.dataset.src; im.removeAttribute('data-src'); });
    $('pick').classList.remove('hidden');
  }
  function hidePicker() { if (st.ci >= 0) $('pick').classList.add('hidden'); }

  async function selectChar(ci) {
    $('pickStatus').textContent = '불러오는 중…';
    const idx = TW.S.index, c = await TW.loadChar(ci);
    setMode('char');
    st.ci = ci; st.char = c; st.equip = {}; st.hidden.clear(); st.hairHidden = false; st.dye = 0; st.dyeBy = {}; st.cdye = {};
    if (!CAT_ORDER.includes(st.cat)) st.cat = 'head';   // coming from the transform cloak screen: start on 투구 확장
    st.hair = idx.chars[ci].default_hair; hairNumbers(); st.motion = 0; st.dir = 10; st.tick = 0; st.q = ''; $('search').value = '';
    settings.lastChar = ci; saveLS();
    $('whoArt').src = artUrl(idx.chars[ci].art); $('whoName').textContent = idx.chars[ci].name; $('whoCard').title = idx.chars[ci].full + ' (클릭 = 캐릭터 바꾸기)';
    // 5 per row: 머리 얼굴 의상 등 발자국 / 헤어 확장의상 무기 보조 변신
    const byKey = Object.fromEntries(idx.slots.map(s => [s.key, [s.key, s.label.replace(' (방패/펜듈럼)', ''), s.label]]));
    byKey.weapon_av = ['weapon_av', '확장 무기', '아바타 무기']; byKey.weapon_eq = ['weapon_eq', '일반 무기', '장비 무기'];
    if (byKey.sub && SUB_LABEL[idx.chars[ci].name]) byKey.sub = ['sub', SUB_LABEL[idx.chars[ci].name], byKey.sub[2]];
    if (!hasSub()) { delete byKey.sub; if (st.cat === 'sub') st.cat = 'head'; }          // nothing to hold in the off hand
    group($('cats'), CAT_ORDER.map(k => k === 'hair' ? ['hair', '헤어', '헤어 스타일'] : byKey[k]).filter(Boolean),
          v => { st.cat = v; $('kinds').classList.toggle('hidden', NO_KIND_FILTER.has(v)); fillGrid(); }, () => st.cat);
    $('kinds').classList.toggle('hidden', NO_KIND_FILTER.has(st.cat));
    catIcons();
    $('motions').classList.remove('many');
    group($('motions'), idx.chars[ci].motions.map(m => [m, idx.motion_names[m] || ('동작 ' + m)]), v => { st.motion = +v; st.tick = 0; refresh(); }, () => st.motion);
    buildSlots(idx);
    $('pick').classList.add('hidden'); $('sim').classList.remove('hidden'); $('pickStatus').textContent = '';
    applyZoom(); fillGrid(); await refresh(); startPlay();
  }

  // ---------------------------------------------------------------- transform cloak screen
  function setMode(m) {
    st.mode = m; const tf = m === 'tf';
    for (const id of ['cats', 'kinds', 'slots']) $(id).classList.toggle('hidden', tf);
    $('sim').classList.toggle('tf', tf);                 // transform screen: a taller preview takes the slots' place (css)
    $('whoArt').classList.toggle('hidden', tf); $('whoTf').classList.toggle('hidden', !tf);
    root.querySelector('.ov-right').classList.toggle('hidden', tf);          // hair toggles: a transform hides the hair
  }
  // paint one icon-sheet cell into a box, scaled to fit `size`
  function drawCellInto(box, cell, size) {
    if (!cell || !box) return;
    const im = new Image(); im.onload = () => {
      const cv = document.createElement('canvas'), f = size / Math.max(cell.w, cell.h); cv.width = Math.round(cell.w * f); cv.height = Math.round(cell.h * f);
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(im, cell.x, cell.y, cell.w, cell.h, 0, 0, cv.width, cv.height);
      box.innerHTML = ''; box.appendChild(cv);
    }; im.src = cell.url;
  }
  async function selectTransforms() {
    $('pickStatus').textContent = '불러오는 중…';
    const [tl, c] = await Promise.all([TW.loadTransforms(), TW.loadChar(0)]);
    setMode('tf');
    st.ci = 0; st.char = c; st.equip = {}; st.hidden.clear(); st.hair = -1; st.motion = 0; st.dir = 10; st.tick = 0; st.q = ''; $('search').value = '';
    st.cat = 'transform'; st.tf = (tl.items[0] || {}).id || 0;
    $('whoName').textContent = '변신 망토'; $('whoCard').title = '클릭 = 캐릭터 선택으로';
    drawCellInto($('whoTf'), TW.transformIcon(st.tf), 100);
    tfMotionButtons();
    $('pick').classList.add('hidden'); $('sim').classList.remove('hidden'); $('pickStatus').textContent = '';
    if (st.tf) fitTransformMotion(st.tf);
    applyZoom(); fillGrid(); await refresh(); startPlay();
  }
  // the motions offered for a cloak: its own motions among tf_motion_order (기본 필드 걷기 달리기 공격 마법 시전), played
  // directly (pose.raw) rather than through the DB 0293 character-motion map
  function tfMotions(id) {
    const it = TW.S.tlist && TW.S.tlist.byId[id], order = TW.S.index.tf_motion_order;
    const ms = it && it.motions ? (order ? order.filter(m => it.motions.includes(m)) : it.motions) : [];
    return ms.length ? ms : TW.S.index.chars[0].motions;
  }
  function tfMotionLabel(m) { const n = TW.S.index.motion_names[m]; return n ? `${n} (${m})` : `동작 ${m}`; }
  function tfMotionButtons() {
    const ms = tfMotions(st.tf);
    group($('motions'), ms.map(m => [m, tfMotionLabel(m)]), v => { st.motion = +v; st.tick = 0; refresh(); }, () => st.motion);
    $('motions').classList.toggle('many', ms.length > 8);       // two columns when a cloak has many motions
  }
  // the cloak lacks the current motion: idle, field idle, or its first motion
  function fitTransformMotion(id) {
    const ms = tfMotions(id);
    if (ms.length && !ms.includes(st.motion)) { st.motion = ms.includes(0) ? 0 : ms.includes(1) ? 1 : ms[0]; st.tick = 0; syncGroup($('motions'), () => st.motion); }
  }

  // list buttons without a fixed icon: the first entry of that list (this character's) drawn above the label
  const LIVE_CAT_ICONS = ['hair', 'weapon_av', 'weapon_eq', 'sub'];
  function catIcons() {
    const ci = st.ci, c = st.char, B = 30;
    for (const k of LIVE_CAT_ICONS) {
      const b = $('cats').querySelector(`.btn[data-v="${k}"]`); if (!b) continue;
      b.classList.add('live-ic'); let box = b.querySelector('.cic');
      if (!box) { box = document.createElement('span'); box.className = 'cic'; b.prepend(box); }
      box.innerHTML = '';
      // the first entries of the list, in order, until one has a picture (투명 아바타 (방패) draws nothing)
      const cands = k === 'hair' ? [c.hairById[TW.S.index.chars[ci].default_hair] || c.hair[0]]
                                 : c.items.filter(it => it.slot === catSlot(k) && (!catKind(k) || it.kind === catKind(k))).slice(0, 6);
      (async () => {
        for (const e of cands) {
          if (!e) continue;
          let cv = null;
          try { cv = k === 'hair' ? headOnly(await TW.hairIcon(ci, e.id)) : await TW.itemIcon(ci, e.id); } catch (err) { console.warn('cat icon', k, err); }
          if (!cv || st.ci !== ci) continue;
          const f = Math.min(B / cv.width, B / cv.height);
          cv.style.width = Math.round(cv.width * f) + 'px'; cv.style.height = Math.round(cv.height * f) + 'px'; box.appendChild(cv); return;
        }
      })();
    }
  }
  // the hair icon window is head + chest: keep the head (top 42 px) and trim the empty border
  function headOnly(cv) {
    if (!cv) return null;
    const H = Math.min(42, cv.height), g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, H).data;
    let x0 = cv.width, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 < 0) return cv;
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(cv, -x0, -y0); return o;
  }

  // ---------------------------------------------------------------- item grid
  // hair styles are shown with their own numbers: the character's default style is 1, the rest 2, 3 ... in list order
  // (the client style ids have gaps and the shared styles keep the same number for every character)
  function hairNumbers() {
    const def = TW.S.index.chars[st.ci].default_hair; st.hairNo = {}; let n = 2;
    for (const h of st.char.hair) st.hairNo[h.id] = h.id === def ? 1 : n++;
  }
  const hairLabel = id => { const h = st.char.hairById[id]; return (st.hairNo[id] || id) + ' ' + (h ? h.name : ''); };
  function listFor() {
    if (st.mode === 'tf') return TW.S.tlist.items.filter(it => !st.q || it.name.toLowerCase().includes(st.q) || String(it.id) === st.q);
    const c = st.char;
    if (st.cat === 'hair') {                                   // the character's own style (default) first
      const def = TW.S.index.chars[st.ci].default_hair;
      const hs = c.hair.filter(h => !st.q || h.name.toLowerCase().includes(st.q) || String(st.hairNo[h.id]) === st.q);
      return [...hs.filter(h => h.id === def), ...hs.filter(h => h.id !== def)];
    }
    const slot = catSlot(st.cat), kind = catKind(st.cat) || (st.kind === 'all' ? null : st.kind);
    return c.items.filter(it => it.slot === slot && (!kind || it.kind === kind) && (!st.q || it.name.toLowerCase().includes(st.q) || String(it.id) === st.q));
  }
  function fillGrid() {
    st.list = listFor(); st.shown = 0;
    const g = $('grid'); g.innerHTML = ''; g.scrollTop = 0;
    $('countLabel').textContent = `${st.list.length.toLocaleString()}개`;
    appendCards();
  }
  // add the next CHUNK of cards; called again whenever the list is scrolled near its end
  function appendCards() {
    if (st.shown >= st.list.length) return;
    const g = $('grid'), src = TW.S.index.src_labels, end = g.querySelector('.end'); if (end) end.remove();
    const on = new Set(st.mode === 'tf' ? [st.tf] : Object.values(st.equip)); if (st.cat === 'hair') on.add(st.hair);
    for (const e of st.list.slice(st.shown, st.shown + CHUNK)) {
      const d = document.createElement('div'); d.className = 'card' + (on.has(e.id) ? ' on' : ''); d.dataset.id = e.id;
      const tag = st.cat === 'hair' ? '' : (e.kind === 'equip' && !NO_KIND_FILTER.has(st.cat) ? '[장비] ' : '') + (st.cat === 'costume' || st.cat === 'transform' ? '' : (src[e.src] || ''));   // the category already says 변신
      const name = st.cat === 'hair' ? hairLabel(e.id) : e.name;
      const ic = st.mode === 'tf' ? TW.transformIcon(e.id) : TW.iconSheet(st.ci, st.cat === 'hair' ? 'h' : 'i', e.id);
      const nm = `<div class="nm" title="${esc(tag + name)}">${esc(tag + name)}</div>`;
      d.innerHTML = nm;
      const tu = st.mode !== 'tf' && tdbUrl(e.slot, e.id);
      if (st.cat === 'hair' && st.mode !== 'tf') { dyeDots(d, e); cardIcon(d, e); }
      else if (tu) {                                           // TalesDB icon; if it cannot load, the exported icon instead
        d.insertAdjacentHTML('beforeend', `<div class="ic tdbbox" style="width:76px;height:76px;left:18px;top:5px">${tdbImg(tu)}</div>`);
        const box = d.querySelector('.ic');
        box.querySelector('img').onerror = () => { box.remove(); if (ic) d.insertAdjacentHTML('beforeend', sheetBox(ic)); else { d.insertAdjacentHTML('beforeend', `<div class="ic live" style="width:76px;height:76px;left:18px;top:5px"></div>`); liveIcon(d.querySelector('.ic.live'), e, 76); } };
      }
      else if (ic) d.insertAdjacentHTML('beforeend', sheetBox(ic));
      else { d.insertAdjacentHTML('beforeend', `<div class="ic live" style="width:76px;height:76px;left:18px;top:5px"></div>`); liveIcon(d.querySelector('.ic'), e, 76); }
      d.onclick = () => pick(e);
      g.appendChild(d);
    }
    st.shown = Math.min(st.list.length, st.shown + CHUNK);
    const e = document.createElement('div'); e.className = 'end'; e.textContent = st.shown < st.list.length ? `${st.shown.toLocaleString()} / ${st.list.length.toLocaleString()} — 아래로 내리면 더 보입니다` : `${st.list.length.toLocaleString()}개 전부 표시`; g.appendChild(e);
    if (g.scrollHeight <= g.clientHeight && st.shown < st.list.length) appendCards();    // list shorter than the box: fill it
  }
  // the icon box is exactly one sheet cell, so neighbouring icons never show through
  const sheetBox = ic => `<div class="ic sheet" style="width:${ic.w}px;height:${ic.h}px;left:${(112 - ic.w) / 2}px;top:${5 + (76 - ic.h) / 2}px;background-image:url('${ic.url}');background-position:${-ic.x}px ${-ic.y}px"></div>`;
  // hair cards: the style's dyes as colour dots, 3 on each side of the preview. A dot puts the style on with that dye
  // (the same dot again = undyed); the card preview shows the style's last dye.
  function dyeDots(d, e) {
    TW.dyes(e.id).forEach(([name, sw], k) => {
      const b = document.createElement('button'); b.className = 'dye ' + (k < 3 ? 'l' : 'r'); b.dataset.k = k + 1;
      b.style.top = (13 + (k % 3) * 22) + 'px'; b.style.background = '#' + sw; b.title = `${k + 1}. ${name}`;
      b.onclick = ev => {
        ev.stopPropagation();
        st.dyeBy[e.id] = st.hair === e.id && st.dye === k + 1 ? 0 : k + 1;
        st.hair = e.id; st.hairHidden = false; st.dye = st.dyeBy[e.id];
        cardIcon(d, e); markSelected(); refresh();
      };
      d.appendChild(b);
    });
  }
  function cardIcon(d, e) {
    const k = st.dyeBy[e.id] || 0, old = d.querySelector('.ic'); if (old) old.remove();
    d.querySelectorAll('.dye').forEach(b => b.classList.toggle('on', +b.dataset.k === k));
    const ic = k ? null : TW.iconSheet(st.ci, 'h', e.id);
    if (ic) { d.insertAdjacentHTML('afterbegin', sheetBox(ic)); return; }
    const box = document.createElement('div'); box.className = 'ic live'; box.style.cssText = 'width:76px;height:76px;left:18px;top:5px';
    d.prepend(box); liveIcon(box, Object.assign({}, e, { slot: 'hair', dye: k }), 76);
  }
  // an item / hair style that is not in the icon sheets (added after the last TW_WebExport), or a dyed hair: drawn in the browser
  async function liveIcon(box, e, size) {
    try {
      const cv = st.cat === 'hair' || e.slot === 'hair' ? await TW.hairIcon(st.ci, e.id, e.dye || 0) : await TW.itemIcon(st.ci, e.id);
      if (!cv || !box.isConnected) return;
      const f = Math.min(1, size / Math.max(cv.width, cv.height)); cv.style.width = Math.round(cv.width * f) + 'px'; cv.style.height = Math.round(cv.height * f) + 'px';
      cv.style.position = 'absolute'; cv.style.left = Math.round((size - cv.width * f) / 2) + 'px'; cv.style.top = Math.round((size - cv.height * f) / 2) + 'px';
      box.appendChild(cv);
    } catch (err) { console.warn('icon', e.id, err); }
  }
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  function markSelected() {
    const on = new Set(st.mode === 'tf' ? [st.tf] : Object.values(st.equip)); if (st.cat === 'hair') on.add(st.hair);
    root.querySelectorAll('#grid .card').forEach(d => d.classList.toggle('on', on.has(+d.dataset.id)));
  }
  async function pick(e) {
    if (st.mode === 'tf') { st.tf = e.id; tfMotionButtons(); fitTransformMotion(e.id); markSelected(); refresh(); return; }
    if (st.cat === 'hair') { st.hair = e.id; st.hairHidden = false; st.dye = st.dyeBy[e.id] || 0; markSelected(); refresh(); return; }
    const slot = e.slot, old = st.equip[slot];
    if (old === e.id) { delete st.equip[slot]; st.hidden.delete(e.id); }
    else {
      if (old) st.hidden.delete(old);
      st.equip[slot] = e.id; st.hidden.delete(e.id);
      if (slot === 'weapon' || slot === 'sub') {
        if (st.motion === 0 && TW.S.index.chars[st.ci].motions.includes(1)) { st.motion = 1; st.tick = 0; syncGroup($('motions'), () => st.motion); status('무기 애니메이션에는 기본(0) 프레임이 없어 동작을 1(필드)로 바꿨습니다.'); }
      } else {
        if (slot === 'head') { st.hairMode = settings.hatHairModes[e.id] || 'all'; syncHair(); }
        const tr = TW.S.extras.transforms[e.id];
        if (tr) {
          const ms = Object.keys(tr.motions).map(Number);
          if (ms.length && !ms.includes(st.motion)) { const m = ms.includes(14) ? 14 : Math.min(...ms); st.motion = m; st.tick = 0; syncGroup($('motions'), () => st.motion); status(`이 변신 아이템은 동작 [${ms.join(', ')}] 에서만 적용됩니다. 동작을 ${m}(${TW.S.index.motion_names[m] || ''})로 바꿨습니다.`); }
        }
      }
    }
    markSelected(); refresh();
  }

  // ---------------------------------------------------------------- slots
  function buildSlots(idx) {
    const el = $('slots'); el.innerHTML = '';
    let short = { hair: '헤어', head: '투구 확장', face: '머리 확장', body: '몸 확장', back: '효과 확장', foot: '다리 확장', costume: '확장 의상', transform: '변신', weapon: '무기', sub: '보조' };
    const have = new Set(['hair', ...idx.slots.map(s => s.key)]); if (!hasSub()) have.delete('sub');
    if (SUB_LABEL[idx.chars[st.ci].name]) short = Object.assign({}, short, { sub: SUB_LABEL[idx.chars[st.ci].name] });
    for (const key of SLOT_ORDER.filter(k => have.has(k))) {
      const d = document.createElement('div'); d.className = 'slot'; d.dataset.key = key;
      d.innerHTML = `<div class="ic" title="더블클릭 = 벗기"></div><input type="checkbox" checked title="그리기"><div class="lb">${short[key] || key}</div>`;
      d.querySelector('.ic').ondblclick = () => { if (key === 'hair') st.hair = -1; else { const id = st.equip[key]; delete st.equip[key]; st.hidden.delete(id); } markSelected(); refresh(); };
      d.querySelector('input').onchange = ev => { if (key === 'hair') st.hairHidden = !ev.target.checked; else { const id = st.equip[key]; if (id) { if (ev.target.checked) st.hidden.delete(id); else st.hidden.add(id); } } refresh(); };
      el.appendChild(d);
    }
    const c = document.createElement('div'); c.className = 'slot clear'; c.title = '착용한 아이템을 전부 벗습니다';
    c.innerHTML = '<div class="sym">⟲</div><div>전부 해제</div>';
    c.onclick = () => { st.equip = {}; st.hidden.clear(); st.cdye = {}; st.hair = TW.S.index.chars[st.ci].default_hair; st.hairHidden = false; st.hairMode = 'all';
                        st.dye = 0; st.dyeBy[st.hair] = 0; const cd = root.querySelector(`#grid .card[data-id="${st.hair}"]`); if (cd && st.cat === 'hair') cardIcon(cd, st.char.hairById[st.hair]);
                        syncHair(); markSelected(); refresh(); };
    el.appendChild(c);
  }
  function refreshSlots() {
    if (st.mode === 'tf') return;
    const short = {};
    root.querySelectorAll('#slots .slot:not(.clear)').forEach(d => {
      const key = d.dataset.key, ic = d.querySelector('.ic'), cb = d.querySelector('input'), lb = d.querySelector('.lb');
      let id = key === 'hair' ? st.hair : st.equip[key], name = '';
      if (key === 'hair' && id >= 0) { const h = st.char.hairById[id], dn = st.dye ? (TW.dyes(id)[st.dye - 1] || [])[0] : ''; name = (h ? hairLabel(id) : String(id)) + (dn ? ` (${dn})` : ''); }
      else if (key !== 'hair' && id) { const it = st.char.byId[id]; name = it ? it.name : String(id); }
      d.classList.toggle('filled', !!name);
      if (!name) { ic.style.backgroundImage = ''; ic.style.clipPath = ''; ic.innerHTML = ''; ic.title = (lb.textContent.split(':')[0]) + ': 비어 있음'; cb.checked = true; lb.textContent = lb.textContent.split(':')[0]; return; }
      const rec = key === 'hair' ? st.char.hairById[id] : st.char.byId[id];
      const B = 72, sh = key === 'hair' && st.dye ? null : TW.iconSheet(st.ci, key === 'hair' ? 'h' : 'i', id);
      ic.innerHTML = '';
      const tu = key !== 'hair' && tdbUrl(key, id);
      if (tu) {                                                // TalesDB icon in the slot too
        ic.style.backgroundImage = ''; ic.style.clipPath = ''; ic.classList.add('tdbbox'); ic.innerHTML = tdbImg(tu); ic.title = name + ' (더블클릭 = 벗기)';
        cb.checked = !st.hidden.has(id); lb.textContent = lb.textContent.split(':')[0] + ': ' + name; lb.title = name; return;
      }
      ic.classList.remove('tdbbox');
      if (!sh) { ic.style.backgroundImage = ''; ic.style.clipPath = ''; liveIcon(ic, key === 'hair' ? { id, slot: 'hair', dye: st.dye } : rec, B); cb.checked = key === 'hair' ? !st.hairHidden : !st.hidden.has(id); lb.textContent = lb.textContent.split(':')[0] + ': ' + name; lb.title = name; return; }
      const f = B / Math.max(sh.w, sh.h);   // one cell scaled into the box
      const sheetW = TW.S.index.icon.cols * sh.w;
      ic.style.backgroundImage = `url('${sh.url}')`; ic.style.backgroundSize = `${sheetW * f}px auto`;
      ic.style.backgroundPosition = `${-sh.x * f + (B - sh.w * f) / 2}px ${-sh.y * f + (B - sh.h * f) / 2}px`;
      ic.style.clipPath = `inset(${(B - sh.h * f) / 2}px ${(B - sh.w * f) / 2}px)`; ic.title = name + ' (더블클릭 = 벗기)';
      cb.checked = key === 'hair' ? !st.hairHidden : !st.hidden.has(id);
      lb.textContent = lb.textContent.split(':')[0] + ': ' + name; lb.title = name;
    });
  }

  // ---------------------------------------------------------------- presets
  function preset(n, save) {
    if (!save && !settings.presets[n]) save = true;
    if (save) {
      settings.presets[n] = { char: st.ci, hair: st.hair, dye: st.dye, hairMode: st.hairMode, items: Object.values(st.equip), hidden: [...st.hidden], cdye: st.cdye }; saveLS();
      status(`프리셋 ${n} 저장: ${TW.S.index.chars[st.ci].name}, 헤어 ${st.hair}, 아이템 ${Object.keys(st.equip).length}개`); return;
    }
    const p = settings.presets[n];
    if (p.char !== st.ci) { status(`프리셋 ${n}은 ${TW.S.index.chars[p.char].name} 것입니다. 먼저 그 캐릭터로 바꾸세요.`); return; }
    st.equip = {}; st.hidden = new Set(p.hidden || []); st.cdye = p.cdye || {};
    for (const id of p.items) { const it = st.char.byId[id]; if (it) st.equip[it.slot] = id; }
    st.hair = st.char.hairById[p.hair] ? p.hair : st.hair; st.dye = st.hair === p.hair ? p.dye || 0 : 0; st.dyeBy[st.hair] = st.dye; st.hairHidden = false; st.hairMode = p.hairMode || 'all';
    syncHair(); markSelected(); refresh(); status(`프리셋 ${n} 불러옴`);
  }

  // ---------------------------------------------------------------- preview
  function pose() {
    if (st.mode === 'tf') return { char: st.ci, motion: st.motion, dir: st.dir, hair: -1, items: st.tf ? [st.tf] : [], hairMode: 'all', hidden: new Set(), raw: true };
    return { char: st.ci, motion: st.motion, dir: st.dir, hair: st.hairHidden ? -1 : st.hair, dye: st.dye, items: Object.values(st.equip), hairMode: st.hairMode, hidden: st.hidden,
             cdye: st.equip.costume ? st.cdye[st.equip.costume] || null : null };
  }
  function setDir(d) { st.dir = d; stageLabel(); refresh(); }
  function stepDir(s) { const o = TW.S.index.dir_order; setDir(o[(o.indexOf(st.dir) + s + o.length) % o.length]); }
  function stepMotion(s) { const ms = st.mode === 'tf' ? tfMotions(st.tf) : TW.S.index.chars[st.ci].motions; st.motion = ms[(ms.indexOf(st.motion) + s + ms.length) % ms.length]; st.tick = 0; syncGroup($('motions'), () => st.motion); refresh(); }
  function stageLabel() { const ix = TW.S.index; $('dirLabel').textContent = `${ix.dir_names[st.dir] || st.dir} · ${ix.motion_names[st.motion] || st.motion}`; }
  function applyZoom() { const v = $('view'); v.width = VIEW[0]; v.height = VIEW[1]; if (st.lastPose) { const [w, h] = logical(); anchor = TW.centeredAnchor(pose(), w, h); } drawNow(); }
  let anchor = null;
  // ---------------------------------------------------------------- 확장 의상 염색 (DB 0351): per-part colour pickers on the stage
  function dyePanel() {
    const box = $('cdye'), iid = st.mode !== 'tf' && st.equip.costume, parts = iid ? TW.costumeDyes(iid) : [];
    if (!parts.length) { box.classList.add('hidden'); return; }
    const cur = st.cdye[iid] || (st.cdye[iid] = {});
    if (box.dataset.iid !== String(iid)) {
      box.dataset.iid = String(iid); box.innerHTML = ''; box.classList.toggle('closed', !st.cdyeOpen);
      const head = document.createElement('button'); head.className = 'btn head'; head.textContent = '염색'; head.title = '부위별로 색을 고릅니다 (게임의 염색 UI처럼 자유 색상; 부위의 첫 음영 칸 = 고른 색, 나머지는 기준 음영 차이만큼 밝게)';
      head.onclick = () => { st.cdyeOpen = box.classList.toggle('closed') ? false : true; }; box.appendChild(head);
      parts.forEach(([name], k) => {
        const row = document.createElement('div'); row.className = 'row'; if (name.startsWith('머리')) row.dataset.hairPart = '1';
        const inp = document.createElement('input'); inp.type = 'color'; inp.value = cur[k] ? '#' + cur[k] : '#ffffff'; inp.classList.toggle('unset', !cur[k]); inp.title = name;
        let last = 0;
        inp.oninput = () => { cur[k] = inp.value.slice(1); inp.classList.remove('unset'); const now = Date.now(); if (now - last > 120) { last = now; drawNow(); } };
        inp.onchange = () => { cur[k] = inp.value.slice(1); inp.classList.remove('unset'); refresh(); };
        const nm = document.createElement('span'); nm.textContent = name;
        const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = '이 부위 염색 지우기';
        x.onclick = () => { delete cur[k]; inp.value = '#ffffff'; inp.classList.add('unset'); refresh(); };
        row.appendChild(inp); row.appendChild(nm); row.appendChild(x); box.appendChild(row);
      });
      const all = document.createElement('button'); all.className = 'btn foot'; all.textContent = '전부 지우기';
      all.onclick = () => { st.cdye[iid] = {}; box.dataset.iid = ''; dyePanel(); refresh(); }; box.appendChild(all);
    }
    // a chosen hair style replaces the outfit's painted hair: its '머리' part is not dyed then (compose.js)
    const hairOn = st.hair >= 0 && !st.hairHidden;
    box.querySelectorAll('.row[data-hair-part]').forEach(r => { r.classList.toggle('off', hairOn); r.title = hairOn ? '헤어를 골라서 의상의 머리 대신 그 헤어가 보입니다. 헤어를 벗기면 이 염색이 적용됩니다' : ''; });
    box.classList.remove('hidden');
  }
  async function refresh() {
    refreshSlots(); dyePanel();
    const p = pose(); st.loading++; status('불러오는 중…');
    try { await TW.prepare(p, (n, t) => status(`텍스처 ${n}/${t}`)); }
    catch (e) { status('불러오기 실패: ' + e.message); }
    st.loading--;
    if (st.loading) return;                         // a newer refresh is running
    syncHair();                                     // the worn style's pieces are known now (앞머리 / 뒷머리 buttons)
    st.maxT = TW.maxDuration(p); if (st.tick > st.maxT) st.tick = 0;
    $('tick').max = st.maxT; $('tick').value = st.tick;
    { const [w, h] = logical(); anchor = TW.centeredAnchor(p, w, h); } st.lastPose = p;
    stageLabel();
    drawNow(); status(`${TW.S.index.chars[st.ci].name}: 아이템 ${Object.keys(st.equip).length}개, ${st.maxT + 1}틱`);
  }
  function drawNow() {
    if (st.ci < 0 || !TW.S.chars[st.ci]) return;
    try { TW.render($('view'), pose(), st.tick, { anchor, scale: st.zoom }); } catch (e) { console.error(e); }
    $('tickLabel').textContent = `${st.tick} / ${st.maxT}`;
  }
  function startPlay() { stopPlay(); st.playing = true; $('btnPlay').textContent = '⏸ 정지'; st.timer = setInterval(() => { if (st.loading || !st.maxT) return; st.tick = (st.tick + 1) % (st.maxT + 1); $('tick').value = st.tick; drawNow(); }, 60); }
  function stopPlay() { if (st.timer) clearInterval(st.timer); st.timer = null; st.playing = false; $('btnPlay').textContent = '▶ 재생'; }
  function togglePlay() { if (st.timer) stopPlay(); else startPlay(); }

  // ---------------------------------------------------------------- export
  function download(canvas, name) { canvas.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }, 'image/png'); }
  function baseName() { return `${TW.S.index.chars[st.ci].name}_m${st.motion}_d${st.dir}`; }
  function savePng() { const cv = document.createElement('canvas'); cv.width = VIEW[0]; cv.height = VIEW[1]; TW.render(cv, pose(), st.tick, { anchor, scale: st.zoom }); download(cv, baseName() + `_t${st.tick}_x${st.zoom}.png`); }
  function saveSheet() {
    const w = 220, h = 240, cv = document.createElement('canvas'); cv.width = w * 8; cv.height = h; const g = cv.getContext('2d');
    const p = pose();
    TW.S.index.dir_order.forEach((d, i) => { const c = document.createElement('canvas'); c.width = w; c.height = h; TW.render(c, Object.assign({}, p, { dir: d }), st.tick, {}); g.drawImage(c, w * i, 0); });
    download(cv, `${TW.S.index.chars[st.ci].name}_m${st.motion}_sheet.png`);
  }
  function saveFrames() {               // every key tick of the current pose as one strip (GIF encoding needs a library; see README)
    const p = pose(), times = TW.frameTimes(p), w = VIEW[0], h = VIEW[1];
    const cv = document.createElement('canvas'); cv.width = w * times.length; cv.height = h; const g = cv.getContext('2d');
    times.forEach((t, i) => { const c = document.createElement('canvas'); c.width = w; c.height = h; TW.render(c, p, t, { anchor, scale: st.zoom }); g.drawImage(c, w * i, 0); });
    download(cv, baseName() + `_frames_${times.join('-')}.png`);
  }

  // PC only: a phone / tablet (mobile user agent, or a touch screen without a mouse) gets a notice and downloads nothing
  const MOBILE = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent) ||
                 (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent)) ||               // iPadOS asks as a Mac
                 (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches);

  function mount(host, opts = {}) {
    if (root) return;                                      // one simulator per page
    root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    const dir = u => String(u).replace(/\/?$/, '/');
    DATA_BASE = dir(opts.data || window.TW_DATA_BASE || 'data/');
    TDB_BASE = opts.tdb ? dir(opts.tdb) : '';
    ART_BASE = opts.art ? dir(opts.art) : '';
    if (opts.embed) host.classList.add('embed');
    // the host stays invisible until app.css has loaded (app.css makes it visible), so the bare markup never flashes
    root.innerHTML = '<style>:host { display: block; visibility: hidden; } .hidden { display: none !important; }</style>' +
                     `<link rel="stylesheet" href="${esc(opts.css || 'css/app.css')}">` + MARKUP;
    // the item list may only be filled once app.css sizes it: without it the list box has no height, so
    // appendCards() keeps adding cards to "fill" it and draws the whole list (500+ cards and icons) at once
    const link = root.querySelector('link');
    cssReady = new Promise(res => { link.onload = link.onerror = res; });
    if (MOBILE) {
      $('pick').classList.add('hidden'); $('sim').classList.add('hidden');
      const n = document.createElement('div'); n.className = 'mobile-block';
      n.innerHTML = '<b>아바타 시뮬레이터는 PC에서만 이용할 수 있습니다.</b><span>PC 브라우저로 접속해 주세요.</span>';
      root.appendChild(n); return;
    }
    main().catch(e => { $('pickStatus').textContent = '데이터를 읽지 못했습니다: ' + e.message; $('pick').classList.remove('hidden'); console.error(e); });
  }
  window.TWAvatarSim = { mount };
})();
