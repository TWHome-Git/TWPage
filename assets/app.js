const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS78PnupM0NaJzkrkFCr2Llja9TJKrLcRZqeCqlCUV4GPGlsJd3xSIn3SQAvHwzy_tGtxDbTFtl8oZQ/pub?gid=898941035&single=true&output=csv";
const SNAPSHOT_URL = "./data/equipment-snapshot.json";

// 이미지는 jsDelivr CDN으로 서빙해 GitHub Pages 대역폭을 아낀다.
//
// @main이 아니라 semver 태그로 고정한다. jsDelivr는 semver 태그와 커밋 SHA만 immutable로 보고
// max-age=1년을 주고, @main이나 그 외 이름의 태그는 엣지 캐시가 12시간마다 만료된다(s-maxage=43200).
// 만료된 뒤 첫 요청은 400~800ms가 걸리는 반면 캐시에 있으면 10~20ms다.
//
// 태그를 올리면 URL이 통째로 바뀌어 그 태그가 덮는 이미지의 브라우저 캐시가 전부 날아간다.
// 아바타만 4,800여 개 68MB라, 아이콘 하나 고치자고 전부 다시 받게 할 수는 없다.
// 그래서 바뀌는 빈도가 다른 묶음끼리 태그를 나눠 둔다.
//
// 접두사를 붙인 태그(avatar-v1 등)는 semver로 인식되지 않아 12시간 캐시가 되므로,
// 유효한 semver를 유지하면서 메이저 번호로 묶음을 구분한다.
//   v1.x  아바타 (avatar-images)      — 4,838개 68MB, 회차 추가 때만 바뀜
//   v2.x  장비   (equipment-images)   — 373개
//   v3.x  그 외  (ability/character/images)
//
// 해당 묶음의 이미지를 추가/교체하면 그 묶음의 새 태그를 찍고 아래 상수를 함께 올린다.
// 기존 태그를 옮기면 안 된다. 캐시가 immutable이라 옛 이미지가 1년간 그대로 나간다.
//   git tag v3.0.1 && git push origin v3.0.1
const CDN_ROOT = "https://cdn.jsdelivr.net/gh/TWHome-Git/TWPage@";
const CDN_AVATAR_ROOT = `${CDN_ROOT}v1.0.6/`;
const CDN_EQUIP_ROOT = `${CDN_ROOT}v2.0.3/`;
const CDN_ETC_ROOT = `${CDN_ROOT}v3.0.0/`;

const IMAGE_BASE = `${CDN_EQUIP_ROOT}equipment-images/`;
const CHARACTER_IMAGE_BASE = `${CDN_ETC_ROOT}character-images/`;

// "기본/16회차_아바타별/파일명.png"처럼 하위 폴더가 포함된 값은 세그먼트별로 인코딩해야
// 슬래시가 %2F로 바뀌지 않는다 (CDN은 %2F 경로를 찾지 못함).
const encodeImagePath = (path) => path.split("/").map(encodeURIComponent).join("/");

// 아직 공개하지 않을 화면은 마크업에 data-local-only hidden으로 두고,
// 로컬에서 열었을 때만 드러낸다. GitHub Pages로 나가면 자동으로 숨는다.
// (file://로 열면 hostname이 빈 문자열이다)
const IS_LOCAL = ["localhost", "127.0.0.1", "::1", ""].includes(location.hostname);

function revealLocalOnly() {
  if (!IS_LOCAL) return;
  document.querySelectorAll("[data-local-only]").forEach((el) => {
    el.hidden = false;
  });
}

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
  "나야트레이|STAB": { weapon: "단검", wrist: ["리스트", "밴드"], armor: ["아머", "슈츠"], artifact: "찌르기" },
  "나야트레이|PHYSICAL_HYBRID": { weapon: "단도", wrist: ["리스트", "밴드"], armor: ["아머", "슈츠"], artifact: "물리복합" },
  "나야트레이|HACK": { weapon: "도끼", wrist: ["리스트", "밴드"], armor: ["아머", "슈츠"], artifact: "베기" },
  "루시안|STAB": { weapon: "세검", wrist: ["리스트", "방패"], armor: ["메일", "아머"], artifact: "찌르기" },
  "루시안|PHYSICAL_HYBRID": { weapon: "장검", wrist: ["리스트", "방패"], armor: ["메일", "아머"], artifact: "물리복합" },
  "루시안|HACK": { weapon: "평도", wrist: ["리스트", "방패"], armor: ["메일", "아머"], artifact: "베기" },
  "이자크|STAB": { weapon: "클로", wrist: ["리스트", "밴드"], armor: ["메일", "아머", "슈츠"], artifact: "찌르기" },
  "이자크|HACK": { weapon: "카라", wrist: ["리스트", "밴드"], armor: ["메일", "아머", "슈츠"], artifact: "베기" },
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
  "벤야|HACK": { weapon: "사이드", wrist: ["리스트", "밴드"], armor: ["메일", "아머", "슈츠"], artifact: "베기" },
  "벤야|MAGIC_DEFENSE": { weapon: "해머", wrist: ["수정구", "밴드"], armor: ["메일", "아머", "슈츠"], artifact: "신성" },
  "리체|HACK": { weapon: "아밍소드", wrist: ["리스트"], armor: ["메일", "아머"], artifact: "베기" },
  "밀라|HACK": { weapon: "채찍", wrist: ["리스트", "밴드"], armor: ["아머", "슈츠"], artifact: "베기" },
  "밀라|PHYSICAL_HYBRID": { weapon: "플레일", wrist: ["리스트", "밴드"], armor: ["아머", "슈츠"], artifact: "물리복합" },
  "이스핀|STAB": { weapon: "세검", wrist: ["리스트", "방패"], armor: ["메일", "아머"], artifact: "찌르기" },
  "이스핀|PHYSICAL_HYBRID": { weapon: "장검", wrist: ["리스트", "방패"], armor: ["메일", "아머"], artifact: "물리복합" },
  "이스핀|HACK": { weapon: "평도", wrist: ["리스트", "방패"], armor: ["메일", "아머"], artifact: "베기" },
  "녹턴|STAB": { weapon: "핸드런처", wrist: ["리스트"], armor: ["아머", "마법갑옷"], artifact: "찌르기" },
  "조슈아|STAB": { weapon: "스몰소드", wrist: ["리스트"], armor: ["아머", "마법갑옷"], artifact: "찌르기" },
  "조슈아|MAGIC_ATTACK": { weapon: "완드", wrist: ["스펠북"], armor: ["아머", "마법갑옷"], artifact: "마법공격" },
  "란지에|STAB": { weapon: "물리총", wrist: ["물리 탄창"], armor: ["아머", "마법갑옷"], artifact: "찌르기" },
  "란지에|MAGIC_ATTACK": { weapon: "마법총", wrist: ["마법 탄창"], armor: ["아머", "마법갑옷"], artifact: "마법공격" },
  "로아미니|MAGIC_ATTACK": { weapon: "토템", wrist: ["암릿", "밴드"], armor: ["로브"], artifact: "마법공격" },
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
// 방어 관통 확인용 콘텐츠. 값은 monsters.json의 (스탯방어 + 고정방어)다.
// 최후의 결전은 석상, 아페는 노말, 오딘은 랭킹전 기준.
// noCore: 코어 효과가 안 붙는 곳. 계수에서 코어 몫을 빼고 판단한다.
const PIERCE_TARGETS = [
  { name: "최후의 결전", defense: 1500 + 105000 },
  { name: "아페 어려움", defense: 1500 + 64200 },
  { name: "이클 토벌전", defense: 1500 + 61200 },
  { name: "오딘 전면전", defense: 1500 + 51720 },
  { name: "렐릭 13단", defense: 1500 + 62610, noCore: true },
  { name: "렐릭 16단", defense: 1500 + 77610, noCore: true },
  { name: "렐릭 20단", defense: 1500 + 106860, noCore: true },
];

const CALC_SAVE_KEY = "tw-coefficient-save-v1";
// 어빌리티 능력 타입 선택지
// 현재는 "수동 입력"으로 고정, 심연/상실/야성은 숨김(추후 활성화 대비 코드에 유지)
const ABILITY_DEFAULT = "수동 입력";
const ABILITY_TYPES = ["심연", "상실", "야성"];
const ABILITY_OPTIONS = [ABILITY_DEFAULT, ...ABILITY_TYPES];
// ── 에타 순위 (TWChatOverlay EtaRankingService 이식) ──
const ETA_RANKING_URL = "https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/main/eta_ranking.json";
// 날짜 → 커밋 SHA 인덱스. 과거 랭킹은 해당 커밋의 raw 파일로 조회한다.
const ETA_INDEX_URL = "https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/main/ranking_index.json";
const etaSnapshotUrl = (sha) => `https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/${sha}/eta_ranking.json`;
const ETA_CHAR_IMAGE_BASE = `${CDN_ETC_ROOT}images/etachar/`;
const ETA_CHARACTER_BY_CODE = {
  0: "루시안", 1: "보리스", 2: "막시민", 3: "시벨린", 4: "조슈아",
  5: "란지에", 6: "이자크", 7: "밀라", 8: "티치엘", 9: "이스핀",
  10: "나야트레이", 11: "아나이스", 12: "클로에", 13: "벤야", 14: "이솔렛",
  15: "로아미니", 16: "녹턴", 17: "리체", 18: "예프넨",
};

const eta = {
  servers: {}, // 서버명 → 랭킹 배열
  server: "",
  collectDate: null, // "yyyy-MM-dd"
  prevServers: null, // 비교 기준 데이터. 없으면 변동 표시 생략
  prevDate: null,
  compareDays: 1, // 증감 기준: 1(1일 전) | 7(1주일 전) | 30(1달 전)
  category: "전체",
  query: "",
  loaded: false,
  loading: false,
  index: null, // 날짜 → 커밋 SHA
  date: "", // 선택한 날짜 ("" = 최신)
};

function etaCurrentRows() {
  return eta.servers[eta.server] || [];
}

// ── 에타 랭킹 로컬 캐시 ──
// 데이터는 매일 오전 10시경 1회 갱신되므로, 같은 주기의 데이터를 이미 받아뒀다면
// 페이지를 다시 열어도 네트워크 요청 없이 localStorage 캐시를 사용한다.
const ETA_REFRESH_ANCHOR_HOUR = 10;
const ETA_LATEST_CACHE_KEY = "tw-eta-latest-cache-v1";
const ETA_PREV_CACHE_KEY = "tw-eta-prev-cache-v1";
const ETA_SNAPSHOT_CACHE_KEY = "tw-eta-snapshot-cache-v1";

// 오전 10시 이후면 오늘, 이전이면 어제가 현재 갱신 주기의 기준일
function etaCycleDateString(now = new Date()) {
  const date = new Date(now);
  if (date.getHours() < ETA_REFRESH_ANCHOR_HOUR) date.setDate(date.getDate() - 1);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function etaReadCache(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function etaWriteCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간 부족 등은 무시 (캐시는 최적화일 뿐)
  }
}

// cacheSlot: "latest"(주기 일치 시 재사용) | "prev"/"snapshot"(같은 URL이면 재사용, 커밋 고정이라 불변)
async function fetchEtaPayload(url, cacheSlot) {
  if (cacheSlot === "latest") {
    const cached = etaReadCache(ETA_LATEST_CACHE_KEY);
    if (cached?.payload && cached.cycleDate === etaCycleDateString()) return cached.payload;
  } else if (cacheSlot) {
    const key = cacheSlot === "prev" ? ETA_PREV_CACHE_KEY : ETA_SNAPSHOT_CACHE_KEY;
    const cached = etaReadCache(key);
    if (cached?.url === url && cached.payload) return cached.payload;
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();

  if (cacheSlot === "latest") {
    // 수집이 아직 안 된 날(CollectDate가 주기와 다름)에는 캐시하지 않아 다음 방문 때 재확인한다
    const collectDate = clean(payload?.CollectDate || payload?.Date || "").slice(0, 10);
    if (collectDate === etaCycleDateString()) {
      etaWriteCache(ETA_LATEST_CACHE_KEY, { cycleDate: collectDate, payload });
    }
  } else if (cacheSlot) {
    const key = cacheSlot === "prev" ? ETA_PREV_CACHE_KEY : ETA_SNAPSHOT_CACHE_KEY;
    etaWriteCache(key, { url, payload });
  }

  return payload;
}

function etaResetScroll() {
  if (els.etaListWrap) els.etaListWrap.scrollTop = 0;
}

const state = {
  records: [],
  filtered: [],
  page: 0,
  view: "list", // "list" = 장비 목록, "detail" = 장비 상세
  listScroll: 0,
  category: "all",
  type: "all",
  query: "",
  compareId: "",
  limitCompare: false,
  coefType: CALC.STAB, // 장비 상세에 표시할 계수의 계열
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
  dbTabButtons: document.querySelectorAll("[data-db-tab]"),
  dbPanels: document.querySelectorAll("[data-db-panel]"),
  abilityCategorySelect: document.querySelector("#abilityCategorySelect"),
  abilitySearchInput: document.querySelector("#abilitySearchInput"),
  abilityCount: document.querySelector("#abilityCount"),
  abilityStatus: document.querySelector("#abilityStatus"),
  abilityListBody: document.querySelector("#abilityListBody"),
  avatarSourceSelect: document.querySelector("#avatarSourceSelect"),
  avatarSlotSelect: document.querySelector("#avatarSlotSelect"),
  avatarSearchInput: document.querySelector("#avatarSearchInput"),
  avatarCount: document.querySelector("#avatarCount"),
  avatarStatus: document.querySelector("#avatarStatus"),
  avatarBackButton: document.querySelector("#avatarBackButton"),
  avatarListWorkspace: document.querySelector("#avatarListWorkspace"),
  avatarDetailWorkspace: document.querySelector("#avatarDetailWorkspace"),
  avatarListBody: document.querySelector("#avatarListBody"),
  avatarViewTabs: document.querySelector("#avatarViewTabs"),
  avatarListWrap: document.querySelector(".avatar-list-wrap"),
  avatarDetailCard: document.querySelector("#avatarDetailCard"),
  calculatorTabButtons: document.querySelectorAll("[data-calculator-tab]"),
  calculatorPanels: document.querySelectorAll("[data-calculator-panel]"),
  extraTabButtons: document.querySelectorAll("[data-extra-tab]"),
  extraPanels: document.querySelectorAll("[data-extra-panel]"),
  buffTabButtons: document.querySelectorAll("[data-buff-tab]"),
  buffPanels: document.querySelectorAll("[data-buff-panel]"),
  expBaseBox: document.querySelector("#expBaseBox"),
  expResultBox: document.querySelector("#expResultBox"),
  expBuffBody: document.querySelector("#expBuffBody"),
  simulatorTabButtons: document.querySelectorAll("[data-simulator-tab]"),
  simulatorPanels: document.querySelectorAll("[data-simulator-panel]"),
  overlayReadme: document.querySelector("#overlayReadme"),
  overlayDownload: document.querySelector("#overlayDownload"),
  overlayReleaseMeta: document.querySelector("#overlayReleaseMeta"),
  overlayBetaDownload: document.querySelector("#overlayBetaDownload"),
  overlayBetaMeta: document.querySelector("#overlayBetaMeta"),
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
  coefficientPierce: document.querySelector("#coefficientPierce"),
  sideHeadPrimary: document.querySelector("#sideHeadPrimary"),
  sideHeadSecondary: document.querySelector("#sideHeadSecondary"),
  coefficientStatBody: document.querySelector("#coefficientStatBody"),
  statHeadPrimary: document.querySelector("#statHeadPrimary"),
  statHeadSecondary: document.querySelector("#statHeadSecondary"),
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
  backToListButton: document.querySelector("#backToListButton"),
  listWorkspace: document.querySelector("#listWorkspace"),
  detailWorkspace: document.querySelector("#detailWorkspace"),
  equipmentListBody: document.querySelector("#equipmentListBody"),
  equipListWrap: document.querySelector("#listWorkspace .equip-list-wrap"),
  equipmentCard: document.querySelector("#equipmentCard"),
  etaSearchInput: document.querySelector("#etaSearchInput"),
  etaDateSelect: document.querySelector("#etaDateSelect"),
  etaCount: document.querySelector("#etaCount"),
  etaUpdatedDate: document.querySelector("#etaUpdatedDate"),
  etaCompareSelect: document.querySelector("#etaCompareSelect"),
  etaTabButtons: document.querySelectorAll("[data-eta-tab]"),
  etaPanels: document.querySelectorAll("[data-eta-panel]"),
  etaCalcFrom: document.querySelector("#etaCalcFrom"),
  etaCalcTo: document.querySelector("#etaCalcTo"),
  etaCalcResult: document.querySelector("#etaCalcResult"),
  etaCalcSourceList: document.querySelector("#etaCalcSourceList"),
  etaSummaryTable: document.querySelector("#etaSummaryTable"),
  etaLevelTable: document.querySelector("#etaLevelTable"),
  etaServerTabs: document.querySelector("#etaServerTabs"),
  etaSidebar: document.querySelector("#etaSidebar"),
  etaCharacterList: document.querySelector("#etaCharacterList"),
  etaRankingBody: document.querySelector("#etaRankingBody"),
  etaListWrap: document.querySelector(".eta-list-wrap"),
  compareSelect: document.querySelector("#compareSelect"),
  limitCompareToggle: document.querySelector("#limitCompareToggle"),
  compareSummary: document.querySelector("#compareSummary"),
  emptyTemplate: document.querySelector("#emptyTemplate"),
};


// ══════════════════════════════════════════════════════════════
//  주소 공유 — 지금 보고 있는 화면을 주소에 적어 링크로 나눌 수 있게 한다.
//
//  GitHub Pages는 정적 호스팅이라 talesdb.xyz/db/equipment/... 같은 진짜
//  경로를 쓰면 새로고침에서 404가 난다. 서버가 그 경로의 파일을 찾기 때문이다.
//  해시(#) 뒤는 서버로 가지 않고 브라우저 안에서만 처리돼서 그 문제가 없다.
//
//    #/db/equipment/아퀼루스 블레이드
//    #/eta/info
//    #/calc/coefficient          (계산기는 첫 화면까지만. 캐릭터는 담지 않는다)
// ══════════════════════════════════════════════════════════════

// 메인 탭별 기본 하위 탭. 하위 탭이 기본값이면 주소에서 뺀다.
const ROUTE_DEFAULT_SUB = {
  extra: "content",
  eta: "ranking",
  equipment: "equipment",
  calculator: "coefficient",
  simulator: "encrypt",
  overlay: "",
};

// 하위 탭을 어느 버튼 묶음에서 읽고 어느 함수로 여는지
const ROUTE_SUB = {
  extra: { attr: "extraTab", open: (k) => activateExtraTab(k) },
  eta: { attr: "etaTab", open: (k) => activateEtaTab(k) },
  equipment: { attr: "dbTab", open: (k) => activateDbTab(k) },
  calculator: { attr: "calculatorTab", open: (k) => activateCalculatorTab(k) },
  simulator: { attr: "simulatorTab", open: (k) => activateSimulatorTab(k) },
};

// 아바타 이름 앞에 붙는 ♣ 같은 표시용 기호는 주소에서 뺀다. 링크가 읽기 쉬워진다.
// 이름을 맞출 때도 같은 기준으로 다듬어, 기호가 있든 없든 찾아진다.
const routeNameOut = (name) => String(name || "").replace(/^[♠♣♥♦★☆◆■]+\s*/, "").trim();
const routeNameKey = (name) => routeNameOut(name).replace(/\s+/g, " ").toLowerCase();

const route = {
  applying: false, // 주소를 화면에 반영하는 중 — 이때는 주소를 다시 쓰지 않는다
  pending: null,   // 데이터가 아직 안 와서 못 연 항목 { sub, item }
};

function routeActiveKey(attr) {
  const el = document.querySelector(`[data-${attr.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}].is-active`);
  return el ? el.dataset[attr] : "";
}

// 화면 상태 → 주소 조각
function routeCurrent() {
  const main = routeActiveKey("mainTab");
  if (!main) return null;
  const sub = ROUTE_SUB[main] ? routeActiveKey(ROUTE_SUB[main].attr) : "";

  let item = "";
  if (main === "equipment") {
    if (sub === "equipment" && state.view === "detail") item = routeNameOut(currentRecord()?.name);
    else if (sub === "avatar" && avatar.view === "detail") item = routeNameOut(avatar.filtered[avatar.detailIndex]?.name);
    else if (sub === "ability") item = els.abilitySearchInput?.value.trim() || "";
  }
  return { main, sub, item };
}

function routeToHash(r) {
  if (!r) return "";
  const parts = [r.main];
  const needSub = r.item || (r.sub && r.sub !== ROUTE_DEFAULT_SUB[r.main]);
  if (needSub) parts.push(r.sub);
  if (r.item) parts.push(r.item);
  return "#/" + parts.map(encodeURIComponent).join("/");
}

// 주소를 지금 화면에 맞춘다. 뒤로가기 이력을 늘리지 않도록 replaceState를 쓴다.
function routeWrite() {
  if (route.applying) return;
  const hash = routeToHash(routeCurrent());
  if (!hash || hash === location.hash) return;
  history.replaceState(null, "", location.pathname + location.search + hash);
}

function routeParse() {
  const raw = location.hash.replace(/^#\/?/, "");
  if (!raw) return null;
  const parts = raw.split("/").map((x) => {
    try { return decodeURIComponent(x); } catch { return x; }
  });
  const main = parts[0] || "";
  if (!document.querySelector(`[data-main-tab="${CSS.escape(main)}"]`)) return null;
  return { main, sub: parts[1] || ROUTE_DEFAULT_SUB[main] || "", item: parts.slice(2).join("/") };
}

// 주소 → 화면. 항목은 데이터가 와야 열 수 있으므로 못 찾으면 미뤄 둔다.
function routeApply(r) {
  if (!r) return;
  route.applying = true;
  try {
    activateMainTab(r.main);
    const sub = ROUTE_SUB[r.main];
    if (sub && r.sub && document.querySelector(`[data-${sub.attr.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}="${CSS.escape(r.sub)}"]`)) {
      sub.open(r.sub);
    }
    route.pending = r.item ? { sub: r.sub, item: r.item } : null;
    routeResolvePending();
  } finally {
    route.applying = false;
  }
}

// 데이터가 준비된 뒤 미뤄 둔 항목을 연다. 각 DB 로딩이 끝날 때마다 불린다.
function routeResolvePending() {
  const p = route.pending;
  if (!p) return;

  if (p.sub === "equipment") {
    const key = routeNameKey(p.item);
    const idx = state.filtered.findIndex((x) => routeNameKey(x.name) === key);
    if (idx < 0) return;             // 아직 목록이 없거나 이름이 안 맞는다
    route.pending = null;
    openEquipmentDetail(idx);
    return;
  }

  if (p.sub === "avatar") {
    const key = routeNameKey(p.item);
    const idx = avatar.filtered.findIndex((x) => routeNameKey(x.name) === key);
    if (idx < 0) return;
    route.pending = null;
    avatar.detailIndex = idx;
    avatar.view = "detail";
    renderAvatar();
    return;
  }

  if (p.sub === "ability") {
    // 어빌리티는 상세 화면이 없어서 검색어로 좁혀 준다
    if (!ability.records.length) return;
    route.pending = null;
    if (els.abilitySearchInput) {
      els.abilitySearchInput.value = p.item;
      ability.query = p.item.toLowerCase();
      renderAbilityList();
    }
  }
}

function wireRoute() {
  addEventListener("hashchange", () => {
    if (route.applying) return;
    routeApply(routeParse());
  });
}

async function boot() {
  // 기본 탭을 켜면 그 과정에서 주소가 덮어써지므로, 들어온 주소를 먼저 읽어 둔다
  const initialRoute = routeParse();

  resetControls();
  renderCharacterGrid();
  activateMainTab("extra");
  activateCalculatorTab("coefficient");
  activateSimulatorTab("encrypt");
  activateExtraTab("content");
  revealLocalOnly();
  wireEvents();
  setAvatarImageMode(avatar.imageMode); // 저장된 선택을 버튼에 반영
  wireRoute();
  routeApply(initialRoute);
  initDamageCalculator();
  initSimulators();

  renderList(); // 장비 DB가 오기 전까지 로딩 스피너를 띄운다

  try {
    const rows = await loadSheetRows((freshRows) => {
      state.records = normalizeRows(freshRows);
      populateCategorySelect();
      applyFilters();
    });
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

  prefetchSecondaryDbs();
}

// 장비 DB가 준비된 뒤, 어빌리티/아바타 DB를 미리 받아둔다.
// 탭을 처음 눌렀을 때 기다리지 않도록 하는 목적이라 유휴 시간에만 돌린다.
function prefetchSecondaryDbs() {
  const run = () => {
    if (!ability.loaded && !ability.loading) loadAbilityDb();
    if (!avatar.loaded && !avatar.loading) loadAvatarDb();
  };
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 800);
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

async function fetchSheetVersionCell(versionUrl) {
  try {
    const response = await fetch(versionUrl, { cache: "no-store" });
    if (!response.ok) return "";
    const text = (await response.text()).trim().replace(/^"|"$/g, "");
    // 줄바꿈/쉼표가 없는 40자 이하 값만 버전으로 인정 (버전 셀이 비어 전체 CSV가 반환된 경우 배제)
    if (text && text.length <= 40 && !/[\n\r,<]/.test(text)) return text;
  } catch (error) {
    console.info("시트 버전 확인 실패 — 전체 CSV를 받습니다.", error);
  }
  return "";
}

function readCsvCache(cacheKey) {
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached && typeof cached.text === "string" && cached.text) return cached;
  } catch (error) {
    console.info("CSV 캐시를 읽지 못했습니다.", error);
  }
  return null;
}

function writeCsvCache(cacheKey, version, text) {
  if (!version) return;
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ version, text }));
  } catch (error) {
    console.info("CSV 캐시 저장 실패(용량 초과 등) — 캐시 없이 동작합니다.", error);
  }
}

async function fetchSheetCsv(csvUrl) {
  const response = await fetch(csvUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Google Sheet CSV ${response.status}`);
  }
  const text = await response.text();
  if (text.trim().startsWith("<")) {
    throw new Error("Google Sheet returned an HTML page instead of CSV.");
  }
  return text;
}

// 백그라운드 검증: 버전이 바뀐 경우에만 전체 CSV를 다시 받아 캐시를 갱신하고 onFresh로 알린다.
async function revalidateSheetCache(csvUrl, versionUrl, cacheKey, cachedVersion, onFresh) {
  try {
    const version = await fetchSheetVersionCell(versionUrl);
    if (!version || version === cachedVersion) return;
    const text = await fetchSheetCsv(csvUrl);
    writeCsvCache(cacheKey, version, text);
    onFresh(text);
  } catch (error) {
    console.info("시트 갱신 확인 실패 — 캐시 데이터를 계속 사용합니다.", error);
  }
}

// 장비/아바타/어빌리티 시트 공용 (stale-while-revalidate).
// 캐시가 있으면 네트워크를 기다리지 않고 즉시 반환해 화면을 먼저 그린다.
// 버전 확인(수 바이트지만 왕복 0.6~0.9초)과 재다운로드는 백그라운드에서 진행하고,
// 시트가 실제로 바뀐 경우에만 onFresh로 새 데이터를 넘긴다.
// 캐시가 없을 때만 기존처럼 버전 확인 → 전체 CSV 순서로 기다린다.
async function loadSheetTextCached(csvUrl, versionUrl, cacheKey, onFresh) {
  const cached = readCsvCache(cacheKey);
  if (cached) {
    const notify = typeof onFresh === "function" ? onFresh : () => {};
    revalidateSheetCache(csvUrl, versionUrl, cacheKey, cached.version, notify);
    return cached.text;
  }

  const version = await fetchSheetVersionCell(versionUrl);
  const text = await fetchSheetCsv(csvUrl);
  writeCsvCache(cacheKey, version, text);
  return text;
}

async function loadSheetRows(onFresh) {
  const notify = typeof onFresh === "function" ? (text) => onFresh(parseDelimited(text, ",")) : undefined;
  return parseDelimited(await loadSheetTextCached(SHEET_CSV_URL, SHEET_VERSION_URL, CSV_CACHE_KEY, notify), ",");
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Snapshot ${response.status}`);
  }
  return response.json();
}

// 목록이 비었을 때 표시할 행. 아직 로딩 중이면 회전 아이콘을, 로딩이 끝났으면 안내 문구를 보여준다.
function listPlaceholderRow(colspan, isLoaded, emptyTitle, emptyHint) {
  const inner = isLoaded
    ? `<strong>${emptyTitle}</strong><span>${emptyHint}</span>`
    : `<div class="loading-spinner" role="status" aria-label="불러오는 중"></div><span>데이터를 불러오는 중입니다.</span>`;
  return `
    <tr><td colspan="${colspan}">
      <div class="empty-state${isLoaded ? "" : " is-loading"}">${inner}</div>
    </td></tr>
  `;
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

  if (key === "eta" && !eta.loaded && !eta.loading) {
    loadEtaRankings();
  }

  if (key === "overlay") {
    loadOverlayTab();
  }

  routeWrite();
}

// ── 에타 순위 ──────────────────────────────────────────

let etaLoadSeq = 0;

async function loadEtaRankings(url = ETA_RANKING_URL) {
  const seq = ++etaLoadSeq; // 연속 요청 시 마지막 요청만 화면에 반영
  eta.loading = true;
  renderEtaRanking(); // 로딩 스피너를 먼저 띄운다
  loadEtaIndex();

  try {
    const payload = await fetchEtaPayload(url, url === ETA_RANKING_URL ? "latest" : "snapshot");
    if (seq !== etaLoadSeq) return;
    applyEtaPayload(payload);
    eta.loaded = true;
    loadEtaPreviousRankings(seq);
  } catch (error) {
    console.warn("에타 순위 로딩 실패", error);
    if (!eta.loaded && seq === etaLoadSeq) {
      els.etaRankingBody.innerHTML = `
        <tr><td colspan="5">
          <div class="empty-state"><strong>에타 순위를 불러오지 못했습니다</strong><span>잠시 후 페이지를 새로고침해주세요.</span></div>
        </td></tr>
      `;
    }
  } finally {
    if (seq === etaLoadSeq) {
      eta.loading = false;
      renderEtaServerTabs();
      renderEtaSidebar();
      renderEtaRanking();
      els.etaUpdatedDate.textContent = `갱신일: ${eta.collectDate || "-"}`;
    }
  }
}

let etaIndexPromise = null;

function loadEtaIndex() {
  if (eta.index) return Promise.resolve();
  if (!etaIndexPromise) {
    etaIndexPromise = (async () => {
      try {
        const response = await fetch(ETA_INDEX_URL, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        eta.index = await response.json();
        renderEtaDateSelect();
      } catch (error) {
        console.warn("에타 날짜 인덱스 로딩 실패", error);
        etaIndexPromise = null; // 다음 시도에서 재요청 가능하게
      }
    })();
  }
  return etaIndexPromise;
}

function renderEtaDateSelect() {
  if (!els.etaDateSelect) return;
  const dates = eta.index ? Object.keys(eta.index).sort().reverse() : [];
  els.etaDateSelect.innerHTML = [
    `<option value=""${eta.date === "" ? " selected" : ""}>최신</option>`,
    ...dates.map((d) => `<option value="${d}"${d === eta.date ? " selected" : ""}>${d}</option>`),
  ].join("");
  els.etaDateSelect.disabled = !dates.length;
}

// 신규 구조: { Servers: { 서버명: [...] } } / 구 구조: { Rankings: [...] } 모두 지원
function parseEtaServers(payload) {
  const serverMap = payload?.Servers && typeof payload.Servers === "object"
    ? payload.Servers
    : { "하이아칸": Array.isArray(payload?.Rankings) ? payload.Rankings : [] };

  const servers = {};
  Object.entries(serverMap).forEach(([serverName, rows]) => {
    if (!Array.isArray(rows)) return;
    servers[serverName] = rows
      .filter((row) => clean(row.UserId))
      .map((row, index) => {
        const code = Number(row.CharacterCode) || 0;
        return {
          code,
          characterName: ETA_CHARACTER_BY_CODE[code] || `코드${code}`,
          userId: clean(row.UserId),
          level: Number(row.Level) || 0,
          essence: Number(row.Essence) || 0,
          order: index,
        };
      });
  });
  return servers;
}

function applyEtaPayload(payload) {
  eta.servers = parseEtaServers(payload);

  if (!eta.servers[eta.server]) {
    eta.server = Object.keys(eta.servers)[0] || "";
  }
  eta.collectDate = clean(payload?.CollectDate || payload?.Date || "").slice(0, 10) || null;
}

// ── 비교 기준 데이터 (변동 표시) ──
// 기준일(현재 보고 있는 수집일)에서 compareDays일 전 이하의 가장 가까운 날짜를 인덱스에서 찾는다.
function etaPrevIndexDate(baseDate) {
  if (!eta.index || !baseDate) return null;
  const base = new Date(`${baseDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() - eta.compareDays);
  const pad = (value) => String(value).padStart(2, "0");
  const target = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
  const dates = Object.keys(eta.index).filter((d) => d <= target).sort();
  return dates[dates.length - 1] || null;
}

async function loadEtaPreviousRankings(seq) {
  eta.prevServers = null;
  eta.prevDate = null;

  try {
    await loadEtaIndex();
    const baseDate = eta.date || eta.collectDate;
    const prevDate = etaPrevIndexDate(baseDate);
    if (!prevDate) return;

    const sha = eta.index[prevDate];
    const payload = await fetchEtaPayload(etaSnapshotUrl(sha), "prev");
    if (seq !== etaLoadSeq) return;

    eta.prevServers = parseEtaServers(payload);
    eta.prevDate = prevDate;
  } catch (error) {
    console.warn("에타 순위 비교 데이터 로딩 실패", error);
  } finally {
    if (seq === etaLoadSeq) renderEtaRanking();
  }
}

// 현재 서버·카테고리 기준으로 일주일 전 순위·정수를 계산 (검색어는 순위에 영향 없음)
function etaPrevRankMap() {
  const prevRows = eta.prevServers?.[eta.server];
  if (!prevRows || !prevRows.length) return null;

  const rows = eta.category === "전체"
    ? [...prevRows]
    : prevRows.filter((row) => row.characterName === eta.category);
  rows.sort((a, b) => b.level - a.level || b.essence - a.essence || a.order - b.order);

  const map = new Map();
  rows.forEach((row, index) => {
    map.set(`${row.code}|${row.userId}`, { rank: index + 1, level: row.level, essence: row.essence });
  });
  return map;
}

// ── 에타 정보 페이지 ([?] 버튼 → 조견표·레벨별 상세) ──
const ETA_INFO_URL = "./assets/eta_info.json";
const etaInfo = { data: null, loading: false };

// DB 탭과 같은 방식. 정보/계산기 둘 다 같은 eta_info.json을 쓰므로
// 어느 쪽을 처음 열든 그때 한 번만 받아 온다.
function activateEtaTab(key) {
  els.etaTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.etaTab === key);
  });
  els.etaPanels.forEach((panel) => {
    panel.hidden = panel.dataset.etaPanel !== key;
  });
  if (key !== "ranking" && !etaInfo.data && !etaInfo.loading) loadEtaInfo();

  routeWrite();
}

async function loadEtaInfo() {
  etaInfo.loading = true;
  try {
    const response = await fetch(ETA_INFO_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    etaInfo.data = await response.json();
    renderEtaInfo();
    renderEtaCalc();
  } catch (error) {
    console.warn("에타 정보 로딩 실패", error);
    els.etaSummaryTable.innerHTML = `<tr><td>에타 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</td></tr>`;
  } finally {
    etaInfo.loading = false;
  }
}

// 재료 표시 순서. 합계 크기가 아니라 이 순서로 고정한다
const ETA_SUB_ORDER = [
  "루이나 라피스",
  "루이나 젬마",
  "제네로 젬마",
  "에오니스 라피스",
  "레이티아의 시든 꽃",
  "설계자의 반지",
];

// 획득처별 하루 획득량. 여기 없는 재료(에오니스 라피스 등)는 정해진 획득처가
// 없어 일수를 낼 수 없고, 계산에서 빼고 따로 알려준다.
const ETA_SOURCES = [
  { key: "will", name: "에타의 의지", daily: { "루이나 라피스": 10, "루이나 젬마": 2, "제네로 젬마": 2 } },
  { key: "box", name: "에타의 의지 레벨업 상자", daily: { "루이나 라피스": 10, "루이나 젬마": 2, "제네로 젬마": 2 } },
  { key: "golgoda", name: "골고다의 협곡", daily: { "루이나 젬마": 2, "제네로 젬마": 2 } },
  { key: "quest", name: "의뢰서", daily: { "루이나 라피스": 10, "루이나 젬마": 2, "제네로 젬마": 2 } },
  { key: "questTp", name: "의뢰서 TP 교환", daily: { "루이나 라피스": 10, "루이나 젬마": 2, "제네로 젬마": 2 } },
];

const etaCalcChecked = new Set();

// 표시 순서에 없는 이름은 뒤로 보낸다. 데이터에 새 재료가 생겨도 사라지지 않게
function etaSubRank(name) {
  const i = ETA_SUB_ORDER.indexOf(name);
  return i < 0 ? ETA_SUB_ORDER.length : i;
}

function renderEtaCalcSources() {
  if (!els.etaCalcSourceList) return;
  els.etaCalcSourceList.innerHTML = ETA_SOURCES.map((s) => `
    <label class="eta-calc-source">
      <input type="checkbox" data-eta-source="${s.key}"${etaCalcChecked.has(s.key) ? " checked" : ""} />
      <span>${escapeHtml(s.name)}</span>
    </label>
  `).join("");
}

// 체크한 획득처를 합친 하루 획득량
function etaDailyTotals() {
  const daily = new Map();
  ETA_SOURCES.forEach((s) => {
    if (!etaCalcChecked.has(s.key)) return;
    Object.entries(s.daily).forEach(([name, n]) => daily.set(name, (daily.get(name) || 0) + n));
  });
  return daily;
}

// 필요량을 하루 획득량으로 나눠 재료별 소요 일수를 낸다.
//
// 재료는 레벨 순서대로 쓰인다(라피스 5~20 → 젬마 21~40 → 제네로 41~99).
// 앞 재료를 다 모아야 다음 레벨로 넘어가므로 겹치지 않는 구간은 일수를 더한다.
// 반대로 구간이 겹치는 재료(제네로 41~99와 시든 꽃 81~99)는 같이 모이므로
// 더하지 않고 더 오래 걸리는 쪽을 쓴다.
function etaCalcDaysHtml(subs, spans) {
  if (!etaCalcChecked.size) {
    return '<p class="eta-calc-hint">획득처를 선택하면 며칠이 걸리는지 함께 보여줍니다.</p>';
  }
  const daily = etaDailyTotals();
  const rows = [];
  const unknown = [];
  subs.forEach(([name, need]) => {
    const per = daily.get(name) || 0;
    const span = spans.get(name) || { first: 0, last: 0 };
    if (per > 0) rows.push({ name, need, per, days: Math.ceil(need / per), ...span });
    else unknown.push(name);
  });

  if (!rows.length) {
    return `<p class="eta-calc-hint">이 구간에 필요한 재료는 선택한 획득처에서 나오지 않습니다${unknown.length ? ` (${escapeHtml(unknown.join(", "))})` : ""}.</p>`;
  }

  // 레벨 순으로 늘어놓고, 구간이 겹치는 것끼리 묶는다
  const groups = [];
  rows.slice().sort((a, b) => a.first - b.first || a.last - b.last).forEach((r) => {
    const g = groups[groups.length - 1];
    if (g && r.first <= g.last) {
      g.items.push(r);
      g.last = Math.max(g.last, r.last);
      g.days = Math.max(g.days, r.days);
    } else {
      groups.push({ items: [r], first: r.first, last: r.last, days: r.days });
    }
  });

  const total = groups.reduce((sum, g) => sum + g.days, 0);

  return `
    <p class="eta-calc-title">예상 소요 <strong class="eta-calc-days">${etaCalcFmt(total)}일</strong></p>
    <ul class="eta-calc-days-list">
      ${groups.map((g) => g.items.map((r, i) => `
        <li${g.items.length > 1 ? " class=\"is-parallel\"" : ""}>
          <span>${escapeHtml(r.name)}</span>
          <em>Lv ${r.first}~${r.last} · ${etaCalcFmt(r.need)}개 ÷ 하루 ${etaCalcFmt(r.per)}개</em>
          <strong>${etaCalcFmt(r.days)}일${g.items.length > 1 && r.days !== g.days ? '<b class="eta-calc-hidden">(동시)</b>' : ""}</strong>
        </li>
      `).join("")).join("")}
    </ul>
  `;
}

// ── 에타 레벨 누적 재료 계산 ──
// levels의 lv N은 "N에서 N+1로 올릴 때" 드는 비용이다. 요약표 11개 구간과
// 합산 결과가 정확히 일치하는 것을 확인했다. 그래서 현재→목표는 [현재, 목표) 합.

// "950억" → 950, "1,900개" → 1900. 단위가 섞이지 않으므로 숫자만 뽑는다.
function etaCalcNum(value) {
  const m = String(value ?? "").trim().match(/^([\d,.]+)\s*(억|개)?$/);
  return m ? Number(m[1].replace(/,/g, "")) || 0 : 0;
}

// "제네로 젬마 40개 + 레이티아의 시든 꽃 40개" → [["제네로 젬마",40], ...]
function etaCalcSubs(value) {
  return String(value ?? "")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(.*?)\s+([\d,]+)\s*개?$/);
      return m ? [m[1].trim(), Number(m[2].replace(/,/g, "")) || 0] : null;
    })
    .filter(Boolean);
}

function etaCalcTotals(from, to) {
  const levels = etaInfo.data?.levels || [];
  // spans: 재료가 필요한 레벨 범위. 구간이 겹치면 동시에 모이므로 일수를 더하면 안 된다
  const totals = { exp: 0, seed: 0, water: 0, subs: new Map(), spans: new Map() };
  levels.forEach((row) => {
    if (row.lv < from || row.lv >= to) return;
    totals.exp += etaCalcNum(row.exp);
    totals.seed += etaCalcNum(row.seed);
    totals.water += etaCalcNum(row.water);
    etaCalcSubs(row.sub).forEach(([name, count]) => {
      totals.subs.set(name, (totals.subs.get(name) || 0) + count);
      const span = totals.spans.get(name);
      if (span) span.last = row.lv;
      else totals.spans.set(name, { first: row.lv, last: row.lv });
    });
  });
  return totals;
}

const etaCalcFmt = (n) => n.toLocaleString("ko-KR");

function renderEtaCalc() {
  if (!els.etaCalcResult) return;
  const levels = etaInfo.data?.levels || [];
  if (!levels.length) return;

  const max = levels[levels.length - 1].lv;
  const raw = (el) => (el && el.value !== "" ? Number(el.value) : null);
  const from = raw(els.etaCalcFrom);
  const to = raw(els.etaCalcTo);

  if (from === null || to === null) {
    els.etaCalcResult.innerHTML = `<p class="eta-calc-hint">현재 레벨과 목표 레벨을 넣으면 필요한 재료를 합쳐서 보여줍니다. (1~${max})</p>`;
    return;
  }
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < 1 || from > max || to > max) {
    els.etaCalcResult.innerHTML = `<p class="eta-calc-warn">레벨은 1~${max} 사이로 넣어 주세요.</p>`;
    return;
  }
  if (to <= from) {
    els.etaCalcResult.innerHTML = '<p class="eta-calc-warn">목표 레벨이 현재 레벨보다 높아야 합니다.</p>';
    return;
  }

  const t = etaCalcTotals(from, to);
  const main = [
    ["필요 경험치", `${etaCalcFmt(t.exp)}억`],
    ["필요 Seed", `${etaCalcFmt(t.seed)}억`],
    ["경험의 정수", `${etaCalcFmt(t.water)}개`],
  ];
  const subs = [...t.subs.entries()].sort((a, b) => etaSubRank(a[0]) - etaSubRank(b[0]));

  // 항상 드는 것(경험치·Seed·정수)과 구간마다 달라지는 부재료를 줄로 나눈다
  els.etaCalcResult.innerHTML = `
    <p class="eta-calc-title">${from} → ${to} 누적 재료</p>
    <div class="eta-calc-grid is-main-row">
      ${main.map(([k, v]) => `<div class="eta-calc-cell is-main"><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`).join("")}
    </div>
    ${subs.length ? `<div class="eta-calc-grid is-sub-row">
      ${subs.map(([k, v]) => `<div class="eta-calc-cell"><span>${escapeHtml(k)}</span><strong>${etaCalcFmt(v)}개</strong></div>`).join("")}
    </div>` : ""}
    ${subs.length ? `<div class="eta-calc-days-box">${etaCalcDaysHtml(subs, t.spans)}</div>` : ""}
  `;
}

function wireEtaCalc() {
  [els.etaCalcFrom, els.etaCalcTo].forEach((el) => el?.addEventListener("input", renderEtaCalc));
  renderEtaCalcSources();
  els.etaCalcSourceList?.addEventListener("change", (event) => {
    const box = event.target.closest("[data-eta-source]");
    if (!box) return;
    if (box.checked) etaCalcChecked.add(box.dataset.etaSource);
    else etaCalcChecked.delete(box.dataset.etaSource);
    renderEtaCalc();
  });
}

function renderEtaInfo() {
  const { summary, levels } = etaInfo.data;

  const [summaryHead, ...summaryRows] = summary;
  els.etaSummaryTable.innerHTML = `
    <thead><tr>${summaryHead.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>
    <tbody>
      ${summaryRows.map((row) => `
        <tr>
          <th>${escapeHtml(row[0])}</th>
          ${row.slice(1, 10).map((cell, i) => `<td data-label="${escapeHtml(summaryHead[i + 1] || "")}">${escapeHtml(cell || "-")}</td>`).join("")}
          <td class="eta-info-note" data-label="${escapeHtml(summaryHead[10] || "")}">${row[10] ? `<img class="eta-note-icon" src="./images/${encodeURIComponent("경험의 정수.png")}" alt="경험의 정수" title="누적 경험의 정수" decoding="async" /> - ${escapeHtml(row[10])}` : ""}</td>
        </tr>
      `).join("")}
    </tbody>
  `;

  els.etaLevelTable.innerHTML = `
    <thead>
      <tr>
        <th>LV</th><th>필요 경험치</th><th>필요 SEED</th><th>부재료</th><th>경험의 정수</th>
        <th>최대 대미지</th><th>최대 HP</th><th>최대 방어력</th><th>최대 스탯</th><th>각성 대미지</th>
      </tr>
    </thead>
    <tbody>
      ${levels.map((row) => `
        <tr>
          <th>${row.lv}</th>
          <td data-label="필요 경험치">${escapeHtml(row.exp)}</td>
          <td data-label="필요 SEED">${escapeHtml(row.seed)}</td>
          <td class="eta-info-sub" data-label="부재료">${escapeHtml(row.sub || "")}</td>
          <td data-label="경험의 정수">${escapeHtml(row.water)}</td>
          <td data-label="최대 대미지">${escapeHtml(row.dmg)}</td>
          <td data-label="최대 HP">${escapeHtml(row.hp)}</td>
          <td data-label="최대 방어력">${escapeHtml(row.def)}</td>
          <td data-label="최대 스탯">${escapeHtml(row.stat)}</td>
          <td data-label="각성 대미지">${escapeHtml(row.awaken)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
}

function renderEtaServerTabs() {
  const names = Object.keys(eta.servers);
  els.etaServerTabs.innerHTML = names.map((name) => `
    <button class="eta-server-tab${name === eta.server ? " is-active" : ""}" type="button" role="radio" aria-checked="${name === eta.server}" data-eta-server="${escapeHtml(name)}">${escapeHtml(name)}</button>
  `).join("");
}

function renderEtaSidebar() {
  const names = [...new Set(etaCurrentRows().map((row) => row.characterName))]
    .sort((a, b) => a.localeCompare(b, "ko"));
  els.etaCharacterList.innerHTML = names
    .map((name) => `<button class="eta-cat eta-subcat${eta.category === name ? " is-active" : ""}" type="button" data-eta-category="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
    .join("");
  els.etaSidebar.querySelector('[data-eta-category="전체"]')
    ?.classList.toggle("is-active", eta.category === "전체");
}

function renderEtaRanking() {
  // 변동 데이터 도착 후 재렌더링 시 스크롤 위치 유지 (초기화는 각 이벤트 핸들러에서)
  const keepScroll = els.etaListWrap ? els.etaListWrap.scrollTop : 0;
  const source = etaCurrentRows();
  const rows = eta.category === "전체"
    ? [...source]
    : source.filter((row) => row.characterName === eta.category);

  rows.sort((a, b) => b.level - a.level || b.essence - a.essence || a.order - b.order);

  // 순위는 검색어 필터 이전(서버·카테고리 기준)에 확정한다
  const ranked = rows.map((row, index) => ({ ...row, rank: index + 1 }));

  const visible = eta.query
    ? ranked.filter((row) =>
        row.userId.toLowerCase().includes(eta.query) ||
        row.characterName.toLowerCase().includes(eta.query))
    : ranked;

  els.etaCount.textContent = `${visible.length.toLocaleString("ko-KR")}명`;

  if (!visible.length) {
    els.etaRankingBody.innerHTML = `
      ${listPlaceholderRow(5, eta.loaded, "표시할 순위가 없습니다", "조건을 조금 넓혀보세요.")}
    `;
    return;
  }

  const prevMap = etaPrevRankMap();
  const deltaTitle = eta.prevDate ? ` title="${escapeHtml(eta.prevDate)} 대비"` : "";

  els.etaRankingBody.innerHTML = visible.map((row) => {
    const deltaBadge = (diff) => diff > 0
      ? `<span class="eta-delta up"${deltaTitle}>▲${formatNumber(diff)}</span>`
      : diff < 0
        ? `<span class="eta-delta down"${deltaTitle}>▼${formatNumber(-diff)}</span>`
        : `<span class="eta-delta same"${deltaTitle}>-</span>`;

    let deltaHtml = "";
    let newHtml = "";
    let levelDeltaHtml = "";
    let essenceDeltaHtml = "";
    if (prevMap) {
      const prev = prevMap.get(`${row.code}|${row.userId}`);
      if (!prev) {
        newHtml = `<span class="eta-new"${deltaTitle}>NEW</span>`;
      } else {
        deltaHtml = deltaBadge(prev.rank - row.rank);
        levelDeltaHtml = deltaBadge(row.level - prev.level);
        essenceDeltaHtml = deltaBadge(row.essence - prev.essence);
      }
    }
    return `
      <tr class="eta-row">
        <td class="eta-rank">${row.rank}${deltaHtml}</td>
        <td><span class="eta-char-thumb"><img src="${ETA_CHAR_IMAGE_BASE}${row.code}.png" alt="${escapeHtml(row.characterName)}" title="${escapeHtml(row.characterName)}" loading="lazy" decoding="async" /></span></td>
        <td class="eta-userid">${escapeHtml(row.userId)}${newHtml}</td>
        <td class="eta-level">${formatNumber(row.level)}${levelDeltaHtml}</td>
        <td class="eta-essence">${formatNumber(row.essence)}${essenceDeltaHtml}</td>
      </tr>
    `;
  }).join("");

  if (els.etaListWrap) els.etaListWrap.scrollTop = keepScroll;
}

// DB 검색 서브탭 (장비 / 어빌리티 / 아바타)
function activateDbTab(key) {
  els.dbTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.dbTab === key);
  });
  els.dbPanels.forEach((panel) => {
    panel.hidden = panel.dataset.dbPanel !== key;
  });

  if (key === "ability" && !ability.loaded && !ability.loading) {
    loadAbilityDb();
  }
  if (key === "avatar" && !avatar.loaded && !avatar.loading) {
    loadAvatarDb();
  }

  routeWrite();
}

// ── 어빌리티 DB ──
// 데이터: Google Sheets 웹 게시 CSV (이미지 파일, 종류, 어빌리티명, 획득확률, 효과1~6)
const ABILITY_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS78PnupM0NaJzkrkFCr2Llja9TJKrLcRZqeCqlCUV4GPGlsJd3xSIn3SQAvHwzy_tGtxDbTFtl8oZQ/pub?gid=1875452616&single=true&output=csv";
const ABILITY_IMAGE_BASE = `${CDN_ETC_ROOT}ability-images/`;

// 장비/아바타와 동일한 버전 셀 캐시: 어빌리티 시트 탭의 AZ1 값이 같으면 전체 CSV 다운로드 생략
const ABILITY_VERSION_URL = `${ABILITY_CSV_URL}&range=AZ1`;
// 추가 효과는 열 개수가 종류마다 다르고 시트에서 늘어나기도 한다(현재 최대 8).
// 개수를 박아두지 않고 끝까지 읽되, 버전 셀이 있는 AZ열(0-based 51)은 넘지 않는다.
const ABILITY_EFFECT_START = 6;
const ABILITY_EFFECT_END = 51;
const ABILITY_CSV_CACHE_KEY = "tw-ability-csv-cache-v1";
const ability = {
  records: [],
  category: "all",
  query: "",
  loaded: false,
  loading: false,
};

// CSV 텍스트 → ability.records. 최초 로딩과 백그라운드 갱신 양쪽에서 쓴다.
function applyAbilityText(rawText) {
  const rows = parseDelimited(rawText.replace(/^﻿/, ""), ",");
  ability.records = rows
    .slice(1)
    .map((row) => {
      const name = clean(row[2]);
      if (!name) return null;
      // 새로 추가된 어빌리티는 기본 효과와 추가 효과가 따로 있고 확률도 각각이다.
      // 기존 어빌리티는 기본 효과 칸이 비어 있어 추가 효과만 한 줄로 나온다.
      const baseEffects = row.slice(4, 5).map(clean).filter(Boolean);
      const effects = row.slice(ABILITY_EFFECT_START, ABILITY_EFFECT_END).map(clean).filter(Boolean);
      return {
        imageFile: clean(row[0]),
        category: clean(row[1]),
        name,
        baseProb: clean(row[3]),
        baseEffects,
        prob: clean(row[5]),
        effects,
        searchText: [row[1], name, baseEffects.join(" "), effects.join(" ")].join(" ").toLowerCase(),
      };
    })
    .filter(Boolean);
  ability.loaded = true;
  els.abilityStatus.textContent = "DB 연결";
  populateAbilityCategorySelect();
}

async function loadAbilityDb() {
  ability.loading = true;
  els.abilityStatus.textContent = "데이터 로딩 중";
  renderAbilityList(); // 로딩 스피너를 먼저 띄운다

  try {
    applyAbilityText(await loadSheetTextCached(ABILITY_CSV_URL, ABILITY_VERSION_URL, ABILITY_CSV_CACHE_KEY, (fresh) => {
      applyAbilityText(fresh);
      renderAbilityList();
    }));
  } catch (error) {
    console.warn("어빌리티 DB 로딩 실패", error);
    els.abilityStatus.textContent = "데이터 로드 실패";
  } finally {
    ability.loading = false;
    renderAbilityList();
    routeResolvePending();
  }
}

// ── 아바타 DB ──
// 데이터: Google Sheets 웹 게시 CSV
// (아바타 목록 이미지, 아바타 상세 이미지, 아바타 이름, 획득처, 확률, 부위, 月-아이템 교환 가능, 세트 이미지)
const AVATAR_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS78PnupM0NaJzkrkFCr2Llja9TJKrLcRZqeCqlCUV4GPGlsJd3xSIn3SQAvHwzy_tGtxDbTFtl8oZQ/pub?gid=1331633328&single=true&output=csv";
// avatar-images는 Icons(목록용 아이콘)와 Details(착용 상세 이미지)로 나뉘어 있다.
// 두 폴더 모두 파일이 2000개를 넘어 GitHub 목록이 1000개에서 잘리므로, 다시 부위별 하위 폴더로 나눠 담는다.
// 시트는 폴더 없이 파일명만 주므로 여기서 폴더를 붙인다.
const AVATAR_ICON_BASE = `${CDN_AVATAR_ROOT}avatar-images/Icons/`;
const AVATAR_DETAIL_BASE = `${CDN_AVATAR_ROOT}avatar-images/Details/`;
// 세트 대표 이미지는 개별 상세와 성격이 달라 폴더를 나눠 둔다
const AVATAR_SET_BASE = `${CDN_AVATAR_ROOT}avatar-images/Sets/`;

// 장비 DB와 동일한 버전 셀 캐시: AZ1 값이 같으면 전체 CSV 다운로드 생략
const AVATAR_VERSION_URL = `${AVATAR_CSV_URL}&range=AZ1`;
const AVATAR_CSV_CACHE_KEY = "tw-avatar-csv-cache-v1";

async function loadAvatarSheetText(onFresh) {
  return loadSheetTextCached(AVATAR_CSV_URL, AVATAR_VERSION_URL, AVATAR_CSV_CACHE_KEY, onFresh);
}

// 시트의 "(1)"/"(2)"는 이름이 같은 다른 아바타를 구분하려는 표기라 화면에서는 감춘다.
// 레코드 식별은 원래 이름 그대로 해야 두 아바타가 하나로 합쳐지지 않는다.
// 끝에 붙은 (숫자)만 떼므로 "군모(빨강)", "앨리스 망토 (그린 민트)" 같은 이름은 그대로 남는다.
function avatarDisplayName(name) {
  return name.replace(/\s*\(\d+\)\s*$/, "");
}

// 시트에 확장자 없이 적어도 동작하도록 보정
function avatarImageFile(value) {
  const name = clean(value);
  if (!name) return "";
  return name.includes(".") ? name : `${name}.webp`;
}

// Icons/Details는 부위별 하위 폴더로 나뉘어 있다. 부위가 비어 있으면 폴더 없이 그대로 둔다.
function avatarSlotPath(file, slot) {
  return file && slot ? `${slot}/${file}` : file;
}

const AVATAR_VIEW_KEY = "tw-avatar-list-view";

const avatar = {
  records: [],
  filtered: [],
  view: "list", // "list" | "detail"
  // 목록 썸네일을 아이콘(55px)으로 볼지 착용 이미지로 볼지
  imageMode: etaReadCache(AVATAR_VIEW_KEY) === "detail" ? "detail" : "icon",
  detailIndex: 0,
  listScroll: 0,
  query: "",
  source: "all",
  slot: "all",
  loaded: false,
  loading: false,
};

// 시트는 아바타당 한 줄이고, 획득처가 여러 곳이면 " / "로 이어 붙여 둔다.
// 획득처와 확률은 같은 순서로 짝을 이룬다.
const AVATAR_MULTI_SEP = " / ";
const splitMulti = (value) => clean(value).split(AVATAR_MULTI_SEP).map((s) => s.trim());

// CSV 텍스트 → avatar.records. 최초 로딩과 백그라운드 갱신 양쪽에서 쓴다.
function applyAvatarText(rawText) {
  const text = rawText.replace(/^﻿/, "");
  const rows = parseDelimited(text, ",");
  const merged = new Map();
  rows.slice(1).forEach((row) => {
      const name = clean(row[2]);
      if (!name) return;
      const slot = clean(row[5]);
      const listImage = avatarSlotPath(avatarImageFile(row[0]), slot);
      const detailImage = avatarSlotPath(avatarImageFile(row[1]), slot);
      // 세트 이미지도 획득처처럼 " / "로 여러 개 올 수 있다 (한 아바타가 두 세트에 동시에 속하는 경우)
      const setImages = splitMulti(row[7]).map(avatarImageFile).filter(Boolean);
      const srcList = splitMulti(row[3]).filter(Boolean);
      const probList = splitMulti(row[4]);
      const sources = srcList.map((source, i) => ({ source, prob: probList[i] || "" }));
      const existing = merged.get(name);
      if (existing) {
        // 시트가 아바타당 한 줄이라 여기까지 오는 일은 없지만, 중복 줄이 생겨도 정보가 사라지지 않게 둔다
        sources.forEach((s) => {
          if (!existing.sources.some((x) => x.source === s.source && x.prob === s.prob)) existing.sources.push(s);
        });
        if (!existing.listImage) existing.listImage = listImage;
        if (detailImage && !existing.detailImages.includes(detailImage)) existing.detailImages.push(detailImage);
        setImages.forEach((file) => {
          if (!existing.setImages.includes(file)) existing.setImages.push(file);
        });
        if (!existing.exchange) existing.exchange = clean(row[6]);
        if (!existing.slot) existing.slot = slot;
        if (slot && !existing.slots.includes(slot)) existing.slots.push(slot);
      } else {
        merged.set(name, {
          listImage,
          detailImages: detailImage ? [detailImage] : [],
          setImages,
          name,
          displayName: avatarDisplayName(name),
          slot,
          slots: slot ? [slot] : [],
          sources,
          exchange: clean(row[6]),
          searchText: name.toLowerCase(),
        });
      }
  });
  avatar.records = [...merged.values()];
  avatar.loaded = true;
  populateAvatarFilters();
  els.avatarStatus.textContent = "DB 연결";
}

async function loadAvatarDb() {
  avatar.loading = true;
  els.avatarStatus.textContent = "데이터 로딩 중";
  renderAvatar(); // 로딩 스피너를 먼저 띄운다

  try {
    // 캐시가 있으면 즉시 반환된다. 시트가 바뀐 경우에만 뒤늦게 onFresh로 다시 그린다.
    applyAvatarText(await loadAvatarSheetText((fresh) => {
      applyAvatarText(fresh);
      renderAvatar();
    }));
  } catch (error) {
    console.warn("아바타 DB 로딩 실패", error);
    els.avatarStatus.textContent = "데이터 로드 실패";
  } finally {
    avatar.loading = false;
    renderAvatar();
    routeResolvePending();
  }
}

// 획득처 표시 순서: 화려한 모음집(회차순) → 세트 상자 Vol → 세트 모음집 상자 → 봄날 → 한여름
// 규칙에 안 맞는 새 획득처가 생기면 맨 뒤에 가나다순으로 붙는다.
const AVATAR_SOURCE_GROUPS = [
  /화려한\s*아바타\s*모음집\s*\((\d+)/,
  /세트\s*상자\s*Vol\.?\s*(\d+)/i,
  /세트\s*모음집\s*상자\s*(\d+)/,
  /^봄날/,
  /^한여름/,
];

function avatarSourceRank(name) {
  for (let i = 0; i < AVATAR_SOURCE_GROUPS.length; i += 1) {
    const matched = name.match(AVATAR_SOURCE_GROUPS[i]);
    if (matched) return [i, Number(matched[1]) || 0];
  }
  return [AVATAR_SOURCE_GROUPS.length, 0];
}

function compareAvatarSource(a, b) {
  const [rankA, numA] = avatarSourceRank(a);
  const [rankB, numB] = avatarSourceRank(b);
  return rankA - rankB || numA - numB || a.localeCompare(b, "ko");
}

// 부위는 시트 등장 순서를 그대로 쓴다 (투구→머리→몸→다리→효과 = 게임 내 순서)
function populateAvatarFilters() {
  const sources = [...new Set(avatar.records.flatMap((record) => record.sources.map((s) => s.source)))]
    .filter(Boolean)
    .sort(compareAvatarSource);
  const slots = [...new Set(avatar.records.flatMap((record) => record.slots))].filter(Boolean);

  els.avatarSourceSelect.innerHTML = optionHtml("all", "전체 획득처") + sources.map((s) => optionHtml(s, s)).join("");
  els.avatarSlotSelect.innerHTML = optionHtml("all", "전체 부위") + slots.map((s) => optionHtml(s, s)).join("");

  // 캐시본으로 먼저 그린 뒤 최신 시트로 다시 채울 때, 고르고 있던 항목이 사라졌으면 전체로 되돌린다
  // (그냥 두면 셀렉트는 빈칸인데 필터는 걸려 있는 상태가 된다)
  if (!sources.includes(avatar.source)) avatar.source = "all";
  if (!slots.includes(avatar.slot)) avatar.slot = "all";
  els.avatarSourceSelect.value = avatar.source;
  els.avatarSlotSelect.value = avatar.slot;
}

function renderAvatar() {
  avatar.filtered = avatar.records.filter((record) => {
    if (avatar.source !== "all" && !record.sources.some((s) => s.source === avatar.source)) return false;
    if (avatar.slot !== "all" && !record.slots.includes(avatar.slot)) return false;
    if (avatar.query && !record.searchText.includes(avatar.query)) return false;
    return true;
  });

  els.avatarCount.textContent = `${avatar.filtered.length.toLocaleString("ko-KR")}개`;

  const isList = avatar.view === "list";
  els.avatarListWorkspace.hidden = !isList;
  els.avatarDetailWorkspace.hidden = isList;
  els.avatarBackButton.hidden = isList;

  if (isList) {
    renderAvatarList();
  } else {
    renderAvatarDetail();
  }
}

// 목록은 획득처를 한 줄로 요약한다 (전체 내역은 상세 화면의 획득처 표에서 확인).
// 획득처 필터가 걸려 있으면 그 획득처를 대표로 올려, 왜 걸렸는지 바로 보이게 한다.
function avatarSourceSummary(record) {
  const list = record.sources;
  const head = (avatar.source !== "all" && list.find((s) => s.source === avatar.source)) || list[0];
  if (!head) return "-";
  const label = `${escapeHtml(head.source || "-")}${head.prob ? ` <em class="avatar-prob">(${escapeHtml(head.prob)})</em>` : ""}`;
  const rest = list.length - 1;
  return rest > 0 ? `${label} <em class="avatar-more">외 ${rest}곳</em>` : label;
}

// 착용 이미지는 아바타마다 크기·비율이 제각각이라 세로만 맞추고 가로는 흐르게 둔다.
// 착용 이미지가 없는 아바타는 아이콘으로 되돌린다.
function avatarListImageHtml(record, detailMode) {
  const detail = record.detailImages[0];
  const [base, file] = detailMode && detail
    ? [AVATAR_DETAIL_BASE, detail]
    : [AVATAR_ICON_BASE, record.listImage];
  if (!file) return "";
  return `<img src="${base}${encodeImagePath(file)}" alt="" loading="lazy" decoding="async" />`;
}

function setAvatarImageMode(mode) {
  avatar.imageMode = mode === "detail" ? "detail" : "icon";
  etaWriteCache(AVATAR_VIEW_KEY, avatar.imageMode);
  els.avatarViewTabs?.querySelectorAll("[data-avatar-view]").forEach((button) => {
    const on = button.dataset.avatarView === avatar.imageMode;
    button.classList.toggle("is-active", on);
    button.setAttribute("aria-checked", String(on));
  });
  renderAvatarList();
}

function renderAvatarList() {
  if (!avatar.filtered.length) {
    els.avatarListBody.innerHTML = listPlaceholderRow(3, avatar.loaded, "검색 결과가 없습니다", "조건을 조금 넓혀보세요.");
    return;
  }

  const detailMode = avatar.imageMode === "detail";

  els.avatarListBody.innerHTML = avatar.filtered.map((record, index) => `
    <tr class="equip-row avatar-row" data-index="${index}">
      <td class="equip-info-cell">
        <div class="equip-info">
          <span class="equip-thumb ability-thumb${detailMode ? " is-wide" : ""}">
            ${avatarListImageHtml(record, detailMode)}
          </span>
          <span class="equip-name-block">
            <strong>${escapeHtml(record.displayName)}</strong>
          </span>
        </div>
      </td>
      <td class="avatar-slot">${escapeHtml(record.slots.join(", ") || "-")}</td>
      <td class="avatar-source">${avatarSourceSummary(record)}</td>
    </tr>
  `).join("");

  if (els.avatarListWrap) els.avatarListWrap.scrollTop = avatar.listScroll;
}

function renderAvatarDetail() {
  const record = avatar.filtered[avatar.detailIndex];
  if (!record) {
    els.avatarDetailCard.innerHTML = "";
    return;
  }

  const iconHtml = record.listImage
    ? `<img src="${AVATAR_ICON_BASE}${encodeImagePath(record.listImage)}" alt="" decoding="async" />`
    : "";
  // 개별 상세 이미지를 먼저, 세트 대표 이미지를 뒤에 (폴더가 달라 경로를 따로 만든다)
  const wearFiles = [
    ...record.detailImages.map((file) => [AVATAR_DETAIL_BASE, file]),
    ...record.setImages.map((file) => [AVATAR_SET_BASE, file]),
  ];
  const wearHtml = wearFiles
    .map(([base, file]) => `<img class="avatar-wear-image" src="${base}${encodeImagePath(file)}" alt="${escapeHtml(record.displayName)} 착용 이미지" decoding="async" />`)
    .join("");

  const sourceRows = record.sources.length
    ? record.sources.map((s) => `
        <tr>
          <td>${escapeHtml(s.source || "-")}</td>
          <td>${escapeHtml(s.prob || "-")}</td>
        </tr>
      `).join("")
    : '<tr><td colspan="2">획득처 정보 없음</td></tr>';

  els.avatarDetailCard.innerHTML = `
    <div class="item-hero">
      <div class="item-image avatar-detail-thumb">${iconHtml}</div>
      <div>
        <p class="item-kind">아바타</p>
        <h2>${escapeHtml(record.displayName)}</h2>
        <p class="item-condition">${record.sources.length > 1 ? `획득처 ${record.sources.length}곳` : escapeHtml(record.sources[0]?.source || "획득처 정보 없음")}</p>
      </div>
    </div>

    <div class="avatar-detail-meta">
      <table class="avatar-source-table" aria-label="획득처별 정보">
        <thead>
          <tr><th>획득처</th><th>확률</th></tr>
        </thead>
        <tbody>${sourceRows}</tbody>
      </table>
      <div class="avatar-meta-row"><span>月-아이템 교환</span><strong>${escapeHtml(record.exchange || "-")}</strong></div>
    </div>

    <div class="avatar-wear-section">
      <span>착용 이미지</span>
      <div class="avatar-wear-frame" data-count="${wearFiles.length}">${wearHtml}<b class="avatar-wear-missing" hidden>✕ 이미지 준비 중</b></div>
    </div>
  `;

  const wearImgs = [...els.avatarDetailCard.querySelectorAll(".avatar-wear-image")];
  const missing = els.avatarDetailCard.querySelector(".avatar-wear-missing");
  if (!wearImgs.length) {
    missing.hidden = false;
  } else {
    wearImgs.forEach((img) => {
      img.addEventListener("error", () => {
        img.hidden = true;
        if (wearImgs.every((item) => item.hidden)) missing.hidden = false;
      });
    });
  }
  els.avatarDetailCard.querySelector(".avatar-detail-thumb img")?.addEventListener("error", (event) => {
    event.currentTarget.hidden = true;
  });
}

function populateAbilityCategorySelect() {
  const categories = [...new Set(ability.records.map((record) => record.category))];
  els.abilityCategorySelect.innerHTML = optionHtml("all", "전체 종류") + categories.map((category) => optionHtml(category, category)).join("");
  els.abilityCategorySelect.value = ability.category;
}

function renderAbilityList() {
  let rows = ability.category === "all"
    ? ability.records
    : ability.records.filter((record) => record.category === ability.category);

  if (ability.query) {
    rows = rows.filter((record) => record.searchText.includes(ability.query));
  }

  els.abilityCount.textContent = `${rows.length.toLocaleString("ko-KR")}개`;

  if (!rows.length) {
    els.abilityListBody.innerHTML = listPlaceholderRow(3, ability.loaded, "검색 결과가 없습니다", "조건을 조금 넓혀보세요.");
    return;
  }

  // td 자체를 flex로 만들면 표 셀이 아니게 돼 행 높이만큼 늘어나지 않는다.
  // (기본/추가 사이 구분선이 어긋난다) 안쪽 래퍼에 flex를 준다.
  const chips = (list) => `<div class="ability-chips">${
    list.map((effect) => `<b class="ability-chip">${escapeHtml(effect)}</b>`).join("")
  }</div>`;

  els.abilityListBody.innerHTML = rows.map((record, index) => {
    // 기본 효과가 있으면 기본/추가를 두 줄로 나눠 보여준다.
    // 이름 칸은 rowspan으로 묶어 두 줄이 한 어빌리티임을 드러낸다.
    const split = record.baseEffects.length > 0;
    const alt = index % 2 === 1 ? " is-alt" : "";
    const nameCell = `
      <td class="equip-info-cell"${split ? ' rowspan="2"' : ""}>
        <div class="equip-info">
          <span class="equip-thumb ability-thumb">
            ${record.imageFile ? `<img src="${ABILITY_IMAGE_BASE}${encodeImagePath(record.imageFile)}" alt="" decoding="async" />` : ""}
          </span>
          <span class="equip-name-block">
            <strong>${escapeHtml(record.name)}</strong>
            <small>${escapeHtml(record.category)}</small>
          </span>
        </div>
      </td>`;

    if (!split) {
      return `
        <tr class="ability-row${alt}">
          ${nameCell}
          <td class="ability-prob">각 ${escapeHtml(record.prob)}</td>
          <td class="ability-effects">${chips(record.effects)}</td>
        </tr>
      `;
    }

    return `
      <tr class="ability-row is-head${alt}">
        ${nameCell}
        <td class="ability-prob"><em class="ability-kind">기본</em>${escapeHtml(record.baseProb)}</td>
        <td class="ability-effects">${chips(record.baseEffects)}</td>
      </tr>
      <tr class="ability-row is-sub${alt}">
        <td class="ability-prob"><em class="ability-kind">추가</em>각 ${escapeHtml(record.prob)}</td>
        <td class="ability-effects">${chips(record.effects)}</td>
      </tr>
    `;
  }).join("");
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
  if (key === "damage") {
    // 대미지 상한이 에타 정보에 있어 같이 받아 둔다
    if (!etaInfo.data && !etaInfo.loading) loadEtaInfo().then(dmgRefresh);
    dmgRefresh();
  }

  routeWrite();
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

  routeWrite();
}

function activateExtraTab(key) {
  els.extraTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.extraTab === key);
  });
  els.extraPanels.forEach((panel) => {
    const isActive = panel.dataset.extraPanel === key;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });
  // 버프 탭은 처음 열릴 때 기본 하위 탭(경험치)을 그린다
  if (key === "buff") loadExpBuffs();

  routeWrite();
}

// ══════════════════════════════════════════════════════════════
//  버프 아이템 탭 — 경험치 버프 / 레어 버프
// ══════════════════════════════════════════════════════════════
const BUFF_ICON_BASE = `${CDN_ETC_ROOT}images/`;
const EXP_BUFF_URL = "./assets/exp-buffs.json";
let expBuffLoaded = false;

function activateBuffTab(key) {
  els.buffTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.buffTab === key);
  });
  els.buffPanels.forEach((panel) => {
    panel.hidden = panel.dataset.buffPanel !== key;
  });
  if (key === "exp") loadExpBuffs();
}

// 계산기 상태: 기본 경험치 선택과 버프 체크 상태를 함께 들고 있는다
// inputs: 직접 입력이 있는 항목(투구 부가, 시오칸 코어)의 값을 항목별로 담는다
const expCalc = { data: null, baseIndex: -1, baseCustom: "", checked: new Set(), inputs: {} };

// 선택 상태는 브라우저에 남긴다. 줄/칸 위치는 목록을 손대면 바뀌므로
// 위치가 아니라 버프 "이름"으로 저장해서, 순서를 바꿔도 그대로 복원되게 한다.
const EXP_SAVE_KEY = "tw-exp-buff-save-v1";

const expNameOf = (key) => expBuffItem(key)?.["이름"] || "";

function expKeyByName() {
  const map = new Map();
  (expCalc.data?.["버프"] || []).forEach((row, ri) => {
    row.forEach((item, ci) => map.set(item["이름"], `${ri}-${ci}`));
  });
  return map;
}

function expSaveState() {
  try {
    const inputs = {};
    Object.entries(expCalc.inputs).forEach(([key, value]) => {
      const name = expNameOf(key);
      if (name && value !== "") inputs[name] = value;
    });
    localStorage.setItem(EXP_SAVE_KEY, JSON.stringify({
      기본: (expCalc.data?.["기본경험치"] || [])[expCalc.baseIndex]?.["이름"] || "",
      기본직접: expCalc.baseCustom,
      버프: [...expCalc.checked].map(expNameOf).filter(Boolean),
      입력: inputs,
    }));
  } catch {
    // 저장 공간 부족 등은 무시 (저장은 편의일 뿐)
  }
}

function expRestoreState() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(EXP_SAVE_KEY) || "null");
  } catch {
    return;
  }
  if (!saved) return;

  const bases = expCalc.data?.["기본경험치"] || [];
  const baseIndex = bases.findIndex((base) => base["이름"] === saved["기본"]);
  if (baseIndex >= 0) expCalc.baseIndex = baseIndex;
  expCalc.baseCustom = saved["기본직접"] || "";

  // 저장한 뒤 이름이 사라졌거나 배타 규칙이 바뀌었을 수 있다.
  // 하나씩 넣으면서 그때그때 잠기는지 보고, 충돌하는 건 버린다.
  const byName = expKeyByName();
  (saved["버프"] || []).forEach((name) => {
    const key = byName.get(name);
    if (key && !expIsLocked(expBuffItem(key), key, expLockedGroups())) expCalc.checked.add(key);
  });
  Object.entries(saved["입력"] || {}).forEach(([name, value]) => {
    const key = byName.get(name);
    if (key) expCalc.inputs[key] = value;
  });
}

// 아이콘이 아직 없는 항목은 빈 자리를 남겨 나중에 채워 넣을 수 있게 한다.
// "buff/이름.png"처럼 하위 폴더를 적어도 되도록 세그먼트별로 인코딩한다.
function buffIconHtml(item) {
  // 아이콘이 없는 항목은 글자표기로 대신할 수 있다 (그외 이벤트 버프 = E)
  if (item["표기"]) return `<span class="buff-icon is-text" aria-hidden="true">${escapeHtml(item["표기"])}</span>`;
  // 아이콘이 없으면 자리도 비우지 않는다 (해피아워 등)
  if (!item["아이콘"]) return "";
  return `<span class="buff-icon"><img src="${BUFF_ICON_BASE}${encodeImagePath(item["아이콘"])}" alt="" loading="lazy" decoding="async" /></span>`;
}

function expBaseValue() {
  const list = expCalc.data?.["기본경험치"] || [];
  const picked = list[expCalc.baseIndex];
  if (!picked) return 0;
  if (picked["직접입력"]) return Number(expCalc.baseCustom) || 0;
  return Number(picked["값"]) || 0;
}

// 일반 경험치 배율 = 1 + (선택한 버프 배율의 합)
// 원래 공식이 [[[기본 × 일반배율] × 해피아워] × 펫스킬] 이라
// 해피아워·펫 스킬은 일반 배율에 더하지 않고 따로 곱한다.
function expRates() {
  let sum = 0;
  const mults = [];
  (expCalc.data?.["버프"] || []).forEach((row, ri) => {
    row.forEach((item, ci) => {
      const key = `${ri}-${ci}`;
      if (!expCalc.checked.has(key)) return;
      if (item["곱연산"]) mults.push({ name: item["이름"], value: Number(item["배수"]) || 1, group: Number(item["그룹"]) || 3 });
      else if (item["입력"]) sum += (Number(expCalc.inputs[key]) || 0) / 100;
      else sum += Number(item["배율"]) || 0;
    });
  });
  return { normal: 1 + sum, mults };
}

function renderExpBase() {
  const list = expCalc.data?.["기본경험치"] || [];
  const picked = list[expCalc.baseIndex];
  // 버튼과 직접 입력칸을 한 줄에 둔다 ("기타"를 골랐을 때만 입력칸이 오른쪽에 붙는다)
  els.expBaseBox.innerHTML = `
    <p class="buff-section-title">기본 획득 경험치</p>
    <div class="buff-base-row">
      ${list.map((b, i) => `
        <button type="button" class="buff-base-btn${i === expCalc.baseIndex ? " is-active" : ""}" data-base-index="${i}">
          ${escapeHtml(b["이름"] || "")}
        </button>
      `).join("")}
      ${picked?.["직접입력"] ? `
        <input id="expBaseCustom" class="buff-base-input" type="number" min="0" step="1"
          inputmode="numeric" placeholder="기본 경험치 직접 입력" value="${escapeHtml(expCalc.baseCustom)}" />
      ` : ""}
    </div>
  `;
}

function renderExpResult() {
  const base = expBaseValue();
  const { normal, mults } = expRates();
  const total = Math.floor(mults.reduce((acc, m) => acc * m.value, base * normal));
  const fmt = (n) => n.toLocaleString("ko-KR");
  // 선택한 곳에 딸린 설명(예: 골고다 2종 평균)은 그 값 바로 옆에 붙여야 뜻이 통한다
  const note = (expCalc.data?.["기본경험치"] || [])[expCalc.baseIndex]?.["비고"];
  els.expResultBox.innerHTML = `
    <div class="buff-result-row">
      <span>기본 경험치${note ? `<em class="buff-base-note">${escapeHtml(note)}</em>` : ""}</span><strong>${fmt(base)}</strong>
    </div>
    ${mults.map((m) => `
      <div class="buff-result-row" data-group="${m.group}">
        <span>${escapeHtml(m.name)}</span><strong>×${m.value}</strong>
      </div>
    `).join("")}
    <div class="buff-result-row" data-group="3">
      <span>일반 경험치 배율</span><strong>×${normal.toFixed(2)}</strong>
    </div>
    <div class="buff-result-row is-total">
      <span>획득 경험치</span><strong>${fmt(total)}</strong>
    </div>
  `;
}

// 배타 그룹을 공유하는 항목끼리는 같이 못 쓴다. 그룹은 줄을 넘나든다
// (눈사람족 특제 포션은 일루미네이션과도, 클럽/에오스 파편과도 충돌한다).
const expBuffItem = (key) => {
  const [ri, ci] = String(key).split("-").map(Number);
  return expCalc.data?.["버프"]?.[ri]?.[ci] || null;
};

function expExclOf(item) {
  return Array.isArray(item?.["배타"]) ? item["배타"] : [];
}

// 지금 체크된 항목들이 점유한 배타 그룹과, 그 그룹을 점유한 항목의 키
function expLockedGroups() {
  const held = new Map();
  (expCalc.data?.["버프"] || []).forEach((row, ri) => {
    row.forEach((item, ci) => {
      const key = `${ri}-${ci}`;
      if (!expCalc.checked.has(key)) return;
      expExclOf(item).forEach((g) => held.set(g, key));
    });
  });
  return held;
}

// 자기가 점유한 그룹은 빼고 본다. 안 그러면 켜진 항목이 스스로를 잠근다
const expIsLocked = (item, key, held) =>
  expExclOf(item).some((g) => held.has(g) && held.get(g) !== key);

// 숫자를 직접 넣는 항목(투구/시오칸 코어)은 값이 정해져 있지 않으니 표기하지 않는다
function expRateLabel(item) {
  if (item["입력"]) return "";
  if (item["곱연산"]) return `<span class="buff-rate">x${item["배수"]}</span>`;
  const rate = Number(item["배율"]) || 0;
  return rate ? `<span class="buff-rate">+${Math.round(rate * 1000) / 10}%</span>` : "";
}

// "택 1" 안내 문구 대신 체크박스를 잠가서 규칙 자체로 드러낸다.
function expItemHtml(item, ri, ci, locked) {
  const key = `${ri}-${ci}`;
  const on = expCalc.checked.has(key);
  return `
    <label class="buff-item${locked ? " is-locked" : ""}">
      <input type="checkbox" class="buff-check" data-buff-key="${key}"${on ? " checked" : ""}${locked ? " disabled" : ""} />
      ${buffIconHtml(item)}
      <span class="buff-name">${escapeHtml(item["이름"] || "")}</span>
      ${expRateLabel(item)}
    </label>
    ${item["입력"] && on ? `
      <input class="buff-num" data-buff-input="${key}" type="number"
        min="${item["입력"]["최소"]}" max="${item["입력"]["최대"]}" step="1" inputmode="numeric"
        placeholder="${item["입력"]["최소"]}~${item["입력"]["최대"]}" value="${escapeHtml(expCalc.inputs[key] || "")}" />
      <span class="buff-unit">${escapeHtml(item["입력"]["단위"] || "")}</span>
    ` : ""}
  `;
}

// 그룹은 데이터(그룹 필드)로 정한다. 배치와 색을 순서에 의존시키지 않기 위해서다.
const expGroupOf = (item) => Number(item?.["그룹"]) || 3;

// 못 쓰는 조합은 체크박스 잠금으로 드러나므로 묶음 테두리를 두지 않는다.
// 모든 항목이 같은 크기의 한 칸을 쓴다.
function expCellHtml(entry, held) {
  const { item, key, first } = entry;
  const [ri, ci] = key.split("-").map(Number);
  // 데이터의 한 줄이 화면의 한 줄이다. 두 칸짜리 줄 뒤에 다음 줄이 딸려 올라오지 않도록
  // 줄의 첫 칸을 1열에 고정한다.
  return `<div class="buff-cell" data-group="${expGroupOf(item)}"${first ? ' style="grid-column-start:1"' : ""}>
    ${expItemHtml(item, ri, ci, expIsLocked(item, key, held))}
  </div>`;
}

function renderExpBuffs() {
  const held = expLockedGroups();
  const all = [];
  (expCalc.data?.["버프"] || []).forEach((row, ri) => {
    row.forEach((item, ci) => all.push({ item, key: `${ri}-${ci}`, first: ci === 0 }));
  });

  // 곱해지는 단계(그룹1 해피아워 / 그룹2 펫 스킬)는 성격이 달라 맨 위에 두고,
  // 더해지는 일반 배율(그룹3)만 아래 격자에 넣는다.
  const top = all.filter((e) => expGroupOf(e.item) < 3);
  const rest = all.filter((e) => expGroupOf(e.item) === 3);

  // 그룹3은 접속 종료 시 버프 시간이 흐르는지로 다시 둘로 나눠 보여준다
  const label = expCalc.data?.["소분류"] || {};
  const section = (title, list) => (list.length ? `
    <p class="buff-sub-title">${escapeHtml(title)}</p>
    <div class="buff-grid">${list.map((e) => expCellHtml(e, held)).join("")}</div>
  ` : "");

  els.expBuffBody.innerHTML = `
    ${top.length ? `<div class="buff-top">${top.map((e) => expCellHtml(e, held)).join("")}</div>` : ""}
    <p class="buff-section-title">버프 아이템 목록</p>
    ${section(label["소진"] || "접속 종료 시에도, 버프 시간 소진되는 버프 목록", rest.filter((e) => e.item["소진"]))}
    ${section(label["유지"] || "접속 종료 시, 버프 시간 소진 안되는 버프 목록", rest.filter((e) => !e.item["소진"]))}
  `;
}

function renderExpCalculator() {
  renderExpBase();
  renderExpBuffs();
  renderExpResult();
}

async function loadExpBuffs() {
  if (expBuffLoaded || !els.expBuffBody) return;
  expBuffLoaded = true;
  try {
    const res = await fetch(EXP_BUFF_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    expCalc.data = await res.json();
    expRestoreState();
    renderExpCalculator();
  } catch (error) {
    expBuffLoaded = false;
    console.warn("경험치 버프 데이터를 불러오지 못했습니다.", error);
    els.expBuffBody.innerHTML = '<div class="coming-soon">경험치 버프 정보를 불러오지 못했습니다.</div>';
  }
}

// ══════════════════════════════════════════════════════════════
//  TWChatOverlay 탭 — GitHub README + 최신 릴리스 다운로드
// ══════════════════════════════════════════════════════════════

const OVERLAY_REPO = "TWHome-Git/TWChatOverlay";
const OVERLAY_REPO_URL = `https://github.com/${OVERLAY_REPO}`;
const OVERLAY_RAW_BASE = `https://raw.githubusercontent.com/${OVERLAY_REPO}/HEAD/`;
const OVERLAY_README_API = `https://api.github.com/repos/${OVERLAY_REPO}/readme`;
const OVERLAY_RELEASE_API = `https://api.github.com/repos/${OVERLAY_REPO}/releases/latest`;
// 베타는 태그를 직접 지정한다. 새 베타가 나오면 이 값만 바꾸면 된다.
const OVERLAY_BETA_TAG = "5.0.0";
const OVERLAY_BETA_API = `https://api.github.com/repos/${OVERLAY_REPO}/releases/tags/${OVERLAY_BETA_TAG}`;

// "idle"일 때만 요청한다. 실패하면 다시 "idle"로 되돌려서 탭을 다시 눌렀을 때 재시도되게 한다.
const overlay = { readme: "idle", release: "idle" };

function loadOverlayTab() {
  if (overlay.readme === "idle") loadOverlayReadme();
  if (overlay.release === "idle") loadOverlayRelease();
}

// 릴리스 하나를 읽어 버튼에 첨부 파일 링크와 버전 정보를 채운다
async function fillOverlayRelease(apiUrl, link, metaEl, fallbackHref, fallbackText) {
  if (!link || !metaEl) return true;   // 버튼이 없으면 실패로 치지 않는다

  try {
    const response = await fetch(apiUrl, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw new Error(`Release ${response.status}`);
    const release = await response.json();

    const assets = Array.isArray(release.assets) ? release.assets : [];
    const asset = assets.find((item) => /\.zip$/i.test(item.name || "")) || assets[0];

    // 첨부 파일이 있으면 바로 받아지게, 없으면 릴리스 페이지로 보낸다
    link.href = asset?.browser_download_url || release.html_url || fallbackHref;

    const meta = [];
    if (release.tag_name) meta.push(`v${String(release.tag_name).replace(/^v/i, "")}`);
    if (asset?.size) meta.push(formatOverlaySize(asset.size));
    if (release.published_at) meta.push(String(release.published_at).slice(0, 10));
    metaEl.textContent = meta.join(" · ") || fallbackText;

    return true;
  } catch (error) {
    console.warn("TWChatOverlay 릴리스 정보를 불러오지 못했습니다.", apiUrl, error);
    link.href = fallbackHref;
    metaEl.textContent = fallbackText;
    return false;
  }
}

async function loadOverlayRelease() {
  if (!els.overlayDownload || !els.overlayReleaseMeta) return;
  overlay.release = "loading";

  const results = await Promise.all([
    fillOverlayRelease(
      OVERLAY_RELEASE_API,
      els.overlayDownload,
      els.overlayReleaseMeta,
      `${OVERLAY_REPO_URL}/releases/latest`,
      "Latest Release"
    ),
    fillOverlayRelease(
      OVERLAY_BETA_API,
      els.overlayBetaDownload,
      els.overlayBetaMeta,
      `${OVERLAY_REPO_URL}/releases/tag/${OVERLAY_BETA_TAG}`,
      `v${OVERLAY_BETA_TAG}`
    ),
  ]);

  // 하나라도 실패하면 탭을 다시 눌렀을 때 재시도한다
  overlay.release = results.every(Boolean) ? "loaded" : "idle";
}

function formatOverlaySize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}

async function loadOverlayReadme() {
  if (!els.overlayReadme) return;
  overlay.readme = "loading";
  els.overlayReadme.innerHTML = `
    <div class="overlay-loading">
      <div class="loading-spinner" role="status" aria-label="불러오는 중"></div>
      <span>README를 불러오는 중입니다.</span>
    </div>
  `;

  try {
    els.overlayReadme.innerHTML = await fetchOverlayReadme();
    decorateOverlayReadme();
    overlay.readme = "loaded";
  } catch (error) {
    console.warn("TWChatOverlay README를 불러오지 못했습니다.", error);
    overlay.readme = "idle";
    els.overlayReadme.innerHTML = `
      <div class="empty-state overlay-error">
        <strong>README를 불러오지 못했습니다</strong>
        <span>GitHub 응답이 없거나 API 요청 한도에 걸렸을 수 있습니다.</span>
        <div class="overlay-error-actions">
          <button class="sim-btn" type="button" data-overlay-retry>다시 시도</button>
          <a href="${OVERLAY_REPO_URL}#readme" target="_blank" rel="noopener noreferrer">GitHub에서 바로 보기</a>
        </div>
      </div>
    `;
    els.overlayReadme.querySelector("[data-overlay-retry]")?.addEventListener("click", loadOverlayReadme);
  }
}

// 1순위는 GitHub이 직접 렌더링해준 HTML이다. 문법 재현이 정확하고 서버에서 살균까지 끝난 상태다.
// API 요청 한도(비로그인 시간당 60회)에 걸리면 raw 마크다운을 받아 내장 변환기로 그린다.
async function fetchOverlayReadme() {
  try {
    const response = await fetch(OVERLAY_README_API, { headers: { Accept: "application/vnd.github.html" } });
    if (!response.ok) throw new Error(`README ${response.status}`);
    return await response.text();
  } catch (error) {
    console.info("GitHub README API 실패. raw 마크다운으로 대체합니다.", error);
    const response = await fetch(`${OVERLAY_RAW_BASE}README.md`);
    if (!response.ok) throw new Error(`README raw ${response.status}`);
    return renderOverlayMarkdown(await response.text());
  }
}

// README는 저장소 루트 기준으로 쓰여 있어서, 상대 경로를 GitHub 절대 주소로 바꿔줘야 한다.
function decorateOverlayReadme() {
  els.overlayReadme.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href") || "";

    if (href.startsWith("#")) {
      // 문서 내 앵커는 탭 안에서 페이지 전체를 튀게 만들어서 비활성화한다
      anchor.removeAttribute("href");
      anchor.classList.add("is-inert");
      return;
    }

    const resolved = resolveOverlayUrl(href, `${OVERLAY_REPO_URL}/blob/HEAD/`);
    if (!resolved) {
      anchor.removeAttribute("href");
      return;
    }
    anchor.href = stabilizeOverlayImageUrl(resolved);
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  });

  els.overlayReadme.querySelectorAll("img[src]").forEach((image) => {
    const resolved = resolveOverlayUrl(image.getAttribute("src") || "", OVERLAY_RAW_BASE);
    if (resolved) image.src = stabilizeOverlayImageUrl(resolved);
    image.loading = "lazy";
    image.decoding = "async";
  });
}

// GitHub README API는 첨부 이미지를 5분짜리 서명 URL(private-user-images)로 바꿔서 내려준다.
// 지연 로딩으로 아래쪽 이미지를 나중에 불러오면 이미 만료된 뒤라서 깨진다.
// 파일명에 남아 있는 UUID로 만료되지 않는 user-attachments 주소를 복원한다.
function stabilizeOverlayImageUrl(url) {
  if (!/^https:\/\/private-user-images\.githubusercontent\.com\//i.test(url)) return url;
  const uuid = /-([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\.[a-z0-9]+(?:[?#]|$)/i.exec(url)?.[1];
  return uuid ? `https://github.com/user-attachments/assets/${uuid}` : url;
}

function resolveOverlayUrl(value, base) {
  try {
    const url = new URL(value, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch (error) {
    return "";
  }
}

// GitHub API가 막혔을 때만 쓰는 최소 마크다운 변환기.
// 이 README가 실제로 쓰는 문법(제목 / 목록 / 강조 / 링크 / 이미지 / 구분선 / 코드)만 다룬다.
function renderOverlayMarkdown(source) {
  const rawImages = [];

  const text = String(source)
    .replace(/^\uFEFF+/, "")
    .replace(/\r\n?/g, "\n")
    // 마크다운에 직접 박아둔 <img> 태그는 허용 속성만 남겨 따로 보관했다가 마지막에 되돌린다
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] || "";
      if (!resolveOverlayUrl(src, OVERLAY_RAW_BASE)) return "";
      const alt = /\balt\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] || "";
      rawImages.push(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`);
      return `@@TWIMG${rawImages.length - 1}@@`;
    });

  const inline = (value) => escapeHtml(value)
    .replace(/`([^`]+)`/g, (match, code) => `<code>${code}</code>`)
    .replace(/!\[([^\]]*)\]\(\s*([^)\s]+)[^)]*\)/g, (match, alt, url) => `<img src="${url}" alt="${alt}" />`)
    .replace(/\[([^\]]+)\]\(\s*([^)\s]+)[^)]*\)/g, (match, label, url) => `<a href="${url}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/@@TWIMG(\d+)@@/g, (match, index) => rawImages[Number(index)] || "");

  const out = [];
  const stack = []; // 열려 있는 목록 { tag, indent }
  let paragraph = [];
  let codeLines = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const closeLists = (indent = -1) => {
    while (stack.length && stack[stack.length - 1].indent > indent) {
      out.push(`</li></${stack.pop().tag}>`);
    }
  };

  const openItem = (indent, tag, content) => {
    flushParagraph();
    closeLists(indent);

    if (!stack.length || indent > stack[stack.length - 1].indent) {
      stack.push({ tag, indent });
      out.push(`<${tag}>`);
    } else {
      out.push("</li>");
      if (stack[stack.length - 1].tag !== tag) {
        out.push(`</${stack.pop().tag}>`);
        stack.push({ tag, indent });
        out.push(`<${tag}>`);
      }
    }
    out.push(`<li>${inline(content)}`);
  };

  text.split("\n").forEach((line) => {
    const fence = /^\s*```/.test(line);
    if (fence) {
      if (codeLines) {
        out.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = null;
      } else {
        flushParagraph();
        closeLists();
        codeLines = [];
      }
      return;
    }
    if (codeLines) {
      codeLines.push(line);
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      return;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      closeLists();
      const level = Math.min(heading[1].length + 1, 6); // 페이지에 h1이 이미 있어서 한 단계씩 낮춘다
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      return;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushParagraph();
      closeLists();
      out.push("<hr />");
      return;
    }

    const bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      openItem(bullet[1].length, "ul", bullet[2]);
      return;
    }

    const ordered = /^(\s*)\d+[.)]\s+(.*)$/.exec(line);
    if (ordered) {
      openItem(ordered[1].length, "ol", ordered[2]);
      return;
    }

    // 목록 안에서 들여쓴 본문(주로 스크린샷)은 현재 <li>에 이어 붙인다
    if (stack.length && /^\s+/.test(line)) {
      out.push(`<div>${inline(line.trim())}</div>`);
      return;
    }

    flushParagraph();
    closeLists();
    paragraph.push(line.trim());
  });

  if (codeLines) out.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  flushParagraph();
  closeLists();

  return out.join("");
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

// 스탯 창에 뜨는 표기. 게임과 같은 말로 적어야 옮겨 적기 쉽다.
const STAT_ABBR = {
  찌르기: "Stab",
  베기: "Hack",
  마법공격: "Int",
  마법방어: "MR",
};

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

// 계수 계산기의 계수(T)로 최종 계수를 구한다. dmgApplySnapshot과 같은 식이다.
// 스탯 계수는 장비와 무관하게 고정이라 따로 받는다.
function calcFinalCoefficient(total, statCoefficient) {
  const equipment = Math.max(0, total - statCoefficient);
  const bonus = Math.floor((equipment / 25.0) * (0.05 + 0.03 * 5)) * 25.0;
  return Math.floor(statCoefficient + equipment) + bonus;
}

// 방어 관통(최종계수 + 1 - 방어)이 0 이상이 되는 최소 계수.
// 최종 계수가 계수에 대해 단조 증가라 이분 탐색으로 찾는다.
function calcPierceRequirement(defense, statCoefficient) {
  let lo = statCoefficient;
  let hi = statCoefficient + defense * 2 + 1000;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (calcFinalCoefficient(mid, statCoefficient) + 1 - defense >= 0) hi = mid;
    else lo = mid + 1;
  }
  return lo;
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

// 입력 필드 → 한계치 힌트 필드 매핑 (마우스 오버 시 MAX 표기)
const HINT_FIELD_BY_INPUT = {
  attackEnchant: "attackEnchantMaxHint",
  defenseEnchant: "defenseEnchantMaxHint",
  hitValue: "hitMaxHint",
  primaryStatValue: "primaryStatMaxHint",
  secondaryStatValue: "secondaryStatMaxHint",
};

function makeNumberInput(row, field, onCommit) {
  const input = document.createElement("input");
  input.type = "number";
  input.value = f0(row[field]);
  input.dataset.field = field;
  const hintField = HINT_FIELD_BY_INPUT[field];
  const showHint = row.isStat
    ? field === "primaryStatValue" || field === "secondaryStatValue"
    : !row.isAbility && !ACCESSORY_SLOTS.includes(row.slotName);
  if (hintField && showHint) input.title = row[hintField];
  input.addEventListener("input", () => {
    row[field] = Number(input.value) || 0;
    recalcRow(row, calc.type);
    if (onCommit) onCommit();
    updateDerived();
  });
  return input;
}

// label: 폰에서 표를 카드로 펼 때 값 앞에 붙일 이름 (머리글이 안 보인다)
function cellWith(node, className, label) {
  const td = document.createElement("td");
  if (className) td.className = className;
  if (label) td.dataset.label = label;
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

  // 사이드 헤더. 스탯 표는 게임 안 표기(Stab/Hack/Int/MR)를 그대로 쓴다.
  els.sideHeadPrimary.textContent = primary;
  els.sideHeadSecondary.textContent = secondary;
  if (els.statHeadPrimary) els.statHeadPrimary.textContent = STAT_ABBR[primary] || primary;
  if (els.statHeadSecondary) els.statHeadSecondary.textContent = STAT_ABBR[secondary] || secondary;

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
      tr.appendChild(cellWith(typeSelect, null, "능력 타입"));

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

      const coeff = cellWith(f0(row.coefficient), "coeff-cell", "계수");
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
    tr.appendChild(cellWith(select, null, "아이템"));

    tr.appendChild(cellWith(makeNumberInput(row, "attackValue"), null, primary));
    tr.appendChild(cellWith(makeNumberInput(row, "attackEnchant"), null, `강화 ${primary}`));
    tr.appendChild(cellWith(makeNumberInput(row, "defenseValue"), null, secondary));
    tr.appendChild(cellWith(makeNumberInput(row, "defenseEnchant"), null, `강화 ${secondary}`));
    tr.appendChild(cellWith(makeNumberInput(row, "hitValue"), null, "명중"));

    const coeff = cellWith(f0(row.coefficient), "coeff-cell", "계수");
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
  els.coefficientStatBody?.replaceChildren();

  const addAccCoeff = (name, td) => calc.dom.accCoeff.set(name, td);

  // 스탯·덱스는 캐릭터 창에서 그대로 옮겨 적는 값이라 위쪽 표로 떼어 놓는다.
  const buildRow = (label, cells, body = els.coefficientSideBody) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = label;
    tr.appendChild(th);
    for (const c of cells) tr.appendChild(c);
    body.appendChild(tr);
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
  ], els.coefficientStatBody || els.coefficientSideBody);

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
  (els.coefficientStatBody || els.coefficientSideBody).appendChild(dexTr);

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
  // 주/보조 스탯은 "기본(강화)" 한 칸으로 합쳐 자리를 아끼고,
  // 맨 왼쪽에 총 주스탯을 둔다 (콘텐츠 요약 줄에서 올라온 값).
  const withEnchant = (base, enchant) => `${f0(base)}(${f0(enchant)})`;
  els.coefficientMainTotal.innerHTML = [
    [`총 ${pLabel}`, f0(totals.totalPrimarySum)],
    [pLabel, withEnchant(totals.primaryBaseSum, totals.primaryEnchantSum)],
    [sLabel, withEnchant(totals.secondarySum, totals.secondaryEnchantSum)],
    ["명중", f0(totals.hitSum)],
    ["계수", f2(totals.totalCoefficient)],
  ]
    .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");

  // 방어 관통: 지금 계수로 그 콘텐츠에 대미지가 들어가는지
  if (els.coefficientPierce) {
    const statRow = accRow("스탯");
    const statCoef = statRow ? statRow.coefficient : 0;
    const coreCoef = accRow("코어")?.coefficient || 0;
    els.coefficientPierce.innerHTML = PIERCE_TARGETS.map((t) => {
      const cur = totals.totalCoefficient - (t.noCore ? coreCoef : 0);
      const need = calcPierceRequirement(t.defense, statCoef);
      const gap = Math.round(cur - need);
      const ok = gap >= 0;
      return `<div>
        <span>${escapeHtml(t.name)}</span>
        <strong class="${ok ? "is-ok" : "is-no"}">${ok ? "가능" : "불가능"}</strong>
        <em>${gap >= 0 ? "+" : "\u2212"}${f0(Math.abs(gap))}</em>
      </div>`;
    }).join("");
  }

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

  els.dbTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateDbTab(button.dataset.dbTab);
    });
  });

  els.abilityCategorySelect?.addEventListener("change", () => {
    ability.category = els.abilityCategorySelect.value;
    renderAbilityList();
  });

  // 어빌리티 이미지 로드 실패 시 임시 X 표시 (error는 버블링되지 않으므로 캡처 단계에서 위임)
  els.abilityListBody?.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement) {
      event.target.hidden = true;
      event.target.closest(".ability-thumb")?.classList.add("is-missing");
    }
  }, true);

  let abilitySearchTimer = null;
  els.abilitySearchInput?.addEventListener("input", () => {
    clearTimeout(abilitySearchTimer);
    abilitySearchTimer = setTimeout(() => {
      ability.query = els.abilitySearchInput.value.trim().toLowerCase();
      renderAbilityList();
      routeWrite();
    }, 200);
  });

  const applyAvatarFilter = (key) => (event) => {
    avatar[key] = event.currentTarget.value;
    avatar.view = "list";
    avatar.listScroll = 0;
    renderAvatar();
  };
  els.avatarSourceSelect?.addEventListener("change", applyAvatarFilter("source"));
  els.avatarSlotSelect?.addEventListener("change", applyAvatarFilter("slot"));

  let avatarSearchTimer = null;
  els.avatarSearchInput?.addEventListener("input", () => {
    clearTimeout(avatarSearchTimer);
    avatarSearchTimer = setTimeout(() => {
      avatar.query = els.avatarSearchInput.value.trim().toLowerCase();
      avatar.view = "list";
      avatar.listScroll = 0;
      renderAvatar();
    }, 200);
  });

  els.avatarListBody?.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-index]");
    if (!row) return;
    avatar.listScroll = els.avatarListWrap?.scrollTop || 0;
    avatar.detailIndex = Number(row.dataset.index);
    avatar.view = "detail";
    renderAvatar();
    routeWrite();
  });

  els.avatarViewTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-avatar-view]");
    if (button) setAvatarImageMode(button.dataset.avatarView);
  });

  els.avatarBackButton?.addEventListener("click", () => {
    avatar.view = "list";
    renderAvatar();
    routeWrite();
  });

  // 아바타 아이콘 로드 실패 시 임시 X 표시
  els.avatarListBody?.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement) {
      event.target.hidden = true;
      event.target.closest(".ability-thumb")?.classList.add("is-missing");
    }
  }, true);

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

  els.extraTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateExtraTab(button.dataset.extraTab);
    });
  });

  els.buffTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateBuffTab(button.dataset.buffTab);
    });
  });

  els.expBaseBox?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-base-index]");
    if (!button) return;
    expCalc.baseIndex = Number(button.dataset.baseIndex);
    expSaveState();
    renderExpBase();
    renderExpResult();
    document.querySelector("#expBaseCustom")?.focus();
  });

  els.expBaseBox?.addEventListener("input", (event) => {
    if (event.target.id !== "expBaseCustom") return;
    expCalc.baseCustom = event.target.value;
    expSaveState();
    renderExpResult();
  });

  els.expBuffBody?.addEventListener("change", (event) => {
    const box = event.target.closest(".buff-check");
    if (!box) return;
    const key = box.dataset.buffKey;
    if (box.checked) {
      // 충돌하는 건 이미 잠겨서 여기 올 일이 없지만, 방어적으로 비운다
      const held = expLockedGroups();
      expExclOf(expBuffItem(key)).forEach((g) => {
        if (held.has(g)) expCalc.checked.delete(held.get(g));
      });
      expCalc.checked.add(key);
    } else {
      expCalc.checked.delete(key);
    }
    expSaveState();
    renderExpBuffs();
    renderExpResult();
    els.expBuffBody.querySelector(`[data-buff-input="${key}"]`)?.focus();
  });

  els.expBuffBody?.addEventListener("input", (event) => {
    const key = event.target.dataset?.buffInput;
    if (!key) return;
    expCalc.inputs[key] = event.target.value;
    expSaveState();
    renderExpResult();
  });

  // 범위를 벗어난 입력은 포커스를 뗄 때 최소/최대로 맞춘다
  els.expBuffBody?.addEventListener("blur", (event) => {
    const input = event.target;
    const key = input.dataset?.buffInput;
    if (!key || input.value === "") return;
    const clamped = Math.min(Number(input.max), Math.max(Number(input.min), Number(input.value)));
    if (String(clamped) !== input.value) {
      expCalc.inputs[key] = String(clamped);
      input.value = expCalc.inputs[key];
      expSaveState();
      renderExpResult();
    }
  }, true);

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
    state.view = "list";
    state.listScroll = 0;
    populateTypeSelect();
    applyFilters();
  });

  els.typeSelect.addEventListener("change", () => {
    state.type = els.typeSelect.value;
    state.page = 0;
    state.view = "list";
    state.listScroll = 0;
    applyFilters();
  });

  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value.trim().toLowerCase();
    state.page = 0;
    state.view = "list";
    state.listScroll = 0;
    applyFilters();
  });

  let etaSearchTimer = null;
  els.etaSearchInput?.addEventListener("input", () => {
    clearTimeout(etaSearchTimer);
    etaSearchTimer = setTimeout(() => {
      eta.query = els.etaSearchInput.value.trim().toLowerCase();
      etaResetScroll();
      renderEtaRanking();
    }, 250);
  });

  els.etaDateSelect?.addEventListener("change", () => {
    eta.date = els.etaDateSelect.value;
    const sha = eta.date ? eta.index?.[eta.date] : null;
    etaResetScroll();
    loadEtaRankings(sha ? etaSnapshotUrl(sha) : ETA_RANKING_URL);
  });

  els.etaTabButtons.forEach((button) => {
    button.addEventListener("click", () => activateEtaTab(button.dataset.etaTab));
  });
  wireEtaCalc();

  els.etaCompareSelect?.addEventListener("change", () => {
    eta.compareDays = Number(els.etaCompareSelect.value) || 1;
    loadEtaPreviousRankings(etaLoadSeq);
  });

  els.etaServerTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-eta-server]");
    if (!button || button.dataset.etaServer === eta.server) return;
    eta.server = button.dataset.etaServer;
    eta.category = "전체";
    etaResetScroll();
    renderEtaServerTabs();
    renderEtaSidebar();
    renderEtaRanking();
  });

  els.etaSidebar?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-eta-category]");
    if (!button) return;
    eta.category = button.dataset.etaCategory;
    els.etaSidebar.querySelectorAll("[data-eta-category]").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    etaResetScroll();
    renderEtaRanking();
  });

  els.etaRankingBody?.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement) event.target.hidden = true;
  }, true);

  els.equipmentListBody?.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-index]");
    if (!row) return;
    openEquipmentDetail(Number(row.dataset.index));
  });

  // 목록 썸네일 이미지 로드 실패 시 숨김 (error는 버블링되지 않으므로 캡처 단계에서 위임)
  els.equipmentListBody?.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement) event.target.hidden = true;
  }, true);

  els.backToListButton?.addEventListener("click", () => {
    state.view = "list";
    render();
    routeWrite();
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
  routeResolvePending();
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

  const isList = state.view === "list";
  els.listWorkspace.hidden = !isList;
  els.detailWorkspace.hidden = isList;
  els.backToListButton.hidden = isList;
  els.prevButton.hidden = isList;
  els.nextButton.hidden = isList;
  els.pageLabel.hidden = isList;

  if (isList) {
    renderList();
    return;
  }

  els.pageLabel.textContent = state.filtered.length ? `${state.page + 1} / ${state.filtered.length}` : "0 / 0";
  els.prevButton.disabled = state.page <= 0;
  els.nextButton.disabled = state.page >= state.filtered.length - 1;
  renderCard();
  populateCompareSelect();
  renderCompare();
}

function openEquipmentDetail(index) {
  state.listScroll = els.equipListWrap?.scrollTop || 0;
  state.page = clamp(index, 0, Math.max(0, state.filtered.length - 1));
  state.view = "detail";
  render();
  routeWrite();
}

function renderList() {
  if (!state.filtered.length) {
    els.equipmentListBody.innerHTML = listPlaceholderRow(
      STAT_NAMES.length + 1,
      state.records.length > 0,
      "검색 결과가 없습니다",
      "조건을 조금 넓혀보세요.",
    );
    return;
  }

  els.equipmentListBody.innerHTML = state.filtered.map((record, index) => {
    const thumb = record.imageFile
      ? `<img src="${IMAGE_BASE}${encodeURIComponent(record.imageFile)}" alt="" loading="lazy" decoding="async" />`
      : "";
    const statCells = STAT_NAMES.map((name) => listStatCellHtml(record.stats[name])).join("");
    return `
      <tr class="equip-row" data-index="${index}">
        <td class="equip-info-cell">
          <div class="equip-info">
            <span class="equip-thumb">${thumb}</span>
            <span class="equip-name-block">
              <strong>${escapeHtml(record.name)}</strong>
              <small>${escapeHtml(record.type)}</small>
            </span>
          </div>
        </td>
        ${statCells}
      </tr>
    `;
  }).join("");

  if (els.equipListWrap) els.equipListWrap.scrollTop = state.listScroll;
}

function listStatCellHtml(stat) {
  const isZero = stat.min <= 0 && stat.max <= 0 && stat.limit <= 0;
  if (isZero) return `<td class="equip-stat is-zero"><span class="range">-</span></td>`;

  const range = stat.max > 0
    ? (stat.min > 0 && stat.min !== stat.max ? `${formatNumber(stat.min)}-${formatNumber(stat.max)}` : formatNumber(stat.max))
    : "-";
  const limit = stat.limit > 0 ? `<span class="limit">${formatNumber(stat.limit)}</span>` : "";
  return `<td class="equip-stat"><span class="range">${range}</span>${limit}</td>`;
}

// 일반 장비 계수 가중치. recalcRow()의 마지막 분기(일반 장비)와 같은 값이다.
// [주스탯, 주스탯강화, 부스탯, 부스탯강화]
const COEF_WEIGHTS = {
  [CALC.STAB]: [23.75, 32.5, 3.75, 18.75],
  [CALC.HACK]: [23.75, 32.5, 3.75, 18.75],
  [CALC.MAGIC_ATTACK]: [23.75, 32.5, 2.5, 18.25],
  [CALC.MAGIC_DEFENSE]: [20.5, 32.5, 2.5, 16.75],
  [CALC.PHYSICAL_HYBRID]: [14.5, 28.75, 14.5, 28.75],
  [CALC.MAGIC_HACK]: [14.5, 28.75, 14.5, 28.75],
};

// 장비 한 개의 계수. 강화는 주스탯·보조스탯 중 한쪽에만 붙는다.
function equipmentCoefficient(record, type, primaryEnchant = 0, secondaryEnchant = 0) {
  const w = COEF_WEIGHTS[type];
  if (!w) return 0;
  const { pMax, sMax } = statByType(record, type);
  return w[0] * pMax + w[1] * Math.max(0, primaryEnchant)
       + w[2] * sMax + w[3] * Math.max(0, secondaryEnchant);
}

// 주스탯을 한계치까지 올렸을 때의 강화량 (= 스탯표의 "한계" 값)
function primaryEnchantCap(record, type) {
  const { pMax, pLimit } = statByType(record, type);
  return Math.max(0, pLimit - pMax);
}

function secondaryEnchantCap(record, type) {
  const { sMax, sLimit } = statByType(record, type);
  return Math.max(0, sLimit - sMax);
}

// 물리복합·마법베기는 두 스탯의 계수 가중치가 같아서(14.5 / 28.75) 어느 쪽을
// 강화해도 값어치가 같다. 그래서 한계치가 큰 쪽을 고르는 문제가 된다.
// 나머지 계열은 주스탯 강화가 확실히 유리해 보조스탯 강화를 따로 보여주지 않는다.
function hasTwoEnchantChoices(type) {
  const w = COEF_WEIGHTS[type];
  return !!w && w[1] === w[3];
}

// 이클립스부터가 상위 등급이다. 앞의 改-는 개조 표기라 등급 판단에서 무시한다.
// \b는 한글에서 경계로 잡히지 않으므로(\w가 ASCII 기준) 쓰지 않는다.
const HIGH_TIER_ARMOR = /^(?:改-)?(?:이클립스|세크리드)\s/;
// 밴드·방패는 강화작을 사실상 하지 않아 중간 단계를 빼둔다.
const NO_ENCHANT_STEP_TYPES = ["밴드", "방패"];

// 기본과 한계 사이에 끼워 보여줄 중간 강화 단계. 없으면 0.
function midEnchantStep(record) {
  if (record.category === "무기" || record.category === "손목") {
    return NO_ENCHANT_STEP_TYPES.includes(record.type) ? 0 : 28;
  }
  // 갑옷과 장비 세트(헬름·아뮬렛·윙·부츠·건틀렛)는 이클립스 등급부터 +30을 넣는다.
  if ((record.category === "갑옷" || record.category === "장비 세트") && HIGH_TIER_ARMOR.test(record.name)) return 30;
  return 0;
}

// 계열별 주스탯 / 부스탯 이름. statByType()이 어떤 스탯을 쓰는지와 짝을 맞춘다.
const COEF_STAT_NAMES = {
  [CALC.STAB]: ["찌르기", "베기"],
  [CALC.HACK]: ["베기", "찌르기"],
  [CALC.MAGIC_ATTACK]: ["마법공격", "마법방어"],
  [CALC.MAGIC_DEFENSE]: ["마법방어", "마법공격"],
  [CALC.PHYSICAL_HYBRID]: ["찌르기", "베기"],
  [CALC.MAGIC_HACK]: ["베기", "마법공격"],
};

// 계수 칸 목록. [라벨, 강화량] 순으로 기본 → 중간 → 한계.
function coefficientSteps(record, type) {
  const cap = primaryEnchantCap(record, type);
  const [primaryName, secondaryName] = COEF_STAT_NAMES[type] || ["주스탯", "부스탯"];
  const steps = [{ label: "기본", p: 0, s: 0 }];
  const mid = midEnchantStep(record);
  // 한계보다 큰 강화는 불가능하므로 그런 경우엔 중간 단계를 건너뛴다.
  if (mid > 0 && mid < cap) steps.push({ label: `+${mid} ${primaryName}`, p: mid, s: 0, limit: false });
  steps.push({ label: `+${formatNumber(cap)} ${primaryName}`, p: cap, s: 0, limit: true });

  // 두 스탯 중 어느 쪽을 강화해도 값어치가 같은 계열이면, 보조스탯 쪽 한계도 낸다.
  // 중간 단계(+28)는 가중치가 같아 양쪽 값이 똑같으므로 따로 내지 않는다.
  if (hasTwoEnchantChoices(type)) {
    const sCap = secondaryEnchantCap(record, type);
    if (sCap > 0) steps.push({ label: `+${formatNumber(sCap)} ${secondaryName}`, p: 0, s: sCap, limit: true });
  }
  return steps;
}

// 소수점이 남을 수 있어 최대 두 자리까지만 보여준다.
function formatCoefficient(value) {
  return Number(value.toFixed(2)).toLocaleString("ko-KR");
}

// 아티팩트 분류 표기가 시트와 슬롯표에서 조금씩 달라서 맞춰준다.
// 예) "마법 베기" -> "마법베기", "마법방어(신성)" -> "신성"
function normalizeArtifactType(value) {
  const text = String(value || "").replace(/\s+/g, "");
  return text.includes("신성") ? "신성" : text;
}

// 아티팩트는 분류 자체가 계열이다. 착용 조건이 없어도 계열이 하나로 정해진다.
const ARTIFACT_TYPE_TO_CALC = {
  찌르기: CALC.STAB,
  베기: CALC.HACK,
  마법공격: CALC.MAGIC_ATTACK,
  신성: CALC.MAGIC_DEFENSE,
  물리복합: CALC.PHYSICAL_HYBRID,
  마법베기: CALC.MAGIC_HACK,
};

// 이 장비의 분류(해머 / 리스트 / 아머 ...)가 해당 캐릭터·계열 조합에서 쓰이는지 본다.
// 슬롯표에 없는 카테고리(장비 세트 등)는 분류로 좁히지 않는다.
function slotMatchesRecord(slot, record) {
  if (!slot) return false;
  switch (record.category) {
    case "무기":
      return slot.weapon === record.type;
    case "손목":
      return (slot.wrist || []).includes(record.type);
    case "갑옷":
      return (slot.armor || []).includes(record.type);
    case "아티팩트":
      return normalizeArtifactType(slot.artifact) === normalizeArtifactType(record.type);
    default:
      return true;
  }
}

// 착용 조건에 적힌 캐릭터가 이 장비로 실제로 탈 수 있는 계열만 남긴다.
// 예를 들어 벤야는 베기·마법방어를 쓰지만 해머는 마법방어 전용이라 마법방어만 남는다.
// 조건이 비어 있으면(공통 방어구) 어느 캐릭터가 입을지 모르므로 전체 계열을 준다.
function availableCoefTypes(record) {
  if (record.category === "아티팩트") {
    const type = ARTIFACT_TYPE_TO_CALC[normalizeArtifactType(record.type)];
    if (type) return [type];
  }

  const names = String(record.condition || "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => CHARACTER_CALC_TYPES[name]);

  if (!names.length) return Object.values(CALC);

  const byCharacter = new Set();
  const bySlot = new Set();
  names.forEach((name) => {
    CHARACTER_CALC_TYPES[name].forEach((type) => {
      byCharacter.add(type);
      if (slotMatchesRecord(CHARACTER_TYPE_SLOT_MAP[`${name}|${type}`], record)) bySlot.add(type);
    });
  });

  // 슬롯표에 없는 장비까지 빈 목록이 되지 않도록, 좁혀서 남는 게 없으면 캐릭터 기준으로 되돌린다.
  const usable = bySlot.size ? bySlot : byCharacter;
  return Object.values(CALC).filter((type) => usable.has(type));
}

// 계수 공식이 쓰는 스탯(찌르기/베기/마법공격/마법방어)이 없거나 계수를 따지지 않는 분류.
const COEF_HIDDEN_TYPES = ["방패", "밴드", "아머", "슈츠"];

function hasCoefficient(record) {
  return !COEF_HIDDEN_TYPES.includes(record.type);
}

function coefficientBlockHtml(record) {
  if (!hasCoefficient(record)) return "";

  const types = availableCoefTypes(record);
  // 고른 계열을 이 장비가 못 쓰면 첫 계열로 보여주되, state는 건드리지 않는다.
  // (쓸 수 있는 장비로 돌아왔을 때 선택이 유지되도록)
  const type = types.includes(state.coefType) ? state.coefType : types[0];

  const picker = types.length > 1
    ? `<label class="coef-type-field">
          <span class="sr-only">계열</span>
          <select id="coefTypeSelect" aria-label="계수 계열">${types
            .map((key) => `<option value="${key}"${key === type ? " selected" : ""}>${escapeHtml(CALC_TYPE_DISPLAY[key])}</option>`)
            .join("")}</select>
        </label>`
    : `<span class="coef-type-fixed">${escapeHtml(CALC_TYPE_DISPLAY[type])}</span>`;

  const { pMax, sMax } = statByType(record, type);
  const [primaryName, secondaryName] = COEF_STAT_NAMES[type] || ["주스탯", "부스탯"];
  const steps = coefficientSteps(record, type);
  const items = steps.map((step, index) => {
    const note = index === 0
      ? `${primaryName} ${formatNumber(pMax)} · ${secondaryName} ${formatNumber(sMax)}`
      : step.s > 0
        ? `${secondaryName} ${formatNumber(sMax + step.s)}`
        : `${primaryName} ${formatNumber(pMax + step.p)}`;
    return `
        <div class="coef-item">
          <span class="coef-label">${escapeHtml(step.label)}</span>
          <strong class="coef-value${step.limit ? " is-limit" : ""}">${formatCoefficient(equipmentCoefficient(record, type, step.p, step.s))}</strong>
          <span class="coef-note">${note}</span>
        </div>
    `;
  }).join("");

  return `
    <div class="coef-block">
      <div class="coef-head">
        <span>계수</span>
        ${picker}
      </div>
      <div class="coef-grid" data-steps="${steps.length}">${items}</div>
    </div>
  `;
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

    ${coefficientBlockHtml(record)}

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
  els.equipmentCard.querySelector("#coefTypeSelect")?.addEventListener("change", (event) => {
    state.coefType = event.target.value;
    renderCard();
    renderCompare(); // 비교 패널의 계수 차이도 같은 계열을 따라가야 한다
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

  // 계수 차이는 상세 카드에서 보고 있는 계열과 같은 기준으로 낸다.
  // 비교 목록은 같은 분류끼리만 뜨므로 두 장비의 선택 가능한 계열도 같다.
  const coefTypes = availableCoefTypes(record);
  const coefType = coefTypes.includes(state.coefType) ? state.coefType : coefTypes[0];
  const coefBlock = hasCoefficient(compare)
    ? `
    <div class="compare-coef">
      <p class="compare-coef-head">${escapeHtml(compare.name)} 계수 · ${escapeHtml(CALC_TYPE_DISPLAY[coefType])}</p>
      <div class="diff-grid">${coefficientSteps(compare, coefType).map((step) => `
        <div class="diff-row">
          <span>${escapeHtml(step.label)}</span>
          <strong class="neutral">${formatCoefficient(equipmentCoefficient(compare, coefType, step.p, step.s))}</strong>
        </div>
      `).join("")}</div>
    </div>`
    : "";

  els.compareSummary.innerHTML = `
    <p class="compare-name">${escapeHtml(compare.name)} 대비${state.limitCompare ? " · LIMIT" : ""}</p>
    <div class="diff-grid">${diffs}</div>
    ${coefBlock}
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

// 몬스터 수치는 assets/monsters.json에 둔다. 스킬·버프와 같은 방식이라
// 수치가 바뀌어도 코드를 건드리지 않는다. 로딩 전에는 빈 배열이다.
let DMG_MONSTERS = [];

// 캐릭터 특성: [이름, 적받피증가, 공격피해량, 추가피해량, 능력치감소, 딜레이감소]

const DMG_SNIPER = [0, 5, 10, 15, 20, 25, 28, 31, 34, 37, 40];
const DMG_GEM = [0, 45, 46, 47, 48]; // 무기 장비 강화석 부가옵션
const DMG_BOSS = [0, 18, 19, 20, 21]; // 일반 보스 추가 피해량
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
            const num = (src, key) => Number((src || {})[key]) || 0;
            const pick = (src) => ({
              attackDamage: num(src, "공격피해량"),
              enemyTaken: num(src, "적받는피해증가"),
              statReduction: num(src, "적능력치감소"),
              additional: num(src, "추가피해량"),
            });
            return {
              name: String(name).trim(),
              icon: d["아이콘"] || null,
              effects: pick(eff),
              // 꺼도 일부가 붙는 버프가 있다 (클로에 포커스: ON 20% / OFF 10%)
              offEffects: d["꺼짐효과"] ? pick(d["꺼짐효과"]) : null,
              // 같은 그룹끼리는 동시에 못 켠다 (클로에 작열 / 풍화)
              exclusive: Array.isArray(d["배타"]) ? d["배타"] : [],
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

async function loadDmgMonsters() {
  try {
    const res = await fetch("./assets/monsters.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const list = Array.isArray(data?.["몬스터"]) ? data["몬스터"] : [];
    if (!list.length) return;
    DMG_MONSTERS = list.map((m) => ({
      name: String(m["이름"] || "").trim(),
      statDef: Number(m["스탯방어"]) || 0,
      fixedDef: Number(m["고정방어"]) || 0,
      fixedReduction: Number(m["고정피감"]) || 0,
      reductionRate: Number(m["피감률"]) || 0,
      attribute: Number(m["속성값"]) || 0,
      hp: Number(m["HP"]) || 0,
      // 렐릭의 성소처럼 코어 효과가 안 붙는 곳
      noCore: !!m["코어미적용"],
    }));
    // 이미 열려 있으면 몬스터 목록을 다시 채운다
    if (dmgInited) {
      dmgFillSelect("dmgMonster", DMG_MONSTERS.map((m) => m.name));
      dmgRefresh();
    }
  } catch (error) {
    console.info("몬스터 정보(monsters.json)를 불러오지 못했습니다.", error);
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
  skillKey: "", // "캐릭터::타입" — 스킬 프리셋 콤보 캐시 키
  buffChecked: new Set(), // 켜 둔 캐릭터 버프 이름
  userEdited: false,      // 사용자가 직접 건드렸는지
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
    coreCoefficient: accRow("코어")?.coefficient || 0,
    primaryStat: statRow ? statRow.primaryStatValue : 0,
    secondaryStat: statRow ? statRow.secondaryStatValue : 0,
    totalCoefficient: totals.totalCoefficient,
    dexValue: calc.dex,
    totalPrimarySum: totals.totalPrimarySum,
    primaryEnchantSum: totals.primaryEnchantSum,
    secondarySum: totals.secondarySum,
    secondaryEnchantSum: totals.secondaryEnchantSum,
  };
}

// 계수 가공 (UpdateCoefficientBreakdown)
// excludeCore: 코어가 안 붙는 지역이면 총 계수에서 코어 몫을 뺀다
function dmgApplySnapshot(s, excludeCore) {
  const statCoefficient = s.statCoefficient;
  const total = s.totalCoefficient - (excludeCore ? s.coreCoefficient : 0);
  const equipmentCoefficient = Math.max(0, total - statCoefficient);
  const correction = Math.floor(statCoefficient + s.dexValue * 3.0) / 18.0;
  // 0.03에 곱하는 5는 연마강화 단계다. 마스터(5단계) 기준으로 고정해 둔다
  const bonus = Math.floor((equipmentCoefficient / 25.0) * (0.05 + 0.03 * 5)) * 25.0;
  const finalCoefficient = Math.floor(statCoefficient + equipmentCoefficient) + bonus;
  dmg.statCoefficient = statCoefficient;
  dmg.equipmentCoefficient = equipmentCoefficient;
  dmg.dexCorrection = correction;
  dmg.finalCoefficient = finalCoefficient;
}

// 캐릭터 특성 (ApplyCharacterModifier)
// 캐릭터 특성값은 켜 둔 버프의 합이다.
// 예전에는 캐릭터별 preset 표를 기본값으로 깔고 버프를 그 위에 더했는데,
// preset이 그 캐릭터 버프 전부를 켠 값이라 다 켜면 두 번 세어졌다.
function dmgApplyTraits() {
  const totals = dmgBuffTotals();
  dmg.traitEnemyTaken = totals.enemyTaken;
  dmg.traitAttackDamage = totals.attackDamage;
  dmg.traitAdditional = totals.additional;
  dmg.traitStatReduction = totals.statReduction;
}

// 스탯 행이 비어 있으면 계수와 DEX 보정이 0이라 대미지가 크게 어긋난다.
// 계수 계산기에서 넘어오는 값이라 여기서는 알려주기만 한다.
function dmgRenderStatWarning(s) {
  const el = dmgEls.dmgStatWarn;
  if (!el) return;
  const [pLabel, sLabel] = typeStatLabels(s.calcType);
  const missing = [
    [pLabel, s.primaryStat],
    [sLabel, s.secondaryStat],
    ["DEX", s.dexValue],
  ]
    .filter(([, v]) => !(Number(v) > 0))
    .map(([label]) => label);

  el.hidden = missing.length === 0;
  if (missing.length) {
    el.textContent = `계수 계산기의 스탯 행에 ${missing.join(" · ")} 값이 없습니다. 대미지가 실제보다 낮게 나옵니다.`;
  }
}

// 같이 켤 수 없는 체크박스 짝. 하나를 켜면 다른 쪽을 잠근다.
// 둘 다 끄는 건 된다.
const DMG_EXCLUSIVE_PAIRS = [["dmgA1Snowman", "dmgA1Illumi"]];

function dmgApplyExclusive() {
  DMG_EXCLUSIVE_PAIRS.forEach((pair) => {
    const on = pair.find((id) => dmgChecked(id));
    pair.forEach((id) => {
      const el = dmgEls[id];
      if (!el) return;
      const locked = !!on && id !== on;
      el.disabled = locked;
      el.closest(".dmg-row")?.classList.toggle("is-locked", locked);
    });
  });
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
  const boss = DMG_BOSS[dmgSel("dmgAddBoss")] ?? 0;
  const weapon = Math.min(100, Math.max(0, dmgV("dmgAddWeapon")));
  return sniper + gem + boss + weapon + dmg.traitAdditional;
}
function dmgMonsterAttrFactor(cur, mon) {
  const raw = Math.min(1.5, Math.max(1.0, 1.0 + (cur - mon) * 0.00625));
  // 게임은 소수 2자리에서 버린다. 1.1875는 1.18로 쓰인다
  return Math.floor(raw * 100) / 100;
}
function dmgMonsterReductionFactor(rate) {
  return Math.min(1, Math.max(0, 1.0 - rate / 100.0));
}

// 적 능력치 감소는 스탯 방어에만 걸린다. 고정 방어는 깎이지 않는다.
// 감소분은 올림으로 남기므로(=방어가 덜 깎인다) ceil을 쓴다. 상한 30%.
function dmgMonsterDefense(entry, defenseMultiplier) {
  const reduction = Math.min(30, Math.max(0, dmg.traitStatReduction)) / 100;
  const statDef = Math.ceil(entry.statDef * (1 - reduction));
  return Math.floor((statDef + entry.fixedDef) * defenseMultiplier);
}

// 에타 레벨마다 한 방에 들어갈 수 있는 대미지 상한이 있다.
// 값은 에타 정보(eta_info.json)의 "최대 대미지"를 그대로 쓴다.
// 아직 안 받아왔으면 상한 없이 둔다 — 없는 상한을 0으로 잡으면 전부 0이 된다.
function dmgDamageCap() {
  const lv = Math.min(100, Math.max(1, Math.round(dmgV("dmgEtaLevel"))));
  const row = (etaInfo.data?.levels || []).find((x) => x.lv === lv);
  const cap = Number(String(row?.dmg ?? "").replace(/,/g, ""));
  return Number.isFinite(cap) && cap > 0 ? cap : Infinity;
}

// ── 핵심 대미지 (CalculateDamageRange) ──
function dmgCalcRange(entry, defenseMultiplier) {
  const monsterDefense = dmgMonsterDefense(entry, defenseMultiplier);
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

  const cap = dmgDamageCap();
  const clamp = (v) => Math.min(cap, Math.max(1, Math.floor(v)));
  return {
    min: clamp(midMin * attackDamageFactor),
    max: clamp(midMax * attackDamageFactor),
  };
}
// 다른 계산기(공유 엑셀 시트 등)와 대조할 때 어느 배율에서 갈라지는지 보려고
// dmgCalcRange가 쓰는 값을 같은 순서로 그대로 찍는다. 계산에는 관여하지 않는다.
function renderDmgBreakdown(entry) {
  const box = dmgEls.dmgBreakdownBody;
  if (!box || !entry) return;

  const def = dmgMonsterDefense(entry, 1.0);
  const base = dmg.finalCoefficient + 1 - def;
  const skill = dmgV("dmgSkill") / 100.0 + (dmgChecked("dmgHelmet") ? 0.1 : 0.0);
  const crit = dmgV("dmgCrit") / 100.0;
  const critBuf = 1 + dmgCritFactorPercent() / 100.0;
  const combo = dmgChecked("dmgCombo") ? 1.15 : 1.0;
  const attr = dmgMonsterAttrFactor(dmgV("dmgElement"), entry.attribute);
  const skillMul = skill * crit * critBuf * combo * attr;
  const afterSkill = Math.floor(base * skillMul);

  const finalF = 1 + dmgFinalPercent() / 100.0;
  const red = dmgMonsterReductionFactor(entry.reductionRate);
  const special = dmgSpecialFactor();
  const siena = 1 + dmgV("dmgSiena") / 100.0;
  const eta = Math.max(0, dmg.etaAwakening);
  const series = 1 + dmgSeriesPercent() / 100.0;
  const amp = 1 + dmg.traitEnemyTaken / 100.0;
  const weaponAmp = dmgChecked("dmgWeaponAmp") ? 1.1 : 1.0;
  const boost = special * siena * eta * series * amp * weaponAmp;
  const afterBoost = Math.floor((afterSkill * finalF * red - entry.fixedReduction) * boost);
  const atk = 1 + dmgAttackDamagePercent() / 100.0;
  const cap = dmgDamageCap();
  const oneHit = Math.min(cap, Math.max(1, Math.floor(afterBoost * atk)));
  const bdHits = Math.max(1, dmgV("dmgHitCount"));
  const bdWeaponAdd = entry.name.includes("키메라") ? 0 : Math.max(0, dmgV("dmgWeaponAdd"));
  const bdAddF = 1 + dmgAdditionalDamagePercent() / 100.0;

  const n = (v) => (Number.isInteger(v) ? v.toLocaleString("ko-KR") : String(Math.round(v * 10000) / 10000));
  const x = (v) => `\u00d7${n(v)}`;

  const groups = [
    ["\u2460 방어 관통", [
      ["최종 계수", n(dmg.finalCoefficient)],
      ["스탯 방어력", n(entry.statDef)],
      ["고정 방어력", n(entry.fixedDef)],
      ["적 능력치 감소", `${dmg.traitStatReduction}%`],
      ["몬스터 방어", n(def)],
      ["관통 대미지", n(base)],
    ]],
    ["\u2461 스킬 배수", [
      ["스킬배율 + 투구", x(skill)],
      ["스킬 크리티컬 배율", x(crit)],
      ["크리티컬 배율", x(critBuf)],
      ["콤보", x(combo)],
      ["속성 배율", x(attr)],
      ["스킬 적용 대미지", n(afterSkill)],
    ]],
    ["\u2462 피해 감소와 증폭", [
      ["최종 대미지", x(finalF)],
      ["몬스터 피해율", x(red)],
      ["고정 피해 감소", `\u2212${n(entry.fixedReduction)}`],
      ["특수 피해 감소", x(special)],
      ["시에나", x(siena)],
      ["각성 \u00b7 에타", x(eta)],
      ["계열 공격력", x(series)],
      ["디버프", x(amp)],
      ["무기 증폭", x(weaponAmp)],
      ["증폭 후 대미지", n(afterBoost)],
    ]],
    ["\u2463 1타 대미지", [
      ["공격 피해량", x(atk)],
      ["대미지 상한 (에타)", cap === Infinity ? "없음" : n(cap)],
      ["1타 대미지 (최소)", n(oneHit)],
    ]],
    ["\u2464 총 대미지", [
      ["타수", x(bdHits)],
      ["무기 추가 대미지", `+${n(bdWeaponAdd)}`],
      ["추가 피해량", x(bdAddF)],
      ["추가 피해량 대미지", n(dmgAddedDamage(oneHit, entry))],
      ["총 대미지 (최소)", n(dmgTotalDamage(oneHit, entry))],
    ]],
  ];

  // 단계마다 표를 따로 만들어 CSS가 좌우 2단으로 나눌 수 있게 한다.
  // 수식은 항목 아래 작은 글씨로 붙여 줄이 길어지지 않게 한다.
  box.innerHTML = groups
    .map(([title, rows]) => {
      const body = rows
        .map(([k, v], ri) =>
          `<tr${ri === rows.length - 1 ? ' class="dmg-bd-sum"' : ""}>` +
          `<th>${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`)
        .join("");
      return `<section class="dmg-bd-group"><h4>${escapeHtml(title)}</h4>` +
        `<table class="dmg-bd-table"><tbody>${body}</tbody></table></section>`;
    })
    .join("");
}

function dmgAvg(range) {
  return Math.floor((range.min + range.max) / 2.0);
}
// 1타 대미지에 타수와 추가 피해량, 무기 추가 대미지까지 얹은 값.
//   (1타 x 타수 + 무기추가) x (1 + 추가피해량)
// 추가 피해량 = 저격 연마 + 장비 강화석 부가 + 기타 + 캐릭터 특성 추가피해량.
// 무기 추가 대미지는 키메라에게 들어가지 않는다.
function dmgHitBase(damage, entry) {
  const hits = Math.max(1, dmgV("dmgHitCount"));
  const weaponAdd = entry.name.includes("키메라") ? 0 : Math.max(0, dmgV("dmgWeaponAdd"));
  return damage * hits + weaponAdd;
}

function dmgTotalDamage(damage, entry) {
  return Math.floor(dmgHitBase(damage, entry) * (1 + dmgAdditionalDamagePercent() / 100.0));
}

// 추가 피해량이 실제로 얹어주는 몫만 따로 본다
function dmgAddedDamage(damage, entry) {
  return Math.floor(dmgHitBase(damage, entry) * (dmgAdditionalDamagePercent() / 100.0));
}

const dmgRangeOf = (fn, range, entry) => ({ min: fn(range.min, entry), max: fn(range.max, entry) });

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
  dmgFillSelect("dmgAddBoss", DMG_BOSS.map((v) => `${v}%`));
  dmgFillSelect("dmgEtaFinal", Array.from({ length: 6 }, (_, i) => `LV${i} - ${i * 4}%`));
  dmgFillSelect("dmgJudgement", Array.from({ length: 41 }, (_, i) => `LV${i} - ${(i * 0.75).toFixed(2)}%`));
  dmgFillSelect("dmgEtaCrit", Array.from({ length: 21 }, (_, i) => `LV${i} - ${(i * 1.5).toFixed(1)}%`));

}

// 캐릭터·타입별 버프 토글 렌더 (buffs.json 기반)
function dmgRenderBuffs(skillKey) {
  if (!dmgEls.dmgTraitChecks) return;
  const buffs = DMG_BUFFS[skillKey] || [];
  const held = dmgBuffHeldGroups();
  dmgEls.dmgTraitChecks.innerHTML = buffs.length
    ? buffs
        .map((b) => {
          const icon = b.icon
            ? `<img class="dmg-chk-icon" src="./images/buff/${encodeURIComponent(b.icon)}" alt="" />`
            : '<span class="dmg-chk-icon"></span>';
          const on = dmg.buffChecked.has(b.name) ? " checked" : "";
          const locked = dmgBuffLocked(b, held);
          return `<label class="dmg-row${locked ? " is-locked" : ""}"><span class="dmg-row-label">${icon}${escapeHtml(b.name)}</span>` +
            `<input type="checkbox" class="dmg-switch" data-dmg-buff="${escapeHtml(b.name)}"${on}${locked ? " disabled" : ""} /></label>`;
        })
        .join("")
    : '<p class="dmg-note">등록된 버프가 없습니다.</p>';
}

// 켜 둔 버프들의 효과 합. 캐릭터 특성 위에 더해진다.
// buffs.json의 수치가 아직 전부 0이라 지금은 켜도 결과가 그대로다.
function dmgBuffTotals() {
  const totals = { attackDamage: 0, enemyTaken: 0, statReduction: 0, additional: 0 };
  (DMG_BUFFS[dmg.skillKey] || []).forEach((b) => {
    const on = dmg.buffChecked.has(b.name);
    const eff = on ? b.effects : b.offEffects;
    if (!eff) return;
    totals.attackDamage += eff.attackDamage;
    totals.enemyTaken += eff.enemyTaken;
    totals.statReduction += eff.statReduction;
    totals.additional += eff.additional;
  });
  return totals;
}

// 켜 둔 버프가 점유한 배타 그룹 → 그 그룹을 켠 버프 이름
function dmgBuffHeldGroups() {
  const held = new Map();
  (DMG_BUFFS[dmg.skillKey] || []).forEach((b) => {
    if (!dmg.buffChecked.has(b.name)) return;
    b.exclusive.forEach((g) => held.set(g, b.name));
  });
  return held;
}

// 자기가 점유한 그룹은 빼고 본다. 안 그러면 켜 둔 버프가 스스로를 잠근다
const dmgBuffLocked = (b, held) =>
  b.exclusive.some((g) => held.has(g) && held.get(g) !== b.name);
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

  // 코어 미적용 지역이면 계수가 달라지므로 몬스터를 먼저 정한다
  const monster = DMG_MONSTERS[dmgSel("dmgMonster")] || null;
  dmgApplySnapshot(s, !!monster?.noCore);
  dmgApplyEta();
  dmgApplyExclusive();
  dmgRenderStatWarning(s);

  // 캐릭터·타입별 스킬 프리셋 콤보 (캐릭터나 타입이 바뀔 때만 다시 채우고 텍스트박스에 반영)
  const skillKey = `${s.characterName}::${s.calcType}`;
  if (dmg.skillKey !== skillKey) {
    dmg.skillKey = skillKey;
    // 캐릭터나 타입이 바뀌면 앞 캐릭터의 버프가 남지 않게 비운다
    dmg.buffChecked.clear();
    dmgRenderBuffs(skillKey);
    const skills = dmgSkillsFor(s.characterName, s.calcType);
    dmg.skillList = skills;
    if (dmgEls.dmgSkillSelect) {
      dmgEls.dmgSkillSelect.innerHTML = skills.map((sk, i) => optionHtml(String(i), sk[0])).join("");
      dmgEls.dmgSkillSelect.selectedIndex = 0;
    }
    dmgApplySkillPreset();
  }

  // 몬스터·버프·스킬 목록이 각자 비동기로 도착하면서 셀렉트를 다시 채운다.
  // 한 번만 되살리면 나중에 도착한 목록이 저장값을 덮어쓰므로,
  // 사용자가 직접 건드리기 전까지는 갱신될 때마다 되살린다.
  if (!dmg.userEdited) dmgRestoreState();

  // skillKey가 정해지고 버프 목록이 그려진 뒤라야 합이 맞는다
  dmgApplyTraits();

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

  dmgEls.dmgTraitList.innerHTML = [
    ["공격 피해량(스킬)", `${dmg.traitAttackDamage}%`],
    ["적이 받는 피해 증가", `${dmg.traitEnemyTaken}%`],
    ["적 능력치 감소", `${dmg.traitStatReduction}%`],
    ["추가 피해량", `${dmg.traitAdditional}%`],
  ].map(([k, v]) => `<div>${escapeHtml(k)} <strong>${escapeHtml(v)}</strong></div>`).join("");

  const entry = monster;
  if (!entry) return;
  const normal = dmgCalcRange(entry, 1.0);
  const strong = dmgCalcRange(entry, 0.5);
  const passive = dmgCalcRange(entry, 0.85);

  // 평균 하나만 보여주면 시트 같은 다른 계산기와 대조하기 어렵다.
  // 실제로 뜨는 값은 최소~최대 사이라 범위를 그대로 보여주고 평균은 아래에 둔다.
  const span = (r) => `${dmgNum(r.min)} ~ ${dmgNum(r.max)}`;
  const card = (label, range, note) => `
    <div>
      <span>${label}</span>
      <strong>${span(range)}</strong>
      ${note ? `<em>${note}</em>` : ""}
    </div>`;

  // 위: 조건 없이 항상 나오는 값. 아래: 방어 무시가 발동했을 때.
  dmgEls.dmgResult.innerHTML =
    card("일반 대미지 <b>1타</b>", normal) +
    card("추가 피해량", dmgRangeOf(dmgAddedDamage, normal, entry)) +
    card("총 대미지", dmgRangeOf(dmgTotalDamage, normal, entry));

  if (dmgEls.dmgPierceResult) {
    // 방어 무시는 타수 전부에 걸리지 않는다. 펫 강타는 10타 중 1~2타 정도만
    // 뜨므로 총 대미지로 환산하면 과대평가가 된다. 1타 값만 보여준다.
    const pierceRow = (label, range) => `
      <div>
        <span>${label}</span>
        <strong>${span(range)}</strong>
        <b>일반 대비 +${dmgNum(range.min - normal.min)}</b>
      </div>`;
    dmgEls.dmgPierceResult.innerHTML =
      pierceRow("펫 강타 <em>방어 무시 50%</em>", strong) +
      pierceRow("캐릭터 스킬 <em>방어 무시 15%</em>", passive);
  }

  renderDmgBreakdown(entry);
}

// 대미지 계산기 입력값을 이 PC에 남긴다.
// 셀렉트는 인덱스가 아니라 보이는 글자로 저장한다. 목록이 늘거나 순서가 바뀌어도
// 같은 항목을 찾아가고, 못 찾으면 그냥 건너뛴다.
const DMG_SAVE_KEY = "tw-damage-save-v1";

function dmgSaveState() {
  if (!dmgInited) return;
  const panel = document.querySelector('[data-calculator-panel="damage"]');
  if (!panel) return;
  try {
    const fields = {};
    panel.querySelectorAll("input[id], select[id]").forEach((el) => {
      if (el.type === "checkbox") fields[el.id] = { on: el.checked };
      else if (el.tagName === "SELECT") fields[el.id] = { text: el.options[el.selectedIndex]?.text ?? "" };
      else fields[el.id] = { value: el.value };
    });
    localStorage.setItem(DMG_SAVE_KEY, JSON.stringify({ fields, buffs: [...dmg.buffChecked] }));
  } catch {
    // 저장 공간 부족 등은 무시 (저장은 편의일 뿐)
  }
}

function dmgRestoreState() {
  const panel = document.querySelector('[data-calculator-panel="damage"]');
  if (!panel) return;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(DMG_SAVE_KEY) || "null");
  } catch {
    return;
  }
  if (!saved) return;

  Object.entries(saved.fields || {}).forEach(([id, v]) => {
    const el = panel.querySelector(`#${CSS.escape(id)}`);
    if (!el) return;
    if (el.type === "checkbox") el.checked = !!v.on;
    else if (el.tagName === "SELECT") {
      const i = [...el.options].findIndex((o) => o.text === v.text);
      if (i >= 0) el.selectedIndex = i;
    } else if (typeof v.value === "string") el.value = v.value;
  });

  // 버프는 이름으로 되살리되, 배타 규칙에 걸리는 건 버린다
  (saved.buffs || []).forEach((name) => {
    const b = (DMG_BUFFS[dmg.skillKey] || []).find((x) => x.name === name);
    if (b && !dmgBuffLocked(b, dmgBuffHeldGroups())) dmg.buffChecked.add(name);
  });
  dmgRenderBuffs(dmg.skillKey);
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

  // 버프 토글은 dmgRefresh가 다시 그리므로 체크 상태를 먼저 기록해 둔다
  panel.addEventListener("change", (event) => {
    const box = event.target.closest("[data-dmg-buff]");
    if (!box) return;
    dmg.userEdited = true;
    if (box.checked) dmg.buffChecked.add(box.dataset.dmgBuff);
    else dmg.buffChecked.delete(box.dataset.dmgBuff);
    // 배타 그룹 잠금이 바뀌므로 목록을 다시 그린다
    dmgRenderBuffs(dmg.skillKey);
  });

  // dmgRefresh보다 먼저 등록해야 한다. 뒤에 두면 첫 입력에서 복원이 먼저 돌아
  // 방금 친 값을 저장값으로 되돌려 버린다.
  const markEdited = () => {
    dmg.userEdited = true;
  };
  panel.addEventListener("input", markEdited);
  panel.addEventListener("change", markEdited);

  panel.addEventListener("input", dmgRefresh);
  panel.addEventListener("change", dmgRefresh);
  panel.addEventListener("input", dmgSaveState);
  panel.addEventListener("change", dmgSaveState);

  dmgRefresh();
}

// ══════════════════════════════════════════════════════════════
//  시뮬레이터 3종 (TWChatOverlay 로직 이식)
// ══════════════════════════════════════════════════════════════
const simEls = {};
let simInited = false;

// 시뮬레이터 재료 아이콘 (images 폴더)
const SIM_IMG_BASE = `${CDN_ETC_ROOT}images/`;
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
    "relicRateButton", "coreRateButton",
    "rateModal", "rateModalTitle", "rateModalNote", "rateModalBody",
  ].forEach((id) => (simEls[id] = q(id)));

  wireRateModal();
  wirePierceHelp();

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
  // 막대는 줄바꿈이 안 되므로 폰에서는 개수를 줄여 폭을 맞춘다
  const n = window.matchMedia("(max-width: 560px)").matches ? 19 : 33;
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
    // 표시용: 상위 % = 100 - percentile(나보다 운 나쁜 사람 비율) → 100명 중 등수(순위)로 표현
    const topPercent = Math.max(0, Math.min(100, 100 - luck.percentile));
    const rank = Math.max(1, Math.min(100, Math.round(topPercent)));
    const luckText = `운 순위: 100명 중 <span class="sim-status-strong">${rank}등</span> (상위 ${topPercent.toFixed(1)}%)`;
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
  // 토막마다 span으로 감싼다. 좁은 화면에서 숫자 중간이 아니라
  // 토막 단위로 줄이 바뀌어야 읽을 수 있다.
  let html =
    `<span class="log-seq">${e.attempts.toLocaleString("ko-KR")}번째</span>` +
    `<span class="log-step">${e.inkBefore}→${e.inkAfter} 인크</span>` +
    `<span class="log-cost">비용 ${encFmtCost(e.cost)}</span>`;
  if (expectedCost != null) {
    const diff = expectedCost - e.cost;
    encSim.totalExpectedCost += expectedCost;
    html += `<span class="log-exp">기대값 <span class="${diff >= 0 ? "sim-pos" : "sim-neg"}">${encFmtSigned(diff)}</span></span>`;
  } else {
    html += '<span class="log-exp">기대값 N/A</span>';
  }
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
    `<span class="cum-head">▼ 누적 합산 (${encSim.totalAttempts.toLocaleString("ko-KR")}회 시도)</span>` +
    `<span class="cum-cost">누적 비용: ${encFmtCost(encSim.totalCost)}</span>` +
    `<span class="cum-exp">누적 기대 비용: ${encFmtCost(displayExpected)}</span>` +
    `<span class="cum-diff">기대값 차이: <span class="${diff >= 0 ? "sim-pos" : "sim-neg"}">${encFmtSigned(diff)}</span></span>`;
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
  // 폰에서는 표를 카드로 펴므로 셀마다 이름을 달아둔다 (머리글이 안 보인다)
  const labels = ["단계", "확률", "시도", "가루", "결정", "강화 비용", "총 기대비용"];
  const body = rows
    .map((r) => {
      const cells = [r.step.display, `${r.step.ratePct}%`, coreFmtCount(r.expected), r.dustExp.toLocaleString("ko-KR"), r.crystalExp.toLocaleString("ko-KR"), `${coreFmtEok(r.seedExp)}억`, `${coreFmtEok(r.stepCost)}억`];
      return "<tr>" + cells.map((c, i) => `<td data-label="${escapeHtml(labels[i])}"${i === cells.length - 1 ? ' class="sim-cost"' : ""}>${escapeHtml(c)}</td>`).join("") + "</tr>";
    })
    .join("");
  simEls.coreTable.innerHTML = `<thead><tr>${head.map((h) => `<th><span class="sim-th">${h}</span></th>`).join("")}</tr></thead><tbody>${body}</tbody>`;
}
// 코어는 한 캐릭터에 6개를 낀다. 한 개 기준만 보여주면 실제로 드는 양을
// 가늠하기 어려워서 6개 전부 맞췄을 때도 같이 낸다.
const CORE_SLOT_COUNT = 6;

function coreRenderSummary(s) {
  const statLabel = s.isMainStat ? "주스탯" : "부스탯";
  const range = `${coreStages[s.startIdx].display} → ${coreStages[s.targetIdx].display}`;
  const mats = (n) =>
    `<div class="sim-summary-mats">` +
    `<span>${simIcon("코어가루.png", 24)}${(s.totalDust * n).toLocaleString("ko-KR")}개</span>` +
    `<span>${simIcon("코어결정.png", 24)}${(s.totalCrystal * n).toLocaleString("ko-KR")}개</span>` +
    `<span>${simIcon("시드.png", 24)}${coreFmtEok(s.totalCost * n)}억</span>` +
    `</div>`;

  simEls.coreSummary.innerHTML =
    `<div class="sim-summary-title">${escapeHtml(statLabel)} | ${escapeHtml(range)} 기대값</div>` +
    `<div class="sim-summary-cols">` +
    `<div class="sim-summary-col"><span class="sim-summary-label">코어 1개</span>${mats(1)}</div>` +
    `<div class="sim-summary-col"><span class="sim-summary-label">코어 ${CORE_SLOT_COUNT}개 전체</span>${mats(CORE_SLOT_COUNT)}</div>` +
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
  // 카드로 펼 때 쓸 이름 (머리글의 아이콘을 뺀 글자만)
  const labels = ["단계", "확률", "시도", "신조의 가루", "신조의 정수", "달의 파편", "월광석"];
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
      return "<tr>" + cells.map((c, i) => `<td data-label="${escapeHtml(labels[i])}">${escapeHtml(c)}</td>`).join("") + "</tr>";
    })
    .join("");
  simEls.relicTable.innerHTML = `<thead><tr>${head.map((h) => `<th><span class="sim-th">${h}</span></th>`).join("")}</tr></thead><tbody>${body}</tbody>`;
}
// 강화 확률표는 계산에 쓰는 RELIC_RATES를 그대로 그린다 (수치를 두 곳에 두지 않는다).
// 넥슨 원본은 0.0000%까지 적힌 20x20 표라 눈에 안 들어와서, 정수 %로 줄이고
// 0%는 "-"로 죽인 뒤 확률이 높을수록 진해지는 배경을 깔았다.
function relicRateTableHtml() {
  const cur = Number(simEls.relicCurrent?.value);
  const diff = Number(simEls.relicDifficulty?.value);
  const head = ['<th class="rr-corner">단계 \\ 난이도</th>']
    .concat(RELIC_RATES[0].map((_, i) => {
      const n = i + 1;
      return `<th class="${n === diff ? "is-on" : ""}">${n}</th>`;
    }))
    .join("");

  const body = RELIC_RATES.map((row, ri) => {
    const level = ri + 1;
    // 현재 레벨에서 다음 단계로 갈 확률이므로, 현재 레벨 + 1 행이 지금 시도할 줄이다
    const isNext = level === cur + 1;
    const group = level === 1 || level === 11 ? " is-group" : "";
    const cells = row.map((v, ci) => {
      const pct = Math.round(v * 100);
      if (!pct) return '<td class="rr-zero">-</td>';
      // 10~54% 구간을 0~1로 펴서 배경 진하기로 쓴다
      const t = Math.min(1, Math.max(0, (pct - 10) / 44));
      return `<td class="${ci + 1 === diff ? "is-on" : ""}" style="--rr:${t.toFixed(2)}">${pct}</td>`;
    }).join("");
    return `<tr class="${isNext ? "is-next" : ""}${group}"><th>${escapeHtml(relicFmtLevel(level))}</th>${cells}</tr>`;
  }).join("");

  return `<table class="rr-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

// 코어 확률표. 두 계열의 확률이 단계마다 다르므로 나란히 두어 비교되게 한다.
// 수치는 coreBuildStages()가 계산에 쓰는 값을 그대로 뽑아 쓴다.
function coreRateTableHtml() {
  const abyss = coreBuildStages(true);
  const normal = coreBuildStages(false);
  const curType = coreIsAbyss();
  const start = Number(simEls.coreStartStage?.value);
  const target = Number(simEls.coreTargetStage?.value);

  const body = abyss.slice(1).map((s, i) => {
    const n = normal[i + 1];
    // 지금 계산 구간에 드는 단계를 표시
    const inRange = Number.isFinite(start) && Number.isFinite(target) && s.index > start && s.index <= target;
    const cell = (pct, on) => {
      const t = Math.min(1, Math.max(0, (pct - 1) / 99));
      return `<td class="${on ? "is-on" : ""}" style="--rr:${t.toFixed(2)}">${pct}%</td>`;
    };
    return `<tr class="${inRange ? "is-next" : ""}${s.tier !== abyss[i].tier ? " is-group" : ""}">
      <th>${escapeHtml(s.display)}</th>
      ${cell(s.ratePct, curType)}
      ${cell(n.ratePct, !curType)}
      <td class="rr-mat">${s.dust.toLocaleString("ko-KR")}</td>
      <td class="rr-mat">${s.crystal ? s.crystal.toLocaleString("ko-KR") : "-"}</td>
      <td class="rr-mat">${(s.seed / 10000).toLocaleString("ko-KR")}만</td>
    </tr>`;
  }).join("");

  return `<table class="rr-table rr-core">
    <thead><tr>
      <th class="rr-corner">단계</th>
      <th class="${curType ? "is-on" : ""}">머큐리얼/어비스</th>
      <th class="${curType ? "" : "is-on"}">이클립스/루비코나</th>
      <th>가루</th><th>결정</th><th>시드</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function openRateModal(title, note, html) {
  simEls.rateModalTitle.textContent = title;
  simEls.rateModalNote.textContent = note;
  simEls.rateModalBody.innerHTML = html;
  simEls.rateModal.hidden = false;
}

function wirePierceHelp() {
  document.querySelector("#pierceHelpButton")?.addEventListener("click", () =>
    openRateModal(
      "방어 관통",
      "",
      `<p class="modal-text">가능/불가능은 몹스터에게 입히는 피해가 1을 넘는지를 기준으로 판단합니다.</p>
       <p class="modal-text">괄호 안 숫자는 그 경계선까지 남은 계수입니다. 가능이면 여유분(+), 불가능이면 부족분(−)을 뜻합니다.</p>`
    ));
}

function wireRateModal() {
  simEls.rateModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-rate-close]")) simEls.rateModal.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && simEls.rateModal && !simEls.rateModal.hidden) simEls.rateModal.hidden = true;
  });
  simEls.relicRateButton?.addEventListener("click", () => openRateModal(
    "렐릭 강화 확률",
    "가로 = 콘텐츠 난이도(강화 가능 단수), 세로 = 현재 렐릭 단계. 값은 다음 단계로 오를 확률입니다.",
    relicRateTableHtml(),
  ));
  simEls.coreRateButton?.addEventListener("click", () => openRateModal(
    "코어 강화 확률",
    "단계별 성공 확률과 소모 재료입니다. 재료는 주스탯 기준이며 부스탯은 절반입니다. 선택 중인 계열이 강조됩니다.",
    coreRateTableHtml(),
  ));
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
loadDmgMonsters();

// ══════════════════════════════════════════════════════════════
//  문의 · 건의 게시판
//  글은 구글 시트에 쌓이고, 읽기/쓰기 모두 Apps Script 웹앱을 거친다.
//  (게시 CSV는 갱신이 몇 분 늦어, 방금 쓴 글이 안 보이는 문제가 있다)
//  설치 방법은 저장소 루트의 board-apps-script.gs 주석에 적어 뒀다.
// ══════════════════════════════════════════════════════════════
const BOARD_API_URL = "https://script.google.com/macros/s/AKfycbyNioDGVAQp8KSIsgUkPwfVMRY8xtG7CAtaUSjWc0Hs4qiaSvKWxBGGcfEUfsUFWG2U/exec";

const BOARD_CATEGORIES = ["버그", "건의", "문의"];
const BOARD_LIMITS = { title: 100, author: 20, content: 2000 };

const board = {
  view: "list",       // "list" | "detail" | "write"
  posts: [],
  post: null,         // 본문까지 받아온 글
  category: "all",
  loaded: false,
  busy: false,
  error: "",
  notice: "",
  draft: { category: "", title: "", author: "", content: "" },
};

const boardEls = {
  button: document.querySelector("#boardOpenButton"),
  modal: document.querySelector("#boardModal"),
  body: document.querySelector("#boardBody"),
};

const boardApi = (params) => `${BOARD_API_URL}?${new URLSearchParams(params)}`;

function boardDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 줄바꿈만 살리고 나머지는 escape 한다. 방문자가 쓴 글이라 HTML을 그대로 넣으면 안 된다
const boardText = (value) => escapeHtml(value || "").replace(/\n/g, "<br />");

async function boardFetch(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
  return data;
}

async function boardLoadList(force) {
  if (board.loaded && !force) return;
  board.busy = true;
  board.error = "";
  boardRender();
  try {
    const data = await boardFetch(boardApi({ action: "list" }));
    board.posts = data.posts || [];
    board.loaded = true;
  } catch (error) {
    board.error = "글 목록을 불러오지 못했습니다.";
    console.warn("게시판 목록 로딩 실패", error);
  } finally {
    board.busy = false;
    boardRender();
  }
}

async function boardOpenPost(id) {
  board.view = "detail";
  board.post = null;
  board.busy = true;
  board.error = "";
  boardRender();
  try {
    const data = await boardFetch(boardApi({ action: "post", id }));
    board.post = data.post;
  } catch (error) {
    board.error = "글을 불러오지 못했습니다.";
    console.warn("게시판 글 로딩 실패", error);
  } finally {
    board.busy = false;
    boardRender();
  }
}

async function boardSubmit(form) {
  const draft = {
    category: form.category.value,
    title: form.title.value.trim(),
    author: form.author.value.trim(),
    content: form.content.value.trim(),
    website: form.website.value,   // 봇 미끼. 사람은 못 보는 칸이다
  };
  board.draft = { category: draft.category, title: draft.title, author: draft.author, content: draft.content };

  if (!BOARD_CATEGORIES.includes(draft.category)) return boardFail("분류를 선택해 주세요.");
  if (!draft.title) return boardFail("제목을 입력해 주세요.");
  if (!draft.content) return boardFail("내용을 입력해 주세요.");

  board.busy = true;
  board.error = "";
  boardRender();
  try {
    // application/json으로 보내면 CORS 프리플라이트가 뜨고 Apps Script가 그걸 못 받는다
    await boardFetch(BOARD_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(draft),
    });
    board.draft = { category: "", title: "", author: "", content: "" };
    board.notice = "등록했습니다. 답변은 게시판에서 확인하실 수 있습니다.";
    board.view = "list";
    board.busy = false;
    await boardLoadList(true);
  } catch (error) {
    board.busy = false;
    boardFail(error.message || "등록하지 못했습니다.");
  }
}

function boardFail(message) {
  board.error = message;
  boardRender();
}

function boardListHtml() {
  const rows = board.category === "all"
    ? board.posts
    : board.posts.filter((p) => p.category === board.category);

  const filters = ["all", ...BOARD_CATEGORIES]
    .map((key) => `<button type="button" class="board-filter${board.category === key ? " is-active" : ""}" data-board-filter="${key}">${key === "all" ? "전체" : key}</button>`)
    .join("");

  const items = rows.length
    ? rows.map((p) => `
        <li>
          <button type="button" class="board-item" data-board-post="${p.id}">
            <span class="board-cat" data-cat="${escapeHtml(p.category)}">${escapeHtml(p.category)}</span>
            <span class="board-item-title">${escapeHtml(p.title)}</span>
            ${p.answer ? '<span class="board-answered">답변 완료</span>' : ""}
            <span class="board-item-meta">${escapeHtml(p.author)} · ${boardDate(p.createdAt)}</span>
          </button>
        </li>
      `).join("")
    : `<li class="board-empty">${board.busy ? "불러오는 중…" : "아직 글이 없습니다."}</li>`;

  return `
    <div class="board-toolbar">
      <div class="board-filters">${filters}</div>
      <button type="button" class="board-write-button" data-board-view="write">글쓰기</button>
    </div>
    <ul class="board-list">${items}</ul>
  `;
}

function boardDetailHtml() {
  const p = board.post;
  if (!p) return `<p class="board-empty">${board.busy ? "불러오는 중…" : ""}</p>`;
  return `
    <button type="button" class="board-back" data-board-view="list">← 목록</button>
    <article class="board-detail">
      <h3>
        <span class="board-cat" data-cat="${escapeHtml(p.category)}">${escapeHtml(p.category)}</span>
        ${escapeHtml(p.title)}
      </h3>
      <p class="board-item-meta">${escapeHtml(p.author)} · ${boardDate(p.createdAt)}</p>
      <div class="board-content">${boardText(p.content)}</div>
      ${p.answer ? `
        <div class="board-answer">
          <span class="board-answer-head">운영자 답변 · ${boardDate(p.answeredAt)}</span>
          <div class="board-content">${boardText(p.answer)}</div>
        </div>
      ` : '<p class="board-pending">아직 답변이 등록되지 않았습니다.</p>'}
    </article>
  `;
}

function boardWriteHtml() {
  const d = board.draft;
  const options = BOARD_CATEGORIES
    .map((c) => `<option value="${c}"${d.category === c ? " selected" : ""}>${c}</option>`)
    .join("");
  return `
    <button type="button" class="board-back" data-board-view="list">← 목록</button>
    <form class="board-form" id="boardForm">
      <label class="board-field">
        <span>분류</span>
        <select name="category" required>
          <option value="">선택</option>
          ${options}
        </select>
      </label>
      <label class="board-field">
        <span>이름 <small>(비우면 익명)</small></span>
        <input name="author" type="text" maxlength="${BOARD_LIMITS.author}" placeholder="익명" value="${escapeHtml(d.author)}" />
      </label>
      <label class="board-field board-field-wide">
        <span>제목</span>
        <input name="title" type="text" maxlength="${BOARD_LIMITS.title}" required value="${escapeHtml(d.title)}" />
      </label>
      <label class="board-field board-field-wide">
        <span>내용</span>
        <textarea name="content" rows="8" maxlength="${BOARD_LIMITS.content}" required>${escapeHtml(d.content)}</textarea>
      </label>
      <input class="board-honeypot" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <div class="board-form-foot">
        <span class="board-hint">글과 이름은 누구나 볼 수 있습니다. 개인정보는 적지 말아 주세요.</span>
        <button type="submit" class="board-submit"${board.busy ? " disabled" : ""}>${board.busy ? "등록 중…" : "등록"}</button>
      </div>
    </form>
  `;
}

function boardRender() {
  if (!boardEls.body) return;
  if (!BOARD_API_URL) {
    boardEls.body.innerHTML = '<p class="board-empty">게시판을 준비 중입니다.</p>';
    return;
  }
  const notice = board.notice ? `<p class="board-notice">${escapeHtml(board.notice)}</p>` : "";
  const error = board.error ? `<p class="board-error">${escapeHtml(board.error)}</p>` : "";
  const view = board.view === "detail" ? boardDetailHtml()
    : board.view === "write" ? boardWriteHtml()
    : boardListHtml();
  boardEls.body.innerHTML = notice + error + view;
}

function boardSetView(view) {
  board.view = view;
  board.error = "";
  if (view !== "list") board.notice = "";
  boardRender();
}

function boardOpen() {
  boardEls.modal.hidden = false;
  boardSetView("list");
  boardLoadList(false);
}

function boardClose() {
  boardEls.modal.hidden = true;
  board.notice = "";
}

function wireBoard() {
  if (!boardEls.button || !boardEls.modal) return;
  boardEls.button.addEventListener("click", boardOpen);
  boardEls.modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-board-close]")) boardClose();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !boardEls.modal.hidden) boardClose();
  });

  boardEls.body.addEventListener("click", (event) => {
    const filter = event.target.closest("[data-board-filter]");
    if (filter) {
      board.category = filter.dataset.boardFilter;
      return boardRender();
    }
    const viewButton = event.target.closest("[data-board-view]");
    if (viewButton) return boardSetView(viewButton.dataset.boardView);
    const item = event.target.closest("[data-board-post]");
    if (item) boardOpenPost(item.dataset.boardPost);
  });

  boardEls.body.addEventListener("submit", (event) => {
    if (event.target.id !== "boardForm") return;
    event.preventDefault();
    boardSubmit(event.target);
  });
}

wireBoard();

// ══════════════════════════════════════════════════════════════
//  계수 · 대미지 계산기 JSON 내보내기 / 불러오기
//  브라우저에 남는 localStorage와 달리, 파일로 빼서 백업하거나 남에게 넘길 수 있다.
// ══════════════════════════════════════════════════════════════
const CALC_FILE_VERSION = 1;

function calcDownloadJson(payload, name) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  // 링크가 클릭된 뒤에 풀어야 저장이 끊기지 않는다
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function calcPickJson(onLoad) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onLoad(JSON.parse(String(reader.result)));
      } catch (error) {
        console.warn("파일을 읽지 못했습니다.", error);
        alert("JSON 파일을 읽지 못했습니다. 파일이 손상되었을 수 있습니다.");
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

// 지금 화면의 계수 계산기 상태 (행 값 + 덱스 + 아바타 강화)
function calcCollectState() {
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
  const data = {};
  for (const row of calc.mainRows) data[row.slotName] = capture(row);
  for (const row of calc.accRows) data[row.slotName] = capture(row);
  return {
    character: calc.characterName,
    type: calc.type,
    dex: calc.dex,
    avatarMain: !!els.avatarMainEnhance?.checked,
    avatarSub: !!els.avatarSubEnhance?.checked,
    data,
  };
}

// 불러온 상태를 화면에 넣는다. 캐릭터·타입이 다르면 먼저 그쪽으로 옮긴다.
function calcApplyState(state) {
  if (!state || !state.character || !state.type) {
    alert("계수 계산기 데이터가 없는 파일입니다.");
    return false;
  }
  if (state.character !== calc.characterName || state.type !== calc.type) {
    showCoefficientDetail(state.character);
    if (resolveCalculatorTypes(state.character).includes(state.type)) {
      calc.type = state.type;
      if (els.coefficientTypeSelect) els.coefficientTypeSelect.value = state.type;
    }
    // 새 타입 기준으로 행을 다시 만든다 (저장 슬롯도 불러오지만 아래에서 덮어쓴다)
    refreshAllRows();
  }

  const snap = state.data || {};
  const apply = (row, isMain) => {
    const s = snap[row.slotName];
    if (!s) return;
    if (isMain) {
      if (s.at && ABILITY_OPTIONS.includes(s.at)) row.abilityType = s.at;
      if (s.equip && row.candidates.includes(s.equip)) {
        row.selectedEquipment = s.equip;
        applyEquipmentToRow(row);
      }
      if (row.selectedEquipment === "수동 입력" || row.isAbility) {
        row.attackValue = s.a || 0;
        row.defenseValue = s.d || 0;
        row.hitValue = s.hit || 0;
      }
    } else {
      row.attackValue = s.a || 0;
      row.defenseValue = s.d || 0;
      row.hitValue = s.hit || 0;
    }
    row.attackEnchant = s.ae || 0;
    row.defenseEnchant = s.de || 0;
    row.primaryStatValue = s.p || 0;
    row.secondaryStatValue = s.s || 0;
    recalcRow(row, calc.type);
  };
  for (const row of calc.mainRows) apply(row, true);
  for (const row of calc.accRows) apply(row, false);

  calc.dex = Number(state.dex) || 0;
  if (els.avatarMainEnhance) els.avatarMainEnhance.checked = !!state.avatarMain;
  if (els.avatarSubEnhance) els.avatarSubEnhance.checked = !!state.avatarSub;

  renderCalculator();
  scheduleSave();
  return true;
}

// 대미지 계산기 패널의 입력값 (저장 형식은 localStorage와 같다)
function dmgCollectFields() {
  const panel = document.querySelector('[data-calculator-panel="damage"]');
  const fields = {};
  panel?.querySelectorAll("input[id], select[id]").forEach((el) => {
    if (el.type === "checkbox") fields[el.id] = { on: el.checked };
    else if (el.tagName === "SELECT") fields[el.id] = { text: el.options[el.selectedIndex]?.text ?? "" };
    else fields[el.id] = { value: el.value };
  });
  return { fields, buffs: [...dmg.buffChecked] };
}

function dmgApplyFields(saved) {
  const panel = document.querySelector('[data-calculator-panel="damage"]');
  if (!panel || !saved) return;
  Object.entries(saved.fields || {}).forEach(([id, v]) => {
    const el = panel.querySelector(`#${CSS.escape(id)}`);
    if (!el) return;
    if (el.type === "checkbox") el.checked = !!v.on;
    else if (el.tagName === "SELECT") {
      const i = [...el.options].findIndex((o) => o.text === v.text);
      if (i >= 0) el.selectedIndex = i;
    } else if (typeof v.value === "string") el.value = v.value;
  });
  dmg.buffChecked.clear();
  (saved.buffs || []).forEach((name) => {
    const b = (DMG_BUFFS[dmg.skillKey] || []).find((x) => x.name === name);
    if (b && !dmgBuffLocked(b, dmgBuffHeldGroups())) dmg.buffChecked.add(name);
  });
  dmgRenderBuffs(dmg.skillKey);
}

// 파일명에 쓸 수 없는 글자를 걷어낸다
const calcSafeName = (s) => String(s || "무제").replace(/[\\/:*?"<>|]/g, "_");

// 저장/불러오기는 두 계산기가 같은 파일 하나를 쓴다.
// 대미지는 계수 위에 얹히므로 따로 떼면 반쪽짜리가 된다.
function calcBuildPayload() {
  const coefficient = calcCollectState();
  // 대미지 패널을 아직 한 번도 안 열었으면 담을 값이 없다
  const monster = document.querySelector('[data-calculator-panel="damage"] #dmgMonster');
  const damage = monster?.options.length ? dmgCollectFields() : null;
  return {
    version: CALC_FILE_VERSION,
    kind: "calculator",
    savedAt: new Date().toISOString(),
    coefficient,
    damage,
  };
}

function calcSavePayload() {
  if (!calc.active) {
    alert("먼저 캐릭터를 선택하고 계수를 입력하세요.");
    return;
  }
  const payload = calcBuildPayload();
  const name = calcSafeName(payload.coefficient.character);
  const type = calcSafeName(CALC_TYPE_DISPLAY[payload.coefficient.type] || payload.coefficient.type);
  calcDownloadJson(payload, `계산기_${name}_${type}.json`);
}

function calcLoadPayload(json) {
  // 계수 전용으로 저장된 옛 파일도 읽는다
  if (!calcApplyState(json.coefficient || json)) return;

  dmg.userEdited = true;          // 불러온 값을 복원 로직이 덮어쓰지 않게
  dmgRefresh();                   // 셀렉트를 먼저 채운 뒤
  if (json.damage) {
    dmgApplyFields(json.damage);  // 값을 넣고
    dmgRefresh();                 // 다시 계산한다
  }
  dmgSaveState();
}

function wireCalcJsonIo() {
  ["#coeffExport", "#dmgExport"].forEach((sel) =>
    document.querySelector(sel)?.addEventListener("click", calcSavePayload));

  ["#coeffImport", "#dmgImport"].forEach((sel) =>
    document.querySelector(sel)?.addEventListener("click", () => calcPickJson(calcLoadPayload)));
}

wireCalcJsonIo();
