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
    <div id="parts" class="group parts hidden"></div>   <!-- weapon types of 확장 무기 / 일반 무기: outside the list, so it never scrolls -->
    <div id="grid" class="grid"></div>
  </div>
  <div class="right panel">
    <div class="stage">
      <canvas id="view" width="516" height="600"></canvas>
      <div class="ov ov-left"><span class="ov-title">동작</span><div id="motions" class="ov-col"></div></div>
      <div class="ov ov-right"><span class="ov-title">헤어</span><div id="hairModes" class="ov-col"></div></div>
      <div id="cdye" class="ov-dye hidden closed"></div>   <!-- 확장 의상 염색: shown while a dyeable outfit is worn -->
      <button class="arrow ar-up" data-motion="-1" title="이전 동작">▲</button>
      <!-- dir_order runs 정면 → 정면좌 → 좌 → …: ◀ steps forward (the character turns to the left), ▶ back (to the right) -->
      <button class="arrow ar-left" data-step="1" title="왼쪽으로 한 칸 회전">◀</button>
      <button class="arrow ar-right" data-step="-1" title="오른쪽으로 한 칸 회전">▶</button>
      <button class="arrow ar-down" data-motion="1" title="다음 동작">▼</button>
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
  // hidden items: not listed until 전부 해제 is pressed while the search box holds this week's password - that press only
  // shows them (the outfit stays on). Nothing is saved: a reload hides them again, and so does leaving the simulator
  // (hideSecret). The password (16 characters) changes every Monday 0:00 KST and is mailed to the site owner by the
  // Apps Script web app SECRET_URL (TWPage avatar-secret-apps-script.gs); the page gets only that week's hash from it and
  // compares the hash of what was typed. Until SECRET_URL is set, the fixed command SECRET_CMD does it instead
  const SECRET_URL = 'https://script.google.com/macros/s/AKfycbwPNU-mDQo96POiOLT8kX2CLS94HrtbdyoN-w2dg6pV4GGLBhLYmUYGdkEaApm2cubc/exec';
  const SECRET_CMD = '/HomeSR';
  const SECRET_SALT = 'TWSIM|';                     // as in avatar-secret-apps-script.gs
  let secretWeek = null;                            // {week, hash, at} from SECRET_URL, asked again after 10 minutes
  async function secretOk(typed) {
    if (!SECRET_URL) return typed === SECRET_CMD;
    if (typed.length !== 16 || !window.crypto || !crypto.subtle) return false;
    try {
      if (!secretWeek || Date.now() - secretWeek.at > 600000) {
        const j = await (await fetch(SECRET_URL, { cache: 'no-store' })).json();
        secretWeek = { week: j.week, hash: j.hash, at: Date.now() };
      }
      const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SECRET_SALT + secretWeek.week + '|' + typed));
      return [...new Uint8Array(d)].map(v => v.toString(16).padStart(2, '0')).join('') === secretWeek.hash;
    } catch (e) { return false; }
  }
  const isSecret = it => it.kind === 'avatar' ? /^여명의 (파편|인도자|여신)/.test(it.name) : /^테네브리스/.test(it.name);
  const shown = it => st.secret || !isSecret(it);
  // lists split by weapon type (index part_names: 세검 장검 ...): a row of type buttons above the list when there are two or more
  // (보조: 이솔렛 물리검 / 마법검, 조슈아 수정구 / 스펠북)
  const PART_CATS = new Set(['weapon_av', 'weapon_eq', 'sub']);
  // 확장 무기 order: by series, as asked (names differ by character - 슈팅스타(검) / 테일즈 슈팅스타(소드셰이프) - and the
  // collaborations are told apart by their item number ranges); the rest after them in their own order
  const AV_WEAPON_SERIES = [/^별빛/, /^코스믹/, /^드래고닉 레거시/, /탄생석/, /슈팅스타/, /쿠루쿠루/, /뮤직/, /야채/, /키친/, /^아발론/,
    /^프리즘 플라워/, /^금빛 은하/, /보노보노/,
    [1045754, 1045762],                                    // 로그 호라이즌 (신도 코가라스마루, 선혈의 마인 도끼, 요변천목도 ...)
    [1046284, 1046318],                                    // 슬레이어즈 (빛의 검, 붉은 눈의 마왕, 제로스의 지팡이, 영왕결마탄)
    /^하트리본/,
    [1047348, 1047362],                                    // 던전밥 (검돌이, 파린의 메이스, 암브로시아, 미믹의 발톱 ...)
    [1047823, 1047852],                                    // 베스페리아 (브레이브 베스페리아, 에스텔 로드, 칼로리안 해머, 금성 2호 ...)
    /^엔젤릭/, /^여명/];
  const avSeries = it => { const k = AV_WEAPON_SERIES.findIndex(s => Array.isArray(s) ? it.id >= s[0] && it.id <= s[1] : s.test(it.name)); return k < 0 ? AV_WEAPON_SERIES.length : k; };
  const avOrder = list => list.map((it, i) => [avSeries(it), i, it]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(x => x[2]);
  const logical = () => [VIEW[0] / st.zoom, VIEW[1] / st.zoom];   // VIEW = preview canvas in pixels; the zoom only changes the drawing scale
  const st = { ci: -1, char: null, hair: -1, hairHidden: false, hairMode: 'all', equip: {}, hidden: new Set(), dye: 0, dyeBy: {}, cdye: {},   // dye: of the worn hair; dyeBy: last dye per style (card previews)
               motion: 0, dir: 10, tick: 0, maxT: 0, zoom: 2, cat: 'head', kind: 'all', q: '', shown: 0, list: [],
               playing: true, loading: 0, timer: null, lastPose: null, mode: 'char', tf: 0,     // mode 'tf' = transform cloak screen
               secret: false,                                                                    // the hidden items are listed
               part: 'all',                                                                      // weapon type shown (PART_CATS lists)
               bdye: {} };                                                                       // 기본 의상 염색: {part index: preset index or 'rrggbb'}
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
  // the icon from the shared sheets (icons/d: 64 per file, one request for a screenful) or else its own file
  const tdbIcon = (slot, id) => { if (!TDB_SLOTS.has(slot)) return null; const cell = TW.tdbCell(id); if (cell) return { cell }; const url = tdbUrl(slot, id); return url ? { url } : null; };
  const tdbHtml = t => t.cell ? `<span class="tdb" style="background-image:url('${t.cell.url}');background-position:${-t.cell.x}px ${-t.cell.y}px"></span>` : tdbImg(t.url);

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
    const charP = TW.loadChar(tf ? 0 : first).catch(() => null);   // a wrong ?char= fails again (and reports) in selectChar
    const idx = await TW.load(DATA_BASE);
    // the TalesDB icon list comes in boot.json; an older export has it on its own
    TDB = TW.S.tdb || (await TW.getJSON(DATA_BASE + 'tdbicons.json').catch(() => null)) || TDB;   // none: the exported sheets are used
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
    $('search').oninput = () => {
      const cmd = !SECRET_URL && $('search').value.trim() === SECRET_CMD;   // the command is not a search: the list stays as it is
      st.q = cmd ? '' : $('search').value.trim().toLowerCase(); fillGrid();
    };
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
    st.ci = ci; st.char = c; st.equip = {}; st.hidden.clear(); st.hairHidden = false; st.dye = 0; st.dyeBy = {}; st.cdye = {}; st.bdye = {};
    if (!CAT_ORDER.includes(st.cat)) st.cat = 'head';   // coming from the transform cloak screen: start on 투구 확장
    st.hair = idx.chars[ci].default_hair; st.motion = 0; st.dir = 10; st.tick = 0; st.q = ''; $('search').value = '';
    settings.lastChar = ci; saveLS();
    $('whoArt').src = artUrl(idx.chars[ci].art); $('whoName').textContent = idx.chars[ci].name; $('whoCard').title = idx.chars[ci].full;
    // 5 per row: 머리 얼굴 의상 등 발자국 / 헤어 확장의상 무기 보조 변신
    const byKey = Object.fromEntries(idx.slots.map(s => [s.key, [s.key, s.label.replace(' (방패/펜듈럼)', ''), s.label]]));
    byKey.weapon_av = ['weapon_av', '확장 무기', '아바타 무기']; byKey.weapon_eq = ['weapon_eq', '일반 무기', '장비 무기'];
    if (byKey.sub && SUB_LABEL[idx.chars[ci].name]) byKey.sub = ['sub', SUB_LABEL[idx.chars[ci].name], byKey.sub[2]];
    if (!hasSub()) { delete byKey.sub; if (st.cat === 'sub') st.cat = 'head'; }          // nothing to hold in the off hand
    group($('cats'), CAT_ORDER.map(k => k === 'hair' ? ['hair', '헤어', '헤어 스타일'] : byKey[k]).filter(Boolean),
          v => { st.cat = v; st.part = 'all'; $('kinds').classList.toggle('hidden', NO_KIND_FILTER.has(v)); partChips(); fillGrid(); }, () => st.cat);
    $('kinds').classList.toggle('hidden', NO_KIND_FILTER.has(st.cat));
    st.part = 'all'; partChips();
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
    if (tf) $('parts').classList.add('hidden');            // the weapon-type row comes back with the character screen (partChips)
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

  // the hidden items hidden again (and taken off if worn) once the simulator is left: the page left (back / forward
  // can bring it back from the browser's page cache) or, inside TalesDB, another tab opened (the host is not displayed)
  function hideSecret() {
    if (!st.secret) return;
    st.secret = false;
    if (!st.char) return;
    let off = false;
    for (const [k, id] of Object.entries(st.equip)) { const it = st.char.byId[id]; if (it && isSecret(it)) { delete st.equip[k]; off = true; } }
    catIcons(); partChips(); fillGrid();
    if (off) { markSelected(); refresh(); }
  }
  // the weapon-type buttons (전체 + this character's types in the open list); hidden for every other list
  function partChips() {
    const el = $('parts'), on = st.mode !== 'tf' && PART_CATS.has(st.cat);
    const kind = catKind(st.cat), PN = TW.S.index.part_names;
    const types = on ? [...new Set(st.char.items.filter(it => it.slot === catSlot(st.cat) && (!kind || it.kind === kind) && shown(it)).map(it => it.part))].sort((a, b) => a - b) : [];
    if (types.length < 2) { st.part = 'all'; el.classList.add('hidden'); el.innerHTML = ''; return; }
    if (st.part !== 'all' && !types.includes(+st.part)) st.part = 'all';
    // 이솔렛's off-hand swords are 물리서브검 / 마법서브검 in the data: in the 보조 무기 list just 물리검 / 마법검
    group(el, [['all', '전체'], ...types.map(p => [p, (PN[p] || ('종류 ' + p)).replace('서브', '')])], v => { st.part = v; fillGrid(); }, () => st.part);
    el.classList.remove('hidden');
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
                                 : (k === 'weapon_av' ? avOrder : x => x)(c.items.filter(it => it.slot === catSlot(k) && (!catKind(k) || it.kind === catKind(k)) && shown(it))).slice(0, 6);
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
  // hair styles are shown by name only (they used to carry a list number in front)
  const hairLabel = id => { const h = st.char.hairById[id]; return h ? h.name : String(id); };
  function listFor() {
    if (st.mode === 'tf') return TW.S.tlist.items.filter(it => !st.q || it.name.toLowerCase().includes(st.q) || String(it.id) === st.q);
    const c = st.char;
    if (st.cat === 'hair') {                                   // the character's own style (default) first
      const def = TW.S.index.chars[st.ci].default_hair;
      const hs = c.hair.filter(h => !st.q || h.name.toLowerCase().includes(st.q));
      return [...hs.filter(h => h.id === def), ...hs.filter(h => h.id !== def)];
    }
    const slot = catSlot(st.cat), kind = catKind(st.cat) || (st.kind === 'all' ? null : st.kind);
    const part = PART_CATS.has(st.cat) && st.part !== 'all' ? +st.part : null;
    const list = c.items.filter(it => it.slot === slot && (!kind || it.kind === kind) && shown(it) && (part === null || it.part === part) &&
                                      (!st.q || it.name.toLowerCase().includes(st.q) || String(it.id) === st.q));
    return st.cat === 'weapon_av' ? avOrder(list) : list;
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
      const tu = st.mode !== 'tf' && tdbIcon(e.slot, e.id);
      if (st.cat === 'hair' && st.mode !== 'tf') { dyeDots(d, e); cardIcon(d, e); }
      else if (tu) {                                           // TalesDB icon; if its own file cannot load, the exported icon instead
        d.insertAdjacentHTML('beforeend', `<div class="ic tdbbox" style="width:76px;height:76px;left:18px;top:5px">${tdbHtml(tu)}</div>`);
        const box = d.querySelector('.ic'), img = box.querySelector('img');
        if (img) img.onerror = () => { box.remove(); if (ic) d.insertAdjacentHTML('beforeend', sheetBox(ic)); else { d.insertAdjacentHTML('beforeend', `<div class="ic live" style="width:76px;height:76px;left:18px;top:5px"></div>`); liveIcon(d.querySelector('.ic.live'), e, 76); } };
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
    c.onclick = async () => {
      const typed = $('search').value.trim();
      if (!st.secret && typed && await secretOk(typed)) {                    // see SECRET_URL: show the hidden items instead
        st.secret = true; $('search').value = ''; st.q = ''; catIcons(); partChips(); fillGrid(); return;
      }
      st.equip = {}; st.hidden.clear(); st.cdye = {}; st.bdye = {}; st.hair = TW.S.index.chars[st.ci].default_hair; st.hairHidden = false; st.hairMode = 'all';
      st.dye = 0; st.dyeBy[st.hair] = 0; const cd = root.querySelector(`#grid .card[data-id="${st.hair}"]`); if (cd && st.cat === 'hair') cardIcon(cd, st.char.hairById[st.hair]);
      syncHair(); markSelected(); refresh();
    };
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
      const tu = key !== 'hair' && tdbIcon(key, id);
      if (tu) {                                                // TalesDB icon in the slot too
        ic.style.backgroundImage = ''; ic.style.clipPath = ''; ic.classList.add('tdbbox'); ic.innerHTML = tdbHtml(tu); ic.title = name;
        cb.checked = !st.hidden.has(id); lb.textContent = lb.textContent.split(':')[0] + ': ' + name; lb.title = name; return;
      }
      ic.classList.remove('tdbbox');
      if (!sh) { ic.style.backgroundImage = ''; ic.style.clipPath = ''; liveIcon(ic, key === 'hair' ? { id, slot: 'hair', dye: st.dye } : rec, B); cb.checked = key === 'hair' ? !st.hairHidden : !st.hidden.has(id); lb.textContent = lb.textContent.split(':')[0] + ': ' + name; lb.title = name; return; }
      const f = B / Math.max(sh.w, sh.h);   // one cell scaled into the box
      const sheetW = TW.S.index.icon.cols * sh.w;
      ic.style.backgroundImage = `url('${sh.url}')`; ic.style.backgroundSize = `${sheetW * f}px auto`;
      ic.style.backgroundPosition = `${-sh.x * f + (B - sh.w * f) / 2}px ${-sh.y * f + (B - sh.h * f) / 2}px`;
      ic.style.clipPath = `inset(${(B - sh.h * f) / 2}px ${(B - sh.w * f) / 2}px)`; ic.title = name;
      cb.checked = key === 'hair' ? !st.hairHidden : !st.hidden.has(id);
      lb.textContent = lb.textContent.split(':')[0] + ': ' + name; lb.title = name;
    });
  }

  // ---------------------------------------------------------------- presets
  // the dye choices are copied in and out: the saved preset must not follow later changes (settings are saved again later)
  const copy = o => JSON.parse(JSON.stringify(o));
  function preset(n, save) {
    if (!save && !settings.presets[n]) save = true;
    if (save) {
      settings.presets[n] = { char: st.ci, hair: st.hair, dye: st.dye, hairMode: st.hairMode, items: Object.values(st.equip), hidden: [...st.hidden], cdye: copy(st.cdye), bdye: copy(st.bdye) }; saveLS();
      status(`프리셋 ${n} 저장: ${TW.S.index.chars[st.ci].name}, 헤어 ${st.hair}, 아이템 ${Object.keys(st.equip).length}개`); return;
    }
    const p = settings.presets[n];
    if (p.char !== st.ci) { status(`프리셋 ${n}은 ${TW.S.index.chars[p.char].name} 것입니다. 먼저 그 캐릭터로 바꾸세요.`); return; }
    st.equip = {}; st.hidden = new Set(p.hidden || []); st.cdye = copy(p.cdye || {}); st.bdye = copy(p.bdye || {}); $('cdye').dataset.iid = '';   // the 염색 window is built anew on the loaded choices
    for (const id of p.items) { const it = st.char.byId[id]; if (it) st.equip[it.slot] = id; }
    st.hair = st.char.hairById[p.hair] ? p.hair : st.hair; st.dye = st.hair === p.hair ? p.dye || 0 : 0; st.dyeBy[st.hair] = st.dye; st.hairHidden = false; st.hairMode = p.hairMode || 'all';
    syncHair(); markSelected(); refresh(); status(`프리셋 ${n} 불러옴`);
  }

  // ---------------------------------------------------------------- preview
  function pose() {
    if (st.mode === 'tf') return { char: st.ci, motion: st.motion, dir: st.dir, hair: -1, items: st.tf ? [st.tf] : [], hairMode: 'all', hidden: new Set(), raw: true };
    return { char: st.ci, motion: st.motion, dir: st.dir, hair: st.hairHidden ? -1 : st.hair, dye: st.dye, items: Object.values(st.equip), hairMode: st.hairMode, hidden: st.hidden,
             cdye: st.equip.costume && !NO_DYE.has(st.equip.costume) ? st.cdye[st.equip.costume] || null : null, bdye: st.equip.costume ? null : st.bdye };
  }
  function setDir(d) { st.dir = d; refresh(); }
  function stepDir(s) { const o = TW.S.index.dir_order; setDir(o[(o.indexOf(st.dir) + s + o.length) % o.length]); }
  function stepMotion(s) { const ms = st.mode === 'tf' ? tfMotions(st.tf) : TW.S.index.chars[st.ci].motions; st.motion = ms[(ms.indexOf(st.motion) + s + ms.length) % ms.length]; st.tick = 0; syncGroup($('motions'), () => st.motion); refresh(); }
  function applyZoom() { const v = $('view'); v.width = VIEW[0]; v.height = VIEW[1]; if (st.lastPose) { const [w, h] = logical(); anchor = TW.centeredAnchor(pose(), w, h); } drawNow(); }
  let anchor = null;
  // ---------------------------------------------------------------- 염색 window on the stage: the worn 확장 의상 (DB 0351,
  // free colours per part) or, with no 확장 의상, the character's own outfit (DB 0186 / 0068, the game's 10 colours per part)
  // outfits the data lists as dyeable that the game does not let you dye (confirmed in game): no 염색 window for them
  const NO_DYE = new Set([1040556]);                // 멜빵바지 (이스핀)
  function dyePanel() {
    const box = $('cdye'), iid = st.mode !== 'tf' && st.equip.costume, parts = iid && !NO_DYE.has(iid) ? TW.costumeDyes(iid) : [];
    if (st.mode !== 'tf' && !st.equip.costume) { basePanel(box); return; }
    if (!parts.length) { box.classList.add('hidden'); return; }
    const cur = st.cdye[iid] || (st.cdye[iid] = {});
    if (box.dataset.iid !== String(iid)) {
      box.dataset.iid = String(iid); box.innerHTML = '';
      dyeChrome(box, '부위별로 색을 고릅니다');
      parts.forEach(([name], k) => {
        const row = document.createElement('div'); row.className = 'row'; if (name.startsWith('머리')) row.dataset.hairPart = '1';
        // the part's colour: a swatch opening colorPicker (previews while picking; 확인 keeps it, 취소 puts the old one back)
        const sw = document.createElement('button'); sw.className = 'sw'; sw.title = name;
        const show = () => { sw.style.background = '#' + (cur[k] || 'ffffff'); sw.classList.toggle('unset', !cur[k]); };
        show();
        sw.onclick = () => {
          const before = cur[k]; let last = 0;
          colorPicker(sw, cur[k] || 'ffffff',
            hex => { cur[k] = hex; show(); const now = Date.now(); if (now - last > 120) { last = now; drawNow(); } },
            hex => { if (hex) cur[k] = hex; else if (before) cur[k] = before; else delete cur[k]; show(); refresh(); });
        };
        const nm = document.createElement('span'); nm.textContent = name; nm.title = name;   // cut short by css: whole on hover
        const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = '이 부위 염색 지우기';
        x.onclick = () => { delete cur[k]; show(); refresh(); };
        row.appendChild(sw); row.appendChild(nm); row.appendChild(x); box.appendChild(row);
      });
      const all = document.createElement('button'); all.className = 'btn foot'; all.textContent = '전부 지우기';
      all.onclick = () => { st.cdye[iid] = {}; box.dataset.iid = ''; dyePanel(); refresh(); }; box.appendChild(all);
    }
    // a chosen hair style replaces the outfit's painted hair: its '머리' part is not dyed then (compose.js)
    const hairOn = st.hair >= 0 && !st.hairHidden;
    box.querySelectorAll('.row[data-hair-part]').forEach(r => { r.classList.toggle('off', hairOn); r.title = hairOn ? '헤어를 골라서 의상의 머리 대신 그 헤어가 보입니다. 헤어를 벗기면 이 염색이 적용됩니다' : ''; });
    box.classList.remove('hidden'); placeDye();
  }
  // the window's frame: the 염색 button (closed) and, open, a title bar to drag it around the stage with × at its right
  // end closing it back to the button
  function dyeChrome(box, title) {
    box.classList.toggle('closed', !st.cdyeOpen);
    const head = document.createElement('button'); head.className = 'btn head'; head.textContent = '염색'; head.title = title;
    head.onclick = () => { st.cdyeOpen = true; box.classList.remove('closed'); placeDye(); }; box.appendChild(head);
    const bar = document.createElement('div'); bar.className = 'bar'; bar.title = '끌어서 옮기기';
    const ttl = document.createElement('span'); ttl.textContent = '염색';
    const cls = document.createElement('button'); cls.className = 'close'; cls.textContent = '×'; cls.title = '닫기';
    cls.onclick = () => { st.cdyeOpen = false; box.classList.add('closed'); placeDye(); };
    bar.onpointerdown = ev => {
      if (ev.button !== 0 || ev.target === cls) return;
      ev.preventDefault(); bar.setPointerCapture(ev.pointerId);
      const S = box.parentElement.getBoundingClientRect(), B = box.getBoundingClientRect(), dx = ev.clientX - B.left, dy = ev.clientY - B.top;
      bar.onpointermove = e => {
        st.cdyePos = { x: Math.max(0, Math.min(S.width - B.width, e.clientX - S.left - dx)), y: Math.max(0, Math.min(S.height - B.height, e.clientY - S.top - dy)) };
        placeDye();
      };
      bar.onpointerup = bar.onpointercancel = () => { bar.onpointermove = null; };
    };
    bar.appendChild(ttl); bar.appendChild(cls); box.appendChild(bar);
  }
  // 기본 의상 염색: the same window as 확장 의상 염색 (per part a swatch opening colorPicker, × = undyed), the picker
  // also offering the game's colours of that part (up to 10 presets): a preset keeps the game's own shading, a colour
  // picked freely gets the part's shading (compose.js customRamp). The part called 머리 is the hair, which the body does
  // not draw (hair styles have their own dyes): not offered
  const presetSwatch = ramp => { const ks = Object.keys(ramp).map(Number).sort((a, b) => a - b); return ramp[ks[Math.floor(ks.length * 0.45)]] || 'ffffff'; };
  function basePanel(box) {
    const parts = TW.baseDyes(st.ci).map((p, k) => [p, k]).filter(([p]) => p[0] !== '머리');
    if (!parts.length) { box.classList.add('hidden'); box.dataset.iid = ''; return; }
    if (box.dataset.iid !== 'base' + st.ci) {
      box.dataset.iid = 'base' + st.ci; box.innerHTML = '';
      dyeChrome(box, '부위별로 색을 고릅니다');
      for (const [[name, , presets, order, names], k] of parts) {
        // the presets in the order the shop sells the dyes (basedye.json: columns without a dye item last), named by the dye
        const pre = (order || presets.map((_, j) => j)).filter(j => presets[j])
          .map((j, pos) => ({ value: j, hex: presetSwatch(presets[j]), title: (names && names[j]) || `${pos + 1}번 색` }));
        const row = document.createElement('div'); row.className = 'row'; row.dataset.k = k;
        const sw = document.createElement('button'); sw.className = 'sw';
        // the swatch shows the part's current dye (st.bdye[k]: a preset index or 'rrggbb'); kept in step by basePanel
        row.show = () => {
          const v = st.bdye[k], p = pre.find(q => q.value === v);
          sw.style.background = '#' + (typeof v === 'string' ? v : p ? p.hex : 'ffffff'); sw.classList.toggle('unset', v === undefined);
          sw.title = v === undefined ? name : `${name} · ${typeof v === 'string' ? '#' + v : p ? p.title : ''}`;
        };
        sw.onclick = () => {
          const before = st.bdye[k], p = pre.find(q => q.value === before); let last = 0;
          const set = (hex, preset) => { st.bdye[k] = preset !== undefined ? preset : hex; row.show(); };
          colorPicker(sw, typeof before === 'string' ? before : p ? p.hex : 'ffffff',
            (hex, preset) => { set(hex, preset); const now = Date.now(); if (now - last > 120) { last = now; drawNow(); } },
            (hex, preset) => { if (hex) set(hex, preset); else if (before !== undefined) st.bdye[k] = before; else delete st.bdye[k]; row.show(); refresh(); },
            { presets: pre, preset: p ? before : undefined });
        };
        const nm = document.createElement('span'); nm.textContent = name; nm.title = name;   // cut short by css: whole on hover
        const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = '이 부위 염색 지우기';
        x.onclick = () => { delete st.bdye[k]; row.show(); refresh(); };
        row.appendChild(sw); row.appendChild(nm); row.appendChild(x); box.appendChild(row);
      }
      const all = document.createElement('button'); all.className = 'btn foot'; all.textContent = '전부 지우기';
      all.onclick = () => { st.bdye = {}; refresh(); }; box.appendChild(all);
    }
    box.querySelectorAll('.row').forEach(r => r.show());
    box.classList.remove('hidden'); placeDye();
  }
  // ---------------------------------------------------------------- colour picker (확장 의상 / 기본 의상 염색)
  // The browser's own picker has no 확인 / 취소, so this one: saturation / brightness square, hue bar, R G B, the
  // eyedropper where the browser has one, and opt.presets [{value, hex, title}] (기본 의상: the game's colours) as boxes
  // under R G B. onLive(hex, preset) while picking; onDone(hex, preset) on 확인, onDone(null) on 취소 / Esc / a click
  // outside it. preset = the chosen preset's value until the colour is changed by hand (opt.preset: the one at the
  // start), else undefined. One open at a time.
  let pickerClose = null;
  const hsv2rgb = (h, s, v) => { const f = n => { const k = (n + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))); }; return [f(5), f(3), f(1)]; };
  const rgb2hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    const h = !d ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, mx ? d / mx : 0, mx]; };
  const hex2rgb = hex => [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  const rgb2hex = rgb => rgb.map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('');
  function colorPicker(anchor, hex, onLive, onDone, opt = {}) {
    if (pickerClose) pickerClose(null);
    let [h, s, v] = rgb2hsv(...hex2rgb(hex)), pv = opt.preset;
    const el = document.createElement('div'); el.className = 'cpick';
    el.innerHTML = `<div class="sv"><canvas width="200" height="132"></canvas><i></i></div>
      <div class="mid">${window.EyeDropper ? '<button class="eye" title="화면에서 색 가져오기"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M19.4 3.6a2.1 2.1 0 0 0-3 0l-2.6 2.6-1.1-1.1-1.4 1.4 1.1 1.1-7.2 7.2V18h3.2l7.2-7.2 1.1 1.1 1.4-1.4-1.1-1.1 2.6-2.6a2.1 2.1 0 0 0 0-3zM7.6 16H6v-1.6l7-7 1.6 1.6z" fill="currentColor"/></svg></button>' : ''}
        <span class="now"></span><div class="hue"><i></i></div></div>
      <div class="rgb">${['R', 'G', 'B'].map(c => `<label><input type="number" min="0" max="255" step="1">${c}</label>`).join('')}</div>
      ${opt.presets && opt.presets.length ? '<div class="pre"></div>' : ''}
      <div class="act"><button class="btn cancel">취소</button><button class="btn ok">확인</button></div>`;
    root.appendChild(el);
    const sv = el.querySelector('.sv'), cv = sv.querySelector('canvas'), dot = sv.querySelector('i'), hue = el.querySelector('.hue'), knob = hue.querySelector('i');
    const now = el.querySelector('.now'), nums = [...el.querySelectorAll('.rgb input')];
    const paint = (fromNums) => {
      const g = cv.getContext('2d'), W = cv.width, H = cv.height;
      g.fillStyle = `hsl(${h}, 100%, 50%)`; g.fillRect(0, 0, W, H);
      let gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      dot.style.left = s * 100 + '%'; dot.style.top = (1 - v) * 100 + '%'; knob.style.left = h / 360 * 100 + '%';
      const rgb = hsv2rgb(h, s, v); now.style.background = '#' + rgb2hex(rgb);
      if (!fromNums) nums.forEach((n, i) => { n.value = rgb[i]; });
      return rgb2hex(rgb);
    };
    // the presets: a box per game colour (its dye name on hover); the chosen one is outlined while the colour is its own
    const boxes = (opt.presets || []).map(p => {
      const b = document.createElement('button'); b.className = 'p'; b.style.background = '#' + p.hex; b.title = p.title;
      b.onclick = () => { [h, s, v] = rgb2hsv(...hex2rgb(p.hex)); pv = p.value; mark(); onLive(paint(), pv); };
      el.querySelector('.pre').appendChild(b); return b;
    });
    const mark = () => boxes.forEach((b, i) => b.classList.toggle('on', opt.presets[i].value === pv));
    const live = fromNums => { pv = undefined; mark(); onLive(paint(fromNums), pv); };
    const drag = (target, set) => target.onpointerdown = ev => {
      if (ev.button !== 0) return; ev.preventDefault(); target.setPointerCapture(ev.pointerId);
      const at = e => { const b = target.getBoundingClientRect(); set(Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), Math.max(0, Math.min(1, (e.clientY - b.top) / b.height))); live(); };
      at(ev); target.onpointermove = at; target.onpointerup = target.onpointercancel = () => { target.onpointermove = null; };
    };
    drag(sv, (x, y) => { s = x; v = 1 - y; });
    drag(hue, x => { h = Math.min(359.9, x * 360); });
    nums.forEach(n => n.oninput = () => { const rgb = nums.map(i => Math.max(0, Math.min(255, +i.value || 0))); [h, s, v] = rgb2hsv(...rgb); live(true); });
    const eye = el.querySelector('.eye');
    if (eye) eye.onclick = async () => { try { const r = await new window.EyeDropper().open(); [h, s, v] = rgb2hsv(...hex2rgb(r.sRGBHex.slice(1))); live(); } catch (e) { /* dismissed */ } };
    // beside the swatch, inside the window
    const a = anchor.getBoundingClientRect(), P = el.getBoundingClientRect();
    let x = a.left - P.width - 8; if (x < 8) x = Math.min(a.right + 8, innerWidth - P.width - 8);
    el.style.left = Math.max(8, x) + 'px'; el.style.top = Math.max(8, Math.min(a.top - 40, innerHeight - P.height - 8)) + 'px';
    const close = result => {
      pickerClose = null; el.remove(); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', key, true);
      onDone(result, result ? pv : undefined);
    };
    const outside = ev => { if (!ev.composedPath().includes(el)) close(null); };
    const key = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); close(null); } else if (ev.key === 'Enter') close(paint()); };
    el.querySelector('.ok').onclick = () => close(paint());
    el.querySelector('.cancel').onclick = () => close(null);
    setTimeout(() => { document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', key, true); });
    pickerClose = close;
    mark(); paint();
  }
  // the open window sits where it was last dragged (st.cdyePos, stage pixels); closed, the 염색 button is in its own corner (css)
  function placeDye() {
    const box = $('cdye'), p = !box.classList.contains('closed') && st.cdyePos;
    Object.assign(box.style, p ? { left: p.x + 'px', top: p.y + 'px', right: 'auto', bottom: 'auto' } : { left: '', top: '', right: '', bottom: '' });
    if (!p) return;
    // another outfit can make the window taller (more parts): moved up / left as far as it takes to stay whole on the
    // stage; st.cdyePos keeps the place chosen, so a shorter window goes back there
    const S = box.parentElement.getBoundingClientRect();
    box.style.left = Math.max(0, Math.min(p.x, S.width - box.offsetWidth)) + 'px';
    box.style.top = Math.max(0, Math.min(p.y, S.height - box.offsetHeight)) + 'px';
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
    addEventListener('pagehide', hideSecret);
    if (window.ResizeObserver) new ResizeObserver(es => { for (const e of es) if (!e.contentRect.width && !e.contentRect.height) hideSecret(); }).observe(host);
    main().catch(e => { $('pickStatus').textContent = '데이터를 읽지 못했습니다: ' + e.message; $('pick').classList.remove('hidden'); console.error(e); });
  }
  window.TWAvatarSim = { mount };
})();
