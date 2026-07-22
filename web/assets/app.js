const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS78PnupM0NaJzkrkFCr2Llja9TJKrLcRZqeCqlCUV4GPGlsJd3xSIn3SQAvHwzy_tGtxDbTFtl8oZQ/pub?gid=898941035&single=true&output=csv";
const SNAPSHOT_URL = "./data/equipment-snapshot.json";
const IMAGE_BASE = "./equipment-images/";
const CHARACTER_IMAGE_BASE = "./character-images/";

const STAT_NAMES = [
  "찌르기",
  "베기",
  "물리방어",
  "마법공격",
  "마법방어",
  "명중",
  "회피",
  "민첩",
  "크리티컬",
];

const LIMIT_COMPARE_STATS = ["찌르기", "베기", "마법공격", "마법방어"];
const CATEGORY_ORDER = ["무기", "손목", "갑옷", "장비 세트", "아티팩트"];
const CHARACTER_NAMES = [
  "나야트레이",
  "녹턴",
  "란지에",
  "로아미니",
  "루시안",
  "리체",
  "막시민",
  "밀라",
  "벤야",
  "보리스",
  "시벨린",
  "아나이스",
  "예프넨",
  "이솔렛",
  "이스핀",
  "이자크",
  "조슈아",
  "클로에",
  "티치엘",
];
// === 계수 계산기 (TWChatOverlay CoefficientCalculatorView 로직 이식) ===
// 계산 타입
const CALC = {
  STAB: "STAB",
  HACK: "HACK",
  MAGIC_ATTACK: "MAGIC_ATTACK",
  MAGIC_DEFENSE: "MAGIC_DEFENSE",
  PHYSICAL_HYBRID: "PHYSICAL_HYBRID",
  MAGIC_HACK: "MAGIC_HACK",
};

const CALC_TYPE_DISPLAY = {
  [CALC.STAB]: "찌르기",
  [CALC.HACK]: "베기",
  [CALC.MAGIC_ATTACK]: "마법공격",
  [CALC.MAGIC_DEFENSE]: "마법방어",
  [CALC.PHYSICAL_HYBRID]: "물리 복합",
  [CALC.MAGIC_HACK]: "마법베기",
};

// 캐릭터별 사용 가능한 계산 타입 (CharacterCalculatorTypeMap)
const CHARACTER_CALC_TYPES = {
  나야트레이: [CALC.STAB, CALC.HACK, CALC.PHYSICAL_HYBRID],
  루시안: [CALC.STAB, CALC.HACK, CALC.PHYSICAL_HYBRID],
  이자크: [CALC.STAB, CALC.HACK],
  막시민: [CALC.PHYSICAL_HYBRID, CALC.HACK, CALC.MAGIC_HACK],
  보리스: [CALC.HACK, CALC.PHYSICAL_HYBRID, CALC.MAGIC_HACK],
  시벨린: [CALC.STAB, CALC.PHYSICAL_HYBRID],
  티치엘: [CALC.MAGIC_ATTACK, CALC.MAGIC_DEFENSE, CALC.PHYSICAL_HYBRID],
  클로에: [CALC.MAGIC_ATTACK],
  아나이스: [CALC.MAGIC_ATTACK, CALC.MAGIC_DEFENSE],
  벤야: [CALC.HACK, CALC.MAGIC_DEFENSE],
  리체: [CALC.HACK],
  밀라: [CALC.HACK, CALC.PHYSICAL_HYBRID],
  이스핀: [CALC.STAB, CALC.HACK, CALC.PHYSICAL_HYBRID],
  녹턴: [CALC.STAB],
  조슈아: [CALC.STAB, CALC.MAGIC_ATTACK],
  란지에: [CALC.STAB, CALC.MAGIC_ATTACK],
  로아미니: [CALC.MAGIC_ATTACK],
  예프넨: [CALC.HACK],
  이솔렛: [CALC.HACK, CALC.MAGIC_DEFENSE],
};

// 캐릭터·타입별 장비 후보 필터 (CharacterTypeSlotMap)
// key: "캐릭터|타입", value: { weapon, wrist[], armor[], artifact }
const CHARACTER_TYPE_SLOT_MAP = {
  "나야트레이|STAB": { weapon: "단검", wrist: ["리스트"], armor: ["아머", "슈츠"], artifact: "찌르기" },
  "나야트레이|PHYSICAL_HYBRID": { weapon: "단도", wrist: ["리스트"], armor: ["아머", "슈츠"], artifact: "물리복합" },
  "나야트레이|HACK": { weapon: "도끼", wrist: ["리스트"], armor: ["아머", "슈츠"], artifact: "베기" },
  "루시안|STAB": { weapon: "세검", wrist: ["리스트"], armor: ["메일", "아머"], artifact: "찌르기" },
  "루시안|PHYSICAL_HYBRID": { weapon: "장검", wrist: ["리스트"], armor: ["메일", "아머"], artifact: "물리복합" },
  "루시안|HACK": { weapon: "평도", wrist: ["리스트"], armor: ["메일", "아머"], artifact: "베기" },
  "이자크|STAB": { weapon: "클로", wrist: ["리스트"], armor: ["메일", "아머", "슈츠"], artifact: "찌르기" },
  "이자크|HACK": { weapon: "카라", wrist: ["리스트"], armor: ["메일", "아머", "슈츠"], artifact: "베기" },
  "막시민|MAGIC_HACK": { weapon: "대검", wrist: ["리스트"], armor: ["마법갑옷", "메일", "아머"], artifact: "마법베기" },
  "막시민|PHYSICAL_HYBRID": { weapon: "태도", wrist: ["리스트"], armor: ["마법갑옷", "메일", "아머"], artifact: "물리복합" },
  "막시민|HACK": { weapon: "평도", wrist: ["리스트"], armor: ["마법갑옷", "메일", "아머"], artifact: "베기" },
  "보리스|MAGIC_HACK": { weapon: "대검", wrist: ["리스트"], armor: ["마법갑옷", "메일", "아머"], artifact: "마법베기" },
  "보리스|PHYSICAL_HYBRID": { weapon: "태도", wrist: ["리스트"], armor: ["마법갑옷", "메일", "아머"], artifact: "물리복합" },
  "보리스|HACK": { weapon: "평도", wrist: ["리스트"], armor: ["마법갑옷", "메일", "아머"], artifact: "베기" },
  "시벨린|STAB": { weapon: "창", wrist: ["리스트"], armor: ["메일", "아머"], artifact: "찌르기" },
  "시벨린|PHYSICAL_HYBRID": { weapon: "봉", wrist: ["리스트"], armor: ["메일", "아머"], artifact: "물리복합" },
  "티치엘|MAGIC_ATTACK": { weapon: "스태프", wrist: ["암릿"], armor: ["로브"], artifact: "마법공격" },
  "티치엘|MAGIC_DEFENSE": { weapon: "로드", wrist: ["암릿"], armor: ["로브"], artifact: "신성" },
  "티치엘|PHYSICAL_HYBRID": { weapon: "메이스", wrist: ["리스트"], armor: ["아머", "로브"], artifact: "물리복합" },
  "클로에|MAGIC_ATTACK": { weapon: "스태프", wrist: ["암릿"], armor: ["로브"], artifact: "마법공격" },
  "아나이스|MAGIC_ATTACK": { weapon: "셉터", wrist: ["암릿"], armor: ["로브"], artifact: "마법공격" },
  "아나이스|MAGIC_DEFENSE": { weapon: "핸드벨", wrist: ["암릿"], armor: ["로브"], artifact: "신성" },
  "벤야|HACK": { weapon: "사이드", wrist: ["리스트"], armor: ["메일", "아머", "슈츠"], artifact: "베기" },
  "벤야|MAGIC_DEFENSE": { weapon: "해머", wrist: ["수정구"], armor: ["메일", "아머", "슈츠"], artifact: "신성" },
  "리체|HACK": { weapon: "아밍소드", wrist: ["리스트"], armor: ["메일", "아머"], artifact: "베기" },
  "밀라|HACK": { weapon: "채찍", wrist: ["리스트"], armor: ["아머", "슈츠"], artifact: "베기" },
  "밀라|PHYSICAL_HYBRID": { weapon: "플레일", wrist: ["리스트"], armor: ["아머", "슈츠"], artifact: "물리복합" },
  "이스핀|STAB": { weapon: "세검", wrist: ["리스트"], armor: ["메일", "아머"], artifact: "찌르기" },
  "이스핀|PHYSICAL_HYBRID": { weapon: "장검", wrist: ["리스트"], armor: ["메일", "아머"], artifact: "물리복합" },
  "이스핀|HACK": { weapon: "평도", wrist: ["리스트"], armor: ["메일", "아머"], artifact: "베기" },
  "녹턴|STAB": { weapon: "핸드런처", wrist: ["리스트"], armor: ["아머", "마법갑옷"], artifact: "찌르기" },
  "조슈아|STAB": { weapon: "스몰소드", wrist: ["리스트"], armor: ["아머", "마법갑옷"], artifact: "찌르기" },
  "조슈아|MAGIC_ATTACK": { weapon: "완드", wrist: ["스펠북"], armor: ["아머", "마법갑옷"], artifact: "마법공격" },
  "란지에|STAB": { weapon: "물리총", wrist: ["물리 탄창"], armor: ["아머", "마법갑옷"], artifact: "찌르기" },
  "란지에|MAGIC_ATTACK": { weapon: "마법총", wrist: ["마법 탄창"], armor: ["아머", "마법갑옷"], artifact: "마법공격" },
  "로아미니|MAGIC_ATTACK": { weapon: "토템", wrist: ["암릿"], armor: ["로브"], artifact: "마법공격" },
  "예프넨|HACK": { weapon: "소드셰이프", wrist: ["리스트"], armor: ["마법갑옷", "메일", "아머"], artifact: "베기" },
  "이솔렛|HACK": { weapon: "물리검", wrist: ["물리검"], armor: ["메일", "마법갑옷"], artifact: "베기" },
  "이솔렛|MAGIC_DEFENSE": { weapon: "마법검", wrist: ["마법검"], armor: ["메일", "마법갑옷"], artifact: "신성" },
};

// 메인 슬롯 (MainSlotNames) / 보조 슬롯 (AccessorySlotNames)
const MAIN_SLOTS = [
  "무기", "무기 어빌리티", "갑옷", "갑옷 어빌리티", "손목", "손목 어빌리티",
  "투구", "머리", "몸", "손", "손 어빌리티", "다리", "효과", "아티팩트",
];
const ACCESSORY_SLOTS = ["스탯", "아바타", "커프", "칭호", "코어", "렐릭", "링크"];

// 콘텐츠 가능여부 임계값 (UpdateContentAvailability)
const CONTENT_THRESHOLDS = [
  { name: "최후의 결전", impossible: 90000, hard: 93000, possible: 95000, odin: false },
  { name: "아페 어려움", impossible: 67500, hard: 70000, possible: 72500, odin: false },
  { name: "이클 토벌전", impossible: 67500, hard: 70000, possible: 72500, odin: false },
  { name: "이클 6보스", impossible: 45000, hard: 52500, possible: 55000, odin: false },
  { name: "오딘 전면전", impossible: 47000, hard: 49500, possible: 51000, odin: true },
];

const CALC_SAVE_KEY = "tw-coefficient-save-v1";
// 어빌리티 능력 타입 선택지
// 현재는 "수동 입력"으로 고정, 심연/상실/야성은 숨김(추후 활성화 대비 코드에 유지)
const ABILITY_DEFAULT = "수동 입력";
const ABILITY_TYPES = ["심연", "상실", "야성"];
const ABILITY_OPTIONS = [ABILITY_DEFAULT, ...ABILITY_TYPES];
const state = {
  records: [],
  filtered: [],
  page: 0,
  category: "all",
  type: "all",
  query: "",
  compareId: "",
  limitCompare: false,
  source: "loading",
};

const calc = {
  active: false,
  characterName: "",
  types: [],
  type: null,
  preset: 1, // 캐릭터·타입별 프리셋 (1~3)
  mainRows: [],
  accRows: [],
  dex: 0,
  save: loadCalcSave(),
};

const els = {
  mainTabButtons: document.querySelectorAll(".top-tabs [data-main-tab]"),
  mainTabTriggers: document.querySelectorAll("[data-main-tab]"),
  mainPanels: document.querySelectorAll("[data-main-panel]"),
  calculatorTabButtons: document.querySelectorAll("[data-calculator-tab]"),
  calculatorPanels: document.querySelectorAll("[data-calculator-panel]"),
  simulatorTabButtons: document.querySelectorAll("[data-simulator-tab]"),
  simulatorPanels: document.querySelectorAll("[data-simulator-panel]"),
  characterGrid: document.querySelector("#characterGrid"),
  coefficientSelectView: document.querySelector("#coefficientSelectView"),
  coefficientDetailView: document.querySelector("#coefficientDetailView"),
  coefficientBackButton: document.querySelector("#coefficientBackButton"),
  coefficientResetButton: document.querySelector("#coefficientResetButton"),
  coefficientSelectedImage: document.querySelector("#coefficientSelectedImage"),
  coefficientSelectedName: document.querySelector("#coefficientSelectedName"),
  coefficientTypeSelect: document.querySelector("#coefficientTypeSelect"),
  coefficientTableHead: document.querySelector("#coefficientTableHead"),
  coefficientTableBody: document.querySelector("#coefficientTableBody"),
  coefficientSideBody: document.querySelector("#coefficientSideBody"),
  coefficientMainTotal: document.querySelector("#coefficientMainTotal"),
  coefficientContentSummary: document.querySelector("#coefficientContentSummary"),
  sideHeadPrimary: document.querySelector("#sideHeadPrimary"),
  sideHeadSecondary: document.querySelector("#sideHeadSecondary"),
  avatarMainEnhance: document.querySelector("#avatarMainEnhance"),
  avatarSubEnhance: document.querySelector("#avatarSubEnhance"),
  categorySelect: document.querySelector("#categorySelect"),
  typeSelect: document.querySelector("#typeSelect"),
  searchInput: document.querySelector("#searchInput"),
  resultCount: document.querySelector("#resultCount"),
  dataStatus: document.querySelector("#dataStatus"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  pageLabel: document.querySelector("#pageLabel"),
  equipmentCard: document.querySelector("#equipmentCard"),
  compareSelect: document.querySelector("#compareSelect"),
  limitCompareToggle: document.querySelector("#limitCompareToggle"),
  compareSummary: document.querySelector("#compareSummary"),
  emptyTemplate: document.querySelector("#emptyTemplate"),
};

async function boot() {
  resetControls();
  renderCharacterGrid();
  activateMainTab("equipment");
  activateCalculatorTab("coefficient");
  activateSimulatorTab("encrypt");
  wireEvents();
  initDamageCalculator();
  initSimulators();

  try {
    const rows = await loadSheetRows();
    state.records = normalizeRows(rows);
    state.source = "live";
  } catch (error) {
    console.info("Live sheet is unavailable. Using local snapshot.", error);
    const snapshot = await fetchJson(SNAPSHOT_URL);
    state.records = snapshot.records || [];
    state.source = "snapshot";
  }

  populateCategorySelect();
  applyFilters();

  if (calc.active) refreshAllRows();
  else restoreLastCharacter();
}

// 재접속 시 마지막으로 보던 캐릭터를 자동으로 열어줌
function restoreLastCharacter() {
  const name = calc.save.lastCharacter;
  if (name && CHARACTER_NAMES.includes(name)) {
    showCoefficientDetail(name);
  }
}

// 시트의 AZ1 셀을 버전 값으로 사용:
//  1) AZ1만 먼저 요청(수 바이트) → 저장된 캐시 버전과 같으면 전체 CSV 다운로드 생략
//  2) 다르면(또는 버전 셀이 비어 있으면) 전체 CSV를 받고 캐시 갱신
// AZ1이 비어 있으면 Google이 range를 무시하고 전체 CSV를 반환하므로,
// "짧은 단일 토큰"일 때만 유효한 버전으로 인정한다.
const SHEET_VERSION_URL = `${SHEET_CSV_URL}&range=AZ1`;
const CSV_CACHE_KEY = "tw-equipment-csv-cache-v1";

async function fetchSheetVersion() {
  try {
    const response = await fetch(SHEET_VERSION_URL, { cache: "no-store" });
    if (!response.ok) return "";
    const text = (await response.text()).trim().replace(/^"|"$/g, "");
    // 줄바꿈/쉼표가 없는 40자 이하 값만 버전으로 인정 (전체 CSV가 반환된 경우 배제)
    if (text && text.length <= 40 && !/[\n\r,<]/.test(text)) return text;
  } catch (error) {
    console.info("시트 버전 확인 실패 — 전체 CSV를 받습니다.", error);
  }
  return "";
}

async function loadSheetRows() {
  const version = await fetchSheetVersion();

  // 버전이 같으면 localStorage에 저장해둔 CSV 재사용
  if (version) {
    try {
      const cached = JSON.parse(localStorage.getItem(CSV_CACHE_KEY) || "null");
      if (cached && cached.version === version && typeof cached.text === "string" && cached.text) {
        return parseDelimited(cached.text, ",");
      }
    } catch (error) {
      console.info("CSV 캐시를 읽지 못했습니다.", error);
    }
  }

  const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Google Sheet CSV ${response.status}`);
  }
  const text = await response.text();
  if (text.trim().startsWith("<")) {
    throw new Error("Google Sheet returned an HTML page instead of CSV.");
  }

  if (version) {
    try {
      localStorage.setItem(CSV_CACHE_KEY, JSON.stringify({ version, text }));
    } catch (error) {
      console.info("CSV 캐시 저장 실패(용량 초과 등) — 캐시 없이 동작합니다.", error);
    }
  }
  return parseDelimited(text, ",");
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Snapshot ${response.status}`);
  }
  return response.json();
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(value);
      value = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function normalizeRows(rows) {
  return rows
    .slice(2)
    .map((row, index) => toRecord(row, index))
    .filter(Boolean);
}

function toRecord(row, index) {
  const name = clean(row[2]);
  if (!name) return null;

  const imageFile = clean(row[0]);
  const category = clean(row[3]) || "기타";
  const type = clean(row[4]) || "기타";
  const stats = {};

  STAT_NAMES.forEach((label, statIndex) => {
    const start = 5 + statIndex * 3;
    stats[label] = {
      min: toNumber(row[start]),
      max: toNumber(row[start + 1]),
      limit: toNumber(row[start + 2]),
    };
  });

  const materials = row
    .slice(33, 39)
    .map(clean)
    .filter((item) => item && item !== "#REF!");

  const condition = clean(row[32]);
  const id = `${imageFile || name}-${index}`;

  return {
    id,
    imageFile,
    name,
    category,
    type,
    stats,
    condition,
    materials,
    searchText: [name, category, type, condition, materials.join(" "), imageFile]
      .join(" ")
      .toLowerCase(),
  };
}

function clean(value) {
  return String(value ?? "").trim();
}

function toNumber(value) {
  const numeric = Number(String(value ?? "").replaceAll(",", "").trim());
  return Number.isFinite(numeric) ? numeric : 0;
}

function materialImageUrls(material) {
  return materialImageNameCandidates(material)
    .map((name) => `${IMAGE_BASE}${encodeURIComponent(`${name.replace(/\s+/g, "_")}.png`)}`);
}

function materialImageNameCandidates(material) {
  const source = clean(material).split("/").map((part) => part.trim()).find(Boolean) || clean(material);
  const base = stripTrailingQuantity(source);
  const candidates = new Set();
  const add = (value) => {
    const next = clean(value);
    if (next) candidates.add(next);
  };
  const transforms = [
    (value) => value.replaceAll("달 여왕", "달여왕"),
    (value) => value.replace(/ 오브 디펜시오$/, " 오브 - 디펜시오"),
    (value) => stripTrailingParenthetical(value),
    (value) => value.replaceAll("파편", "조각"),
    (value) => value.replaceAll("조각", "파편"),
  ];

  add(base);
  for (let round = 0; round < 2; round += 1) {
    [...candidates].forEach((candidate) => {
      transforms.forEach((transform) => add(transform(candidate)));
    });
  }

  return [...candidates];
}

function stripTrailingQuantity(value) {
  let next = clean(value);
  let previous = "";
  while (next && next !== previous) {
    previous = next;
    next = next.replace(/\s*\(\s*\d+[^()]*\)\s*$/u, "").trim();
  }
  return next;
}

function stripTrailingParenthetical(value) {
  return clean(value).replace(/\s*\([^()]*\)\s*$/u, "").trim();
}

function populateCategorySelect() {
  const categories = orderedCategories(state.records.map((record) => record.category));
  els.categorySelect.innerHTML = optionHtml("all", "전체 카테고리") + categories.map((category) => optionHtml(category, category)).join("");
  els.categorySelect.value = state.category;
  populateTypeSelect();
}

function resetControls() {
  state.page = 0;
  state.category = "all";
  state.type = "all";
  state.query = "";
  state.compareId = "";
  state.limitCompare = false;

  els.searchInput.value = "";
  els.limitCompareToggle.checked = false;
}

function populateTypeSelect() {
  const source = state.category === "all"
    ? state.records
    : state.records.filter((record) => record.category === state.category);
  const types = unique(source.map((record) => record.type));
  els.typeSelect.innerHTML = optionHtml("all", "전체 분류") + types.map((type) => optionHtml(type, type)).join("");
  if (![...els.typeSelect.options].some((option) => option.value === state.type)) {
    state.type = "all";
  }
  els.typeSelect.value = state.type;
}

function optionHtml(value, label) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
}

function orderedCategories(values) {
  const categories = [...new Set(values.filter(Boolean))];
  const known = CATEGORY_ORDER.filter((category) => categories.includes(category));
  const rest = categories
    .filter((category) => !CATEGORY_ORDER.includes(category))
    .sort((a, b) => a.localeCompare(b, "ko"));
  return [...known, ...rest];
}

function activateMainTab(key) {
  els.mainPanels.forEach((panel) => {
    const isActive = panel.dataset.mainPanel === key;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });

  els.mainTabButtons.forEach((button) => {
    const isActive = button.dataset.mainTab === key;
    button.classList.toggle("is-active", isActive);
    button.toggleAttribute("aria-current", isActive);
  });
}

function activateCalculatorTab(key) {
  els.calculatorTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.calculatorTab === key);
  });
  els.calculatorPanels.forEach((panel) => {
    const isActive = panel.dataset.calculatorPanel === key;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });
  if (key === "damage") dmgRefresh();
}

function activateSimulatorTab(key) {
  els.simulatorTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.simulatorTab === key);
  });
  els.simulatorPanels.forEach((panel) => {
    const isActive = panel.dataset.simulatorPanel === key;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });
}

function renderCharacterGrid() {
  if (!els.characterGrid) return;

  els.characterGrid.innerHTML = CHARACTER_NAMES.map((name) => `
    <button class="character-card" type="button" data-character="${escapeHtml(name)}">
      <span class="character-portrait">
        <img src="${CHARACTER_IMAGE_BASE}${encodeURIComponent(`${name}.png`)}" alt="" loading="lazy" decoding="async" />
      </span>
      <strong>${escapeHtml(name)}</strong>
    </button>
  `).join("");
}

// ── 계수 계산기 엔진 ──────────────────────────────────────────

function resolveCalculatorTypes(characterName) {
  const types = CHARACTER_CALC_TYPES[characterName];
  return types && types.length ? types : [CALC.STAB];
}

function makeSlotRow(slotName) {
  const managed = ACCESSORY_SLOTS.includes(slotName) || slotName.includes("어빌리티");
  return {
    slotName,
    isAccessory: slotName === "커프" || slotName === "렐릭",
    isCore: slotName === "코어",
    isStat: slotName === "스탯",
    isAvatar: slotName === "아바타",
    isTitle: slotName === "칭호",
    isAbility: slotName.includes("어빌리티"),
    abilityType: ABILITY_DEFAULT,
    selectedEquipment: managed ? "" : "수동 입력",
    candidates: ["수동 입력"],
    attackValue: 0,
    attackEnchant: 0,
    defenseValue: 0,
    defenseEnchant: 0,
    hitValue: 0,
    primaryStatValue: 0,
    secondaryStatValue: 0,
    coefficient: 0,
    attackEnchantMaxHint: "MAX : -",
    defenseEnchantMaxHint: "MAX : -",
    hitMaxHint: "MAX : -",
    primaryStatMaxHint: "MAX : -",
    secondaryStatMaxHint: "MAX : -",
  };
}

// 보조행 접근자 (AccessoryValue1/2, TitleValue, CoreValue 매핑)
function accRow(name) {
  return calc.accRows.find((row) => row.slotName === name) || null;
}

function recalcRow(row, type) {
  const p = row.primaryStatValue;
  const s = row.secondaryStatValue;

  if (row.isStat) {
    row.coefficient = ({
      [CALC.STAB]: 2.1 * p + 1.08 * s,
      [CALC.HACK]: 2.1 * p + 1.08 * s,
      [CALC.MAGIC_ATTACK]: 2.4 * p + 0.6 * s,
      [CALC.MAGIC_DEFENSE]: 2.55 * p + 0.45 * s,
      [CALC.PHYSICAL_HYBRID]: 1.8 * (p + s),
      [CALC.MAGIC_HACK]: 1.8 * (p + s),
    })[type] || 0;
    return;
  }

  if (row.isCore) {
    const core = row.attackEnchant; // CoreValue
    row.coefficient = ({
      [CALC.STAB]: 32.5 * core,
      [CALC.HACK]: 32.5 * core,
      [CALC.MAGIC_ATTACK]: 32.5 * core,
      [CALC.MAGIC_DEFENSE]: 32.5 * core,
      [CALC.PHYSICAL_HYBRID]: 28.75 * core,
      [CALC.MAGIC_HACK]: 28.75 * core,
    })[type] || 0;
    return;
  }

  if (row.isTitle) {
    const title = row.defenseValue; // TitleValue
    row.coefficient = ({
      [CALC.STAB]: 23.75 * title,
      [CALC.HACK]: 23.75 * title,
      [CALC.MAGIC_ATTACK]: 23.75 * title,
      [CALC.MAGIC_DEFENSE]: 20.5 * title,
      [CALC.PHYSICAL_HYBRID]: 14.5 * title,
      [CALC.MAGIC_HACK]: 14.5 * title,
    })[type] || 0;
    return;
  }

  if (row.isAvatar || row.isAccessory) {
    const v1 = row.attackValue; // AccessoryValue1
    const v2 = row.attackEnchant; // AccessoryValue2
    row.coefficient = ({
      [CALC.STAB]: 23.75 * v1 + 3.75 * v2,
      [CALC.HACK]: 23.75 * v1 + 3.75 * v2,
      [CALC.MAGIC_ATTACK]: 23.75 * v1 + 2.5 * v2,
      [CALC.MAGIC_DEFENSE]: 20.5 * v1 + 2.5 * v2,
      [CALC.PHYSICAL_HYBRID]: 14.5 * (v1 + v2),
      [CALC.MAGIC_HACK]: 14.5 * (v1 + v2),
    })[type] || 0;
    return;
  }

  const av = row.attackValue;
  const ae = row.attackEnchant;
  const dv = row.defenseValue;
  const de = row.defenseEnchant;
  row.coefficient = ({
    [CALC.STAB]: 23.75 * av + 32.5 * ae + 3.75 * dv + 18.75 * de,
    [CALC.HACK]: 23.75 * av + 32.5 * ae + 3.75 * dv + 18.75 * de,
    [CALC.MAGIC_ATTACK]: 23.75 * av + 32.5 * ae + 2.5 * dv + 18.25 * de,
    [CALC.MAGIC_DEFENSE]: 20.5 * av + 32.5 * ae + 2.5 * dv + 16.75 * de,
    [CALC.PHYSICAL_HYBRID]: 14.5 * (av + dv) + 28.75 * (ae + de),
    [CALC.MAGIC_HACK]: 14.5 * (av + dv) + 28.75 * (ae + de),
  })[type] || 0;
}

// 타입별 주/보조 스탯 컬럼 라벨
function typeStatLabels(type) {
  return ({
    [CALC.STAB]: ["찌르기", "베기"],
    [CALC.HACK]: ["베기", "찌르기"],
    [CALC.MAGIC_ATTACK]: ["마법공격", "마법방어"],
    [CALC.MAGIC_DEFENSE]: ["마법방어", "마법공격"],
    [CALC.PHYSICAL_HYBRID]: ["찌르기", "베기"],
    [CALC.MAGIC_HACK]: ["베기", "마법공격"],
  })[type] || ["공격력", "방어력"];
}

// 장비 필터 헬퍼 (attack_type 없는 웹 CSV → 아티팩트는 분류(type) 텍스트에서 공격타입 유도)
function normalizeTypeToken(token) {
  let t = String(token || "").trim().replace(/\s+/g, "");
  if (t === "마법방어" || t === "신성공격") return "신성";
  if (t === "물리복합" || t === "물리복합형") return "물리복합";
  return t;
}

function recordAttackTypes(record) {
  // 아티팩트만 분류 컬럼이 공격타입을 담고 있음
  if (record.category !== "아티팩트") return [];
  const raw = String(record.type || "");
  if (!raw) return [];
  if (raw.includes("신성")) return ["신성"];
  const cleaned = raw.replace(/\([^()]*\)/g, "").replace(/\s+/g, "");
  return cleaned ? [normalizeTypeToken(cleaned)] : [];
}

function recordCharacters(record) {
  // 착용조건 컬럼에 사용 가능 캐릭터가 ", "로 나열될 수 있음 (방어구/손목 등)
  const cond = clean(record.condition);
  if (!cond) return [];
  return cond
    .split(/[,/·\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function containsCategory(record, keyword) {
  return (
    String(record.type || "").includes(keyword) ||
    String(record.category || "").includes(keyword)
  );
}

function containsKeyword(record, keyword) {
  return (
    String(record.name || "").includes(keyword) ||
    String(record.type || "").includes(keyword) ||
    String(record.category || "").includes(keyword)
  );
}

function isUsableByCharacter(record, characterName) {
  if (!characterName) return true;
  const chars = recordCharacters(record);
  if (chars.length === 0) return true;
  return chars.some((c) => c === characterName);
}

function typeMatchKeyword(type) {
  return ({
    [CALC.STAB]: "찌르기",
    [CALC.HACK]: "베기",
    [CALC.MAGIC_ATTACK]: "마법공격",
    [CALC.MAGIC_DEFENSE]: "신성",
    [CALC.PHYSICAL_HYBRID]: "물리복합",
    [CALC.MAGIC_HACK]: "마법베기",
  })[type] || "";
}

function matchesArtifactKeyword(record, keyword) {
  const target = normalizeTypeToken(keyword);
  if (!target) return true;
  for (const at of recordAttackTypes(record)) {
    if (normalizeTypeToken(at) === target) return true;
  }
  const texts = [record.name || "", record.type || "", record.category || ""];
  const separators = /[\/,|\s()\[\]\-_]+/;
  for (const text of texts) {
    for (const token of String(text).split(separators)) {
      if (token && normalizeTypeToken(token) === target) return true;
    }
  }
  return false;
}

function isMatchByAttackType(record, type, allowWhenUnknown, excludeMagicHackWhenHack = true) {
  const keyword = typeMatchKeyword(type);
  if (!keyword) return true;

  const attackTypes = recordAttackTypes(record);
  if (attackTypes.length) {
    const normalized = [...new Set(attackTypes.map(normalizeTypeToken).filter(Boolean))];
    const target = normalizeTypeToken(keyword);
    if (type === CALC.HACK && excludeMagicHackWhenHack) {
      return normalized.includes("베기") && !normalized.includes("마법베기");
    }
    if (type === CALC.MAGIC_HACK) {
      return normalized.includes("마법베기");
    }
    return normalized.includes(target);
  }

  if (matchesArtifactKeyword(record, keyword)) return true;
  return allowWhenUnknown;
}

function isWeaponMatchByType(record, type) {
  const isWeapon =
    String(record.category || "").includes("무기") ||
    String(record.type || "").includes("무기");
  if (!isWeapon) return false;
  return isMatchByAttackType(record, type, false);
}

function buildEquipmentCandidates(slot, type, characterName) {
  let list = state.records.filter((r) => isUsableByCharacter(r, characterName));
  const config = CHARACTER_TYPE_SLOT_MAP[`${characterName}|${type}`];

  let filtered;
  if (slot === "무기") {
    filtered = config
      ? list.filter((r) => containsKeyword(r, config.weapon))
      : list.filter((r) => isWeaponMatchByType(r, type));
  } else if (slot === "손목") {
    filtered = config
      ? list.filter((r) => config.wrist.some((k) => containsKeyword(r, k)))
      : list.filter((r) => containsCategory(r, "손목"));
  } else if (slot === "갑옷") {
    filtered = config
      ? list.filter(
          (r) =>
            containsCategory(r, "갑옷") &&
            config.armor.some((k) => containsCategory(r, k)) &&
            isMatchByAttackType(r, type, true, false)
        )
      : list.filter((r) => containsCategory(r, "갑옷") && isMatchByAttackType(r, type, true, false));
  } else if (slot === "아티팩트") {
    filtered = list.filter(
      (r) => containsCategory(r, "아티팩트") && isMatchByAttackType(r, type, false, true)
    );
  } else if (slot === "다리") {
    filtered = list.filter((r) => containsCategory(r, "발") || containsCategory(r, "다리"));
  } else if (slot === "손") {
    filtered = list.filter((r) => containsCategory(r, "손") && !containsCategory(r, "손목"));
  } else if (slot.includes("어빌리티") || ACCESSORY_SLOTS.includes(slot)) {
    filtered = [];
  } else {
    filtered = list.filter((r) => containsCategory(r, slot));
  }

  const names = [...new Set(filtered.map((r) => r.name).filter(Boolean))];
  names.unshift("수동 입력");
  return names;
}

// 장비 선택 → 행 스탯 반영 (ApplyEquipmentToRow)
function statByType(record, type) {
  const S = (key) => record.stats[key] || { min: 0, max: 0, limit: 0 };
  const stab = S("찌르기");
  const hack = S("베기");
  const int = S("마법공격");
  const mr = S("마법방어");
  switch (type) {
    case CALC.STAB:
      return { pMax: stab.max, sMax: hack.max, pLimit: stab.limit, sLimit: hack.limit };
    case CALC.HACK:
      return { pMax: hack.max, sMax: stab.max, pLimit: hack.limit, sLimit: stab.limit };
    case CALC.MAGIC_ATTACK:
      return { pMax: int.max, sMax: mr.max, pLimit: int.limit, sLimit: mr.limit };
    case CALC.MAGIC_DEFENSE:
      return { pMax: mr.max, sMax: int.max, pLimit: mr.limit, sLimit: int.limit };
    case CALC.PHYSICAL_HYBRID:
      return { pMax: stab.max, sMax: hack.max, pLimit: stab.limit, sLimit: hack.limit };
    case CALC.MAGIC_HACK:
      return { pMax: hack.max, sMax: int.max, pLimit: hack.limit, sLimit: int.limit };
    default:
      return { pMax: stab.max, sMax: hack.max, pLimit: stab.limit, sLimit: hack.limit };
  }
}

function applyEquipmentToRow(row) {
  if (ACCESSORY_SLOTS.includes(row.slotName) || row.isAbility) return;

  const resetEmpty = () => {
    row.attackValue = 0;
    row.defenseValue = 0;
    row.hitValue = 0;
    row.primaryStatValue = 0;
    row.secondaryStatValue = 0;
    row.attackEnchantMaxHint = "MAX : -";
    row.defenseEnchantMaxHint = "MAX : -";
    row.hitMaxHint = "MAX : -";
  };

  if (!state.records.length || !row.selectedEquipment || row.selectedEquipment === "수동 입력") {
    resetEmpty();
    return;
  }

  const item = state.records.find((r) => r.name === row.selectedEquipment);
  if (!item) {
    resetEmpty();
    return;
  }

  const { pMax, sMax, pLimit, sLimit } = statByType(item, calc.type);
  const dex = item.stats["명중"] || { max: 0, limit: 0 };
  row.attackValue = pMax;
  row.defenseValue = sMax;
  row.hitValue = dex.max;
  row.primaryStatValue = 0;
  row.secondaryStatValue = 0;
  row.attackEnchantMaxHint = pLimit > 0 ? `MAX : ${Math.max(0, pLimit - pMax)}` : "MAX : -";
  row.defenseEnchantMaxHint = sLimit > 0 ? `MAX : ${Math.max(0, sLimit - sMax)}` : "MAX : -";
  row.hitMaxHint = dex.limit > 0 ? `MAX : ${Math.max(0, dex.limit - dex.max)}` : "MAX : -";
}

function updateStatLimitHintsFromWeapon() {
  const statRow = accRow("스탯");
  const weaponRow = calc.mainRows.find((r) => r.slotName === "무기");
  if (!statRow) return;
  if (!weaponRow || !weaponRow.selectedEquipment || weaponRow.selectedEquipment === "수동 입력") {
    statRow.primaryStatMaxHint = "MAX : -";
    statRow.secondaryStatMaxHint = "MAX : -";
    return;
  }
  const item = state.records.find((r) => r.name === weaponRow.selectedEquipment);
  if (!item) {
    statRow.primaryStatMaxHint = "MAX : -";
    statRow.secondaryStatMaxHint = "MAX : -";
    return;
  }
  const { pMax, sMax, pLimit, sLimit } = statByType(item, calc.type);
  statRow.primaryStatMaxHint = `MAX : ${Math.max(0, pLimit - pMax)}`;
  statRow.secondaryStatMaxHint = `MAX : ${Math.max(0, sLimit - sMax)}`;
}

// 아바타 강화 보너스 계수 (CalculateAvatarEnhancementBonusCoefficient)
function avatarEnhancementBonus(mainBonus, subBonus) {
  return ({
    [CALC.STAB]: 32.5 * mainBonus + 18.75 * subBonus,
    [CALC.HACK]: 32.5 * mainBonus + 18.75 * subBonus,
    [CALC.MAGIC_ATTACK]: 32.5 * mainBonus + 18.25 * subBonus,
    [CALC.MAGIC_DEFENSE]: 32.5 * mainBonus + 16.75 * subBonus,
    [CALC.PHYSICAL_HYBRID]: 28.75 * (mainBonus + subBonus),
    [CALC.MAGIC_HACK]: 28.75 * (mainBonus + subBonus),
  })[calc.type] || 0;
}

function calcTotalMetrics() {
  const avatar = accRow("아바타");
  const cuff = accRow("커프");
  const relic = accRow("렐릭");
  const title = accRow("칭호");
  const core = accRow("코어");
  const link = accRow("링크");

  const avatarMainBonus = els.avatarMainEnhance && els.avatarMainEnhance.checked ? 50 : 0;
  const avatarSubBonus = els.avatarSubEnhance && els.avatarSubEnhance.checked ? 50 : 0;

  const sum = (arr, fn) => arr.reduce((acc, r) => acc + fn(r), 0);

  const primaryBaseSum =
    sum(calc.mainRows, (r) => r.attackValue) +
    (avatar ? avatar.attackValue : 0) +
    (cuff ? cuff.attackValue : 0) +
    (relic ? relic.attackValue : 0) +
    (title ? title.defenseValue : 0) +
    (link ? link.attackValue : 0);

  const primaryEnchantSum =
    sum(calc.mainRows, (r) => r.attackEnchant) + (core ? core.attackEnchant : 0) + avatarMainBonus;

  const secondarySum =
    sum(calc.mainRows, (r) => r.defenseValue) +
    (avatar ? avatar.attackEnchant : 0) +
    (cuff ? cuff.attackEnchant : 0) +
    (relic ? relic.attackEnchant : 0);

  const secondaryEnchantSum = sum(calc.mainRows, (r) => r.defenseEnchant) + avatarSubBonus;

  const hitSum = sum(calc.mainRows, (r) => r.hitValue) + sum(calc.accRows, (r) => r.hitValue);

  const baseTotal = sum(calc.mainRows, (r) => r.coefficient) + sum(calc.accRows, (r) => r.coefficient);
  const bonus = avatarEnhancementBonus(avatarMainBonus, avatarSubBonus);
  const totalCoefficient = baseTotal + bonus;

  return {
    primaryBaseSum,
    primaryEnchantSum,
    secondarySum,
    secondaryEnchantSum,
    hitSum,
    totalPrimarySum: primaryBaseSum + primaryEnchantSum,
    totalCoefficient,
  };
}

function evaluateByThreshold(value, t) {
  if (value <= t.impossible) return "불가능";
  if (value <= t.hard) return "힘듬";
  if (value <= t.possible) return "가능";
  return "원활";
}

function statusClass(value) {
  return ({
    불가능: "status-impossible",
    힘듬: "status-hard",
    가능: "status-possible",
    원활: "status-smooth",
  })[value] || "";
}

// 계산 타입 초기화 및 상세 화면 진입 (SelectCharacterAsync)
function showCoefficientDetail(characterName) {
  calc.active = true;
  calc.characterName = characterName;
  calc.types = resolveCalculatorTypes(characterName);
  calc.type = calc.types[0];

  els.coefficientSelectedName.textContent = characterName;
  els.coefficientSelectedImage.src = `${CHARACTER_IMAGE_BASE}${encodeURIComponent(`${characterName}.png`)}`;
  els.coefficientTypeSelect.innerHTML = calc.types
    .map((t) => optionHtml(t, CALC_TYPE_DISPLAY[t]))
    .join("");

  // 저장된 마지막 선택 타입 복원
  const saved = calc.save.characters[characterName];
  if (saved && calc.types.includes(saved.lastType)) {
    calc.type = saved.lastType;
  }
  els.coefficientTypeSelect.value = calc.type;

  // 해당 캐릭터·타입에서 마지막으로 쓰던 프리셋 복원
  calc.preset = savedPresetFor(characterName, calc.type);
  updatePresetButtons();

  calc.mainRows = MAIN_SLOTS.map(makeSlotRow);
  calc.accRows = ACCESSORY_SLOTS.map(makeSlotRow);

  refreshAllRows();

  els.coefficientSelectView.hidden = true;
  els.coefficientDetailView.hidden = false;
}

function showCoefficientSelect() {
  saveCalcState();
  calc.active = false;
  els.coefficientDetailView.hidden = true;
  els.coefficientSelectView.hidden = false;
}

// 프리셋 버튼 활성 표시 갱신
function updatePresetButtons() {
  document.querySelectorAll("#coefficientPresetGroup [data-preset]").forEach((btn) => {
    btn.classList.toggle("is-active", Number(btn.dataset.preset) === calc.preset);
  });
}

// 프리셋 전환: 현재 프리셋을 저장한 뒤 대상 프리셋 데이터 로드 (없으면 기본값)
function switchPreset(n) {
  if (!calc.active || n === calc.preset) return;

  // 대기 중인 자동 저장 취소 후 현재 프리셋에 즉시 저장
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveCalcState();

  calc.preset = n;

  // 선택 프리셋 기억
  const charEntry = calc.save.characters[calc.characterName];
  if (charEntry) {
    charEntry.presetSel = charEntry.presetSel || {};
    charEntry.presetSel[slotBaseKey()] = n;
    saveCalcSave();
  }

  updatePresetButtons();
  refreshAllRows();
}

// 선택된 캐릭터 + 계산 타입의 데이터만 초기화
function resetCurrentTypeData() {
  if (!calc.active || !calc.characterName || !calc.type) return;

  const typeName = CALC_TYPE_DISPLAY[calc.type] || calc.type;
  const ok = window.confirm(`${calc.characterName} · ${typeName} · 프리셋 ${calc.preset} 데이터를 초기화할까요?`);
  if (!ok) return;

  // 대기 중인 자동 저장 취소 (초기화 직후 되살아나지 않도록)
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  const charEntry = calc.save.characters[calc.characterName];
  if (charEntry && charEntry.slots && charEntry.slots[slotSaveKey()]) {
    delete charEntry.slots[slotSaveKey()];
    saveCalcSave();
  }

  // 저장 엔트리를 지운 뒤 기본값으로 다시 렌더 (loadSavedSlotState가 복원할 데이터가 없어 기본값 유지)
  refreshAllRows();
}

// 타입 변경/진입 시 전체 행 초기화 (RefreshAllRows)
function refreshAllRows() {
  const type = calc.type;

  for (const row of calc.mainRows) {
    row.attackValue = 0;
    row.attackEnchant = 0;
    row.defenseValue = 0;
    row.defenseEnchant = 0;
    row.hitValue = 0;
    row.primaryStatValue = 0;
    row.secondaryStatValue = 0;
    row.attackEnchantMaxHint = "MAX : -";
    row.defenseEnchantMaxHint = "MAX : -";
    row.hitMaxHint = "MAX : -";

    if (row.isAbility) {
      row.candidates = ["수동 입력"];
      row.selectedEquipment = "";
      recalcRow(row, type);
    } else {
      row.candidates = buildEquipmentCandidates(row.slotName, type, calc.characterName);
      row.selectedEquipment = row.candidates[0] || "수동 입력";
      applyEquipmentToRow(row);
      recalcRow(row, type);
    }
  }

  for (const row of calc.accRows) {
    row.attackValue = 0;
    row.attackEnchant = 0;
    row.defenseValue = 0;
    row.defenseEnchant = 0;
    row.hitValue = 0;
    row.primaryStatValue = 0;
    row.secondaryStatValue = 0;

    switch (row.slotName) {
      case "아바타":
        row.attackValue = 15;
        row.attackEnchant = 15;
        row.hitValue = 15;
        break;
      case "커프":
        row.attackValue = 50;
        row.attackEnchant = 50;
        row.hitValue = 50;
        break;
      case "렐릭":
        row.attackValue = 17;
        row.attackEnchant = 17;
        row.hitValue = 17;
        break;
      case "칭호":
        row.defenseValue = 50;
        break;
      case "코어":
        row.attackEnchant = 0;
        break;
      default:
        break;
    }
    recalcRow(row, type);
  }

  loadSavedSlotState();
  updateStatLimitHintsFromWeapon();
  renderCalculator();
}

// ── 저장/복원 (CoefficientDataService) ──
function loadCalcSave() {
  try {
    const raw = localStorage.getItem(CALC_SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { characters: parsed.characters || {}, lastCharacter: parsed.lastCharacter || "" };
    }
  } catch (error) {
    console.info("계수 계산기 저장값을 불러오지 못했습니다.", error);
  }
  return { characters: {}, lastCharacter: "" };
}

function saveCalcSave() {
  try {
    localStorage.setItem(CALC_SAVE_KEY, JSON.stringify(calc.save));
  } catch (error) {
    console.info("계수 계산기 저장에 실패했습니다.", error);
  }
}

function slotBaseKey() {
  return `${calc.characterName}::${calc.type}`;
}

// 프리셋 1은 기존 키 그대로(하위 호환), 2·3은 ::p2 / ::p3 접미사
function slotSaveKey() {
  return calc.preset > 1 ? `${slotBaseKey()}::p${calc.preset}` : slotBaseKey();
}

function savedPresetFor(characterName, type) {
  const charEntry = calc.save.characters[characterName];
  const n = charEntry && charEntry.presetSel ? charEntry.presetSel[`${characterName}::${type}`] : 1;
  return n === 2 || n === 3 ? n : 1;
}

// 입력 변경 시 디바운스 자동 저장
let saveTimer = null;
function scheduleSave() {
  if (!calc.active) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveCalcState();
  }, 400);
}

// 즉시 저장 (탭 종료/전환 시 대기 중인 저장을 바로 반영)
function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (calc.active) saveCalcState();
}

function saveCalcState() {
  if (!calc.characterName || !calc.type) return;

  const charEntry = calc.save.characters[calc.characterName] || { lastType: calc.type, slots: {} };
  charEntry.lastType = calc.type;
  charEntry.dex = calc.dex;

  const snapshot = {};
  const capture = (row) => ({
    equip: row.selectedEquipment,
    at: row.abilityType,
    a: row.attackValue,
    ae: row.attackEnchant,
    d: row.defenseValue,
    de: row.defenseEnchant,
    hit: row.hitValue,
    p: row.primaryStatValue,
    s: row.secondaryStatValue,
  });
  for (const row of calc.mainRows) snapshot[row.slotName] = capture(row);
  for (const row of calc.accRows) snapshot[row.slotName] = capture(row);

  charEntry.slots = charEntry.slots || {};
  charEntry.slots[slotSaveKey()] = {
    data: snapshot,
    avatarMain: !!(els.avatarMainEnhance && els.avatarMainEnhance.checked),
    avatarSub: !!(els.avatarSubEnhance && els.avatarSubEnhance.checked),
  };

  // 캐릭터·타입별 마지막 선택 프리셋 기억
  charEntry.presetSel = charEntry.presetSel || {};
  charEntry.presetSel[slotBaseKey()] = calc.preset;

  calc.save.characters[calc.characterName] = charEntry;
  calc.save.lastCharacter = calc.characterName;
  saveCalcSave();
}

function loadSavedSlotState() {
  const charEntry = calc.save.characters[calc.characterName];
  const entry = charEntry && charEntry.slots ? charEntry.slots[slotSaveKey()] : null;

  if (entry && entry.data) {
    const snap = entry.data;
    for (const row of calc.mainRows) {
      const s = snap[row.slotName];
      if (!s) continue;
      if (s.at && ABILITY_OPTIONS.includes(s.at)) row.abilityType = s.at;
      if (s.equip && row.candidates.includes(s.equip)) {
        row.selectedEquipment = s.equip;
        applyEquipmentToRow(row);
      }
      row.attackEnchant = s.ae || 0;
      row.defenseEnchant = s.de || 0;
      if (row.selectedEquipment === "수동 입력" || row.isAbility) {
        row.attackValue = s.a || 0;
        row.defenseValue = s.d || 0;
        row.hitValue = s.hit || 0;
      }
      row.primaryStatValue = s.p || 0;
      row.secondaryStatValue = s.s || 0;
      recalcRow(row, calc.type);
    }
    for (const row of calc.accRows) {
      const s = snap[row.slotName];
      if (!s) continue;
      row.attackValue = s.a || 0;
      row.attackEnchant = s.ae || 0;
      row.defenseValue = s.d || 0;
      row.defenseEnchant = s.de || 0;
      row.hitValue = s.hit || 0;
      row.primaryStatValue = s.p || 0;
      row.secondaryStatValue = s.s || 0;
      recalcRow(row, calc.type);
    }
  }

  if (els.avatarMainEnhance) els.avatarMainEnhance.checked = !!(entry && entry.avatarMain);
  if (els.avatarSubEnhance) els.avatarSubEnhance.checked = !!(entry && entry.avatarSub);

  calc.dex = charEntry && charEntry.dex ? charEntry.dex : 0;
}

// ── 렌더링 ──
// .NET ToString("F0")과 동일한 은행가 반올림(round-half-to-even)
function f0(value) {
  const n = Number(value) || 0;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const floor = Math.floor(abs);
  const diff = abs - floor;
  let rounded;
  if (diff > 0.5) rounded = floor + 1;
  else if (diff < 0.5) rounded = floor;
  else rounded = floor % 2 === 0 ? floor : floor + 1;
  return (sign * rounded).toString();
}

function f2(value) {
  return (Number(value) || 0).toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function makeNumberInput(row, field, onCommit) {
  const input = document.createElement("input");
  input.type = "number";
  input.value = f0(row[field]);
  input.dataset.field = field;
  input.addEventListener("input", () => {
    row[field] = Number(input.value) || 0;
    recalcRow(row, calc.type);
    if (onCommit) onCommit();
    updateDerived();
  });
  return input;
}

function cellWith(node, className) {
  const td = document.createElement("td");
  if (className) td.className = className;
  if (node instanceof Node) td.appendChild(node);
  else td.textContent = node;
  return td;
}

function renderCalculator() {
  calc.dom = { rowCoeff: new Map(), accCoeff: new Map() };

  els.coefficientTypeSelect.value = calc.type;
  const [primary, secondary] = typeStatLabels(calc.type);

  // 메인 테이블 헤더
  els.coefficientTableHead.innerHTML = [
    "부위",
    "아이템",
    primary,
    `강화 ${primary}`,
    secondary,
    `강화 ${secondary}`,
    "명중",
    "계수",
  ]
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join("");

  // 사이드 헤더
  els.sideHeadPrimary.textContent = primary;
  els.sideHeadSecondary.textContent = secondary;

  // 메인 테이블 본문 (어빌리티는 해당 장비 바로 아래에 인라인 행으로)
  els.coefficientTableBody.replaceChildren();
  for (const row of calc.mainRows) {
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    th.textContent = row.slotName;
    tr.appendChild(th);

    if (row.isAbility) {
      // 어빌리티 행: [능력 타입 콤보(심연/상실/야성)] + 어빌리티(일반 주스탯) + 시에나(강화 주스탯, 무기·손목만)
      tr.classList.add("ability-inline");

      // 아이템 칸: 능력 타입 콤보박스 (수동 입력 고정, 심연/상실/야성은 숨김)
      const typeSelect = document.createElement("select");
      typeSelect.innerHTML = ABILITY_OPTIONS.map((t) =>
        t === ABILITY_DEFAULT
          ? `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`
          : `<option value="${escapeHtml(t)}" hidden>${escapeHtml(t)}</option>`
      ).join("");
      typeSelect.value = ABILITY_OPTIONS.includes(row.abilityType) ? row.abilityType : ABILITY_DEFAULT;
      typeSelect.addEventListener("change", () => {
        row.abilityType = typeSelect.value;
      });
      tr.appendChild(cellWith(typeSelect));

      // 콤보 오른쪽: 어빌리티 / 시에나 입력
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "ability-inline-cell";

      const addField = (labelText, field) => {
        const wrap = document.createElement("label");
        wrap.className = "ability-field";
        const span = document.createElement("span");
        span.textContent = labelText;
        wrap.appendChild(span);
        wrap.appendChild(makeNumberInput(row, field));
        cell.appendChild(wrap);
      };

      addField("어빌리티", "attackValue");
      if (row.slotName === "무기 어빌리티" || row.slotName === "손목 어빌리티") {
        addField("시에나", "attackEnchant");
      }
      tr.appendChild(cell);

      const coeff = cellWith(f0(row.coefficient), "coeff-cell");
      calc.dom.rowCoeff.set(row.slotName, coeff);
      tr.appendChild(coeff);

      els.coefficientTableBody.appendChild(tr);
      continue;
    }

    // 아이템
    const select = document.createElement("select");
    select.innerHTML = row.candidates.map((name) => optionHtml(name, name)).join("");
    select.value = row.selectedEquipment;
    select.addEventListener("change", () => {
      row.selectedEquipment = select.value;
      applyEquipmentToRow(row);
      recalcRow(row, calc.type);
      if (row.slotName === "무기") updateStatLimitHintsFromWeapon();
      renderCalculator();
    });
    tr.appendChild(cellWith(select));

    tr.appendChild(cellWith(makeNumberInput(row, "attackValue")));
    tr.appendChild(cellWith(makeNumberInput(row, "attackEnchant")));
    tr.appendChild(cellWith(makeNumberInput(row, "defenseValue")));
    tr.appendChild(cellWith(makeNumberInput(row, "defenseEnchant")));
    tr.appendChild(cellWith(makeNumberInput(row, "hitValue")));

    const coeff = cellWith(f0(row.coefficient), "coeff-cell");
    calc.dom.rowCoeff.set(row.slotName, coeff);
    tr.appendChild(coeff);

    els.coefficientTableBody.appendChild(tr);
  }

  // 아이템 컬럼 폭을 가장 긴 옵션명에 맞게 축소
  sizeItemColumn();

  // 사이드 테이블 본문
  renderSideTable();

  // 합계 및 콘텐츠
  updateDerived();
}

// 콤보박스 옵션 중 가장 긴 이름을 실측해 아이템 컬럼 폭을 최소화 (잘리지 않게)
function sizeItemColumn() {
  const table = els.coefficientTableBody.closest("table");
  if (!table) return;
  const selects = [...els.coefficientTableBody.querySelectorAll("select")];
  if (!selects.length) {
    table.style.setProperty("--item-col-width", "160px");
    return;
  }

  const canvas = sizeItemColumn._canvas || (sizeItemColumn._canvas = document.createElement("canvas"));
  const ctx = canvas.getContext("2d");
  const cs = getComputedStyle(selects[0]);
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

  let maxText = 0;
  for (const select of selects) {
    for (const option of select.options) {
      const w = ctx.measureText(option.textContent).width;
      if (w > maxText) maxText = w;
    }
  }

  // 셀 패딩(20) + select 패딩/테두리(18) + 드롭다운 화살표(~18) + 여유(8)
  const width = Math.min(360, Math.max(120, Math.ceil(maxText) + 64));
  table.style.setProperty("--item-col-width", `${width}px`);
}

function renderSideTable() {
  els.coefficientSideBody.replaceChildren();

  const addAccCoeff = (name, td) => calc.dom.accCoeff.set(name, td);

  const buildRow = (label, cells) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = label;
    tr.appendChild(th);
    for (const c of cells) tr.appendChild(c);
    els.coefficientSideBody.appendChild(tr);
  };

  const stat = accRow("스탯");
  const avatar = accRow("아바타");
  const cuff = accRow("커프");
  const relic = accRow("렐릭");
  const title = accRow("칭호");
  const core = accRow("코어");
  const link = accRow("링크");

  // 스탯: 명중(빈칸), 주스탯, 부스탯, 계수
  const statCoeff = cellWith(f0(stat.coefficient), "coeff-cell");
  addAccCoeff("스탯", statCoeff);
  buildRow("스탯", [
    cellWith(""),
    cellWith(makeNumberInput(stat, "primaryStatValue")),
    cellWith(makeNumberInput(stat, "secondaryStatValue")),
    statCoeff,
  ]);

  // 덱스: 4칸 병합 입력
  const dexInput = document.createElement("input");
  dexInput.type = "number";
  dexInput.value = f0(calc.dex);
  dexInput.addEventListener("input", () => {
    calc.dex = Number(dexInput.value) || 0;
  });
  const dexCell = document.createElement("td");
  dexCell.colSpan = 4;
  dexCell.appendChild(dexInput);
  const dexTr = document.createElement("tr");
  const dexTh = document.createElement("th");
  dexTh.textContent = "덱스";
  dexTr.appendChild(dexTh);
  dexTr.appendChild(dexCell);
  els.coefficientSideBody.appendChild(dexTr);

  // 아바타 / 커프 / 렐릭: 명중, 주스탯(값1), 부스탯(값2), 계수
  for (const [label, row] of [["아바타", avatar], ["커프", cuff], ["렐릭", relic]]) {
    const coeff = cellWith(f0(row.coefficient), "coeff-cell");
    addAccCoeff(label, coeff);
    buildRow(label, [
      cellWith(makeNumberInput(row, "hitValue")),
      cellWith(makeNumberInput(row, "attackValue")),
      cellWith(makeNumberInput(row, "attackEnchant")),
      coeff,
    ]);
  }

  // 칭호: 주스탯(TitleValue=defenseValue), 계수
  const titleCoeff = cellWith(f0(title.coefficient), "coeff-cell");
  addAccCoeff("칭호", titleCoeff);
  buildRow("칭호", [
    cellWith(""),
    cellWith(makeNumberInput(title, "defenseValue")),
    cellWith(""),
    titleCoeff,
  ]);

  // 코어: 주스탯(CoreValue=attackEnchant), 계수
  const coreCoeff = cellWith(f0(core.coefficient), "coeff-cell");
  addAccCoeff("코어", coreCoeff);
  buildRow("코어", [
    cellWith(""),
    cellWith(makeNumberInput(core, "attackEnchant")),
    cellWith(""),
    coreCoeff,
  ]);

  // 링크: 일반 주스탯 계수 (값=attackValue, 계수는 recalcRow 기본식이 primaryBase×값 계산)
  const linkCoeff = cellWith(f0(link.coefficient), "coeff-cell");
  addAccCoeff("링크", linkCoeff);
  buildRow("링크", [
    cellWith(""),
    cellWith(makeNumberInput(link, "attackValue")),
    cellWith(""),
    linkCoeff,
  ]);
}

// 파생 값(계수 셀, 합계, 콘텐츠 판정)만 갱신 — 입력 포커스 유지
function updateDerived() {
  if (!calc.dom) return;
  const [primary] = typeStatLabels(calc.type);

  for (const row of calc.mainRows) {
    const td = calc.dom.rowCoeff.get(row.slotName);
    if (td) td.textContent = f0(row.coefficient);
  }
  for (const row of calc.accRows) {
    const td = calc.dom.accCoeff.get(row.slotName);
    if (td) td.textContent = f0(row.coefficient);
  }

  const totals = calcTotalMetrics();
  const [pLabel, sLabel] = typeStatLabels(calc.type);
  els.coefficientMainTotal.innerHTML = [
    [pLabel, f0(totals.primaryBaseSum)],
    [`강화 ${pLabel}`, f0(totals.primaryEnchantSum)],
    [sLabel, f0(totals.secondarySum)],
    [`강화 ${sLabel}`, f0(totals.secondaryEnchantSum)],
    ["명중", f0(totals.hitSum)],
    ["계수", f2(totals.totalCoefficient)],
  ]
    .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");

  // 콘텐츠 가능여부
  const cards = [`<div><span>총 ${escapeHtml(primary)}</span><strong>${escapeHtml(f0(totals.totalPrimarySum))}</strong></div>`];
  for (const t of CONTENT_THRESHOLDS) {
    const metric = t.odin ? totals.totalCoefficient - totals.secondaryEnchantSum : totals.totalCoefficient;
    const status = evaluateByThreshold(metric, t);
    cards.push(
      `<div><span>${escapeHtml(t.name)}</span><strong class="${statusClass(status)}">${escapeHtml(status)}</strong></div>`
    );
  }
  els.coefficientContentSummary.innerHTML = cards.join("");

  // 대미지 계산기 탭이 열려 있으면 계수 변경을 즉시 반영
  const damagePanel = document.querySelector('[data-calculator-panel="damage"]');
  if (damagePanel && !damagePanel.hidden) dmgRefresh();
}

function wireEvents() {
  els.mainTabTriggers.forEach((button) => {
    button.addEventListener("click", () => {
      activateMainTab(button.dataset.mainTab);
    });
  });

  els.calculatorTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateCalculatorTab(button.dataset.calculatorTab);
    });
  });

  els.simulatorTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateSimulatorTab(button.dataset.simulatorTab);
    });
  });

  els.characterGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-character]");
    if (!button) return;
    showCoefficientDetail(button.dataset.character);
  });

  els.coefficientBackButton?.addEventListener("click", showCoefficientSelect);

  els.coefficientResetButton?.addEventListener("click", resetCurrentTypeData);

  els.coefficientTypeSelect?.addEventListener("change", () => {
    saveCalcState();
    calc.type = els.coefficientTypeSelect.value;
    // 바뀐 타입에서 마지막으로 쓰던 프리셋 복원
    calc.preset = savedPresetFor(calc.characterName, calc.type);
    updatePresetButtons();
    refreshAllRows();
  });

  document.querySelector("#coefficientPresetGroup")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-preset]");
    if (!btn) return;
    switchPreset(Number(btn.dataset.preset));
  });

  els.avatarMainEnhance?.addEventListener("change", updateDerived);
  els.avatarSubEnhance?.addEventListener("change", updateDerived);

  // 입력값 자동 저장: 상세 화면 내 모든 입력/선택/체크박스 변경 시 (디바운스)
  els.coefficientDetailView?.addEventListener("input", scheduleSave);
  els.coefficientDetailView?.addEventListener("change", scheduleSave);

  // 탭을 닫거나 다른 앱으로 전환할 때 대기 중인 변경을 즉시 저장
  window.addEventListener("pagehide", flushSave);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave();
  });

  els.categorySelect.addEventListener("change", () => {
    state.category = els.categorySelect.value;
    state.type = "all";
    state.page = 0;
    populateTypeSelect();
    applyFilters();
  });

  els.typeSelect.addEventListener("change", () => {
    state.type = els.typeSelect.value;
    state.page = 0;
    applyFilters();
  });

  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value.trim().toLowerCase();
    state.page = 0;
    applyFilters();
  });

  els.prevButton.addEventListener("click", () => {
    state.page = Math.max(0, state.page - 1);
    render();
  });

  els.nextButton.addEventListener("click", () => {
    state.page = Math.min(state.filtered.length - 1, state.page + 1);
    render();
  });

  els.compareSelect.addEventListener("change", () => {
    state.compareId = els.compareSelect.value;
    renderCompare();
  });

  els.limitCompareToggle.addEventListener("change", () => {
    state.limitCompare = els.limitCompareToggle.checked;
    renderCompare();
  });
}

function applyFilters() {
  state.filtered = state.records.filter((record) => {
    const categoryOk = state.category === "all" || record.category === state.category;
    const typeOk = state.type === "all" || record.type === state.type;
    const queryOk = !state.query || record.searchText.includes(state.query);
    return categoryOk && typeOk && queryOk;
  });

  state.page = clamp(state.page, 0, Math.max(0, state.filtered.length - 1));
  render();
}

function populateCompareSelect() {
  const current = currentRecord();
  const matches = current
    ? state.records.filter((record) => record.id !== current.id && record.type === current.type)
    : [];
  const options = matches
    .map((record) => optionHtml(record.id, record.name))
    .join("");
  const placeholder = current ? `${current.type} 장비 선택` : "비교 장비 없음";
  els.compareSelect.innerHTML = `${optionHtml("", placeholder)}${options}`;
  els.compareSelect.disabled = matches.length === 0;
  if (![...els.compareSelect.options].some((option) => option.value === state.compareId)) {
    state.compareId = "";
  }
  els.compareSelect.value = state.compareId;
}

function render() {
  els.resultCount.textContent = `${state.filtered.length.toLocaleString("ko-KR")}개`;
  els.dataStatus.textContent = state.source === "live" ? "DB 연결" : "로컬 스냅샷";
  els.pageLabel.textContent = state.filtered.length ? `${state.page + 1} / ${state.filtered.length}` : "0 / 0";
  els.prevButton.disabled = state.page <= 0;
  els.nextButton.disabled = state.page >= state.filtered.length - 1;
  renderCard();
  populateCompareSelect();
  renderCompare();
}

function renderCard() {
  const record = currentRecord();
  if (!record) {
    els.equipmentCard.replaceChildren(els.emptyTemplate.content.cloneNode(true));
    return;
  }

  const statRows = STAT_NAMES.map((name) => {
    const stat = record.stats[name];
    const isZero = stat.min === 0 && stat.max === 0 && stat.limit === 0;
    const cap = stat.limit - stat.max;
    return `
      <tr class="${isZero ? "is-zero" : ""}">
        <th>${escapeHtml(name)}</th>
        <td>${formatStatValue(stat.min)}</td>
        <td>${formatStatValue(stat.max)}</td>
        <td class="limit-value">${formatStatValue(stat.limit)}</td>
        <td class="cap-value">${formatStatValue(cap)}</td>
      </tr>
    `;
  }).join("");

  els.equipmentCard.innerHTML = `
    <div class="item-hero">
      <div class="item-image">
        ${record.imageFile ? `<img src="${IMAGE_BASE}${encodeURIComponent(record.imageFile)}" alt="" />` : ""}
        <span>${escapeHtml(record.name.slice(0, 2))}</span>
      </div>
      <div>
        <p class="item-kind">${escapeHtml(record.category)} · ${escapeHtml(record.type)}</p>
        <h2>${escapeHtml(record.name)}</h2>
        <p class="item-condition">${escapeHtml(record.condition || "착용 조건 없음")}</p>
      </div>
    </div>

    <table class="stat-table">
      <thead>
        <tr>
          <th>스탯</th>
          <th>MIN</th>
          <th>MAX</th>
          <th>LIMIT</th>
          <th>한계</th>
        </tr>
      </thead>
      <tbody>${statRows}</tbody>
    </table>

    <div class="materials">
      <span>재료</span>
      <div>
        ${record.materials.length ? record.materials.map(materialChipHtml).join("") : "<b class=\"material-chip\">없음</b>"}
      </div>
    </div>
  `;

  els.equipmentCard.querySelector(".item-image img")?.addEventListener("error", (event) => {
    event.currentTarget.hidden = true;
  });
  els.equipmentCard.querySelectorAll(".material-icon").forEach((image) => {
    image.addEventListener("error", handleMaterialImageError);
  });
}

function materialChipHtml(item) {
  const urls = materialImageUrls(item);
  const [src, ...fallbacks] = urls;
  const image = src
    ? `<img class="material-icon" src="${src}" alt="" loading="lazy" decoding="async" data-fallbacks="${escapeHtml(JSON.stringify(fallbacks))}" />`
    : "";

  return `
    <b class="material-chip">
      ${image}
      <span>${escapeHtml(item)}</span>
    </b>
  `;
}

function handleMaterialImageError(event) {
  const image = event.currentTarget;
  const fallbacks = JSON.parse(image.dataset.fallbacks || "[]");
  const next = fallbacks.shift();

  if (next) {
    image.dataset.fallbacks = JSON.stringify(fallbacks);
    image.src = next;
    return;
  }

  image.hidden = true;
  image.closest(".material-chip")?.classList.add("has-missing-image");
}

function renderCompare() {
  const record = currentRecord();
  if (!record) {
    els.compareSummary.innerHTML = "";
    return;
  }

  const compareOptions = state.records.filter((item) => item.id !== record.id && item.type === record.type);
  const compare = compareOptions.find((item) => item.id === state.compareId);
  if (!compareOptions.length) {
    els.compareSummary.innerHTML = `<span class="soft-note">${escapeHtml(record.type)} 분류의 다른 장비가 없습니다.</span>`;
    return;
  }

  if (!compare) {
    els.compareSummary.innerHTML = `<span class="soft-note"> 비교할 장비를 선택하세요.</span>`;
    return;
  }

  const compareStats = state.limitCompare ? LIMIT_COMPARE_STATS : STAT_NAMES;
  const compareKey = state.limitCompare ? "limit" : "max";
  const diffs = compareStats.map((name) => {
    const diff = record.stats[name][compareKey] - compare.stats[name][compareKey];
    const diffClass = diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral";
    const diffText = diff > 0 ? `+${formatNumber(diff)}` : formatNumber(diff);
    return `
      <div class="diff-row">
        <span>${escapeHtml(name)}</span>
        <strong class="${diffClass}">${diffText}</strong>
      </div>
    `;
  }).join("");

  els.compareSummary.innerHTML = `
    <p class="compare-name">${escapeHtml(compare.name)} 대비${state.limitCompare ? " · LIMIT" : ""}</p>
    <div class="diff-grid">${diffs}</div>
  `;
}

function currentRecord() {
  return state.filtered[state.page] || null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function formatStatValue(value) {
  return value > 0 ? formatNumber(value) : "-";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ══════════════════════════════════════════════════════════════
//  대미지 계산기 (DamageCalculatorView 로직 이식)
// ══════════════════════════════════════════════════════════════
// 에타 레벨별 각성 피해 증가 (index = 레벨 0~100)
// ※ 93레벨 2.256은 원본 데이터 그대로 (앞뒤가 2.55/2.56이라 원본 오타로 보임)
const DMG_ETA_AWAKENING = [
  2.0, 2.01, 2.01, 2.02, 2.02, 2.03, 2.03, 2.04, 2.04, 2.05, 2.05,
  2.06, 2.06, 2.07, 2.07, 2.08, 2.08, 2.09, 2.09, 2.1, 2.1,
  2.15, 2.15, 2.16, 2.16, 2.17, 2.17, 2.18, 2.18, 2.19, 2.19,
  2.2, 2.2, 2.21, 2.21, 2.22, 2.22, 2.23, 2.23, 2.24, 2.24,
  2.29, 2.29, 2.3, 2.3, 2.31, 2.31, 2.32, 2.32, 2.33, 2.33,
  2.34, 2.34, 2.35, 2.35, 2.36, 2.36, 2.37, 2.37, 2.38, 2.38,
  2.4, 2.4, 2.41, 2.41, 2.42, 2.42, 2.43, 2.43, 2.44, 2.44,
  2.45, 2.45, 2.46, 2.46, 2.47, 2.47, 2.48, 2.48, 2.49, 2.49,
  2.5, 2.5, 2.51, 2.51, 2.52, 2.52, 2.53, 2.53, 2.54, 2.54,
  2.55, 2.55, 2.256, 2.56, 2.57, 2.57, 2.58, 2.58, 2.59, 2.59,
];

// 몬스터: [이름, 스탯방어, 고정방어, 고정피감, 피감률, 속성값, HP]
const DMG_MONSTERS = [
  ["허수아비", 990, 0, 0, 0.0, 90, 380000000],
  ["지하 요새", 1350, 3000, 0, 82.0, 120, 300000000],
  ["머큐리얼 보스", 1500, 7200, 0, 48.0, 120, 700000000],
  ["어비스 지옥", 1500, 8100, 0, 75.0, 120, 2170000000],
  ["어비스 코어 마스터", 1500, 8700, 0, 75.0, 120, 2300000000],
  ["갈망하는 즐거움", 1500, 15000, 0, 82.0, 125, 1520000000],
  ["형제의 대장간", 1050, 6000, 5850, 59.5, 120, 24500000],
  ["시오칸하임 보스", 1500, 33720, 4550, 51.0, 125, 2000000000],
  ["시오칸하임 오딘", 1500, 51720, 4550, 51.0, 125, 8000000000],
  ["오딘 랭킹전", 1500, 57720, 4550, 51.0, 125, 12000000000],
  ["멜카르트 키메라", 900, 57000, 0, 57.75, 120, 300000000],
  ["상실의 숲", 1350, 36000, 4550, 51.0, 120, 255000000],
  ["이클립스 보스1(로카고스, 에트로스, 체리아)", 1500, 39720, 4550, 51.0, 125, 2550000000],
  ["이클립스 보스2(라이코스, 마티나, 티로로스)", 1500, 41220, 4550, 51.0, 125, 2550000000],
  ["아페티리아(N)", 1500, 41700, 4550, 51.0, 125, 5100000000],
  ["셀리니아코스(H)", 1500, 59700, 4550, 65.0, 125, 15300000000],
  ["고이티아(H)", 1500, 61200, 4550, 68.5, 125, 20400000000],
  ["키시니크(H)", 1500, 64200, 4550, 72.0, 125, 25500000000],
  ["이클립스 토벌전", 1500, 61200, 4550, 68.5, 125, 17850000000],
  ["골고라 협곡 보병", 1500, 72000, 0, 58.0, 125, 300000000],
  ["골고나 협곡 부대장", 1500, 81000, 4550, 68.5, 125, 7200000000],
  ["최후의 결전 1(로카고스, 체리아)", 1500, 81000, 4550, 68.5, 125, 5200000000],
  ["최후의 결전 2(티로로스, 고이티아)", 1500, 81000, 4550, 68.5, 125, 7800000000],
  ["최후의 결전 석상", 1500, 105000, 4550, 68.5, 125, 6000000000],
  ["셀리니아코스(EX)", 1500, 116700, 5850, 65.0, 125, 4080000000],
  ["고이티아(EX)", 1500, 116700, 5850, 68.5, 125, 4080000000],
  ["키시니크(EX)", 1500, 118050, 5850, 72.0, 125, 4080000000],
  ["릴리의 성소10", 1500, 37140, 0, 51.0, 120, 3600000000],
  ["릴리의 성소11", 1500, 58200, 0, 72.0, 125, 10000000000],
  ["릴리의 성소12", 1500, 60780, 0, 72.0, 125, 11000000000],
  ["릴리의 성소13", 1500, 62610, 0, 72.0, 125, 13310000000],
  ["릴리의 성소14", 1500, 76290, 0, 72.0, 125, 13310000000],
  ["릴리의 성소15", 1500, 76950, 0, 72.0, 125, 14641000000],
  ["릴리의 성소16", 1500, 77610, 0, 72.0, 125, 16105100000],
  ["릴리의 성소17", 1500, 100200, 0, 72.0, 125, 11273570000],
  ["릴리의 성소18", 1500, 102120, 0, 72.0, 125, 10146213000],
  ["릴리의 성소19", 1500, 104040, 0, 72.0, 125, 9131591700],
  ["릴리의 성소20", 1500, 106860, 0, 72.0, 125, 8218432520],
  ["레이티아 N", 1950, 105000, 3250, 67.5, 125, 15000000000],
  ["설계자 N", 1950, 105000, 3250, 67.5, 125, 15000000000],
  ["레이티아 H", 1950, 130200, 2925, 70.75, 125, 15000000000],
  ["설계사 H", 1950, 130800, 2925, 70.75, 125, 15000000000],
].map((x) => ({ name: x[0], statDef: x[1], fixedDef: x[2], fixedReduction: x[3], reductionRate: x[4], attribute: x[5], hp: x[6] }));

// 캐릭터 특성: [이름, 적받피증가, 공격피해량, 추가피해량, 능력치감소, 딜레이감소]
const DMG_MODIFIERS = [
  ["아나이스 마법", 0, 3, 0, 0, 0],
  ["아나이스 비호", 20, 23, 0, 0, 5],
  ["아나이스 파괴", 10, 3, 0, 0, 0],
  ["예프넨", 10, 0, 0, 0, 0],
  ["이자크", 5, 5, 0, 0, 0],
  ["이스핀", 15, 8, 0, 10, 0],
  ["이솔렛", 0, 20, 0, 20, 5],
  ["클로에", 10, 7, 30, 10, 0],
  ["시벨린", 10, 15, 0, 10, 0],
  ["조슈아", 10, 3, 20, 20, 0],
  ["티치엘", 0, 20, 0, 0, 0],
  ["티치엘 타격", 0, 20, 0, 20, 0],
  ["나야트레이", 5, 0, 0, 10, 0],
  ["녹턴", 5, 5, 10, 0, 0],
  ["벤야", 10, 10, 0, 10, 0],
  ["보리스", 0, 3, 10, 0, 10],
  ["막시민", 10, 5, 0, 10, 0],
  ["밀라", 10, 2, 0, 20, 5],
  ["란지에", 20, 13, 0, 0, 0],
  ["리체", 15, 0, 0, 0, 0],
  ["루시안", 5, 5, 0, 0, 0],
  ["로아미니", 20, 23, 0, 25, 0],
].map((x) => ({ name: x[0], dmgAmp: x[1], atkPower: x[2], addDmg: x[3], statReduction: x[4], skillDelay: x[5] }));

const DMG_SNIPER = [0, 5, 10, 15, 20, 25, 28, 31, 34, 37, 40];
const DMG_GEM = [0, 45, 46, 47, 48]; // 무기 장비 강화석 부가옵션
const DMG_DEEP_RUNE = [0, 3, 6, 9]; // 심화 룬 LV0~LV3
// 무기/손목 어빌: 야성 11 / 상실 10 / 심연 9 / 없음 0
const DMG_ABIL_WEAPON_VALS = [11, 10, 9, 0];
const DMG_ABIL_WEAPON_LABELS = ["야성 (11%)", "상실 (10%)", "심연 (9%)", "없음 (0%)"];
// 손 어빌: 야성 9 / 상실 8 / 심연 7 / 없음 0
const DMG_ABIL_HAND_VALS = [9, 8, 7, 0];
const DMG_ABIL_HAND_LABELS = ["야성 (9%)", "상실 (8%)", "심연 (7%)", "없음 (0%)"];
const DMG_SERIES_ARTIFACT = [15, 20, 30, 35];
const DMG_SERIES_ART_LABELS = ["프시키 (15%)", "아크론 (20%)", "이클립스 (30%)", "에테르 (35%)"];
const DMG_SERIES_WRIST = [25, 26, 27, 28];

// 계산 타입(계열)별 이클립스 아티팩트 아이콘 (equipment-images 폴더)
const DMG_ECLIPSE_ARTIFACT = {
  [CALC.STAB]: "이클립스의_자력.png",
  [CALC.HACK]: "이클립스의_참력.png",
  [CALC.MAGIC_ATTACK]: "이클립스의_마력.png",
  [CALC.MAGIC_DEFENSE]: "이클립스의_신성.png",
  [CALC.PHYSICAL_HYBRID]: "이클립스의_물리력.png",
  [CALC.MAGIC_HACK]: "이클립스의_마참력.png",
};

// 캐릭터·타입별 스킬 프리셋 (assets/skills.json에서 로드)
// 키: "캐릭터명::CALC타입" → [ [스킬명, 스킬배율%, 크리배율%, 타수], ... ]
let DMG_SKILLS = {};
const DMG_SKILL_FALLBACK = [["기본 (임시 · 배율 1000 / 크리 200 / 1타)", 1000, 200, 1]];

// skills.json의 한글 타입명 → CALC 키 (공백 제거 후 비교: "물리 복합"/"물리복합" 모두 허용)
const DMG_TYPE_FROM_KO = {
  찌르기: CALC.STAB,
  베기: CALC.HACK,
  마법공격: CALC.MAGIC_ATTACK,
  마법방어: CALC.MAGIC_DEFENSE,
  물리복합: CALC.PHYSICAL_HYBRID,
  마법베기: CALC.MAGIC_HACK,
};

function dmgSkillsFor(char, type) {
  const list = DMG_SKILLS[`${char}::${type}`];
  return list && list.length ? list : DMG_SKILL_FALLBACK;
}

// 캐릭터·타입별 버프 목록 (assets/buffs.json에서 로드)
// JSON 구조: {캐릭터: {버프: {버프명: {아이콘, 효과{공격피해량,적받는피해증가,적능력치감소,추가피해량,중딜레이감소}}}, 타입: {한글타입명: [버프명,...]}}}
// 버프 정의는 캐릭터당 1곳(버프)에서만 관리하고, 타입별 목록은 이름으로 참조
// 키: "캐릭터명::CALC타입" → [ {name, icon(파일명|null), effects{...}}, ... ]
let DMG_BUFFS = {};

async function loadDmgBuffs() {
  try {
    const res = await fetch("./assets/buffs.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const map = {};
    for (const [charName, entry] of Object.entries(data)) {
      if (!entry || typeof entry !== "object") continue;
      const defs = entry["버프"] || {};
      const types = entry["타입"] || {};
      for (const [koType, list] of Object.entries(types)) {
        const type = DMG_TYPE_FROM_KO[String(koType).replace(/\s+/g, "")];
        if (!type || !Array.isArray(list)) continue;
        map[`${charName}::${type}`] = list
          .map((name) => {
            const d = defs[name] || {};
            const eff = d["효과"] || {};
            return {
              name: String(name).trim(),
              icon: d["아이콘"] || null,
              effects: {
                attackDamage: Number(eff["공격피해량"]) || 0,
                enemyTaken: Number(eff["적받는피해증가"]) || 0,
                statReduction: Number(eff["적능력치감소"]) || 0,
                additional: Number(eff["추가피해량"]) || 0,
                skillDelay: Number(eff["중딜레이감소"]) || 0,
              },
            };
          })
          .filter((b) => b.name);
      }
    }
    DMG_BUFFS = map;
    // 이미 열려 있으면 버프 영역을 다시 그리도록 캐시 무효화 후 갱신
    dmg.skillKey = null;
    if (dmgInited) dmgRefresh();
  } catch (error) {
    console.info("버프 목록(buffs.json)을 불러오지 못했습니다.", error);
  }
}

async function loadDmgSkills() {
  try {
    const res = await fetch("./assets/skills.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const map = {};
    for (const [charName, types] of Object.entries(data)) {
      if (!types || typeof types !== "object") continue;
      for (const [koType, list] of Object.entries(types)) {
        const type = DMG_TYPE_FROM_KO[String(koType).replace(/\s+/g, "")];
        if (!type || !Array.isArray(list)) continue;
        map[`${charName}::${type}`] = list
          .map((sk) => [
            String(sk["스킬명"] ?? "").trim(),
            Number(sk["스킬배율"]) || 0,
            Number(sk["크리배율"]) || 0,
            Number(sk["타수"]) || 1,
          ])
          .filter((sk) => sk[0]);
      }
    }
    DMG_SKILLS = map;
    // 이미 열려 있으면 콤보를 다시 채우도록 캐시 무효화 후 갱신
    dmg.skillKey = null;
    if (dmgInited) dmgRefresh();
  } catch (error) {
    console.info("스킬 프리셋(skills.json)을 불러오지 못했습니다.", error);
  }
}

const dmgEls = {};
let dmgInited = false;
const dmg = {
  statCoefficient: 0,
  equipmentCoefficient: 0,
  dexCorrection: 0,
  finalCoefficient: 0,
  etaAwakening: 0,
  traitAttackDamage: 0,
  traitEnemyTaken: 0,
  traitAdditional: 0,
  traitStatReduction: 0,
  traitSkillDelay: 0,
  modifierName: "-",
  skillKey: "", // "캐릭터::타입" — 스킬 프리셋 콤보 캐시 키
  skillList: DMG_SKILL_FALLBACK,
  skillMul: 0,
  critMul: 0,
  hitCount: 1,
};

function dmgV(id) {
  const el = dmgEls[id];
  const n = Number(String(el?.value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}
function dmgChecked(id) {
  return !!dmgEls[id]?.checked;
}
function dmgSel(id) {
  return dmgEls[id] ? Math.max(0, dmgEls[id].selectedIndex) : 0;
}

// 계수 계산기 → 대미지 계산기 스냅샷
function dmgSnapshot() {
  if (!calc.active || !calc.characterName || !calc.type) return null;
  const totals = calcTotalMetrics();
  const statRow = accRow("스탯");
  return {
    characterName: calc.characterName,
    calcType: calc.type,
    calcTypeName: CALC_TYPE_DISPLAY[calc.type] || "",
    statCoefficient: statRow ? statRow.coefficient : 0,
    totalCoefficient: totals.totalCoefficient,
    dexValue: calc.dex,
    totalPrimarySum: totals.totalPrimarySum,
    primaryEnchantSum: totals.primaryEnchantSum,
    secondarySum: totals.secondarySum,
    secondaryEnchantSum: totals.secondaryEnchantSum,
  };
}

// 계수 가공 (UpdateCoefficientBreakdown)
function dmgApplySnapshot(s) {
  const statCoefficient = s.statCoefficient;
  const equipmentCoefficient = Math.max(0, s.totalCoefficient - statCoefficient);
  const correction = Math.floor(statCoefficient + s.dexValue * 3.0) / 18.0;
  const bonus = Math.floor((equipmentCoefficient / 25.0) * (0.05 + 0.03 * 5)) * 25.0;
  const finalCoefficient = Math.floor(statCoefficient + equipmentCoefficient) + bonus;
  dmg.statCoefficient = statCoefficient;
  dmg.equipmentCoefficient = equipmentCoefficient;
  dmg.dexCorrection = correction;
  dmg.finalCoefficient = finalCoefficient;
}

// 캐릭터 특성 (ApplyCharacterModifier)
function dmgApplyModifier(characterName, calcTypeName) {
  const isAnais = characterName === "아나이스";
  const isMagicDefense = calcTypeName.includes("마법방어") || calcTypeName.includes("신성");

  let resolved = characterName;
  if (isAnais) {
    resolved = isMagicDefense ? "아나이스 비호" : "아나이스 마법";
  }

  const m = DMG_MODIFIERS.find((x) => x.name === resolved) || null;
  if (!m) {
    dmg.modifierName = "특성 값 없음";
    dmg.traitAttackDamage = 0;
    dmg.traitEnemyTaken = 0;
    dmg.traitAdditional = 0;
    dmg.traitStatReduction = 0;
    dmg.traitSkillDelay = 0;
    return;
  }
  dmg.modifierName = m.name;
  dmg.traitEnemyTaken = m.dmgAmp;
  dmg.traitAttackDamage = m.atkPower;
  dmg.traitAdditional = m.addDmg;
  dmg.traitStatReduction = m.statReduction;
  dmg.traitSkillDelay = m.skillDelay;
}

function dmgApplyEta() {
  let lv = Math.round(dmgV("dmgEtaLevel"));
  lv = Math.min(100, Math.max(1, lv));
  dmg.etaAwakening = DMG_ETA_AWAKENING[lv] ?? 0;
}

// ── 배율 ──
function dmgCritFactorPercent() {
  const weak = dmgChecked("dmgWeakPoint") ? 40 : 0;
  const judge = Math.min(40, dmgSel("dmgJudgement")) * 0.75;
  const etaCrit = Math.min(20, dmgSel("dmgEtaCrit")) * 1.5;
  return weak + judge + etaCrit;
}
function dmgFinalPercent() {
  const club = dmgChecked("dmgClubFinal") ? 5 : 0;
  const core = dmgV("dmgCoreSet");
  const etaFinal = Math.min(5, dmgSel("dmgEtaFinal")) * 4;
  return club + core + etaFinal;
}
function dmgSpecialFactor() {
  const r = Math.min(50, Math.max(0, dmgV("dmgSpecialReduction")));
  return 1 - r / 100;
}
function dmgSeriesPercent() {
  const art = DMG_SERIES_ARTIFACT[dmgSel("dmgSeriesArtifact")] ?? 15;
  const wrist = DMG_SERIES_WRIST[dmgSel("dmgSeriesWrist")] ?? 25;
  const lunaria = dmgSel("dmgSeriesLunaria"); // 0~10 콤보 (index=값)
  return art + wrist + lunaria;
}
function dmgAtk1Percent() {
  let v = 0;
  if (dmgChecked("dmgA1Snowman")) v += 20;
  if (dmgChecked("dmgA1Illumi")) v += 10;
  if (dmgChecked("dmgA1IsabelDmg")) v += 10;
  if (dmgChecked("dmgA1IsabelSpecial")) v += 10;
  if (dmgChecked("dmgA1IsabelBattle")) v += 10;
  return Math.min(v + dmgV("dmgA1Etc"), 50);
}
function dmgAtk2Percent() {
  let v = 0;
  if (dmgChecked("dmgA2Awakening")) v += 5;
  if (dmgChecked("dmgA2ClubP")) v += 5;
  if (dmgChecked("dmgA2Explore")) v += 5;
  if (dmgChecked("dmgA2TwPower")) v += 5;
  if (dmgChecked("dmgA2Ham")) v += 10;
  if (dmgChecked("dmgA2Event")) v += 10;
  return Math.min(v + dmgV("dmgA2Etc"), 30);
}
function dmgAtk3Percent() {
  return Math.min(dmg.traitAttackDamage, 65);
}
function dmgAtk4Percent() {
  let v = 0;
  if (dmgChecked("dmgAfTitle")) v += 20;
  v += DMG_ABIL_WEAPON_VALS[dmgSel("dmgAfWeapon")] ?? 0;
  if (dmgChecked("dmgAfFever")) v += 10;
  v += DMG_ABIL_WEAPON_VALS[dmgSel("dmgAfWrist")] ?? 0;
  v += DMG_ABIL_HAND_VALS[dmgSel("dmgAfHand")] ?? 0;
  v += dmgSel("dmgAfLunaria");
  v += DMG_DEEP_RUNE[dmgSel("dmgAfDeepRune")] ?? 0;
  return Math.min(v + dmgV("dmgAfEtc"), 80);
}
function dmgAttackDamagePercent() {
  return dmgAtk1Percent() + dmgAtk2Percent() + dmgAtk3Percent() + dmgAtk4Percent();
}
function dmgAdditionalDamagePercent() {
  const sniper = DMG_SNIPER[dmgSel("dmgAddSniper")] ?? 0;
  const gem = DMG_GEM[dmgSel("dmgAddGem")] ?? 0;
  const weapon = Math.min(100, Math.max(0, dmgV("dmgAddWeapon")));
  return sniper + gem + weapon + dmg.traitAdditional;
}
function dmgMonsterAttrFactor(cur, mon) {
  return Math.min(1.5, Math.max(1.0, 1.0 + (cur - mon) * 0.00625));
}
function dmgMonsterReductionFactor(rate) {
  return Math.min(1, Math.max(0, 1.0 - rate / 100.0));
}

// ── 핵심 대미지 (CalculateDamageRange) ──
function dmgCalcRange(entry, defenseMultiplier) {
  const monsterDefense = (entry.statDef + entry.fixedDef) * defenseMultiplier;
  const attrFactor = dmgMonsterAttrFactor(dmgV("dmgElement"), entry.attribute);
  const redFactor = dmgMonsterReductionFactor(entry.reductionRate);

  const baseMin = dmg.finalCoefficient + 1 - monsterDefense;
  const baseMax = dmg.finalCoefficient + 1 + Math.floor(dmg.dexCorrection) - monsterDefense;

  const skillFactor = dmgV("dmgSkill") / 100.0;
  const helmetFactor = dmgChecked("dmgHelmet") ? 0.1 : 0.0;
  const critMultiplier = dmgV("dmgCrit") / 100.0;
  const critFactor = 1 + dmgCritFactorPercent() / 100.0;
  const comboFactor = dmgChecked("dmgCombo") ? 1.15 : 1.0;
  const finalFactor = 1 + dmgFinalPercent() / 100.0;
  const specialFactor = dmgSpecialFactor();
  const sienaFactor = 1 + dmgV("dmgSiena") / 100.0;
  const etaFactor = Math.max(0, dmg.etaAwakening);
  const seriesFactor = 1 + dmgSeriesPercent() / 100.0;
  const ampFactor = 1 + dmg.traitEnemyTaken / 100.0;
  const weaponAmpFactor = dmgChecked("dmgWeaponAmp") ? 1.1 : 1.0;
  const attackDamageFactor = 1 + dmgAttackDamagePercent() / 100.0;

  const innerMin = Math.floor(baseMin * (skillFactor + helmetFactor) * critMultiplier * critFactor * comboFactor * attrFactor);
  const innerMax = Math.floor(baseMax * (skillFactor + helmetFactor) * critMultiplier * critFactor * comboFactor * attrFactor);

  const midMin = Math.floor((innerMin * finalFactor * redFactor - entry.fixedReduction) * specialFactor * sienaFactor * etaFactor * seriesFactor * ampFactor * weaponAmpFactor);
  const midMax = Math.floor((innerMax * finalFactor * redFactor - entry.fixedReduction) * specialFactor * sienaFactor * etaFactor * seriesFactor * ampFactor * weaponAmpFactor);

  return {
    min: Math.max(1, Math.floor(midMin * attackDamageFactor)),
    max: Math.max(1, Math.floor(midMax * attackDamageFactor)),
  };
}
function dmgAvg(range) {
  return Math.floor((range.min + range.max) / 2.0);
}
function dmgCalcDps(range, entry) {
  const avg = (range.min + range.max) / 2.0;
  const hitDamage = Math.floor(avg * Math.max(1, dmgV("dmgHitCount")));
  const addFactor = 1 + dmgAdditionalDamagePercent() / 100.0;
  let total = hitDamage * addFactor;
  if (!entry.name.includes("키메라")) {
    total += Math.max(0, dmgV("dmgWeaponAdd")) * addFactor;
  }
  return Math.floor(total);
}

// ── 렌더링 ──
function dmgFillSelect(id, labels, defaultIndex = 0) {
  const el = dmgEls[id];
  if (!el) return;
  el.innerHTML = labels.map((label, i) => optionHtml(String(i), label)).join("");
  el.selectedIndex = Math.min(Math.max(0, defaultIndex), labels.length - 1);
}
function dmgPopulateSelects() {
  dmgFillSelect("dmgMonster", DMG_MONSTERS.map((m) => m.name));
  // 어빌: 기본값은 "없음"(마지막 항목 0%)
  dmgFillSelect("dmgAfWeapon", DMG_ABIL_WEAPON_LABELS, DMG_ABIL_WEAPON_LABELS.length - 1);
  dmgFillSelect("dmgAfWrist", DMG_ABIL_WEAPON_LABELS, DMG_ABIL_WEAPON_LABELS.length - 1);
  dmgFillSelect("dmgAfHand", DMG_ABIL_HAND_LABELS, DMG_ABIL_HAND_LABELS.length - 1);
  dmgFillSelect("dmgAfLunaria", Array.from({ length: 11 }, (_, i) => `${i}%`));
  dmgFillSelect("dmgAfDeepRune", DMG_DEEP_RUNE.map((v, i) => `LV${i} - ${v}%`));
  dmgFillSelect("dmgSeriesArtifact", DMG_SERIES_ART_LABELS);
  dmgFillSelect("dmgSeriesWrist", DMG_SERIES_WRIST.map((v) => `${v}%`));
  dmgFillSelect("dmgSeriesLunaria", Array.from({ length: 11 }, (_, i) => `${i}%`));
  dmgFillSelect("dmgAddSniper", DMG_SNIPER.map((v, i) => `LV${i} - ${v}%`));
  dmgFillSelect("dmgAddGem", DMG_GEM.map((v) => `${v}%`));
  dmgFillSelect("dmgEtaFinal", Array.from({ length: 6 }, (_, i) => `LV${i} - ${i * 4}%`));
  dmgFillSelect("dmgJudgement", Array.from({ length: 41 }, (_, i) => `LV${i} - ${(i * 0.75).toFixed(2)}%`));
  dmgFillSelect("dmgEtaCrit", Array.from({ length: 21 }, (_, i) => `LV${i} - ${(i * 1.5).toFixed(1)}%`));

}

// 캐릭터·타입별 버프 토글 렌더 (buffs.json 기반, 효과 수치는 추후 연동)
function dmgRenderBuffs(skillKey) {
  if (!dmgEls.dmgTraitChecks) return;
  const buffs = DMG_BUFFS[skillKey] || [];
  dmgEls.dmgTraitChecks.innerHTML = buffs.length
    ? buffs
        .map((b) => {
          const icon = b.icon
            ? `<img class="dmg-chk-icon" src="./images/buff/${encodeURIComponent(b.icon)}" alt="" />`
            : '<span class="dmg-chk-icon"></span>';
          return `<label class="dmg-row"><span class="dmg-row-label">${icon}${escapeHtml(b.name)}</span><input type="checkbox" class="dmg-switch" disabled /></label>`;
        })
        .join("")
    : '<p class="dmg-note">등록된 버프가 없습니다.</p>';
}
// 스킬 프리셋 선택값을 스킬 배율/크리 배율/타수 텍스트박스에 채움
function dmgApplySkillPreset() {
  const skill = dmg.skillList[dmgSel("dmgSkillSelect")];
  if (!skill) return;
  if (dmgEls.dmgSkill) dmgEls.dmgSkill.value = String(skill[1]);
  if (dmgEls.dmgCrit) dmgEls.dmgCrit.value = String(skill[2]);
  if (dmgEls.dmgHitCount) dmgEls.dmgHitCount.value = String(skill[3]);
}
function dmgNum(v) {
  return Math.round(v).toLocaleString("ko-KR");
}
function dmgRefresh() {
  if (!dmgInited) return;
  const s = dmgSnapshot();
  const hasData = !!s;
  if (dmgEls.dmgNoData) dmgEls.dmgNoData.hidden = hasData;
  if (dmgEls.dmgBody) dmgEls.dmgBody.hidden = !hasData;
  if (!hasData) return;

  dmgApplySnapshot(s);
  dmgApplyModifier(s.characterName, s.calcTypeName);
  dmgApplyEta();

  // 캐릭터·타입별 스킬 프리셋 콤보 (캐릭터나 타입이 바뀔 때만 다시 채우고 텍스트박스에 반영)
  const skillKey = `${s.characterName}::${s.calcType}`;
  if (dmg.skillKey !== skillKey) {
    dmg.skillKey = skillKey;
    dmgRenderBuffs(skillKey);
    const skills = dmgSkillsFor(s.characterName, s.calcType);
    dmg.skillList = skills;
    if (dmgEls.dmgSkillSelect) {
      dmgEls.dmgSkillSelect.innerHTML = skills.map((sk, i) => optionHtml(String(i), sk[0])).join("");
      dmgEls.dmgSkillSelect.selectedIndex = 0;
    }
    dmgApplySkillPreset();
  }

  dmgEls.dmgCharName.textContent = s.characterName;
  dmgEls.dmgCalcType.textContent = s.calcTypeName;

  // 아티팩트 아이콘: 계열에 맞는 이클립스 아티팩트로 교체
  const artFile = DMG_ECLIPSE_ARTIFACT[s.calcType];
  if (artFile && dmgEls.dmgArtifactIcon) {
    const artSrc = `${IMAGE_BASE}${encodeURIComponent(artFile)}`;
    if (dmgEls.dmgArtifactIcon.getAttribute("src") !== artSrc) dmgEls.dmgArtifactIcon.src = artSrc;
  }
  dmgEls.dmgFinalCoeff.textContent = dmgNum(dmg.finalCoefficient);

  dmgEls.dmgAtk1Sum.textContent = `${dmgAtk1Percent()}% / 50%`;
  dmgEls.dmgAtk2Sum.textContent = `${dmgAtk2Percent()}% / 30%`;
  dmgEls.dmgAtk4Sum.textContent = `${dmgAtk4Percent()}% / 80%`;
  dmgEls.dmgSeriesSum.textContent = `${dmgSeriesPercent()}%`;
  dmgEls.dmgAddDmgSum.textContent = `${dmgAdditionalDamagePercent()}%`;
  dmgEls.dmgFinalSum.textContent = `${dmgFinalPercent()}%`;
  dmgEls.dmgCritSum.textContent = `${dmgCritFactorPercent()}%`;
  if (dmgEls.dmgSienaSum) dmgEls.dmgSienaSum.textContent = `${dmgV("dmgSiena")}%`;

  dmgEls.dmgTraitName.textContent = dmg.modifierName;
  dmgEls.dmgTraitList.innerHTML = [
    ["공격 피해량(스킬)", `${dmg.traitAttackDamage}%`],
    ["적이 받는 피해 증가", `${dmg.traitEnemyTaken}%`],
    ["적 능력치 감소", `${dmg.traitStatReduction}%`],
    ["추가 피해량", `${dmg.traitAdditional}%`],
    ["중 딜레이 감소", `${dmg.traitSkillDelay}%`],
  ].map(([k, v]) => `<div>${escapeHtml(k)} <strong>${escapeHtml(v)}</strong></div>`).join("");

  const entry = DMG_MONSTERS[dmgSel("dmgMonster")];
  if (!entry) return;
  const normal = dmgCalcRange(entry, 1.0);
  const strong = dmgCalcRange(entry, 0.5);
  const passive = dmgCalcRange(entry, 0.85);

  dmgEls.dmgResult.innerHTML =
    `<div><span>일반 대미지</span><strong>${dmgNum(dmgAvg(normal))}</strong></div>` +
    `<div><span>강타 대미지</span><strong>${dmgNum(dmgAvg(strong))}</strong></div>` +
    `<div><span>방무 대미지</span><strong>${dmgNum(dmgAvg(passive))}</strong></div>`;
}

function initDamageCalculator() {
  if (dmgInited) return;
  const panel = document.querySelector('[data-calculator-panel="damage"]');
  if (!panel) return;
  panel.querySelectorAll("[id]").forEach((el) => (dmgEls[el.id] = el));
  dmgEls.dmgNoData = document.getElementById("dmgNoData");
  dmgEls.dmgBody = document.getElementById("dmgBody");
  dmgInited = true;

  // 체크박스 아이콘 이미지가 없으면 자리표시 박스로 대체 (동적 아이콘 제외)
  panel.querySelectorAll("img.dmg-chk-icon:not([data-dynamic])").forEach((img) => {
    img.addEventListener("error", () => {
      const box = document.createElement("span");
      box.className = "dmg-chk-icon";
      img.replaceWith(box);
    });
  });

  dmgPopulateSelects();

  // 스킬 프리셋 선택 시 스킬 배율/크리/타수 자동 입력 (패널 change보다 먼저 실행되어 값이 반영됨)
  dmgEls.dmgSkillSelect?.addEventListener("change", dmgApplySkillPreset);

  panel.addEventListener("input", dmgRefresh);
  panel.addEventListener("change", dmgRefresh);

  dmgRefresh();
}

// ══════════════════════════════════════════════════════════════
//  시뮬레이터 3종 (TWChatOverlay 로직 이식)
// ══════════════════════════════════════════════════════════════
const simEls = {};
let simInited = false;

// 시뮬레이터 재료 아이콘 (images 폴더)
const SIM_IMG_BASE = "./images/";
function simIcon(file, size = 18) {
  return `<img class="sim-icon" src="${SIM_IMG_BASE}${encodeURIComponent(file)}" alt="" width="${size}" height="${size}" loading="lazy" />`;
}

function initSimulators() {
  if (simInited) return;
  simInited = true;
  const q = (id) => document.getElementById(id);
  [
    "encElso", "encDiscount", "encBaseCost", "encCostLabel", "encStartInk", "encTargetInk",
    "encManualCount", "encPresets", "encRunBatch", "encRunTarget", "encReset", "encStatus", "encLog",
    "coreMainStat", "coreHasDust", "coreStartStage", "coreTargetStage",
    "coreBoxPrice", "coreBoxPriceField", "coreCalc", "coreSummary", "coreTable",
    "relicCurrent", "relicTarget", "relicDifficulty", "relicCalc", "relicSummary", "relicTable",
  ].forEach((id) => (simEls[id] = q(id)));

  wireEncryptSim();
  wireCoreSim();
  wireRelicSim();
}

// ── 인크립트 시뮬 (EncryptSimulatorView) ──────────────────────
const ENC_PRESETS = {
  vianu: {
    man: [["효과", "666"], ["이클립스", "2046"], ["세크리드", "2946"]],
    elso: [["효과", "999"], ["이클립스", "3096"], ["세크리드", "4419"]],
  },
  eta: {
    man: [["세크리드", "29668"]],
    elso: [["세크리드", "44502"]],
  },
};

const encSim = {
  currentInk: 0,
  totalAttempts: 0,
  successCount: 0,
  totalCost: 0,
  attemptsSinceLastSuccess: 0,
  totalExpectedCost: 0,
  totalExpectedSuccesses: 0,
  totalSuccessVariance: 0,
};

function encIsEta() {
  return document.querySelector('input[name="encInkType"]:checked')?.value === "eta";
}
function encIsElso() {
  return simEls.encElso.checked;
}
function encGetChance(ink, isEta) {
  if (isEta) return 0.01;
  return Math.max(0.0001, 0.0007 - ink * 0.00005);
}
function encUnitCost() {
  const raw = String(simEls.encBaseCost.value || "").replace(/만원|만|엘소/g, "").replace(/,/g, "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  let cost = encIsElso() ? n : n * 10000;
  if (simEls.encDiscount.checked) cost = Math.round(cost * 0.8);
  return cost;
}
function encFmtCost(v) {
  const amount = Math.floor(Math.abs(v));
  const eok = Math.floor(amount / 1e8);
  const man = Math.floor((amount % 1e8) / 1e4);
  return `${eok.toLocaleString("ko-KR")}억 ${man.toLocaleString("ko-KR")}만`;
}
function encFmtSigned(v) {
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}${encFmtCost(v)}`;
}
function encStdNormCdf(z) {
  const absZ = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * absZ);
  const d = 0.3989422804014327 * Math.exp(-0.5 * absZ * absZ);
  const poly = ((((1.330274429 * t - 1.821255978) * t + 1.781477937) * t - 0.356563782) * t + 0.31938153) * t;
  const cdf = 1 - d * poly;
  return z >= 0 ? cdf : 1 - cdf;
}
function encAccumulate(chance) {
  if (chance <= 0 || !Number.isFinite(chance)) return;
  encSim.totalExpectedSuccesses += chance;
  encSim.totalSuccessVariance += chance * (1 - chance);
}
function encLuckStats() {
  if (encSim.totalAttempts <= 0 || encSim.totalSuccessVariance <= 0) return null;
  const z = (encSim.successCount - encSim.totalExpectedSuccesses) / Math.sqrt(encSim.totalSuccessVariance);
  const percentile = Math.min(100, Math.max(0, encStdNormCdf(z) * 100));
  const rank = Math.min(10000, Math.max(1, Math.round((percentile / 100) * 10000)));
  return { z, percentile, rank };
}
function encLuckGraph(z) {
  const levels = "▁▂▃▄▅▆▇█";
  const n = 33;
  const chars = [];
  for (let i = 0; i < n; i++) {
    const x = -3 + (6 * i) / (n - 1);
    const y = Math.exp(-0.5 * x * x);
    let lv = Math.round((levels.length - 1) * y);
    lv = Math.max(0, Math.min(levels.length - 1, lv));
    chars.push(levels[lv]);
  }
  const cz = Math.max(-3, Math.min(3, z));
  // 운이 좋을수록(z 큼) 왼쪽에 표시 → "상위 %" 텍스트 방향과 일치 (왼쪽=운 좋음)
  let mark = Math.round(((-cz + 3) / 6) * (n - 1));
  mark = Math.max(0, Math.min(n - 1, mark));
  chars[mark] = "◆";
  return chars.join("");
}
function encRefreshStatus() {
  const isEta = encIsEta();
  const chance = encGetChance(encSim.currentInk, isEta);
  const unit = encUnitCost();
  // "현재 인크립트" 입력창을 실제 현재 인크립트로 동기화 (입력 중이 아닐 때)
  if (simEls.encStartInk && document.activeElement !== simEls.encStartInk) {
    simEls.encStartInk.value = String(encSim.currentInk);
  }
  const rows = [];
  rows.push(`<div>현재 인크: <span class="sim-status-strong">+${encSim.currentInk}</span> (${(chance * 100).toFixed(3)}%) · ${encSim.currentInk}→${encSim.currentInk + 1}</div>`);
  rows.push(`<div>적용 비용: ${unit == null ? "입력 필요" : encIsElso() ? `${Math.round(unit).toLocaleString("ko-KR")} 엘소` : `${Math.round(unit / 10000).toLocaleString("ko-KR")}만원`}</div>`);
  rows.push(`<div>성공 / 시도: <span class="sim-status-strong">${encSim.successCount.toLocaleString("ko-KR")}</span> / ${encSim.totalAttempts.toLocaleString("ko-KR")}</div>`);
  rows.push(`<div>누적 비용: ${encFmtCost(encSim.totalCost)}</div>`);
  const luck = encLuckStats();
  if (luck) {
    // 표시용: 상위 % = 100 - percentile(나보다 운 나쁜 사람 비율), 100명 중 나보다 운 좋은 사람 수
    const topPercent = Math.max(0, Math.min(100, 100 - luck.percentile));
    const luckier = Math.round(topPercent);
    const luckText =
      luckier <= 0
        ? `같은 횟수를 돌린 100명 중 나보다 운 좋은 사람이 거의 없어요 (상위 ${topPercent.toFixed(1)}%)`
        : `같은 횟수를 돌린 100명 중 약 ${luckier}명만 나보다 운이 좋았어요 (상위 ${topPercent.toFixed(1)}%)`;
    rows.push(`<div>${luckText}</div>`);
    rows.push(`<div class="sim-graph-legend"><span>운 좋음</span><span>평균</span><span>운 나쁨</span></div>`);
    rows.push(`<div class="sim-graph">${encLuckGraph(luck.z)}</div>`);
  }
  simEls.encStatus.innerHTML = rows.join("");
}
function encRemoveCumulative() {
  const el = document.getElementById("encCumulative");
  if (el) el.remove();
}
function encAppendLog(e) {
  const expectedCost = e.rate > 0 ? e.unit * (100 / e.rate) : null;
  let html = `• [ ${e.attempts.toLocaleString("ko-KR")}번째 | ${e.inkBefore}→${e.inkAfter} 인크 | 비용 ${encFmtCost(e.cost)}`;
  if (expectedCost != null) {
    const diff = expectedCost - e.cost;
    encSim.totalExpectedCost += expectedCost;
    html += ` | 기대값 <span class="${diff >= 0 ? "sim-pos" : "sim-neg"}">${encFmtSigned(diff)}</span>`;
  } else {
    html += " | 기대값 N/A";
  }
  html += " ]";
  const div = document.createElement("div");
  div.className = "log-entry";
  div.innerHTML = html;
  simEls.encLog.appendChild(div);
  simEls.encLog.scrollTop = simEls.encLog.scrollHeight;
}
function encUpdateCumulative() {
  encRemoveCumulative();
  let displayExpected = encSim.totalExpectedCost;
  const unit = encUnitCost();
  if (encSim.attemptsSinceLastSuccess > 0 && unit != null) {
    const chance = encGetChance(encSim.currentInk, encIsEta());
    if (chance > 0) displayExpected += unit / chance;
  }
  const diff = displayExpected - encSim.totalCost;
  const div = document.createElement("div");
  div.className = "log-cumulative";
  div.id = "encCumulative";
  div.innerHTML =
    `▼ 누적 합산 (${encSim.totalAttempts.toLocaleString("ko-KR")}회 시도)\n` +
    `누적 비용: ${encFmtCost(encSim.totalCost)}  |  누적 기대 비용: ${encFmtCost(displayExpected)}\n` +
    `기대값 차이: <span class="${diff >= 0 ? "sim-pos" : "sim-neg"}">${encFmtSigned(diff)}</span>`;
  simEls.encLog.appendChild(div);
  simEls.encLog.scrollTop = simEls.encLog.scrollHeight;
}
function encRunLoop(mode) {
  const unit = encUnitCost();
  if (unit == null) {
    alert("비용을 올바르게 입력해주세요.");
    return;
  }

  const isEta = encIsEta();
  let remaining = 0;
  let target = 0;
  if (mode === "batch") {
    // 수동 인크립트: 현재 인크립트를 초기화하지 않고 이어서 진행 (리셋 전까지 유지)
    remaining = parseInt(simEls.encManualCount.value, 10);
    if (!Number.isInteger(remaining) || remaining <= 0) {
      alert("수동 횟수를 1 이상의 숫자로 입력해주세요.");
      return;
    }
  } else {
    // 자동 인크립트: 현재 인크립트 값을 시작점으로 설정
    const start = parseInt(simEls.encStartInk.value, 10);
    if (Number.isInteger(start) && start >= 0) encSim.currentInk = start;
    target = parseInt(simEls.encTargetInk.value, 10);
    if (!Number.isInteger(target) || target < 1) {
      alert("목표 인크립트를 1 이상의 숫자로 입력해주세요.");
      return;
    }
    if (encSim.currentInk >= target) {
      alert("이미 목표 인크립트 이상입니다.");
      return;
    }
  }

  // 자동 인크립트: 매번 로그/통계를 초기화하고 이번 실행 결과만 표시 (누적하지 않음)
  if (mode === "target") {
    encSim.totalAttempts = 0;
    encSim.successCount = 0;
    encSim.totalCost = 0;
    encSim.attemptsSinceLastSuccess = 0;
    encSim.totalExpectedCost = 0;
    encSim.totalExpectedSuccesses = 0;
    encSim.totalSuccessVariance = 0;
    simEls.encLog.replaceChildren();
  }

  encRemoveCumulative();
  const logs = [];
  const MAX = 5_000_000;
  let guard = 0;
  const cond = () => (mode === "batch" ? guard < remaining : encSim.currentInk < target && guard < MAX);
  while (cond()) {
    guard++;
    encSim.totalAttempts++;
    encSim.totalCost += unit;
    encSim.attemptsSinceLastSuccess++;
    const chance = encGetChance(encSim.currentInk, isEta);
    encAccumulate(chance);
    if (Math.random() < chance) {
      const inkBefore = encSim.currentInk;
      encSim.successCount++;
      encSim.currentInk++;
      logs.push({
        attempts: encSim.attemptsSinceLastSuccess,
        inkBefore,
        inkAfter: encSim.currentInk,
        cost: unit * encSim.attemptsSinceLastSuccess,
        unit,
        rate: chance * 100,
      });
      encSim.attemptsSinceLastSuccess = 0;
    }
  }
  logs.forEach(encAppendLog);
  encUpdateCumulative();
  encRefreshStatus();
}
function encReset() {
  encSim.currentInk = 0;
  encSim.totalAttempts = 0;
  encSim.successCount = 0;
  encSim.totalCost = 0;
  encSim.attemptsSinceLastSuccess = 0;
  encSim.totalExpectedCost = 0;
  encSim.totalExpectedSuccesses = 0;
  encSim.totalSuccessVariance = 0;
  simEls.encLog.replaceChildren();
  simEls.encStartInk.value = "0";
  encRefreshStatus();
}
function encRenderPresets() {
  const list = ENC_PRESETS[encIsEta() ? "eta" : "vianu"][encIsElso() ? "elso" : "man"];
  simEls.encPresets.innerHTML = list
    .map(([name, val]) => `<button class="sim-preset" type="button" data-cost="${val}">${escapeHtml(name)}</button>`)
    .join("");
  simEls.encCostLabel.textContent = encIsElso() ? "1회 비용 (엘소)" : "1회 비용 (만원)";
  simEls.encBaseCost.value = list[0][1];
}
function wireEncryptSim() {
  encRenderPresets();
  encRefreshStatus();
  document.querySelectorAll('input[name="encInkType"]').forEach((r) =>
    r.addEventListener("change", () => {
      encRenderPresets();
      encRefreshStatus();
    })
  );
  simEls.encElso.addEventListener("change", () => {
    encRenderPresets();
    encRefreshStatus();
  });
  simEls.encDiscount.addEventListener("change", encRefreshStatus);
  simEls.encBaseCost.addEventListener("input", encRefreshStatus);
  simEls.encStartInk.addEventListener("change", () => {
    const s = parseInt(simEls.encStartInk.value, 10);
    if (Number.isInteger(s) && s >= 0) encSim.currentInk = s;
    encRefreshStatus();
  });
  simEls.encPresets.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-cost]");
    if (!btn) return;
    simEls.encBaseCost.value = btn.dataset.cost;
    encRefreshStatus();
  });
  simEls.encRunBatch.addEventListener("click", () => encRunLoop("batch"));
  simEls.encRunTarget.addEventListener("click", () => encRunLoop("target"));
  simEls.encReset.addEventListener("click", encReset);
}

// ── 코어 강화 시뮬 (CoreEnhanceSimulatorView) ─────────────────
let coreStages = [];

function coreBuildStages(isAbyss) {
  const rows = [
    [0, 0, 1, 0, 0, 0, 0],
    [0, 1, 2, 10, 0, 4000000, 100],
    [0, 2, 3, 20, 0, 4400000, isAbyss ? 80 : 70],
    [0, 3, 4, 30, 0, 4800000, isAbyss ? 60 : 50],
    [0, 4, 5, 40, 0, 5200000, isAbyss ? 35 : 20],
    [1, 0, 6, 50, 0, 5600000, isAbyss ? 25 : 10],
    [1, 1, 7, 60, 0, 6000000, isAbyss ? 20 : 7],
    [1, 2, 8, 70, 0, 6400000, isAbyss ? 20 : 7],
    [1, 3, 9, 80, 0, 6800000, isAbyss ? 20 : 7],
    [1, 4, 10, 90, 0, 7200000, isAbyss ? 20 : 7],
    [2, 0, 12, 100, 0, 7600000, isAbyss ? 15 : 5],
    [2, 1, 14, 110, 0, 8000000, isAbyss ? 15 : 5],
    [2, 2, 16, 120, 0, 8400000, isAbyss ? 15 : 5],
    [2, 3, 18, 130, 0, 8800000, isAbyss ? 15 : 5],
    [2, 4, 20, 140, 0, 9200000, isAbyss ? 15 : 5],
    [3, 0, 23, 200, 5, 12000000, isAbyss ? 8 : 2],
    [3, 1, 26, 210, 5, 12400000, isAbyss ? 8 : 2],
    [3, 2, 29, 220, 5, 12800000, isAbyss ? 8 : 2],
    [3, 3, 32, 230, 5, 13200000, isAbyss ? 8 : 2],
    [3, 4, 35, 240, 5, 13600000, isAbyss ? 8 : 2],
    [4, 0, 40, 250, 5, 14000000, isAbyss ? 5 : 1],
    [4, 1, 50, 260, 5, 14400000, isAbyss ? 5 : 1],
    [4, 2, 60, 270, 5, 14800000, isAbyss ? 5 : 1],
    [4, 3, 70, 280, 5, 15200000, isAbyss ? 5 : 1],
    [4, 4, 80, 290, 5, 15600000, isAbyss ? 5 : 1],
  ];
  return rows.map((x, i) => ({
    index: i,
    tier: x[0],
    enhance: x[1],
    dust: x[3],
    crystal: x[4],
    seed: x[5],
    ratePct: x[6],
    rate: x[6] / 100,
    display: `${x[0]}진 ${x[1]}강`,
  }));
}
function coreIsAbyss() {
  return document.querySelector('input[name="coreType"]:checked')?.value === "abyss";
}
function coreParseLong(input) {
  let s = String(input || "").replace(/[,_\s]/g, "").replace(/seed/gi, "");
  s = s.replace(/억/g, "00000000").replace(/만/g, "0000");
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}
function coreFmtEok(amount) {
  return (amount / 1e8).toFixed(2);
}
function coreFmtCount(value) {
  const r = Math.round(value * 100) / 100;
  if (Math.abs(r - Math.round(r)) < 0.0001) return Math.round(r).toLocaleString("ko-KR");
  return r.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function corePopulateStages() {
  simEls.coreStartStage.innerHTML = coreStages.map((s) => optionHtml(String(s.index), s.display)).join("");
  simEls.coreStartStage.value = "0";
  simEls.coreTargetStage.innerHTML = coreStages.map((s) => optionHtml(String(s.index), s.display)).join("");
  simEls.coreTargetStage.value = String(coreStages.length - 1);
}
function coreApplyModeUi() {
  // 가루 보유 시 상자 가격 입력 숨김 (단계 콤보는 건드리지 않음)
  simEls.coreBoxPriceField.hidden = simEls.coreHasDust.checked;
}
function coreCalc() {
  const startIdx = parseInt(simEls.coreStartStage.value, 10);
  const targetIdx = parseInt(simEls.coreTargetStage.value, 10);
  if (startIdx >= targetIdx) {
    alert("목표 단계는 시작 단계보다 높아야 합니다.");
    return;
  }
  const isMainStat = simEls.coreMainStat.checked;
  const isSubStat = !isMainStat;
  const hasDust = simEls.coreHasDust.checked;

  let dustUnitPrice = 0;
  if (!hasDust) {
    const box = coreParseLong(simEls.coreBoxPrice.value);
    if (box == null) {
      alert("상자 가격을 숫자로 입력해주세요.");
      return;
    }
    // 상자 가격은 만원 단위 입력 → 원으로 환산 후 가루 1개당 고정비 2만원 추가
    dustUnitPrice = box * 10000 + 20000;
  }

  const rows = [];
  let totalDust = 0, totalCrystal = 0, totalSeed = 0, totalCost = 0;

  for (let i = startIdx + 1; i <= targetIdx; i++) {
    const step = coreStages[i];
    if (step.rate <= 0) {
      alert(`${step.display} 단계 확률이 0%라 계산할 수 없습니다.`);
      return;
    }
    const expected = 1 / step.rate;

    let dustPer = step.dust, crystalPer = step.crystal, seedPer = step.seed;
    if (isSubStat) {
      dustPer = Math.floor(dustPer / 2);
      crystalPer = Math.floor(crystalPer / 2);
      seedPer = Math.floor(seedPer / 2);
    }

    const dustExp = Math.round(dustPer * expected);
    const crystalExp = Math.round(crystalPer * expected);
    const seedExp = Math.round(seedPer * expected);
    const dustCost = !hasDust ? dustExp * dustUnitPrice : 0;
    const stepCost = dustCost + seedExp;

    totalDust += dustExp;
    totalCrystal += crystalExp;
    totalSeed += seedExp;
    totalCost += stepCost;

    rows.push({ step, expected, dustExp, crystalExp, seedExp, stepCost });
  }

  coreRenderTable(rows);
  coreRenderSummary({ isMainStat, startIdx, targetIdx, totalDust, totalCrystal, totalSeed, totalCost });
}
function coreRenderTable(rows) {
  const head = [
    "단계",
    "확률",
    "시도",
    `${simIcon("코어가루.png")}가루`,
    `${simIcon("코어결정.png")}결정`,
    `${simIcon("시드.png")}강화 비용`,
    `${simIcon("시드.png")}총 기대비용`,
  ];
  const body = rows
    .map((r) => {
      const cells = [r.step.display, `${r.step.ratePct}%`, coreFmtCount(r.expected), r.dustExp.toLocaleString("ko-KR"), r.crystalExp.toLocaleString("ko-KR"), `${coreFmtEok(r.seedExp)}억`, `${coreFmtEok(r.stepCost)}억`];
      return "<tr>" + cells.map((c, i) => `<td${i === cells.length - 1 ? ' class="sim-cost"' : ""}>${escapeHtml(c)}</td>`).join("") + "</tr>";
    })
    .join("");
  simEls.coreTable.innerHTML = `<thead><tr>${head.map((h) => `<th><span class="sim-th">${h}</span></th>`).join("")}</tr></thead><tbody>${body}</tbody>`;
}
function coreRenderSummary(s) {
  const statLabel = s.isMainStat ? "주스탯" : "부스탯";
  const range = `${coreStages[s.startIdx].display} → ${coreStages[s.targetIdx].display}`;
  simEls.coreSummary.innerHTML =
    `<div class="sim-summary-title">${escapeHtml(statLabel)} | ${escapeHtml(range)} 기대값</div>` +
    `<div class="sim-summary-mats">` +
    `<span>${simIcon("코어가루.png", 24)}${s.totalDust.toLocaleString("ko-KR")}개</span>` +
    `<span>${simIcon("코어결정.png", 24)}${s.totalCrystal.toLocaleString("ko-KR")}개</span>` +
    `<span>${simIcon("시드.png", 24)}${coreFmtEok(s.totalCost)}억</span>` +
    `</div>`;
}
function wireCoreSim() {
  coreStages = coreBuildStages(coreIsAbyss());
  corePopulateStages();
  coreApplyModeUi();
  document.querySelectorAll('input[name="coreType"]').forEach((r) =>
    r.addEventListener("change", () => {
      coreStages = coreBuildStages(coreIsAbyss());
      corePopulateStages();
    })
  );
  simEls.coreHasDust.addEventListener("change", coreApplyModeUi);
  simEls.coreCalc.addEventListener("click", coreCalc);
}

// ── 신조 렐릭 시뮬 (RelicExpectationSimulatorView) ─────────────
const RELIC_RATES = [
  [20, 20, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54],
  [10, 20, 20, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52],
  [10, 10, 20, 20, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50],
  [0, 0, 10, 20, 20, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48],
  [0, 0, 0, 10, 20, 20, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46],
  [0, 0, 0, 0, 10, 20, 20, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44],
  [0, 0, 0, 0, 0, 10, 20, 20, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42],
  [0, 0, 0, 0, 0, 0, 10, 20, 20, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40],
  [0, 0, 0, 0, 0, 0, 0, 10, 20, 20, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38],
  [0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 20, 20, 22, 24, 26, 28, 30, 32, 34, 36],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 20, 20, 22, 24, 26, 28, 30, 32, 34],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 20, 20, 22, 24, 26, 28, 30, 32],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 20, 20, 22, 24, 26, 28, 30],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 20, 20, 22, 24, 26, 28],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 20, 20, 22, 24, 26],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 20, 20, 22, 24],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 20, 20, 22],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 20, 20],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20, 20],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 20],
].map((r) => r.map((v) => v / 100));

function relicCosts(isPendant) {
  const shinjo = isPendant ? [140, 100, 25, 35, 25, 25, 25, 25, 50, 50] : [110, 80, 20, 30, 20, 20, 20, 20, 40, 40];
  const luna = isPendant ? 50 : 40;
  const powder = [5, 5, 7, 10, 12, 14, 16, 17, 18, 19];
  const essence = [0, 3, 6, 10, 15, 21, 28, 36, 45, 54];
  const moonPieces = [9, 11, 12, 14, 15, 18, 21, 24, 27, 30];
  const moonStones = [1, 3, 6, 10, 15, 21, 28, 36, 45, 0];
  const costs = [];
  for (let i = 0; i < 10; i++) costs.push({ powder: powder[i], essence: essence[i], moonStone: 0, moonPiece: 0, required: shinjo[i] });
  for (let i = 0; i < 10; i++) costs.push({ powder: 0, essence: 0, moonStone: moonStones[i], moonPiece: moonPieces[i], required: luna });
  return costs;
}
// 진화 재료 시퀀스: 레벨 L 도달 시 소비하는 정수/월광석 = seq[L-2] (이전 단계 → 현재 단계 진화에 사용)
// 신조 정수 10칸(레벨 1~10) 다음 루나 월광석 9칸이 이어짐 → 신조 마지막 정수 54가 루나 1단계 월광석 칸으로 넘어옴
const RELIC_EVOL_SEQ = [0, 3, 6, 10, 15, 21, 28, 36, 45, 54, 1, 3, 6, 10, 15, 21, 28, 36, 45];

function relicFmtLevel(level) {
  if (level <= 0) return "0단계";
  return level <= 10 ? `신조 ${level}단계` : `루나 ${level - 10}단계`;
}
function relicFmtNum(v) {
  return Math.ceil(Math.max(0, v)).toLocaleString("ko-KR");
}
function relicReadInt(el, label, min, max) {
  const raw = String(el.value || "").replace(/,/g, "").trim();
  const n = parseInt(raw, 10);
  if (!Number.isInteger(n) || n < min || n > max) {
    alert(`${label}은(는) ${min}~${max} 숫자로 입력해주세요.`);
    return null;
  }
  return n;
}
function relicCalc() {
  const currentLevel = relicReadInt(simEls.relicCurrent, "현재 레벨", 0, 19);
  if (currentLevel == null) return;
  const targetLevel = relicReadInt(simEls.relicTarget, "목표 레벨", 1, 20);
  if (targetLevel == null) return;
  const difficulty = relicReadInt(simEls.relicDifficulty, "강화 가능 단수", 1, 20);
  if (difficulty == null) return;
  if (targetLevel <= currentLevel) {
    alert("목표 레벨은 현재 레벨보다 높아야 합니다.");
    return;
  }
  const isPendant = document.querySelector('input[name="relicType"]:checked')?.value === "pendant";
  const costs = relicCosts(isPendant);

  const rows = [];
  let totalPowder = 0, totalEssence = 0, totalMoonStone = 0, totalMoonPiece = 0;
  let reached = currentLevel;
  let stopReason = null;

  for (let level = currentLevel + 1; level <= targetLevel; level++) {
    const chance = RELIC_RATES[level - 1][difficulty - 1];
    if (chance <= 0) {
      stopReason = `${relicFmtLevel(level)} 강화 확률이 0%라 ${relicFmtLevel(level - 1)}에서 정지`;
      break;
    }
    const cost = costs[level - 1];
    const expected = cost.required / chance;
    const powder = expected * cost.powder;
    const moonPiece = expected * cost.moonPiece;
    // 정수/월광석: 이전 단계 → 이 단계 진화에 쓴 재료 (첫 레벨은 없음)
    // 재료 종류는 "출발 단계" 기준: 신조(≤10)에서 진화하면 정수, 루나(≥11)에서 진화하면 월광석
    // → 신조 10단계 → 루나 1단계 전환은 신조의 정수 54 사용 (루나 1단계 행에 정수로 표기)
    const reachMat = level >= 2 ? RELIC_EVOL_SEQ[level - 2] : null;
    const isShinjo = level <= 10;
    const matIsEssence = level <= 11;
    const essence = reachMat != null && matIsEssence ? reachMat : null;
    const moonStone = reachMat != null && !matIsEssence ? reachMat : null;
    rows.push({ level, chance, expected, powder, essence, moonStone, moonPiece, isShinjo });
    totalPowder += powder;
    totalEssence += essence != null ? essence : 0;
    totalMoonStone += moonStone != null ? moonStone : 0;
    totalMoonPiece += moonPiece;
    reached = level;
  }

  relicRenderTable(rows);
  const name = isPendant ? "펜던트" : "브레이슬릿";
  const mats = [];
  if (totalPowder > 0 || totalEssence > 0) {
    mats.push(`<span>${simIcon("응축된신조의가루.png", 24)}${relicFmtNum(totalPowder)}개</span>`);
    mats.push(`<span>${simIcon("신조의정수.png", 24)}${relicFmtNum(totalEssence)}개</span>`);
  }
  if (totalMoonPiece > 0 || totalMoonStone > 0) {
    mats.push(`<span>${simIcon("달의파편.png", 24)}${relicFmtNum(totalMoonPiece)}개</span>`);
    mats.push(`<span>${simIcon("월광석.png", 24)}${relicFmtNum(totalMoonStone)}개</span>`);
  }
  let html = `<div class="sim-summary-title">| ${escapeHtml(name)} | ${escapeHtml(relicFmtLevel(currentLevel))} → ${escapeHtml(relicFmtLevel(targetLevel))} | ${escapeHtml(relicFmtLevel(reached))} MAX |</div>`;
  html += `<div class="sim-summary-mats">${mats.join("")}</div>`;
  if (stopReason) html += `<div class="sim-summary-note">※ ${escapeHtml(stopReason)}</div>`;
  simEls.relicSummary.innerHTML = html;
}
function relicRenderTable(rows) {
  const head = [
    "단계",
    "확률",
    "시도",
    `${simIcon("응축된신조의가루.png")}신조의 가루`,
    `${simIcon("신조의정수.png")}신조의 정수`,
    `${simIcon("달의파편.png")}달의 파편`,
    `${simIcon("월광석.png")}월광석`,
  ];
  const body = rows
    .map((r) => {
      const isShinjo = r.isShinjo;
      const cells = [
        relicFmtLevel(r.level),
        `${(r.chance * 100).toFixed(2)}%`,
        relicFmtNum(r.expected),
        isShinjo ? relicFmtNum(r.powder) : "",
        r.essence != null ? relicFmtNum(r.essence) : "",
        isShinjo ? "" : relicFmtNum(r.moonPiece),
        r.moonStone != null ? relicFmtNum(r.moonStone) : "",
      ];
      return "<tr>" + cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("") + "</tr>";
    })
    .join("");
  simEls.relicTable.innerHTML = `<thead><tr>${head.map((h) => `<th><span class="sim-th">${h}</span></th>`).join("")}</tr></thead><tbody>${body}</tbody>`;
}
function wireRelicSim() {
  simEls.relicCalc.addEventListener("click", relicCalc);
}

boot().catch((error) => {
  console.error(error);
  els.dataStatus.textContent = "데이터 로드 실패";
  els.equipmentCard.replaceChildren(els.emptyTemplate.content.cloneNode(true));
});

// 대미지 계산기 스킬 프리셋·버프 목록 로드 (실패해도 기본값으로 동작)
loadDmgSkills();
loadDmgBuffs();

// 방문 수 배지 (hits.sh — 가입 불필요, 호스트+경로 기준 페이지뷰 집계)
// 로컬(127.0.0.1)과 배포 주소는 서로 다른 키로 집계되므로 테스트 방문이 실제 수치에 섞이지 않음
(function initVisitBadge() {
  const badge = document.getElementById("visitBadge");
  if (!badge) return;
  const path = location.pathname.replace(/index\.html$/, "");
  badge.src = `https://hits.sh/${location.host}${path}.svg?style=flat&label=View&color=0f6f63`;
  // 서비스 장애 시 깨진 이미지가 보이지 않도록 로드 성공 시에만 표시
  badge.addEventListener("load", () => {
    badge.hidden = false;
  });
})();
