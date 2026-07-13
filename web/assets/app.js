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
const CHARACTER_COEFFICIENT_TYPES = {
  나야트레이: ["찌르기", "베기", "물리복합"],
  녹턴: ["찌르기"],
  란지에: ["찌르기", "마법공격"],
  로아미니: ["마법공격"],
  루시안: ["찌르기", "베기", "물리복합"],
  리체: ["베기"],
  막시민: ["물리복합", "베기", "마법베기"],
  밀라: ["베기", "물리복합"],
  벤야: ["베기", "마법방어"],
  보리스: ["베기", "물리복합", "마법베기"],
  시벨린: ["찌르기", "물리복합"],
  아나이스: ["마법공격", "마법방어"],
  예프넨: ["베기"],
  이솔렛: ["베기", "마법방어"],
  이스핀: ["찌르기", "베기", "물리복합"],
  이자크: ["찌르기", "베기"],
  조슈아: ["찌르기", "마법공격"],
  클로에: ["마법공격"],
  티치엘: ["마법공격", "마법방어", "물리복합"],
};
const SIMULATOR_COPY = {
  encrypt: {
    title: "인크립트 시뮬",
    description: "인크립트 종류, 비용, 성공/실패 로그 영역을 붙일 자리입니다.",
  },
  core: {
    title: "코어 강화 시뮬",
    description: "코어 강화 기대값 UI를 붙일 메뉴 구조만 준비했습니다.",
  },
  relic: {
    title: "신조 렐릭 시뮬",
    description: "신조 렐릭 기대값 UI를 붙일 메뉴 구조만 준비했습니다.",
  },
};

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

const els = {
  mainTabButtons: document.querySelectorAll(".top-tabs [data-main-tab]"),
  mainTabTriggers: document.querySelectorAll("[data-main-tab]"),
  mainPanels: document.querySelectorAll("[data-main-panel]"),
  calculatorTabButtons: document.querySelectorAll("[data-calculator-tab]"),
  calculatorPanels: document.querySelectorAll("[data-calculator-panel]"),
  simulatorTabButtons: document.querySelectorAll("[data-simulator-tab]"),
  simulatorSlots: document.querySelectorAll("[data-simulator-card]"),
  simulatorPanelTitle: document.querySelector("#simulatorPanelTitle"),
  simulatorPanelDescription: document.querySelector("#simulatorPanelDescription"),
  characterGrid: document.querySelector("#characterGrid"),
  coefficientSelectView: document.querySelector("#coefficientSelectView"),
  coefficientDetailView: document.querySelector("#coefficientDetailView"),
  coefficientBackButton: document.querySelector("#coefficientBackButton"),
  coefficientSelectedImage: document.querySelector("#coefficientSelectedImage"),
  coefficientSelectedName: document.querySelector("#coefficientSelectedName"),
  coefficientTypeSelect: document.querySelector("#coefficientTypeSelect"),
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
  const copy = SIMULATOR_COPY[key] || SIMULATOR_COPY.encrypt;
  els.simulatorPanelTitle.textContent = copy.title;
  els.simulatorPanelDescription.textContent = copy.description;

  els.simulatorTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.simulatorTab === key);
  });
  els.simulatorSlots.forEach((slot) => {
    slot.classList.toggle("is-active", slot.dataset.simulatorCard === key);
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

function showCoefficientDetail(characterName) {
  const types = CHARACTER_COEFFICIENT_TYPES[characterName] || ["찌르기", "베기", "마법공격"];
  els.coefficientSelectedName.textContent = characterName;
  els.coefficientSelectedImage.src = `${CHARACTER_IMAGE_BASE}${encodeURIComponent(`${characterName}.png`)}`;
  els.coefficientTypeSelect.innerHTML = types.map((type) => optionHtml(type, type)).join("");
  els.coefficientSelectView.hidden = true;
  els.coefficientDetailView.hidden = false;
}

function showCoefficientSelect() {
  els.coefficientDetailView.hidden = true;
  els.coefficientSelectView.hidden = false;
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
