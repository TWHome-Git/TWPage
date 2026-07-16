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
const ACCESSORY_SLOTS = ["스탯", "아바타", "커프", "칭호", "코어", "렐릭"];

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

async function loadSheetRows() {
  const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Google Sheet CSV ${response.status}`);
  }
  const text = await response.text();
  if (text.trim().startsWith("<")) {
    throw new Error("Google Sheet returned an HTML page instead of CSV.");
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
}

function activateSimulatorTab(key) {
  els.simulatorTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.simulatorTab === key);
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

  const avatarMainBonus = els.avatarMainEnhance && els.avatarMainEnhance.checked ? 50 : 0;
  const avatarSubBonus = els.avatarSubEnhance && els.avatarSubEnhance.checked ? 50 : 0;

  const sum = (arr, fn) => arr.reduce((acc, r) => acc + fn(r), 0);

  const primaryBaseSum =
    sum(calc.mainRows, (r) => r.attackValue) +
    (avatar ? avatar.attackValue : 0) +
    (cuff ? cuff.attackValue : 0) +
    (relic ? relic.attackValue : 0) +
    (title ? title.defenseValue : 0);

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

// 선택된 캐릭터 + 계산 타입의 데이터만 초기화
function resetCurrentTypeData() {
  if (!calc.active || !calc.characterName || !calc.type) return;

  const typeName = CALC_TYPE_DISPLAY[calc.type] || calc.type;
  const ok = window.confirm(`${calc.characterName} · ${typeName} 데이터를 초기화할까요?`);
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

function slotSaveKey() {
  return `${calc.characterName}::${calc.type}`;
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
    refreshAllRows();
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

boot().catch((error) => {
  console.error(error);
  els.dataStatus.textContent = "데이터 로드 실패";
  els.equipmentCard.replaceChildren(els.emptyTemplate.content.cloneNode(true));
});
