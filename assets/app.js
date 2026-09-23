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
const CDN_AVATAR_ROOT = `${CDN_ROOT}v1.0.15/`;
const CDN_EQUIP_ROOT = `${CDN_ROOT}v2.0.8/`;
const CDN_ETC_ROOT = `${CDN_ROOT}v3.0.9/`;

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
// 갱신 시각만 담은 작은 파일 { CollectDate, LastUpdate }. 홈 카드처럼 랭킹 전체가 필요 없는 곳에서 쓴다 (2026-09-15부터)
const ETA_META_URL = "https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/main/eta_meta.json";
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
  lastUpdate: null, // 사이트(넥슨 에타 랭킹)의 "Last Update" 시각 "yyyy-MM-dd HH:mm:ss". 2026-09-15 이전 스냅샷에는 없음
  prevServers: null, // 비교 기준 데이터. 없으면 변동 표시 생략
  prevDate: null,
  compareDays: 1, // 증감 기준: 1(1일 전) | 7(1주일 전) | 30(1달 전)
  category: "전체",
  query: "",
  sort: "rank", // "rank" = 레벨·정수 순 | "essence" = 보유 정수 순 | "gain" = 획득 정수 순
  loaded: false,
  loading: false,
  index: null, // 날짜 → 커밋 SHA
  date: "", // 선택한 날짜 ("" = 최신)
  visible: [], // 현재 조건에 걸린 행 전부
  shown: 0, // 그중 실제로 그린 개수
  prevMap: null, // 비교 기준 순위. 이어 그릴 때 다시 만들지 않는다
  deltaTitle: "",
};

// 순위표는 5천 행이 넘는다. 한 번에 그리면 노드 6만 개를 만드느라 0.5초쯤
// 멈춘다. 한 화면에 아홉 행쯤 보이므로 앞쪽만 그리고 스크롤이 바닥에 닿을
// 때마다 이어 붙인다.
const ETA_CHUNK = 200;

function etaCurrentRows() {
  return eta.servers[eta.server] || [];
}

// ── 에타 랭킹 로컬 캐시 ──
// 데이터는 매일 1회, 넥슨 랭킹이 갱신되는 오전 8시대 직후(수집 포함 보통 09시 전) 갱신되므로,
// 같은 주기의 데이터를 이미 받아뒀다면 페이지를 다시 열어도 네트워크 요청 없이 localStorage 캐시를 사용한다.
// (2026-09-15 이전에는 10시경 갱신이라 기준이 10시였다)
const ETA_REFRESH_ANCHOR_HOUR = 9;
const ETA_LATEST_CACHE_KEY = "tw-eta-latest-cache-v1";
const ETA_PREV_CACHE_KEY = "tw-eta-prev-cache-v1";
const ETA_SNAPSHOT_CACHE_KEY = "tw-eta-snapshot-cache-v1";

// 기준 시각(오전 9시) 이후면 오늘, 이전이면 어제가 현재 갱신 주기의 기준일
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
  eta.shown = 0; // 조건이 바뀌었으니 다시 앞쪽부터 그린다
}

const state = {
  records: [],
  filtered: [],
  page: 0,
  view: "list", // "list" = 장비 목록, "detail" = 장비 상세
  listScroll: 0,
  shown: 0, // 실제로 그린 행 수. 나머지는 스크롤이 바닥에 닿을 때 이어 붙인다
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
  homeStats: document.querySelector("#homeStats"),
  homeOverlayDownload: document.querySelector("#homeOverlayDownload"),
  homeOverlayMeta: document.querySelector("#homeOverlayMeta"),
  mainPanels: document.querySelectorAll("[data-main-panel]"),
  dbTabButtons: document.querySelectorAll("[data-db-tab]"),
  dbPanels: document.querySelectorAll("[data-db-panel]"),
  calculatorTabButtons: document.querySelectorAll("[data-calculator-tab]"),
  calculatorPanels: document.querySelectorAll("[data-calculator-panel]"),
  calculatorTitle: document.querySelector("#calculatorTitle"),
  simulatorTabButtons: document.querySelectorAll("[data-simulator-tab]"),
  simulatorPanels: document.querySelectorAll("[data-simulator-panel]"),
  simulatorTitle: document.querySelector("#simulatorTitle"),
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
  avatarGallery: document.querySelector("#avatarGallery"),
  avatarListTableWrap: document.querySelector("#avatarListTableWrap"),
  avatarListWrap: document.querySelector(".avatar-list-wrap"),
  avatarDetailCard: document.querySelector("#avatarDetailCard"),
  infoTabButtons: document.querySelectorAll("[data-info-tab]"),
  infoTitle: document.querySelector("#infoTitle"),
  infoPanels: document.querySelectorAll("[data-info-panel]"),
  buffTabButtons: document.querySelectorAll("[data-buff-tab]"),
  buffPanels: document.querySelectorAll("[data-buff-panel]"),
  seedBody: document.getElementById("seedBody"),
  okGroundRow: document.querySelector("#okGroundRow"),
  okModeRow: document.querySelector("#okModeRow"),
  okEtaLevel: document.querySelector("#okEtaLevel"),
  okDamage: document.querySelector("#okDamage"),
  okHits: document.querySelector("#okHits"),
  okExtraRow: document.querySelector("#okExtraRow"),
  okWeapon: document.querySelector("#okWeapon"),
  okResult: document.querySelector("#okResult"),
  expBaseBox: document.querySelector("#expBaseBox"),
  expResultBox: document.querySelector("#expResultBox"),
  expBuffBody: document.querySelector("#expBuffBody"),
  rareBaseBox: document.querySelector("#rareBaseBox"),
  rareResultBox: document.querySelector("#rareResultBox"),
  rareBuffBody: document.querySelector("#rareBuffBody"),

  overlayReadme: document.querySelector("#overlayReadme"),
  overlayDownload: document.querySelector("#overlayDownload"),
  overlayReleaseMeta: document.querySelector("#overlayReleaseMeta"),
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
  etaLapisUse: document.querySelector("#etaLapisUse"),
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
  etaRankingHead: document.querySelector("#etaRankingHead"),
  popRangeButtons: document.querySelector("#popRangeButtons"),
  popBandButtons: document.querySelector("#popBandButtons"),
  popFromDate: document.querySelector("#popFromDate"),
  popToDate: document.querySelector("#popToDate"),
  popServerTabs: document.querySelector("#popServerTabs"),
  popTotal: document.querySelector("#popTotal"),
  popRangeLabel: document.querySelector("#popRangeLabel"),
  popLapisUse: document.querySelector("#popLapisUse"),
  popChart: document.querySelector("#popChart"),
  popEmpty: document.querySelector("#popEmpty"),
  popLegend: document.querySelector("#popLegend"),
  popLegendTotal: document.querySelector("#popLegendTotal"),
  popSelectAll: document.querySelector("#popSelectAll"),
  popSelectNone: document.querySelector("#popSelectNone"),
  etaSidebar: document.querySelector("#etaSidebar"),
  etaCharacterList: document.querySelector("#etaCharacterList"),
  etaRankingBody: document.querySelector("#etaRankingBody"),
  etaNewDateSelect: document.querySelector("#etaNewDateSelect"),
  etaMoveSearch: document.querySelector("#etaMoveSearch"),
  etaMoveResult: document.querySelector("#etaMoveResult"),
  etaNewServerTabs: document.querySelector("#etaNewServerTabs"),
  etaNewRange: document.querySelector("#etaNewRange"),
  etaNewGroups: document.querySelector("#etaNewGroups"),
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
  home: "",
  info: "seed",
  eta: "ranking",
  equipment: "equipment",
  calculator: "equipment",
  simulator: "encrypt",
  overlay: "",
};

// 옛 주소 → 지금 자리. 예전에 "테일즈 정보(extra)"에 있던 화면들이 정보·계산기로 나뉘어서,
// 밖에 퍼진 링크와 북마크가 깨지지 않게 여기서 넘겨준다. 키가 "탭/하위탭"이면 그 하위탭만, "탭"이면 전체를 옮긴다.
const ROUTE_MOVED = {
  "extra/onekill": { main: "calculator", sub: "onekill" },
  "extra/hit": { main: "calculator", sub: "hit" },
  extra: { main: "info" },
  "tools/calc": { main: "calculator" },
  "tools/sim": { main: "simulator" },
  "tools/encrypt": { main: "simulator", sub: "encrypt" },
  "tools/core": { main: "simulator", sub: "core" },
  "tools/relic": { main: "simulator", sub: "relic" },
  "tools/enhance": { main: "simulator", sub: "enhance" },
  "tools/hammer": { main: "simulator", sub: "hammer" },
  tools: { main: "calculator" },
  "calculator/coefficient": { main: "calculator", sub: "damage" },
  "tools/coefficient": { main: "calculator", sub: "damage" },
};

// 하위 탭을 어느 버튼 묶음에서 읽고 어느 함수로 여는지
const ROUTE_SUB = {
  info: { attr: "infoTab", open: (k) => activateInfoTab(k) },
  eta: { attr: "etaTab", open: (k) => activateEtaTab(k) },
  equipment: { attr: "dbTab", open: (k) => activateDbTab(k) },
  calculator: { attr: "calculatorTab", open: (k) => activateCalculatorTab(k) },
  simulator: { attr: "simulatorTab", open: (k) => activateSimulatorTab(k) },
};

// 아바타 이름 앞에 붙는 ♣ 같은 표시용 기호는 주소에서 뺀다. 링크가 읽기 쉬워진다.
// 이름을 맞출 때도 같은 기준으로 다듬어, 기호가 있든 없든 찾아진다.
const routeNameOut = (name) => String(name || "").replace(/^[♠♣♥♦★☆◆■]+\s*/, "").trim();
const routeNameKey = (name) => routeNameOut(name).replace(/\s+/g, " ").toLowerCase();

const ACTIVE_SUB = {};

// 카드 목록만 있는 화면들 — 버튼이 없고, 바깥 흰 칸과 메뉴 줄을 감춘다
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
  const sub = ROUTE_SUB[main] ? (ACTIVE_SUB[main] ?? routeActiveKey(ROUTE_SUB[main].attr)) : "";

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
  visitTrack();
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
  const moved = ROUTE_MOVED[`${parts[0]}/${parts[1] || ""}`] || ROUTE_MOVED[parts[0]];
  const main = moved ? moved.main : (parts[0] || "");
  if (!document.querySelector(`[data-main-tab="${CSS.escape(main)}"]`)) return null;
  const sub = moved ? (moved.sub || parts[1] || "") : parts[1];
  return { main, sub: sub || ROUTE_DEFAULT_SUB[main] || "", item: parts.slice(2).join("/") };
}

// 주소 → 화면. 항목은 데이터가 와야 열 수 있으므로 못 찾으면 미뤄 둔다.
function routeApply(r) {
  if (!r) return;
  route.applying = true;
  try {
    activateMainTab(r.main);
    const sub = ROUTE_SUB[r.main];
    // 기본 페이지("home")는 누를 버튼이 없으므로 버튼 확인을 건너뛴다
    const hasButton = (key) =>
      !!document.querySelector(`[data-${sub.attr.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}="${CSS.escape(key)}"]`);
    if (sub && r.sub && hasButton(r.sub)) {
      sub.open(r.sub);
    }
    route.pending = r.item ? { sub: r.sub, item: r.item } : null;
    routeResolvePending();
  } finally {
    route.applying = false;
  }
  routeWrite(); // 옛 주소로 들어왔으면 지금 자리의 주소로 바꿔 둔다
  visitTrack();
}

// ── 방문 집계 (GoatCounter) ──
// 사람 수와 탭 통계를 따로 센다.
//  - 첫 화면 한 번: 경로 "/"로 페이지뷰를 보낸다. GoatCounter는 세션당 경로별로 한 번만 "방문"으로 세므로
//    이것이 사람(세션) 수에 가장 가깝다. 탭 단위 집계 전(2026-09-13 이전)에 count.js가 자동으로 세던
//    것도 "/"라서 누적이 이어진다.
//  - 탭 이동: 메인/하위 탭 단위 경로(/eta/ranking)를 "이벤트"로 보낸다. 대시보드에서 탭별 인기는 보이지만
//    방문 수(홈의 오늘·누적)에는 들어가지 않는다. 항목(아바타 하나하나)까지는 보내지 않는다.
// 해시 주소라 count.js의 자동 집계(no_onload로 꺼 둠)로는 전부 "/"로 잡히기 때문에 직접 보낸다.
const visit = { ready: false, last: "", landed: false, queue: [] };

// count.js가 아직 안 내려왔으면 모아 뒀다가 로드된 뒤 순서대로 보낸다 (첫 화면)
function visitSend(vars) {
  const gc = window.goatcounter;
  if (gc && typeof gc.count === "function") {
    gc.count(vars);
    return;
  }
  if (!visit.queue.length) {
    document.querySelector("script[data-goatcounter]")?.addEventListener("load", () => {
      const pending = visit.queue.splice(0);
      if (typeof window.goatcounter?.count === "function") pending.forEach((v) => window.goatcounter.count(v));
    }, { once: true });
  }
  visit.queue.push(vars);
}

function visitTrack() {
  if (!visit.ready) return;   // 부팅 중 기본 탭을 켜는 과정은 방문으로 세지 않는다
  const r = routeCurrent();
  if (!r) return;
  const path = "/" + [r.main, r.sub].filter(Boolean).join("/");
  if (path === visit.last) return;   // 같은 경로는 연속으로 다시 세지 않는다
  visit.last = path;

  if (!visit.landed) {
    visit.landed = true;
    visitSend({ path: "/", title: "TW DB" });
  }

  const label = (attr, key) => document.querySelector(`[data-${attr}="${CSS.escape(key)}"]`)?.textContent.trim() || key;
  const title = [label("main-tab", r.main), r.sub ? label(ROUTE_SUB[r.main]?.attr.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()) || "", r.sub) : ""]
    .filter(Boolean).join(" · ");
  visitSend({ path, title, event: true });
}

// 데이터가 준비된 뒤 미뤄 둔 항목을 연다. 각 DB 로딩이 끝날 때마다 불린다.
function routeResolvePending() {
  const p = route.pending;
  if (!p) return;

  // 버프 아이템은 데이터 없이도 바로 열 수 있다: #/extra/buff/rare 처럼 세 번째 칸으로 하위 탭을 고른다
  if (p.sub === "buff") {
    route.pending = null;
    if (document.querySelector(`[data-buff-tab="${CSS.escape(p.item)}"]`)) activateBuffTab(p.item);
    return;
  }

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
  activateMainTab("home");
  activateCalculatorTab("equipment");
  activateSimulatorTab("encrypt");
  activateInfoTab("seed");
  activateEtaTab("ranking");
  activateDbTab("equipment");
  revealLocalOnly();
  wireEvents();
  setAvatarViewMode(avatar.viewMode); // 저장된 선택을 버튼에 반영
  wireRoute();
  visit.ready = true;
  routeApply(initialRoute);
  visitTrack();               // 주소 없이 들어와도(홈) 첫 화면을 센다
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
  hitCalc.refreshEquipment();   // 필요 명중 계산기를 먼저 열어 뒀으면 장비 후보를 채운다

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
// v2: 시트에서 열이 하나 빠져 배치가 바뀌었다. 옛 배치로 캐시된 CSV를 새 파서가
// 읽으면 어긋나므로 키를 올려 버리게 한다.
const CSV_CACHE_KEY = "tw-equipment-csv-cache-v2";

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

// 열 위치는 헤더 이름으로 찾는다. 예전에는 번호를 고정해 뒀는데, 시트에서 열 하나를
// 지우자 이름·스탯·재료가 통째로 한 칸씩 밀려 버렸다. 헤더를 기준으로 잡으면
// 열이 늘거나 줄어도 파서가 따라간다.
//
// 헤더를 찾지 못하면 아래 번호로 되돌아간다 (현재 시트 배치 기준).
const SHEET_COLUMN_FALLBACK = {
  imageFile: 0,
  name: 1,
  category: 2,
  firstStat: 4,
  condition: 31,
  materials: 34,
};

function buildColumnIndex(headerRow, subHeaderRow) {
  const header = (headerRow || []).map(clean);
  const subHeader = (subHeaderRow || []).map(clean);
  // 1행(묶음 헤더)에서 먼저 찾고 없으면 2행(세부 헤더)에서 찾는다.
  // 스탯이 "찌르기 / Min·Max·Limit"로 나뉘듯, 착용조건도 1행은 한 이름으로 묶고
  // 2행에 캐릭터·착용레벨·요구스탯을 나눠 적는다.
  const at = (label, fallback) => {
    const found = header.indexOf(label);
    if (found >= 0) return found;
    const foundInSub = subHeader.indexOf(label);
    return foundInSub >= 0 ? foundInSub : fallback;
  };

  const category = at("카테고리", SHEET_COLUMN_FALLBACK.category);
  const cols = {
    imageFile: at("이미지 파일", SHEET_COLUMN_FALLBACK.imageFile),
    name: at("이름", SHEET_COLUMN_FALLBACK.name),
    category,
    // 종류는 헤더 칸이 비어 있어 이름으로 찾을 수 없다. 카테고리 바로 오른쪽에 온다
    type: category + 1,
    // 1행에 착용조건이 여러 칸 걸쳐 있어도 indexOf가 첫 칸(캐릭터)을 잡는다
    condition: at("착용조건", SHEET_COLUMN_FALLBACK.condition),
    // 아직 안 채운 시트도 있어 없으면 -1 (row[-1]은 undefined라 빈 값이 된다)
    wearLevel: at("착용레벨", -1),
    wearStat: at("요구스탯", -1),
    materials: at("재료", SHEET_COLUMN_FALLBACK.materials),
    stats: {},
  };

  // 스탯은 헤더에 이름이 한 번만 적히고 Min/Max/Limit 3칸을 차지한다
  STAT_NAMES.forEach((label, statIndex) => {
    cols.stats[label] = at(label, SHEET_COLUMN_FALLBACK.firstStat + statIndex * 3);
  });

  return cols;
}

function normalizeRows(rows) {
  const cols = buildColumnIndex(rows[0], rows[1]);
  return rows
    .slice(2)
    .map((row, index) => toRecord(row, index, cols))
    .filter(Boolean);
}

function toRecord(row, index, cols) {
  const name = clean(row[cols.name]);
  if (!name) return null;

  const imageFile = clean(row[cols.imageFile]);
  const category = clean(row[cols.category]) || "기타";
  const type = clean(row[cols.type]) || "기타";
  const stats = {};

  STAT_NAMES.forEach((label) => {
    const start = cols.stats[label];
    stats[label] = {
      min: toNumber(row[start]),
      max: toNumber(row[start + 1]),
      limit: toNumber(row[start + 2]),
    };
  });

  const materials = row
    .slice(cols.materials, cols.materials + 6)
    .map(clean)
    .filter((item) => item && item !== "#REF!");

  const condition = clean(row[cols.condition]);
  const wearLevel = clean(row[cols.wearLevel]);
  const wearStat = clean(row[cols.wearStat]);
  const id = `${imageFile || name}-${index}`;

  return {
    id,
    imageFile,
    name,
    category,
    type,
    stats,
    condition,
    wearLevel,
    wearStat,
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
    // 파일명은 (귀속)인데 표기는 묶음 크기가 붙는 경우가 있다 (룬의 원석(20) → 룬의_원석(귀속))
    (value) => `${stripTrailingParenthetical(value)}(귀속)`,
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

  if (key === "home") {
    loadHomeTab();
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
  // 획득 정수 열에 레벨별 필요량이 필요하다. 늦게 도착하면 그때 다시 그린다
  if (!etaInfo.data) ensureEtaInfo().then(() => { if (seq === etaLoadSeq) renderEtaRanking(); });

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
        <tr><td colspan="6">
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
      els.etaUpdatedDate.textContent = etaUpdatedLabel();
      els.etaUpdatedDate.title = eta.lastUpdate ? `넥슨 에타 랭킹 Last Update ${eta.lastUpdate} (수집일 ${eta.collectDate || "-"})` : "";
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
  eta.lastUpdate = clean(payload?.LastUpdate || "") || null;
}

// 결과 띠의 갱신 표기. 사이트 갱신 시각이 있으면 그 시각(초 제외)을, 없으면 수집일만 보여준다.
function etaUpdatedLabel() {
  if (eta.lastUpdate) return `갱신: ${eta.lastUpdate.slice(0, 16)}`;
  return `갱신일: ${eta.collectDate || "-"}`;
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
  if (dates.length) return dates[dates.length - 1];
  eta.prevShort = true;   // 요청한 기간만큼 자료가 없어 더 짧은 기간과 견줬다
  // 그만큼 거슬러 올라갈 자료가 없으면(수집 시작 전) 가진 것 중 가장 오래된 날과 견준다.
  // 아무 표시도 안 하는 것보다 "있는 데까지"라도 보여 주는 편이 낫다
  const older = Object.keys(eta.index).filter((d) => d < baseDate).sort();
  return older[0] || null;
}

async function loadEtaPreviousRankings(seq) {
  eta.prevServers = null;
  eta.prevDate = null;
  eta.prevShort = false;

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
// 레벨업에 드는 재료. 키는 "그 레벨에서 다음 레벨로" (20 → 21에 라피스 1개)
const ETA_LEVEL_COST = {
  20: { lapis: 1 },
  40: { lapis: 3 },
  60: { lapis: 3 },
  80: { lapis: 3 },
  90: { lapis: 5, ring: 1 },
};

// 이전 레벨에서 지금 레벨까지 올리며 쓴 재료
function etaLevelCost(from, to) {
  let lapis = 0;
  let ring = 0;
  for (let level = from; level < to; level += 1) {
    const cost = ETA_LEVEL_COST[level];
    if (!cost) continue;
    lapis += cost.lapis || 0;
    ring += cost.ring || 0;
  }
  return { lapis, ring };
}

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

// ── 진입 · 이탈 페이지 ──
// 랭킹은 한 아이디당 한 행만 나온다(중복 없음). 그래서 캐릭터 코드가 아니라
// 아이디를 키로 잡아야 캐릭터를 바꿔 랭크된 사람이 진입으로 잘못 잡히지 않는다.
//
// 이 탭은 순위 탭과 따로 논다. 순위 탭은 1일/1주/1달을 고를 수 있지만
// 여기는 "고른 날짜"와 "그 바로 앞 날짜" 딱 두 개만 본다.
const etaNew = {
  date: "",        // "" = 가장 최근 날짜
  baseDate: null,  // 실제로 비교에 쓴 기준일
  prevDate: null,
  base: null,      // 기준일 서버별 행
  prev: null,      // 직전일 서버별 행
  loading: false,
  seq: 0,
  cache: new Map(), // 날짜 → 서버별 행. 날짜를 오가며 볼 때 재다운로드를 막는다
  highlight: "",    // 기록 검색에서 날짜를 눌러 넘어온 아이디. 표에서 강조한다
  scrollTo: false,  // 그 아이디 행으로 한 번만 스크롤
};

const ETA_NEW_CACHE_LIMIT = 6;

async function etaNewSnapshot(date) {
  if (etaNew.cache.has(date)) return etaNew.cache.get(date);
  const sha = eta.index?.[date];
  if (!sha) return null;
  // 순위 탭과 캐시 슬롯을 공유하면 서로 덮어쓰므로 여기서는 슬롯을 쓰지 않는다
  const payload = await fetchEtaPayload(etaSnapshotUrl(sha));
  const servers = parseEtaServers(payload);
  etaNew.cache.set(date, servers);
  while (etaNew.cache.size > ETA_NEW_CACHE_LIMIT) {
    etaNew.cache.delete(etaNew.cache.keys().next().value);
  }
  return servers;
}

async function loadEtaNewcomerData() {
  const seq = ++etaNew.seq;
  etaNew.loading = true;
  renderEtaNewcomers();

  try {
    await loadEtaIndex();
    const dates = eta.index ? Object.keys(eta.index).sort() : [];
    if (!dates.length) return;

    renderEtaNewDateSelect(dates);

    const baseDate = etaNew.date || dates[dates.length - 1];
    const index = dates.indexOf(baseDate);
    const prevDate = index > 0 ? dates[index - 1] : null;

    // 수집이 하루 빠진 날도 있어 "어제 날짜"가 아니라 "인덱스상 바로 앞 날짜"를 쓴다
    const [base, prev] = await Promise.all([
      etaNewSnapshot(baseDate),
      prevDate ? etaNewSnapshot(prevDate) : Promise.resolve(null),
    ]);
    if (seq !== etaNew.seq) return;

    etaNew.baseDate = baseDate;
    etaNew.prevDate = prevDate;
    etaNew.base = base;
    etaNew.prev = prev;
  } catch (error) {
    console.warn("신규 진입 데이터 로딩 실패", error);
  } finally {
    if (seq === etaNew.seq) {
      etaNew.loading = false;
      renderEtaNewcomers();
    }
  }
}

function renderEtaNewDateSelect(dates) {
  if (!els.etaNewDateSelect) return;
  const ordered = [...dates].reverse();
  els.etaNewDateSelect.innerHTML = ordered
    .map((d, i) => {
      const label = i === 0 ? `${d} (최신)` : d;
      return `<option value="${d}"${d === etaNew.date ? " selected" : ""}>${label}</option>`;
    })
    .join("");
  if (!etaNew.date && ordered.length) els.etaNewDateSelect.value = ordered[0];
  els.etaNewDateSelect.disabled = !ordered.length;
}

function etaNewcomerGroups() {
  const current = etaNew.base?.[eta.server] || [];
  const previous = etaNew.prev?.[eta.server];
  if (!current.length || !previous || !previous.length) return null;

  // 수집이 캐릭터 단위로 통째로 빠진 날이 있다(루시안이 16일치 비었다).
  // 그런 날과 비교하면 그 캐릭터 전원이 신규나 사라짐으로 잡히므로 아예 뺀다.
  // 날짜를 박아두지 않고 "한쪽에만 있는 캐릭터"로 판별해 앞으로 생길 누락도 걸린다.
  const codesOf = (rows) => new Set(rows.map((row) => row.code));
  const currentCodes = codesOf(current);
  const previousCodes = codesOf(previous);

  const skippedCodes = new Set();
  for (const code of new Set([...currentCodes, ...previousCodes])) {
    if (currentCodes.has(code) !== previousCodes.has(code)) skippedCodes.add(code);
  }

  const kept = (row) => !skippedCodes.has(row.code);
  const prevIds = new Set(previous.map((row) => row.userId));
  const currentIds = new Set(current.map((row) => row.userId));
  const entered = current.filter((row) => kept(row) && !prevIds.has(row.userId));
  const left = previous.filter((row) => kept(row) && !currentIds.has(row.userId));

  const byRank = (a, b) => b.level - a.level || b.essence - a.essence;

  return {
    entered: entered.sort(byRank),
    left: left.sort(byRank),
  };
}

// ── 아이디 드나든 기록 검색 ──
// 진입·이탈 표는 고른 날짜 하루만 본다. "이 아이디가 언제 드나들었나"를 알려면
// 76일을 전부 비교해야 하는데 원본은 하루치가 1MB 가까워 브라우저가 못 받는다.
// scripts/build-eta-moves.mjs가 미리 훑어 둔 파일 하나만 받아 쓴다.
const ETA_MOVES_URL = "./assets/eta-moves.json";

const etaMoves = {
  data: null,
  loading: false,
  query: "",
};

async function loadEtaMoves() {
  if (etaMoves.data || etaMoves.loading) return etaMoves.data;
  etaMoves.loading = true;
  try {
    // 매일 바뀌는 파일이라 캐시를 그대로 쓰지 않고 바뀌었는지 서버에 물어본다(안 바뀌었으면 304)
    const response = await fetch(ETA_MOVES_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    etaMoves.data = await response.json();
  } catch (error) {
    console.warn("드나든 기록 파일 로딩 실패", error);
  } finally {
    etaMoves.loading = false;
  }
  return etaMoves.data;
}

// 정확히 일치하는 아이디를 먼저 보이고, 나머지는 부분 일치로 채운다
function etaMoveMatches(query) {
  const bag = etaMoves.data?.servers?.[eta.server];
  if (!bag) return [];
  const needle = query.toLowerCase();
  const exact = [];
  const partial = [];
  for (const userId of Object.keys(bag)) {
    const lower = userId.toLowerCase();
    if (lower === needle) exact.push(userId);
    else if (lower.includes(needle)) partial.push(userId);
  }
  return [...exact, ...partial.sort()];
}

function etaMoveRowsHtml(userId) {
  const entry = etaMoves.data.servers[eta.server][userId];
  const dates = etaMoves.data.dates;
  const events = [
    ...(entry.i || []).map((slot) => ({ date: dates[slot], kind: "진입" })),
    ...(entry.o || []).map((slot) => ({ date: dates[slot], kind: "이탈" })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return `
    <section class="eta-move-card">
      <div class="eta-move-card-head">
        <b>${escapeHtml(userId)}</b>
        <span>진입 ${formatNumber((entry.i || []).length)}회 · 이탈 ${formatNumber((entry.o || []).length)}회</span>
      </div>
      <ul class="eta-move-dates">
        ${events.map((event) => `
          <li><button type="button" class="eta-move-jump" data-eta-move-date="${escapeHtml(event.date)}" data-eta-move-user="${escapeHtml(userId)}" title="${escapeHtml(event.date)} 진입·이탈 표로 이동"><span class="eta-move-kind ${event.kind === "진입" ? "in" : "out"}">${event.kind}</span>${escapeHtml(event.date)}</button></li>
        `).join("")}
      </ul>
    </section>
  `;
}

const ETA_MOVE_LIMIT = 20;

function renderEtaMoveSearch() {
  const box = els.etaMoveResult;
  if (!box) return;

  const query = etaMoves.query;
  if (!query) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  box.hidden = false;
  if (!etaMoves.data) {
    box.innerHTML = `<p class="eta-move-empty">${etaMoves.loading ? "기록을 불러오는 중입니다" : "기록을 불러오지 못했습니다"}</p>`;
    return;
  }

  const matches = etaMoveMatches(query);
  if (!matches.length) {
    box.innerHTML = `<p class="eta-move-empty">${escapeHtml(query)} — 드나든 기록이 없습니다. 계속 순위에 있었거나 집계 기간 밖입니다.</p>`;
    return;
  }

  const shown = matches.slice(0, ETA_MOVE_LIMIT);
  const rest = matches.length - shown.length;
  const period = `${etaMoves.data.dates[0]} ~ ${etaMoves.data.dates[etaMoves.data.dates.length - 1]}`;
  box.innerHTML = `
    <div class="eta-move-head">${escapeHtml(period)} 기록에서 ${formatNumber(matches.length)}건</div>
    <div class="eta-move-cards">${shown.map(etaMoveRowsHtml).join("")}</div>
    ${rest > 0 ? `<p class="eta-move-empty">그 밖에 ${formatNumber(rest)}개 더 있습니다. 아이디를 더 적어 좁혀보세요.</p>` : ""}
  `;
}

function etaNewGroupHtml(title, hint, rows) {
  const body = rows.length
    ? rows.map((row) => `
      <tr${etaNew.highlight && row.userId === etaNew.highlight ? ' class="is-highlight"' : ""}>
        <td class="eta-newcomer-id">${escapeHtml(row.userId)}</td>
        <td>${escapeHtml(row.characterName)}</td>
        <td>${formatNumber(row.level)}</td>
        <td>${formatNumber(row.essence)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="4" class="eta-newcomer-empty">해당하는 아이디가 없습니다</td></tr>`;

  return `
    <section class="eta-newcomer-group">
      <div class="eta-newcomer-group-head">
        <h3>${escapeHtml(title)}</h3>
        <strong>${formatNumber(rows.length)}명</strong>
      </div>
      <p class="eta-newcomer-hint">${escapeHtml(hint)}</p>
      <div class="equip-list-wrap eta-newcomer-list-wrap">
        <table class="equip-list eta-newcomer-list">
          <thead><tr><th>아이디</th><th>캐릭터</th><th>에타레벨</th><th>정수</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderEtaNewcomers() {
  if (!els.etaNewGroups) return;

  renderEtaNewServerTabs();

  els.etaNewRange.textContent = etaNew.baseDate
    ? (etaNew.prevDate
        ? `${etaNew.prevDate} → ${etaNew.baseDate}`
        : `${etaNew.baseDate} (이전 날짜 없음)`)
    : "날짜를 불러오는 중입니다";

  const groups = etaNewcomerGroups();
  if (!groups) {
    els.etaNewGroups.innerHTML = `<p class="eta-newcomer-empty-state">${
      etaNew.loading
        ? "데이터를 불러오는 중입니다."
        : etaNew.baseDate && !etaNew.prevDate
          ? "가장 오래된 날짜라 비교할 이전 데이터가 없습니다."
          : "비교할 데이터를 불러오지 못했습니다."
    }</p>`;
    return;
  }

  els.etaNewGroups.innerHTML = [
    etaNewGroupHtml(
      "순위 진입",
      "전날 순위에 없다가 진입한 아이디입니다. 처음 시작한 사람, 돌아온 사람, 아이디를 바꾼 사람이 섞여 있습니다.",
      groups.entered,
    ),
    etaNewGroupHtml(
      "순위 이탈",
      "전날 순위에 있다가 이탈한 아이디입니다. 그만둔 사람, 아이디를 바꾼 사람이 섞여 있습니다.",
      groups.left,
    ),
  ].join("");

  // 기록 검색에서 날짜를 눌러 왔으면 그 아이디 행으로 한 번 스크롤한다
  if (etaNew.scrollTo && !etaNew.loading) {
    etaNew.scrollTo = false;
    const row = els.etaNewGroups.querySelector("tr.is-highlight");
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function renderEtaNewServerTabs() {
  if (!els.etaNewServerTabs) return;
  const names = Object.keys(etaNew.base || eta.servers);
  els.etaNewServerTabs.innerHTML = names.map((name) => `
    <button class="eta-server-tab${name === eta.server ? " is-active" : ""}" type="button" role="radio" aria-checked="${name === eta.server}" data-eta-server="${escapeHtml(name)}">${escapeHtml(name)}</button>
  `).join("");
}

// ── 획득 정수 ──
// 보유 정수만 빼면 레벨업하며 쓴 정수가 빠지므로, "그 레벨까지 올리는 데 든 정수 합 + 보유 정수"를
// 누적 획득량으로 두고 비교 기준일과의 차이를 본다. 레벨별 필요량은 eta_info.json의 레벨표(water)에서 읽는다.
let etaEssenceCumulativeCache = null;

// cum[L] = 1레벨에서 L레벨까지 올리는 데 든 정수 합. 레벨표의 water는 "그 레벨에서 다음 레벨로" 드는 양이다.
function etaEssenceCumulative() {
  if (etaEssenceCumulativeCache) return etaEssenceCumulativeCache;
  const levels = etaInfo.data?.levels;
  if (!Array.isArray(levels) || !levels.length) return null;
  const cost = new Map();
  levels.forEach((row) => {
    const lv = Number(row?.lv);
    const water = Number(String(row?.water ?? "").replace(/[^\d]/g, ""));
    if (lv > 0 && Number.isFinite(water)) cost.set(lv, water);
  });
  const maxLevel = Math.max(100, ...cost.keys());
  const cum = [0, 0];
  for (let lv = 2; lv <= maxLevel + 1; lv += 1) cum[lv] = cum[lv - 1] + (cost.get(lv - 1) || 0);
  etaEssenceCumulativeCache = cum;
  return cum;
}

let etaInfoPromise = null;

// 정보/계산기 탭이 아닌 곳에서 eta_info.json이 필요할 때. 이미 받았으면 바로 끝난다.
function ensureEtaInfo() {
  if (etaInfo.data) return Promise.resolve();
  if (!etaInfoPromise) {
    etaInfoPromise = loadEtaInfo().finally(() => {
      if (!etaInfo.data) etaInfoPromise = null; // 실패했으면 다음에 다시 시도
    });
  }
  return etaInfoPromise;
}

// ── 에타 정보 페이지 ([?] 버튼 → 조견표·레벨별 상세) ──
// ── 에타 인구 통계 ──
// 날짜별 스냅샷은 하루치가 1MB 가까워 브라우저에서 기간만큼 받을 수 없다.
// 캐릭터별 인원수만 미리 집계해 둔 파일을 쓴다(73일에 17KB).
const ETA_POPULATION_URL = "./assets/eta-population.json";

const POP_RANGES = [
  { key: "1w", label: "1주일", days: 7 },
  { key: "1m", label: "1개월", days: 30 },
  { key: "3m", label: "3개월", days: 90 },
  { key: "6m", label: "6개월", days: 182 },
  { key: "1y", label: "1년", days: 365 },
  { key: "all", label: "전체", days: 0 },
];

// 19개 선을 겹쳐 그리므로 이웃한 캐릭터끼리 색이 붙지 않게 색상환을 띄엄띄엄 돈다
const POP_COLORS = [
  "#0f6f63", "#c2410c", "#2563eb", "#b45309", "#7c3aed",
  "#059669", "#db2777", "#0891b2", "#65a30d", "#e11d48",
  "#4f46e5", "#ca8a04", "#0d9488", "#9333ea", "#dc2626",
  "#0284c7", "#16a34a", "#a16207", "#be123c",
];

// 레벨 구간. 집계 파일의 bandTops와 같은 순서다.
const POP_BAND_TOPS = [20, 40, 60, 80, 90, 100];
const POP_BAND_LABELS = POP_BAND_TOPS.map((top, index) => `${(POP_BAND_TOPS[index - 1] || 0) + 1}-${top}`);

// 서버 탭 맨 앞에 놓는 가상 항목. 실제 서버 이름과 겹치지 않는다.
const POP_ALL_SERVERS = "통합";

const etaPop = {
  days: null,        // { "yyyy-MM-dd": { 서버: { 캐릭터코드: [구간별 인원] } } }
  cost: null,        // { "yyyy-MM-dd": { 서버: { 캐릭터코드: [구간을 넘어간 인원] } } }
  loading: false,
  server: "",
  range: "3m",
  from: "",          // 직접 선택. 값이 있으면 range보다 우선한다
  to: "",
  bands: new Set(POP_BAND_TOPS.map((_, index) => index)), // 켜 둔 레벨 구간. 처음엔 전부 켜 둔다
  hidden: new Set(), // 숨긴 캐릭터 코드
};

const ETA_INFO_URL = "./assets/eta_info.json";
const etaInfo = { data: null, loading: false };

// DB 탭과 같은 방식. 정보/계산기 둘 다 같은 eta_info.json을 쓰므로
// 어느 쪽을 처음 열든 그때 한 번만 받아 온다.
function activateEtaTab(key) {
  ACTIVE_SUB.eta = key;
  els.etaTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.etaTab === key);
  });
  els.etaPanels.forEach((panel) => {
    panel.hidden = panel.dataset.etaPanel !== key;
  });
  if (key === "newcomers") {
    if (etaNew.base) renderEtaNewcomers();
    else loadEtaNewcomerData();
  } else if (key === "population") {
    if (etaPop.days) renderEtaPopulation();
    else loadEtaPopulation();
  } else if (key !== "ranking" && !etaInfo.data && !etaInfo.loading) loadEtaInfo();

  routeWrite();
}

function wireEtaPopulation() {
  els.popRangeButtons?.addEventListener("click", (event) => {
    const key = event.target.closest("[data-pop-range]")?.dataset.popRange;
    if (!key) return;
    etaPop.range = key;
    etaPop.from = "";
    etaPop.to = "";
    renderEtaPopulation();
  });

  els.popBandButtons?.addEventListener("click", (event) => {
    const value = event.target.closest("[data-pop-band]")?.dataset.popBand;
    if (value === undefined) return;
    const index = Number(value);
    if (etaPop.bands.has(index)) etaPop.bands.delete(index);
    else etaPop.bands.add(index);
    renderEtaPopulation();
  });

  const applyCustom = () => {
    etaPop.from = els.popFromDate.value;
    etaPop.to = els.popToDate.value;
    renderEtaPopulation();
  };
  els.popFromDate?.addEventListener("change", applyCustom);
  els.popToDate?.addEventListener("change", applyCustom);

  els.popServerTabs?.addEventListener("click", (event) => {
    const name = event.target.closest("[data-pop-server]")?.dataset.popServer;
    if (!name || name === etaPop.server) return;
    etaPop.server = name;
    renderEtaPopulation();
  });

  els.popLegend?.addEventListener("click", (event) => {
    const code = event.target.closest("[data-pop-code]")?.dataset.popCode;
    if (code === undefined) return;
    const key = Number(code);
    if (etaPop.hidden.has(key)) etaPop.hidden.delete(key);
    else etaPop.hidden.add(key);
    renderEtaPopulation();
  });

  els.popSelectAll?.addEventListener("click", () => {
    etaPop.hidden.clear();
    renderEtaPopulation();
  });

  els.popSelectNone?.addEventListener("click", () => {
    popSeries(popVisibleDates()).forEach((series) => etaPop.hidden.add(series.code));
    renderEtaPopulation();
  });
}

// 인구 통계 탭과 홈 요약이 같은 파일을 쓴다. 동시에 불려도 한 번만 받도록 진행 중인 요청을 돌려준다.
let etaPopPromise = null;

function loadEtaPopulation() {
  if (etaPop.days) return Promise.resolve();
  if (etaPopPromise) return etaPopPromise;
  etaPop.loading = true;
  etaPopPromise = (async () => {
    try {
      // 매일 바뀌는 파일이라 캐시를 그대로 쓰지 않고 바뀌었는지 서버에 물어본다(안 바뀌었으면 304)
      const response = await fetch(ETA_POPULATION_URL, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      etaPop.days = payload?.days || {};
      etaPop.cost = payload?.cost || null;
      if (!etaPop.server) etaPop.server = popServerNames()[0] || "";
      renderEtaPopulation();
    } catch (error) {
      console.warn("에타 인구 통계 로딩 실패", error);
      if (els.popChart) {
        els.popChart.innerHTML = `<div class="empty-state"><strong>인구 통계를 불러오지 못했습니다</strong><span>잠시 후 다시 시도해주세요.</span></div>`;
      }
    } finally {
      etaPop.loading = false;
      if (!etaPop.days) etaPopPromise = null; // 실패했으면 다음에 다시 시도
    }
  })();
  return etaPopPromise;
}

// 서버는 도중에 늘어난다(네냐플은 뒤늦게 들어왔다). 전체 날짜에서 모아 쓴다.
function popServerNames() {
  const names = new Set();
  Object.values(etaPop.days || {}).forEach((byServer) => {
    Object.keys(byServer).forEach((name) => names.add(name));
  });
  return [...names];
}

function popAllDates() {
  return Object.keys(etaPop.days || {}).sort();
}

// 그 날짜에 지금 보고 있는 서버의 데이터가 있는지.
// 통합은 한 서버라도 빠진 날을 빼야 한다. 네냐플이 들어온 날 합계가 계단처럼 뛰기 때문이다.
function popDateHasServer(date) {
  const day = etaPop.days[date] || {};
  if (etaPop.server !== POP_ALL_SERVERS) return Boolean(day[etaPop.server]);
  const names = popServerNames();
  return names.length > 0 && names.every((name) => day[name]);
}

// 지금 보고 있는 서버 목록. 통합이면 전부.
function popActiveServers() {
  return etaPop.server === POP_ALL_SERVERS ? popServerNames() : [etaPop.server];
}

// 화면에 그릴 날짜 목록. 직접 선택이 있으면 그 구간, 없으면 마지막 날에서 N일 전까지.
function popVisibleDates() {
  const dates = popAllDates().filter(popDateHasServer);
  if (!dates.length) return [];

  if (etaPop.from || etaPop.to) {
    const from = etaPop.from || dates[0];
    const to = etaPop.to || dates[dates.length - 1];
    return dates.filter((date) => date >= from && date <= to);
  }

  const range = POP_RANGES.find((item) => item.key === etaPop.range);
  if (!range || !range.days) return dates;

  const last = new Date(`${dates[dates.length - 1]}T00:00:00`);
  last.setDate(last.getDate() - (range.days - 1));
  const pad = (value) => String(value).padStart(2, "0");
  const start = `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;
  return dates.filter((date) => date >= start);
}

// 마지막 날 인원이 많은 순으로 정렬해, 범례와 툴팁이 같은 순서를 쓰게 한다
// 그 날짜 그 캐릭터의 인원. 통합이면 서버를 다 더한다. 데이터가 없으면 null.
function popCountAt(date, code) {
  const day = etaPop.days[date];
  if (!day) return null;
  let sum = null;
  popActiveServers().forEach((name) => {
    const bands = day[name]?.[code];
    if (bands) sum = (sum ?? 0) + popSumBands(bands);
  });
  return sum;
}

function popSeries(dates) {
  if (!dates.length) return [];
  const codes = new Set();
  dates.forEach((date) => {
    popActiveServers().forEach((name) => {
      Object.keys(etaPop.days[date]?.[name] || {}).forEach((code) => codes.add(Number(code)));
    });
  });

  // 상위 데이터에 그 캐릭터가 통째로 빠진 날이 있다(루시안이 그렇다).
  // 0으로 찍으면 급락처럼 보이므로 전날 값을 그대로 이어 쓴다.
  // 첫 값이 나오기 전은 이어 쓸 값이 없어 null로 두고 선을 끊는다.
  return [...codes]
    .map((code) => {
      let carried = null;
      const values = dates.map((date) => {
        const count = popCountAt(date, code);
        if (count !== null) carried = count;
        return carried;
      });
      return {
        code,
        name: ETA_CHARACTER_BY_CODE[code] || `코드${code}`,
        color: POP_COLORS[code % POP_COLORS.length],
        values,
      };
    })
    .sort((a, b) => popLastValue(b) - popLastValue(a));
}

// 켜 둔 레벨 구간만 더한다. 저장할 때 뒤쪽 0을 잘라서 배열이 짧을 수 있다.
function popSumBands(bands) {
  let sum = 0;
  for (let i = 0; i < bands.length; i += 1) {
    if (etaPop.bands.has(i)) sum += bands[i];
  }
  return sum;
}

function popLastValue(series) {
  for (let i = series.values.length - 1; i >= 0; i -= 1) {
    if (series.values[i] !== null) return series.values[i];
  }
  return 0;
}

function popFirstValue(series) {
  return series.values.find((value) => value !== null) ?? 0;
}

function renderEtaPopulation() {
  if (!els.popChart || !etaPop.days) return;

  renderPopRangeButtons();
  renderPopBandButtons();
  renderPopServerTabs();

  const dates = popVisibleDates();
  const all = popSeries(dates);
  const shown = all.filter((series) => !etaPop.hidden.has(series.code));

  renderPopLegend(all);

  renderPopLegendTotal(shown);

  const reason = !dates.length ? "데이터 없음"
    : !etaPop.bands.size ? "레벨 구간을 선택해주세요"
    : !shown.length ? "캐릭터를 선택해주세요"
    : "";
  els.popEmpty.hidden = !reason;
  els.popChart.hidden = Boolean(reason);
  if (reason) {
    els.popTotal.textContent = "0명";
    els.popRangeLabel.textContent = reason;
    if (els.popLapisUse) els.popLapisUse.hidden = true;
    return;
  }

  const lastTotal = shown.reduce((sum, series) => sum + popLastValue(series), 0);
  els.popTotal.textContent = `${lastTotal.toLocaleString("ko-KR")}명`;
  // 통합은 서버가 다 모인 날부터라 기간이 잘린다. 왜 짧은지 적어 준다.
  const clipped = etaPop.server === POP_ALL_SERVERS && dates[0] > popAllDates()[0];
  els.popRangeLabel.textContent = `${dates[0]} ~ ${dates[dates.length - 1]} · ${dates.length}일`
    + (clipped ? " · 서버가 모두 수집된 날부터" : "");

  renderPopLapisUse(dates, shown);
  els.popChart.innerHTML = popChartSvg(dates, shown);
  wirePopChartHover(dates, shown);
}

// 날짜별 소모량은 파일을 만들 때 사람마다 어제·오늘 레벨을 견줘 세어 둔 값이다.
// cost[날짜][서버][캐릭터코드] = [20→21 인원, 40→41, 60→61, 80→81, 90→91]
// 넘어간 구간(20→21이면 21-40 구간)이 켜져 있을 때만 센다.
const POP_COST_ITEMS = [{ lapis: 1 }, { lapis: 3 }, { lapis: 3 }, { lapis: 3 }, { lapis: 5, ring: 1 }];

function renderPopLapisUse(dates, shown) {
  const box = els.popLapisUse;
  if (!box) return;
  const cost = etaPop.cost;
  // 그 날짜의 값은 "전날 대비"라 기간의 첫날은 빼고 더한다
  const span = dates.slice(1).filter((date) => cost?.[date]);
  if (!cost || !span.length || !shown.length) {
    box.hidden = true;
    return;
  }
  const codes = shown.map((series) => String(series.code));
  let lapis = 0;
  let ring = 0;
  span.forEach((date) => {
    popActiveServers().forEach((name) => {
      const server = cost[date]?.[name];
      if (!server) return;
      codes.forEach((code) => {
        const counts = server[code];
        if (!counts) return;
        counts.forEach((people, index) => {
          if (!people || !etaPop.bands.has(index + 1)) return;
          lapis += people * POP_COST_ITEMS[index].lapis;
          ring += people * (POP_COST_ITEMS[index].ring || 0);
        });
      });
    });
  });
  const icon = (file) => `<img class="eta-lapis-icon" src="${SIM_IMG_BASE}${encodeURIComponent(file)}" alt="" width="16" height="16" loading="lazy" />`;
  box.hidden = false;
  box.title = `${span[0]} ~ ${span[span.length - 1]} 레벨업에 쓴 양`;
  box.innerHTML = `이 기간 소모 ${icon("에오니스_라피스.png")}라피스 <b>${formatNumber(lapis)}개</b>`
    + ` · ${icon("설계자의_반지.png")}설계자의 반지 <b>${formatNumber(ring)}개</b>`;
}

function renderPopRangeButtons() {
  if (!els.popRangeButtons) return;
  const custom = Boolean(etaPop.from || etaPop.to);
  els.popRangeButtons.innerHTML = POP_RANGES.map((range) => `
    <button class="pop-range-btn${!custom && range.key === etaPop.range ? " is-active" : ""}" type="button" data-pop-range="${range.key}">${range.label}</button>
  `).join("");
  if (els.popFromDate) els.popFromDate.value = etaPop.from;
  if (els.popToDate) els.popToDate.value = etaPop.to;
}

// 켠 구간만 불이 들어온다. 처음엔 전부 켜져 있고, 다 끄면 그릴 게 없다.
function renderPopBandButtons() {
  if (!els.popBandButtons) return;
  els.popBandButtons.innerHTML = POP_BAND_LABELS.map((label, index) => {
    const on = etaPop.bands.has(index);
    return `<button class="pop-range-btn${on ? " is-active" : ""}" type="button" data-pop-band="${index}" aria-pressed="${on}">${label}</button>`;
  }).join("");
}

function renderPopServerTabs() {
  if (!els.popServerTabs) return;
  const names = popServerNames();
  // 서버가 하나뿐이면 통합을 내놔도 같은 값이라 뺀다
  const options = names.length > 1 ? [POP_ALL_SERVERS, ...names] : names;
  els.popServerTabs.innerHTML = options.map((name) => `
    <button class="eta-server-tab${name === etaPop.server ? " is-active" : ""}" type="button" role="radio" aria-checked="${name === etaPop.server}" data-pop-server="${escapeHtml(name)}">${escapeHtml(name)}</button>
  `).join("");
}

// 켜 둔 캐릭터·레벨 구간의 합과, 그 값이 기간 동안 얼마나 움직였는지
function renderPopLegendTotal(shown) {
  if (!els.popLegendTotal) return;
  if (!shown.length) {
    els.popLegendTotal.innerHTML = "";
    return;
  }

  const now = shown.reduce((sum, series) => sum + popLastValue(series), 0);
  const diff = now - shown.reduce((sum, series) => sum + popFirstValue(series), 0);
  const sign = diff > 0 ? "+" : "";
  const tone = diff > 0 ? " is-up" : diff < 0 ? " is-down" : "";
  els.popLegendTotal.innerHTML = `
    총 <b>${now.toLocaleString("ko-KR")}명</b>
    <span class="pop-legend-diff${tone}">${diff === 0 ? "변화 없음" : `${sign}${diff.toLocaleString("ko-KR")}명`}</span>
  `;
}

function renderPopLegend(series) {
  if (!els.popLegend) return;
  els.popLegend.innerHTML = series.map((item) => {
    const off = etaPop.hidden.has(item.code);
    const now = popLastValue(item);
    const diff = now - popFirstValue(item);
    const sign = diff > 0 ? "+" : "";
    return `
      <button class="pop-legend-item${off ? " is-off" : ""}" type="button" data-pop-code="${item.code}" aria-pressed="${!off}">
        <span class="pop-swatch" style="background:${item.color}"></span>
        <span class="pop-legend-name">${escapeHtml(item.name)}</span>
        <span class="pop-legend-value">${now.toLocaleString("ko-KR")}</span>
        <span class="pop-legend-diff${diff > 0 ? " is-up" : diff < 0 ? " is-down" : ""}">${diff === 0 ? "-" : `${sign}${diff.toLocaleString("ko-KR")}`}</span>
      </button>
    `;
  }).join("");
}

const POP_VIEW = { w: 900, h: 340, left: 52, right: 16, top: 16, bottom: 28 };

// y축 눈금을 1·2·5×10ⁿ 중 하나로 떨어뜨려 축 숫자가 읽기 편한 값이 되게 한다.
// 인원이 한 자리면 y축 위끝이 1까지 내려와 1명 차이가 절벽처럼 보인다. 10 아래로는 내리지 않는다.
const POP_MIN_AXIS = 10;

function popNiceMax(value) {
  if (value <= POP_MIN_AXIS) return POP_MIN_AXIS;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const step = [1, 2, 2.5, 5, 10].find((multiple) => value <= multiple * base) || 10;
  return step * base;
}

function popChartSvg(dates, series) {
  const { w, h, left, right, top, bottom } = POP_VIEW;
  const plotW = w - left - right;
  const plotH = h - top - bottom;
  const maxValue = popNiceMax(Math.max(...series.flatMap((item) => item.values.filter((value) => value !== null)), 1));
  const stepX = dates.length > 1 ? plotW / (dates.length - 1) : 0;
  const x = (index) => left + (dates.length > 1 ? index * stepX : plotW / 2);
  const y = (value) => top + plotH - (value / maxValue) * plotH;

  // 위끝이 10이면 1/4 눈금이 2.5라 반올림한 숫자가 어그러진다. 그때는 눈금을 셋만 둔다.
  const ratios = maxValue <= POP_MIN_AXIS ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  const ticks = ratios.map((ratio) => {
    const value = Math.round(maxValue * ratio);
    const py = y(value);
    return `
      <line class="pop-grid" x1="${left}" y1="${py}" x2="${w - right}" y2="${py}" />
      <text class="pop-axis-y" x="${left - 8}" y="${py + 4}">${value.toLocaleString("ko-KR")}</text>
    `;
  }).join("");

  // 날짜가 촘촘하면 라벨이 겹치므로 최대 6개만 남긴다
  const labelStep = Math.max(1, Math.ceil(dates.length / 6));
  const xLabels = dates.map((date, index) => {
    if (index % labelStep !== 0 && index !== dates.length - 1) return "";
    return `<text class="pop-axis-x" x="${x(index)}" y="${h - 8}">${date.slice(5)}</text>`;
  }).join("");

  const lines = series.map((item) => {
    // 값이 없는 날은 건너뛰고, 다음 값에서 선을 새로 시작한다
    let pen = "M";
    const d = item.values.map((value, index) => {
      if (value === null) {
        pen = "M";
        return "";
      }
      const segment = `${pen}${x(index).toFixed(1)} ${y(value).toFixed(1)}`;
      pen = "L";
      return segment;
    }).filter(Boolean).join(" ");
    return `<path class="pop-line" d="${d}" stroke="${item.color}" data-pop-line="${item.code}" />`;
  }).join("");

  return `
    <svg class="pop-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="캐릭터별 에타 인원 추이">
      ${ticks}
      ${xLabels}
      ${lines}
      <line class="pop-cursor" x1="0" y1="${top}" x2="0" y2="${top + plotH}" hidden />
      <rect class="pop-hit" x="${left}" y="${top}" width="${plotW}" height="${plotH}" fill="transparent" />
    </svg>
    <div class="pop-tooltip" hidden></div>
  `;
}

function wirePopChartHover(dates, series) {
  const svg = els.popChart.querySelector(".pop-svg");
  const cursor = els.popChart.querySelector(".pop-cursor");
  const tooltip = els.popChart.querySelector(".pop-tooltip");
  if (!svg || !cursor || !tooltip) return;

  const { w, left, right } = POP_VIEW;
  const plotW = w - left - right;

  const hide = () => {
    cursor.hidden = true;
    tooltip.hidden = true;
  };

  const move = (event) => {
    const box = svg.getBoundingClientRect();
    const point = event.touches?.[0] || event;
    // viewBox 좌표로 되돌린 뒤 가장 가까운 날짜를 고른다
    const vx = ((point.clientX - box.left) / box.width) * w;
    const ratio = clamp((vx - left) / plotW, 0, 1);
    const index = Math.round(ratio * (dates.length - 1));
    if (!Number.isFinite(index)) return;

    const px = left + (dates.length > 1 ? (index / (dates.length - 1)) * plotW : plotW / 2);
    cursor.setAttribute("x1", px);
    cursor.setAttribute("x2", px);
    cursor.hidden = false;

    const rows = series
      .map((item) => ({ name: item.name, color: item.color, value: item.values[index] }))
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
      .slice(0, 12);
    tooltip.innerHTML = `
      <strong>${dates[index]}</strong>
      ${rows.map((row) => `
        <span class="pop-tip-row">
          <i style="background:${row.color}"></i>${escapeHtml(row.name)}
          <b>${row.value === null ? "-" : row.value.toLocaleString("ko-KR")}</b>
        </span>
      `).join("")}
    `;
    tooltip.hidden = false;
    // 오른쪽 끝에서는 툴팁을 왼쪽에 붙여 화면 밖으로 나가지 않게 한다
    tooltip.classList.toggle("is-left", ratio > 0.6);
    tooltip.style.left = `${(px / w) * 100}%`;
  };

  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerleave", hide);
  svg.addEventListener("touchmove", move, { passive: true });
  svg.addEventListener("touchend", hide);
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

// 부재료는 "제네로 젬마 40개 + 레이티아의 시든 꽃 40개 + …" 꼴이다.
// 재료 하나가 이름 중간에서 잘리지 않도록 재료마다 묶고, 좁은 화면에서는 " + " 자리에서만 줄이 나뉘게 한다.
function etaSubHtml(sub) {
  const text = String(sub || "").trim();
  if (!text) return "";
  return text
    .split(/\s*\+\s*/)
    .map((part) => `<span class="eta-sub-item">${escapeHtml(part)}</span>`)
    .join(' <span class="eta-sub-plus">+</span> ');
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

  // 한 행에 두 가지가 섞여 있다: 재료는 "이 레벨 → 다음 레벨"에 드는 값, 능력치는 그 레벨에 도달했을 때의 값.
  // 그래서 LV 칸에 "1 → 2"로 적고 머리글을 두 묶음으로 나눈다. 마지막 레벨은 올라갈 곳이 없어 번호만 적는다.
  const hasNext = (row) => row.exp && row.exp !== "-";
  els.etaLevelTable.innerHTML = `
    <thead>
      <tr>
        <th rowspan="2">LV</th>
        <th colspan="4" class="eta-info-group">다음 레벨까지 필요</th>
        <th colspan="5" class="eta-info-group">현재 레벨 최대 능력치</th>
      </tr>
      <tr>
        <th>경험치</th><th>SEED</th><th>부재료</th><th>경험의 정수</th>
        <th>대미지</th><th>HP</th><th>방어력</th><th>스탯</th><th>각성</th>
      </tr>
    </thead>
    <tbody>
      ${levels.map((row) => `
        <tr>
          <th class="eta-info-lv">${hasNext(row) ? `${row.lv} <span class="eta-info-arrow">→</span> ${row.lv + 1}` : `${row.lv}`}</th>
          <td data-label="필요 경험치">${escapeHtml(row.exp)}</td>
          <td data-label="필요 SEED">${escapeHtml(row.seed)}</td>
          <td class="eta-info-sub" data-label="부재료">${etaSubHtml(row.sub)}</td>
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
  const prevMap = etaPrevRankMap();
  const cum = etaEssenceCumulative();
  let ranked = rows.map((row, index) => {
    // 획득 정수: 비교 기준일 이후 얻은 정수. 레벨업에 쓴 양까지 누적으로 계산한다
    const prev = prevMap?.get(`${row.code}|${row.userId}`);
    const gain = prev && cum
      ? ((cum[row.level] || 0) + row.essence) - ((cum[prev.level] || 0) + prev.essence)
      : null;
    return { ...row, rank: index + 1, prev, gain };
  });

  // 획득 정수 순 정렬. 비교 데이터가 없는 행(NEW)은 뒤로 보내고, 순위 칸은 이 정렬 기준의 순번으로 바꾼다
  if (eta.sort === "gain") {
    ranked.sort((a, b) => {
      if (a.gain == null || b.gain == null) return (a.gain == null) - (b.gain == null);
      return b.gain - a.gain || a.rank - b.rank;
    });
    ranked = ranked.map((row, index) => ({ ...row, rank: index + 1 }));
  }
  // 보유 정수 순 정렬. 레벨과 상관없이 정수만 비교하고, 같으면 원래 순위(레벨·정수 순)를 따른다
  if (eta.sort === "essence") {
    ranked.sort((a, b) => b.essence - a.essence || a.rank - b.rank);
    ranked = ranked.map((row, index) => ({ ...row, rank: index + 1 }));
  }
  els.etaRankingHead?.querySelectorAll("[data-eta-sort]").forEach((head) => {
    head.classList.toggle("is-sorted", head.dataset.etaSort === eta.sort);
  });

  const visible = eta.query
    ? ranked.filter((row) =>
        row.userId.toLowerCase().includes(eta.query) ||
        row.characterName.toLowerCase().includes(eta.query))
    : ranked;

  els.etaCount.textContent = `${visible.length.toLocaleString("ko-KR")}명`;
  renderEtaLapisUse(ranked, prevMap);

  if (!visible.length) {
    els.etaRankingBody.innerHTML = `
      ${listPlaceholderRow(6, eta.loaded, "표시할 순위가 없습니다", "조건을 조금 넓혀보세요.")}
    `;
    return;
  }

  eta.visible = visible;
  // 이어 붙일 때마다 다시 만들면 5천 행을 그때마다 정렬하게 된다.
  // 조건이 바뀌면 어차피 이 함수를 다시 타므로 여기서 한 번만 만든다 (prevMap은 위에서 이미 만들었다)
  eta.prevMap = prevMap;
  eta.deltaTitle = eta.prevDate ? ` title="${escapeHtml(eta.prevDate)} 대비"` : "";
  // 변동 데이터가 뒤늦게 와서 다시 그릴 때는 보던 만큼 그대로 되살린다
  eta.shown = Math.min(visible.length, Math.max(ETA_CHUNK, eta.shown));
  els.etaRankingBody.innerHTML = etaRowsHtml(visible.slice(0, eta.shown));

  if (els.etaListWrap) els.etaListWrap.scrollTop = keepScroll;
}

// 스크롤이 바닥 가까이 오면 다음 묶음을 이어 붙인다
function etaShowMore() {
  if (eta.shown >= eta.visible.length) return;
  const next = eta.visible.slice(eta.shown, eta.shown + ETA_CHUNK);
  eta.shown += next.length;
  els.etaRankingBody.insertAdjacentHTML("beforeend", etaRowsHtml(next));
}

function etaRowsHtml(rows) {
  const prevMap = eta.prevMap;
  const deltaTitle = eta.deltaTitle;
  // 순위 칸이 다른 기준(획득 정수·보유 정수)의 순번일 때는 순위 변동을 뺀다
  const reranked = eta.sort !== "rank";

  return rows.map((row) => {
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
      const prev = row.prev;
      if (!prev) {
        newHtml = `<span class="eta-new"${deltaTitle}>NEW</span>`;
      } else {
        if (!reranked) deltaHtml = deltaBadge(prev.rank - row.rank);
        levelDeltaHtml = deltaBadge(row.level - prev.level);
        essenceDeltaHtml = deltaBadge(row.essence - prev.essence);
      }
    }
    const gainHtml = row.gain == null ? "-" : formatNumber(row.gain);
    return `
      <tr class="eta-row">
        <td class="eta-rank">${row.rank}${deltaHtml}</td>
        <td><span class="eta-char-thumb"><img src="${ETA_CHAR_IMAGE_BASE}${row.code}.png" alt="${escapeHtml(row.characterName)}" title="${escapeHtml(row.characterName)}" loading="lazy" decoding="async" /></span></td>
        <td class="eta-userid">${escapeHtml(row.userId)}${newHtml}</td>
        <td class="eta-level">${formatNumber(row.level)}${levelDeltaHtml}</td>
        <td class="eta-essence">${formatNumber(row.essence)}${essenceDeltaHtml}</td>
        <td class="eta-gain"${deltaTitle}>${gainHtml}</td>
      </tr>
    `;
  }).join("");
}

// 갱신일 옆에 이 기간 동안 쓴 라피스·설계자의 반지 (증감 기준과 같은 기간)
function renderEtaLapisUse(rows, prevMap) {
  const box = els.etaLapisUse;
  if (!box) return;
  if (!prevMap) {
    box.hidden = true;
    return;
  }
  let lapis = 0;
  let ring = 0;
  rows.forEach((row) => {
    if (!row.prev || row.level <= row.prev.level) return;
    const cost = etaLevelCost(row.prev.level, row.level);
    lapis += cost.lapis;
    ring += cost.ring;
  });
  box.hidden = false;
  box.title = eta.prevDate ? `${eta.prevDate} 대비 레벨업에 쓴 양` : "";
  const icon = (file) => `<img class="eta-lapis-icon" src="${SIM_IMG_BASE}${encodeURIComponent(file)}" alt="" width="16" height="16" loading="lazy" />`;
  // 기간을 글로도 적는다. 증감 기준을 바꾸면 이 말도 같이 바뀐다.
  // 그만큼 거슬러 올라갈 자료가 없으면 실제로 견준 날짜를 적는다
  const spanText = { 1: "금일", 7: "최근 1주일", 30: "최근 1달" }[eta.compareDays] || `최근 ${eta.compareDays}일`;
  const label = eta.prevShort ? `${eta.prevDate} 이후` : spanText;
  box.innerHTML = `${label} 소모 ${icon("에오니스_라피스.png")}라피스 <b>${formatNumber(lapis)}개</b>`
    + ` · ${icon("설계자의_반지.png")}설계자의 반지 <b>${formatNumber(ring)}개</b>`;
}

// DB 검색 서브탭 (장비 / 어빌리티 / 아바타)
function activateDbTab(key) {
  ACTIVE_SUB.equipment = key;
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

// 목록을 표로 볼지(리스트 형) 카드 격자로 볼지(갤러리 형)
const AVATAR_VIEW_KEY = "tw-avatar-list-view";

const avatar = {
  records: [],
  filtered: [],
  view: "list", // "list" | "detail"
  viewMode: etaReadCache(AVATAR_VIEW_KEY) === "gallery" ? "gallery" : "list",
  detailIndex: 0,
  listScroll: 0,
  shown: 0, // 목록·갤러리에서 실제로 그린 개수
  query: "",
  source: "all",
  slot: "all",
  loaded: false,
  loading: false,
};

// 아바타는 2천 개가 넘어 한 번에 그리면 0.1초쯤 멈춘다. 한 화면에는 서너 개만
// 보이므로 앞쪽만 그리고 스크롤이 바닥에 닿을 때마다 이어 붙인다.
// 목록은 제 스크롤 칸(.avatar-list-wrap) 안에서, 갤러리는 페이지째 스크롤된다.
const AVATAR_CHUNK = 200;

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

function setAvatarViewMode(mode) {
  avatar.viewMode = mode === "gallery" ? "gallery" : "list";
  etaWriteCache(AVATAR_VIEW_KEY, avatar.viewMode);
  els.avatarViewTabs?.querySelectorAll("[data-avatar-view]").forEach((button) => {
    const on = button.dataset.avatarView === avatar.viewMode;
    button.classList.toggle("is-active", on);
    button.setAttribute("aria-checked", String(on));
  });
  renderAvatarList();
}

// 갤러리 카드 한 장. 착용 이미지를 앞세우고 이름·분류·획득처를 아래에 붙인다.
// 착용 이미지가 없으면 아이콘으로 되돌린다.
function avatarCardHtml(record, index) {
  const detail = record.detailImages[0];
  const [base, file] = detail ? [AVATAR_DETAIL_BASE, detail] : [AVATAR_ICON_BASE, record.listImage];
  const img = file
    ? `<img src="${base}${encodeImagePath(file)}" alt="" loading="lazy" decoding="async" />`
    : "";
  return `
    <button class="avatar-card" type="button" data-index="${index}">
      <span class="avatar-card-image">${img}</span>
      <span class="avatar-card-head">
        <strong>${escapeHtml(record.displayName)}</strong>
        <em>${escapeHtml(record.slots.join(", ") || "-")}</em>
      </span>
      <span class="avatar-card-source">${avatarSourceSummary(record)}</span>
    </button>
  `;
}

function renderAvatarList() {
  const gallery = avatar.viewMode === "gallery";
  if (els.avatarGallery) els.avatarGallery.hidden = !gallery;
  if (els.avatarListTableWrap) els.avatarListTableWrap.hidden = gallery;

  if (!avatar.filtered.length) {
    els.avatarListBody.innerHTML = listPlaceholderRow(3, avatar.loaded, "검색 결과가 없습니다", "조건을 조금 넓혀보세요.");
    if (els.avatarGallery) {
      els.avatarGallery.innerHTML = `<p class="avatar-gallery-empty">${avatar.loaded ? "검색 결과가 없습니다" : "데이터 로딩 중"}</p>`;
    }
    return;
  }

  avatar.shown = Math.min(avatar.filtered.length, Math.max(AVATAR_CHUNK, avatar.shown));
  const shown = avatar.filtered.slice(0, avatar.shown);

  if (gallery) {
    els.avatarGallery.innerHTML = avatarCardsHtml(shown, 0);
    return;
  }

  els.avatarListBody.innerHTML = avatarRowsHtml(shown, 0);

  if (els.avatarListWrap) els.avatarListWrap.scrollTop = avatar.listScroll;
}

// 스크롤이 바닥 가까이 오면 다음 묶음을 이어 붙인다
function avatarShowMore() {
  if (avatar.view !== "list" || avatar.shown >= avatar.filtered.length) return;
  const from = avatar.shown;
  const next = avatar.filtered.slice(from, from + AVATAR_CHUNK);
  avatar.shown += next.length;

  if (avatar.viewMode === "gallery") {
    els.avatarGallery.insertAdjacentHTML("beforeend", avatarCardsHtml(next, from));
  } else {
    els.avatarListBody.insertAdjacentHTML("beforeend", avatarRowsHtml(next, from));
  }
}

// data-index는 avatar.filtered의 자리다. 이어 붙일 때 0부터 다시 매기면
// 카드를 눌렀을 때 엉뚱한 아바타가 열린다
function avatarCardsHtml(records, offset) {
  return records.map((record, i) => avatarCardHtml(record, offset + i)).join("");
}

function avatarRowsHtml(records, offset) {
  return records.map((record, i) => {
    const index = offset + i;
    return `
    <tr class="equip-row avatar-row" data-index="${index}">
      <td class="equip-info-cell">
        <div class="equip-info">
          <span class="equip-thumb ability-thumb">
            ${record.listImage ? `<img src="${AVATAR_ICON_BASE}${encodeImagePath(record.listImage)}" alt="" loading="lazy" decoding="async" />` : ""}
          </span>
          <span class="equip-name-block">
            <strong>${escapeHtml(record.displayName)}</strong>
          </span>
        </div>
      </td>
      <td class="avatar-slot">${escapeHtml(record.slots.join(", ") || "-")}</td>
      <td class="avatar-source">${avatarSourceSummary(record)}</td>
    </tr>
  `;
  }).join("");
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

// 계산기 탭 — 하위 메뉴 알약으로 도구를 바꾼다 (에타·DB와 같은 구성)
const CALCULATOR_TITLES = { equipment: "장비 재료", inherit: "상속서", damage: "계수 · 대미지", onekill: "사냥터 1킬", hit: "명중" };

// 계수 → 대미지는 이어지는 두 단계다. 계수 값을 넣어야 대미지가 계산되므로 한 화면 안에서 오간다.
function activateDamageStep(step) {
  document.querySelectorAll("[data-dmg-step-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.dmgStepTab === step);
  });
  document.querySelectorAll("[data-dmg-step]").forEach((panel) => {
    const isActive = panel.dataset.dmgStep === step;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });
  if (step === "damage") {
    if (!etaInfo.data && !etaInfo.loading) loadEtaInfo().then(dmgRefresh);
    dmgRefresh();
  }
}

function activateCalculatorTab(key) {
  // 아직 공개하지 않은 도구는 버튼이 숨겨져 있다. 주소로 바로 들어와도 열리지 않게 막는다
  const target = [...els.calculatorTabButtons].find((b) => b.dataset.calculatorTab === key);
  if (!target || target.hidden) key = "equipment";
  ACTIVE_SUB.calculator = key;
  if (els.calculatorTitle && CALCULATOR_TITLES[key]) els.calculatorTitle.textContent = CALCULATOR_TITLES[key];

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
  if (key === "onekill") oneKillCalc.load();
  if (key === "hit") hitCalc.load();

  routeWrite();
}

// 시뮬레이터 탭
const SIMULATOR_TITLES = { encrypt: "인크립트", core: "코어 강화", relic: "신조 렐릭", enhance: "장비 강화", siena: "시에나 증폭", sienaaura: "시에나 기운", hammer: "에이라의 망치" };

function activateSimulatorTab(key) {
  const target = [...els.simulatorTabButtons].find((b) => b.dataset.simulatorTab === key);
  if (!target || target.hidden) key = "encrypt";
  ACTIVE_SUB.simulator = key;
  if (els.simulatorTitle && SIMULATOR_TITLES[key]) els.simulatorTitle.textContent = SIMULATOR_TITLES[key];
  const gamble = document.getElementById("simGambleNotice");
  if (gamble) gamble.hidden = key !== "sienaaura";

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

const INFO_TITLES = { seed: "주간 시드 한도", buff: "버프 아이템" };

function activateInfoTab(key) {
  ACTIVE_SUB.info = key;
  if (els.infoTitle && INFO_TITLES[key]) els.infoTitle.textContent = INFO_TITLES[key];
  els.infoTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.infoTab === key);
  });
  els.infoPanels.forEach((panel) => {
    const isActive = panel.dataset.infoPanel === key;
    panel.hidden = !isActive;
    panel.classList.toggle("is-active", isActive);
  });
  // 버프 탭은 처음 열릴 때 기본 하위 탭(경험치)을 그린다
  if (key === "buff") expBuff.load();
  if (key === "seed") seedCalc.load();

  routeWrite();
}

// ══════════════════════════════════════════════════════════════
//  버프 아이템 탭 — 경험치 버프 / 레어 버프
// ══════════════════════════════════════════════════════════════
const BUFF_ICON_BASE = `${CDN_ETC_ROOT}images/`;

function activateBuffTab(key) {
  els.buffTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.buffTab === key);
  });
  els.buffPanels.forEach((panel) => {
    panel.hidden = panel.dataset.buffPanel !== key;
  });
  if (key === "exp") expBuff.load();
  if (key === "rare") rareBuff.load();
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

// 경험치 버프와 레어 버프는 데이터 구조와 계산 규칙이 같다. 계산기를 하나로 만들어 둘 다 쓴다.
//   배율 = 1 + (선택한 버프 배율의 합), 결과 = [[기본 × 배율] × 해피아워] × 펫 스킬 ...
//   (해피아워·펫 스킬 같은 곱연산 항목은 배율에 더하지 않고 따로 곱한다)
// 기본값은 목록에서 고르거나("기본경험치") 데이터에 고정해 둘 수 있다("기본고정": 레어 확률 1).
// 선택 상태는 브라우저에 남긴다. 위치가 아니라 버프 "이름"으로 저장해 목록 순서를 바꿔도 복원된다.
function makeBuffCalculator(cfg) {
  const calc = { data: null, baseIndex: -1, baseCustom: "", checked: new Set(), inputs: {}, loaded: false };
  const box = () => cfg.els();

  const itemOf = (key) => {
    const [ri, ci] = String(key).split("-").map(Number);
    return calc.data?.["버프"]?.[ri]?.[ci] || null;
  };
  const nameOf = (key) => itemOf(key)?.["이름"] || "";
  const exclOf = (item) => (Array.isArray(item?.["배타"]) ? item["배타"] : []);
  const groupOf = (item) => Number(item?.["그룹"]) || 3;
  const bases = () => calc.data?.["기본경험치"] || [];
  const fixedBase = () => calc.data?.["기본고정"] || null;

  function keyByName() {
    const map = new Map();
    (calc.data?.["버프"] || []).forEach((row, ri) => {
      row.forEach((item, ci) => map.set(item["이름"], `${ri}-${ci}`));
    });
    return map;
  }

  // 지금 체크된 항목들이 점유한 배타 그룹과, 그 그룹을 점유한 항목의 키.
  // 배타 그룹은 줄을 넘나든다 (눈사람족 특제 포션은 일루미네이션과도, 클럽/에오스 파편과도 충돌한다).
  function lockedGroups() {
    const held = new Map();
    (calc.data?.["버프"] || []).forEach((row, ri) => {
      row.forEach((item, ci) => {
        const key = `${ri}-${ci}`;
        if (!calc.checked.has(key)) return;
        exclOf(item).forEach((g) => held.set(g, key));
      });
    });
    return held;
  }

  // 자기가 점유한 그룹은 빼고 본다. 안 그러면 켜진 항목이 스스로를 잠근다
  const isLocked = (item, key, held) => exclOf(item).some((g) => held.has(g) && held.get(g) !== key);

  function saveState() {
    try {
      const inputs = {};
      Object.entries(calc.inputs).forEach(([key, value]) => {
        const name = nameOf(key);
        if (name && value !== "") inputs[name] = value;
      });
      localStorage.setItem(cfg.saveKey, JSON.stringify({
        기본: bases()[calc.baseIndex]?.["이름"] || "",
        기본직접: calc.baseCustom,
        버프: [...calc.checked].map(nameOf).filter(Boolean),
        입력: inputs,
      }));
    } catch {
      // 저장 공간 부족 등은 무시 (저장은 편의일 뿐)
    }
  }

  function restoreState() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(cfg.saveKey) || "null");
    } catch {
      return;
    }
    if (!saved) return;

    const baseIndex = bases().findIndex((base) => base["이름"] === saved["기본"]);
    if (baseIndex >= 0) calc.baseIndex = baseIndex;
    calc.baseCustom = saved["기본직접"] || "";

    // 저장한 뒤 이름이 사라졌거나 배타 규칙이 바뀌었을 수 있다.
    // 하나씩 넣으면서 그때그때 잠기는지 보고, 충돌하는 건 버린다.
    const byName = keyByName();
    (saved["버프"] || []).forEach((name) => {
      const key = byName.get(name);
      if (key && !isLocked(itemOf(key), key, lockedGroups())) calc.checked.add(key);
    });
    Object.entries(saved["입력"] || {}).forEach(([name, value]) => {
      const key = byName.get(name);
      if (key) calc.inputs[key] = value;
    });
  }

  function baseValue() {
    const fixed = fixedBase();
    if (fixed) return Number(fixed["값"]) || 0;
    const picked = bases()[calc.baseIndex];
    if (!picked) return 0;
    if (picked["직접입력"]) return Number(calc.baseCustom) || 0;
    return Number(picked["값"]) || 0;
  }

  function rates() {
    let sum = 0;
    const mults = [];
    (calc.data?.["버프"] || []).forEach((row, ri) => {
      row.forEach((item, ci) => {
        const key = `${ri}-${ci}`;
        if (!calc.checked.has(key)) return;
        if (item["곱연산"]) mults.push({ name: item["이름"], value: Number(item["배수"]) || 1, group: groupOf(item) });
        else if (item["입력"]) sum += (Number(calc.inputs[key]) || 0) / 100;
        else sum += Number(item["배율"]) || 0;
      });
    });
    return { normal: 1 + sum, mults };
  }

  function renderBase() {
    const el = box().base;
    if (!el) return;
    // 기본값이 고정된 계산기(레어)는 고를 게 없으니 이 줄을 통째로 접는다
    if (fixedBase()) {
      el.innerHTML = "";
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const list = bases();
    const picked = list[calc.baseIndex];
    // 버튼과 직접 입력칸을 한 줄에 둔다 ("기타"를 골랐을 때만 입력칸이 오른쪽에 붙는다)
    el.innerHTML = `
      <p class="buff-section-title">${escapeHtml(cfg.labels.baseTitle)}</p>
      <div class="buff-base-row">
        ${list.map((b, i) => `
          <button type="button" class="buff-base-btn${i === calc.baseIndex ? " is-active" : ""}" data-base-index="${i}">
            ${escapeHtml(b["이름"] || "")}
          </button>
        `).join("")}
        ${picked?.["직접입력"] ? `
          <input id="${cfg.customInputId}" class="buff-base-input" type="number" min="0" step="1"
            inputmode="numeric" placeholder="${escapeHtml(cfg.labels.basePlaceholder || "")}" value="${escapeHtml(calc.baseCustom)}" />
        ` : ""}
      </div>
    `;
  }

  function renderResult() {
    const el = box().result;
    if (!el) return;
    const base = baseValue();
    const { normal, mults } = rates();
    const total = mults.reduce((acc, m) => acc * m.value, base * normal);
    // 선택한 곳에 딸린 설명(예: 골고다 2종 평균)은 그 값 바로 옆에 붙여야 뜻이 통한다
    const note = fixedBase() ? fixedBase()["비고"] : bases()[calc.baseIndex]?.["비고"];
    const baseLabel = fixedBase()?.["이름"] || cfg.labels.base;
    el.innerHTML = `
      <div class="buff-result-row">
        <span>${escapeHtml(baseLabel)}${note ? `<em class="buff-base-note">${escapeHtml(note)}</em>` : ""}</span><strong>${cfg.formatBase(base)}</strong>
      </div>
      ${mults.map((m) => `
        <div class="buff-result-row" data-group="${m.group}">
          <span>${escapeHtml(m.name)}</span><strong>×${m.value}</strong>
        </div>
      `).join("")}
      <div class="buff-result-row" data-group="3">
        <span>${escapeHtml(cfg.labels.normal)}</span><strong>×${normal.toFixed(2)}</strong>
      </div>
      <div class="buff-result-row is-total">
        <span>${escapeHtml(cfg.labels.total)}</span><strong>${cfg.formatTotal(total)}</strong>
      </div>
    `;
  }

  // 숫자를 직접 넣는 항목(투구/시오칸 코어)은 값이 정해져 있지 않으니 표기하지 않는다
  function rateLabel(item) {
    if (item["입력"]) return "";
    if (item["곱연산"]) return `<span class="buff-rate">x${item["배수"]}</span>`;
    const rate = Number(item["배율"]) || 0;
    return rate ? `<span class="buff-rate">+${Math.round(rate * 1000) / 10}%</span>` : "";
  }

  // "택 1" 안내 문구 대신 체크박스를 잠가서 규칙 자체로 드러낸다.
  function itemHtml(item, ri, ci, locked) {
    const key = `${ri}-${ci}`;
    const on = calc.checked.has(key);
    return `
      <label class="buff-item${locked ? " is-locked" : ""}">
        <input type="checkbox" class="buff-check" data-buff-key="${key}"${on ? " checked" : ""}${locked ? " disabled" : ""} />
        ${buffIconHtml(item)}
        <span class="buff-name">${escapeHtml(item["이름"] || "")}</span>
        ${rateLabel(item)}
      </label>
      ${item["입력"] && on ? `
        <input class="buff-num" data-buff-input="${key}" type="number"
          min="${item["입력"]["최소"]}" max="${item["입력"]["최대"]}" step="1" inputmode="numeric"
          placeholder="${item["입력"]["최소"]}~${item["입력"]["최대"]}" value="${escapeHtml(calc.inputs[key] || "")}" />
        <span class="buff-unit">${escapeHtml(item["입력"]["단위"] || "")}</span>
      ` : ""}
    `;
  }

  // 못 쓰는 조합은 체크박스 잠금으로 드러나므로 묶음 테두리를 두지 않는다. 모든 항목이 같은 크기의 한 칸을 쓴다.
  // 데이터의 한 줄이 화면의 한 줄이다. 두 칸짜리 줄 뒤에 다음 줄이 딸려 올라오지 않도록 줄의 첫 칸을 1열에 고정한다.
  function cellHtml(entry, held) {
    const { item, key, first } = entry;
    const [ri, ci] = key.split("-").map(Number);
    return `<div class="buff-cell" data-group="${groupOf(item)}"${first ? ' style="grid-column-start:1"' : ""}>
      ${itemHtml(item, ri, ci, isLocked(item, key, held))}
    </div>`;
  }

  // "한줄" 항목이 든 줄은 격자 칸에 맞추지 않고 글자 너비만큼만 차지하게 한 줄로 흘린다
  // (이름이 긴 탐험 포인트, 4개를 한 줄에 두는 윙 크리스탈)
  function rowHtml(entries, held) {
    if (!entries.some((e) => e.item["한줄"])) return entries.map((e) => cellHtml(e, held)).join("");
    return `<div class="buff-cell-row">${entries.map((e) => {
      const [ri, ci] = e.key.split("-").map(Number);
      const widthGroup = e.item["폭맞춤"] ? ` data-width-group="${escapeHtml(e.item["폭맞춤"])}"` : "";
      return `<div class="buff-cell" data-group="${groupOf(e.item)}"${widthGroup}>${itemHtml(e.item, ri, ci, isLocked(e.item, e.key, held))}</div>`;
    }).join("")}</div>`;
  }

  // 같은 데이터 줄(ri)끼리 묶는다. 소진/유지로 나눈 뒤에도 줄 단위 배치가 유지되게
  function byRow(list) {
    const rows = new Map();
    list.forEach((e) => {
      const ri = e.key.split("-")[0];
      if (!rows.has(ri)) rows.set(ri, []);
      rows.get(ri).push(e);
    });
    return [...rows.values()];
  }

  function renderBuffs() {
    const el = box().body;
    if (!el) return;
    const held = lockedGroups();
    const all = [];
    (calc.data?.["버프"] || []).forEach((row, ri) => {
      row.forEach((item, ci) => all.push({ item, key: `${ri}-${ci}`, first: ci === 0 }));
    });

    // 곱해지는 단계(그룹1 해피아워 / 그룹2 펫 스킬)는 성격이 달라 맨 위에 두고,
    // 더해지는 일반 배율(그룹3)만 아래 격자에 넣는다.
    const top = all.filter((e) => groupOf(e.item) < 3);
    const rest = all.filter((e) => groupOf(e.item) === 3);

    // 그룹3은 접속 종료 시 버프 시간이 흐르는지로 다시 둘로 나눠 보여준다
    const label = calc.data?.["소분류"] || {};
    const section = (title, list) => (list.length ? `
      <p class="buff-sub-title">${escapeHtml(title)}</p>
      <div class="buff-grid">${byRow(list).map((row) => rowHtml(row, held)).join("")}</div>
    ` : "");

    el.innerHTML = `
      ${top.length ? `<div class="buff-top">${top.map((e) => cellHtml(e, held)).join("")}</div>` : ""}
      <p class="buff-section-title">버프 아이템 목록</p>
      ${section(label["소진"] || "접속 종료 시에도, 버프 시간 소진되는 버프 목록", rest.filter((e) => e.item["소진"]))}
      ${section(label["유지"] || "접속 종료 시, 버프 시간 소진 안되는 버프 목록", rest.filter((e) => !e.item["소진"]))}
    `;
    equalizeWidths(el);
  }

  // "폭맞춤" 이름이 같은 칸들은 그중 가장 넓은 칸의 너비로 맞춘다 (윙 크리스탈 9개를 로얄 크기로)
  function equalizeWidths(el) {
    const groups = new Map();
    el.querySelectorAll("[data-width-group]").forEach((cell) => {
      const name = cell.dataset.widthGroup;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(cell);
    });
    groups.forEach((cells) => {
      cells.forEach((cell) => { cell.style.flex = ""; cell.style.minWidth = ""; });
      // 폰(mobile.css)에서는 칸이 줄 너비를 꽉 채워 한 줄에 하나씩 쌓이므로 폭을 맞추지 않는다.
      // 인라인 너비를 넣으면 그 규칙을 덮어써 좁은 칸 4개가 한 줄에 억지로 들어간다
      if (getComputedStyle(cells[0]).flexBasis === "100%") return;
      let widest = Math.max(...cells.map((cell) => cell.getBoundingClientRect().width));
      // flex-wrap은 기준 너비 합이 줄 너비를 넘으면 줄이기 전에 먼저 줄바꿈한다.
      // 그래서 가장 붐비는 줄(4개)에 다 들어가는 너비를 상한으로 잡는다
      const rows = new Map();
      cells.forEach((cell) => { const row = cell.parentElement; rows.set(row, (rows.get(row) || 0) + 1); });
      rows.forEach((count, row) => {
        const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
        widest = Math.min(widest, Math.floor((row.clientWidth - gap * (count - 1)) / count));
      });
      if (widest > 0) cells.forEach((cell) => { cell.style.flex = `0 1 ${widest}px`; cell.style.minWidth = "0"; });
    });
  }

  function renderAll() {
    renderBase();
    renderBuffs();
    renderResult();
  }

  async function load() {
    const body = box().body;
    if (!body) return;
    // 이미 그려진 탭을 다시 열 때: 숨겨진 동안 창 너비가 바뀌었을 수 있으니 폭만 다시 맞춘다
    if (calc.loaded) { equalizeWidths(body); return; }
    calc.loaded = true;
    try {
      const res = await fetch(cfg.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      calc.data = await res.json();
      restoreState();
      renderAll();
    } catch (error) {
      calc.loaded = false;
      console.warn(cfg.errorText, error);
      box().body.innerHTML = `<div class="coming-soon">${escapeHtml(cfg.errorText)}</div>`;
    }
  }

  function wire() {
    const { base, body } = box();

    base?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-base-index]");
      if (!button) return;
      calc.baseIndex = Number(button.dataset.baseIndex);
      saveState();
      renderBase();
      renderResult();
      document.querySelector(`#${cfg.customInputId}`)?.focus();
    });

    base?.addEventListener("input", (event) => {
      if (event.target.id !== cfg.customInputId) return;
      calc.baseCustom = event.target.value;
      saveState();
      renderResult();
    });

    body?.addEventListener("change", (event) => {
      const check = event.target.closest(".buff-check");
      if (!check) return;
      const key = check.dataset.buffKey;
      if (check.checked) {
        // 충돌하는 건 이미 잠겨서 여기 올 일이 없지만, 방어적으로 비운다
        const held = lockedGroups();
        exclOf(itemOf(key)).forEach((g) => {
          if (held.has(g)) calc.checked.delete(held.get(g));
        });
        calc.checked.add(key);
      } else {
        calc.checked.delete(key);
      }
      saveState();
      renderBuffs();
      renderResult();
      body.querySelector(`[data-buff-input="${key}"]`)?.focus();
    });

    body?.addEventListener("input", (event) => {
      const key = event.target.dataset?.buffInput;
      if (!key) return;
      calc.inputs[key] = event.target.value;
      saveState();
      renderResult();
    });

    // 범위를 벗어난 입력은 포커스를 뗄 때 최소/최대로 맞춘다
    body?.addEventListener("blur", (event) => {
      const input = event.target;
      const key = input.dataset?.buffInput;
      if (!key || input.value === "") return;
      const clamped = Math.min(Number(input.max), Math.max(Number(input.min), Number(input.value)));
      if (String(clamped) !== input.value) {
        calc.inputs[key] = String(clamped);
        input.value = calc.inputs[key];
        saveState();
        renderResult();
      }
    }, true);

    // 창 너비가 바뀌면(PC↔폰 전환 포함) 폭맞춤 칸의 너비를 다시 잰다. 숨겨진 탭은 열 때 맞춘다
    let resizeTimer = 0;
    addEventListener("resize", () => {
      if (!calc.loaded || !body?.offsetParent) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => equalizeWidths(body), 120);
    });
  }

  return { load, wire };
}

const expBuff = makeBuffCalculator({
  url: "./assets/exp-buffs.json",
  saveKey: "tw-exp-buff-save-v1",
  els: () => ({ base: els.expBaseBox, result: els.expResultBox, body: els.expBuffBody }),
  customInputId: "expBaseCustom",
  labels: { baseTitle: "기본 획득 경험치", basePlaceholder: "기본 경험치 직접 입력", base: "기본 경험치", normal: "일반 경험치 배율", total: "획득 경험치" },
  formatBase: (n) => n.toLocaleString("ko-KR"),
  formatTotal: (n) => Math.floor(n).toLocaleString("ko-KR"),
  errorText: "경험치 버프 정보를 불러오지 못했습니다.",
});

// 레어 버프는 기본 확률을 1로 두고 결과를 "몇 배"로 읽는다
const rareBuff = makeBuffCalculator({
  url: "./assets/rare-buffs.json",
  saveKey: "tw-rare-buff-save-v1",
  els: () => ({ base: els.rareBaseBox, result: els.rareResultBox, body: els.rareBuffBody }),
  customInputId: "rareBaseCustom",
  labels: { baseTitle: "기본 레어 획득 확률", basePlaceholder: "", base: "기본 레어 획득 확률", normal: "일반 레어 배율", total: "레어 획득 확률" },
  formatBase: (n) => `×${n}`,
  formatTotal: (n) => `×${Math.round(n * 100) / 100}배`,
  errorText: "레어 버프 정보를 불러오지 못했습니다.",
});

// ══════════════════════════════════════════════════════════════
//  테일즈 정보 > 주간 시드 보상표
//  주간 시드와 그룹·지역 한도는 TWChatOverlay의 WeeklySeedRewardService와 같다.
//  카드를 눌러 켠 항목의 주간 시드를 그룹 한도 → 지역 한도(일반 66억 / 루비코나 28억) 순으로 잘라 합산한다.
// ══════════════════════════════════════════════════════════════

const SEED_EOK = 1e8;
const SEED_MAN = 1e4;
const SEED_SAVE_KEY = "tw-seed-weekly-save-v3";

// 카드 아이콘 — 게임 "콘텐츠 클리어 현황" 창의 초상화를 잘라 images/seed/에 WebP로 둔다.
// 로컬에서는 폴더를 바로 읽고, 배포본은 다른 이미지처럼 CDN 태그(v3.x)를 탄다.
const SEED_ICON_BASE = IS_LOCAL ? "./images/seed/" : `${CDN_ETC_ROOT}images/seed/`;
const SEED_ICONS = {
  "로카고스": "로카고스", "에토스": "에토스", "체리아": "체리아", "마티아": "마티아", "라이코스": "라이코스", "티로로스": "티로로스",
  "이클립스 토벌전": "이클립스 토벌전", "보급품 탈환": "보급품 탈환", "훈련소": "훈련소", "최후의 결전": "최후의 결전",
  "아페티리아 (일반)": "아페티리아", "아페티리아 (어려움)": "아페티리아",
  "로카고스 코어 마스터": "로카고스", "에토스 코어 마스터": "에토스", "체리아 코어 마스터": "체리아",
  "마티아 코어 마스터": "마티아", "라이코스 코어 마스터": "라이코스", "티로로스 코어 마스터": "티로로스",
  "심층Ⅰ 코어 마스터": "어비스", "심층Ⅱ 코어 마스터": "어비스", "심층Ⅲ 코어 마스터": "어비스",
  "샐리온 코어 마스터": "샐리온", "샐레아나 코어 마스터": "샐레아나", "실라이론 코어 마스터": "실라이론",
  "실반 코어 마스터": "실반", "루미너스 코어 마스터": "루미너스",
  "샐리온": "샐리온", "샐레아나": "샐레아나", "실라이론": "실라이론", "실반": "실반", "루미너스": "루미너스",
  "어비스 - 심층Ⅰ": "어비스", "어비스 - 심층Ⅱ": "어비스", "어비스 - 심층Ⅲ": "어비스",
  "지하요새의 망령(차원의 틈)": "차원의 틈", "신조의 둥지 어려움": "신조의 둥지", "오를리 방어전 지옥": "오를리 방어전", "카타콤 지옥": "카타콤",
  "추종하는 환희 (일반)": "추종하는 환희", "추종하는 환희 (어려움)": "추종하는 환희",
  "응시하는 슬픔 (일반)": "응시하는 슬픔", "응시하는 슬픔 (어려움)": "응시하는 슬픔",
};

// 항목: [이름, 주간 시드, 옵션]
//  excl: 같은 키끼리는 하나만 켜진다 (한 주에 한 난이도만 도는 컨텐츠). defaultOff는 처음에 꺼 두는 쪽.
//  uncapped: 같은 그룹에 놓여 있지만 그룹 한도에는 안 잡힌다 (지하요새의 망령(차원의 틈) — 표시만 어비스 주간에 둔다)
// 그룹의 rows는 화면 배치 그대로다. 한 행의 카드는 그룹에서 가장 긴 행의 칸 수에 맞춰 나란히 놓인다.
const SEED_ZONES = [
  {
    key: "general",
    title: "일반 지역",
    cap: 66 * SEED_EOK,
    groups: [
      {
        name: "머큐리얼 주간",
        cap: 525 * SEED_MAN * 100,
        rows: [
          [["샐리온", 105 * SEED_MAN * 100], ["샐레아나", 105 * SEED_MAN * 100], ["실라이론", 105 * SEED_MAN * 100], ["실반", 105 * SEED_MAN * 100]],
          [["루미너스", 105 * SEED_MAN * 100]],
        ],
      },
      {
        name: "머큐리얼 코어 마스터",
        cap: 6 * SEED_EOK,
        rows: [
          [["샐리온 코어 마스터", 210 * SEED_MAN * 100], ["샐레아나 코어 마스터", 210 * SEED_MAN * 100], ["실라이론 코어 마스터", 210 * SEED_MAN * 100], ["실반 코어 마스터", 210 * SEED_MAN * 100]],
          [["루미너스 코어 마스터", 210 * SEED_MAN * 100]],
        ],
      },
      {
        name: "어비스 주간",
        cap: 735 * SEED_MAN * 100,
        capNote: "심층Ⅰ~Ⅲ 합계",
        rows: [
          [["어비스 - 심층Ⅰ", 245 * SEED_MAN * 100], ["어비스 - 심층Ⅱ", 245 * SEED_MAN * 100], ["어비스 - 심층Ⅲ", 245 * SEED_MAN * 100], ["지하요새의 망령(차원의 틈)", 210 * SEED_MAN * 100, { uncapped: true }]],
        ],
      },
      {
        name: "어비스 코어 마스터",
        cap: 7 * SEED_EOK,
        rows: [
          [["심층Ⅰ 코어 마스터", 245 * SEED_MAN * 100], ["심층Ⅱ 코어 마스터", 245 * SEED_MAN * 100], ["심층Ⅲ 코어 마스터", 245 * SEED_MAN * 100]],
        ],
      },
      {
        name: "이클립스",
        cap: 5325 * SEED_MAN * 100,
        rows: [
          [["로카고스", 245 * SEED_MAN * 100], ["에토스", 245 * SEED_MAN * 100], ["체리아", 245 * SEED_MAN * 100]],
          [["마티아", 245 * SEED_MAN * 100], ["라이코스", 245 * SEED_MAN * 100], ["티로로스", 245 * SEED_MAN * 100]],
          [["보급품 탈환", 210 * SEED_MAN * 100], ["훈련소", 245 * SEED_MAN * 100]],
          // 최후의 결전은 판당 2억, 주 1~10판을 직접 고른다 (기본 10판 = 20억)
          [["이클립스 토벌전", 840 * SEED_MAN * 100], ["최후의 결전", 20 * SEED_EOK, { count: { per: 2 * SEED_EOK, max: 10, min: 1 } }]],
          // 주 7판, 한 판 3클리어 (일반 3500만×3×7, 어려움 4000만×3×7)
          [["아페티리아 (일반)", 735 * SEED_MAN * 100, { excl: "apetiria", defaultOff: true }], ["아페티리아 (어려움)", 840 * SEED_MAN * 100, { excl: "apetiria" }]],
        ],
      },
      {
        name: "이클립스 코어 마스터",
        cap: 8 * SEED_EOK,
        rows: [
          [["로카고스 코어 마스터", 280 * SEED_MAN * 100], ["에토스 코어 마스터", 280 * SEED_MAN * 100], ["체리아 코어 마스터", 280 * SEED_MAN * 100]],
          [["마티아 코어 마스터", 280 * SEED_MAN * 100], ["라이코스 코어 마스터", 280 * SEED_MAN * 100], ["티로로스 코어 마스터", 280 * SEED_MAN * 100]],
        ],
      },
      {
        name: "개별 컨텐츠",
        cap: null, // 그룹 한도가 항목 합과 같아 따로 자르지 않는다
        rows: [
          [["신조의 둥지 어려움", 735 * SEED_MAN * 100], ["오를리 방어전 지옥", 210 * SEED_MAN * 100], ["카타콤 지옥", 50 * SEED_MAN * 100]],
        ],
      },
    ],
  },
  {
    key: "rubicona",
    title: "루비코나 지역",
    cap: 28 * SEED_EOK,
    groups: [
      {
        name: "환희 · 슬픔",
        cap: null,
        rows: [
          [["추종하는 환희 (일반)", 14 * SEED_EOK, { excl: "joy", defaultOff: true }], ["추종하는 환희 (어려움)", 14 * SEED_EOK, { excl: "joy" }]],
          [["응시하는 슬픔 (일반)", 14 * SEED_EOK, { excl: "sorrow", defaultOff: true }], ["응시하는 슬픔 (어려움)", 14 * SEED_EOK, { excl: "sorrow" }]],
        ],
      },
    ],
  },
];

// 행 배치와 별개로 계산은 그룹의 항목 목록으로 한다
for (const zone of SEED_ZONES) {
  for (const group of zone.groups) {
    group.items = group.rows.flat();
    group.cols = Math.max(...group.rows.map((row) => row.length));
  }
}

// "53억 2,500만"처럼 억·만으로 끊고, 0인 자리는 뺀다
function seedFmt(v) {
  const amount = Math.floor(Math.abs(v));
  const eok = Math.floor(amount / SEED_EOK);
  const man = Math.floor((amount % SEED_EOK) / SEED_MAN);
  const parts = [];
  if (eok) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (man) parts.push(`${man.toLocaleString("ko-KR")}만`);
  return parts.length ? parts.join(" ") : "0";
}

const seedCalc = (() => {
  let loaded = false;
  let active = new Set(); // 켜진 항목 이름
  let counts = new Map(); // 판수를 고르는 항목의 판수 (이름 → n)

  const allItems = () => SEED_ZONES.flatMap((z) => z.groups.flatMap((g) => g.items));
  const zoneItems = (zoneKey) => SEED_ZONES.find((z) => z.key === zoneKey).groups.flatMap((g) => g.items);
  const findItem = (name) => allItems().find((it) => it[0] === name);
  const countCfg = (item) => item[2]?.count || null;
  const countOf = (item) => counts.get(item[0]) ?? countCfg(item)?.max ?? 1;
  // 주간 시드: 판수 항목은 판당 × 판수, 나머지는 표의 주간값 그대로
  const weeklyOf = (item) => (countCfg(item) ? countCfg(item).per * countOf(item) : item[1]);

  function setCount(name, n) {
    const item = findItem(name);
    const cfg = item && countCfg(item);
    if (!cfg) return;
    counts.set(name, Math.max(cfg.min, Math.min(cfg.max, n)));
    active.add(name); // 판수를 만지면 켜진 것으로 본다
    save();
    render();
  }

  function defaults() {
    return new Set(allItems().filter((it) => !it[2]?.defaultOff).map((it) => it[0]));
  }

  // 항목을 켠다. 배타 항목은 같은 키의 다른 항목을 끈다.
  function activate(item) {
    const excl = item[2]?.excl;
    if (excl) {
      for (const it of allItems()) {
        if (it !== item && it[2]?.excl === excl) active.delete(it[0]);
      }
    }
    active.add(item[0]);
  }

  function restore() {
    active = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(SEED_SAVE_KEY) || "null");
      // 예전 저장값은 켜진 이름 배열, 지금은 { active, counts }
      const names = Array.isArray(saved) ? saved : Array.isArray(saved?.active) ? saved.active : null;
      if (!names) return;
      active = new Set();
      // 저장 순서대로 켜되, 배타 규칙은 다시 적용한다 (규칙이 바뀐 뒤의 저장값 대비)
      // 이름이 바뀐 항목은 옛 저장값을 새 이름으로 읽는다 (2026-09-17: 차원의 틈)
      const renamed = { "차원의 틈": "지하요새의 망령(차원의 틈)" };
      for (const name of names) {
        const item = findItem(renamed[name] || name);
        if (item) activate(item);
      }
      counts = new Map();
      for (const [name, n] of Object.entries(saved?.counts || {})) {
        const item = findItem(name);
        const cfg = item && countCfg(item);
        if (cfg && Number.isInteger(n)) counts.set(name, Math.max(cfg.min, Math.min(cfg.max, n)));
      }
    } catch {
      active = defaults();
      counts = new Map();
    }
  }

  function save() {
    try {
      localStorage.setItem(SEED_SAVE_KEY, JSON.stringify({ active: [...active], counts: Object.fromEntries(counts) }));
    } catch {
      // 저장 공간 부족 등은 무시 (선택 기억은 편의일 뿐)
    }
  }

  // 켜진 항목 기준 그룹별 소계와 지역 최종값.
  // 그룹 한도는 uncapped가 아닌 항목의 합에만 걸고, uncapped 항목은 그 위에 그대로 더한다.
  function compute(zone) {
    const groups = zone.groups.map((g) => {
      let capSum = 0;
      let freeSum = 0;
      for (const it of g.items) {
        if (!active.has(it[0])) continue;
        if (it[2]?.uncapped) freeSum += weeklyOf(it);
        else capSum += weeklyOf(it);
      }
      const over = g.cap != null && capSum > g.cap;
      const capped = (g.cap == null ? capSum : Math.min(capSum, g.cap)) + freeSum;
      return { sum: capSum + freeSum, capped, over };
    });
    const sum = groups.reduce((acc, g) => acc + g.capped, 0);
    return { groups, sum, total: Math.min(sum, zone.cap) };
  }

  function toggle(name) {
    const item = findItem(name);
    if (!item) return;
    if (active.has(name)) active.delete(name);
    else activate(item);
    save();
    render();
  }

  function setZone(zoneKey, on) {
    const items = zoneItems(zoneKey);
    if (!on) {
      items.forEach((it) => active.delete(it[0]));
    } else {
      // 전체 선택 때 배타 항목은 기본 쪽(defaultOff가 아닌 것)만 켠다
      items.forEach((it) => {
        if (it[2]?.defaultOff) active.delete(it[0]);
        else active.add(it[0]);
      });
    }
    save();
    render();
  }

  function cardHtml(item) {
    const [name] = item;
    const on = active.has(name);
    const safe = escapeHtml(name);
    const icon = SEED_ICONS[name];
    const iconHtml = icon
      ? `<img class="seed-card-icon" src="${SEED_ICON_BASE}${encodeURIComponent(icon)}.webp" alt="" loading="lazy" decoding="async" />`
      : `<span class="seed-card-icon"></span>`;
    // 판수 항목은 카드 안에 − n +를 둔다. 스테퍼 클릭은 카드 토글이 아니다 (wire에서 먼저 잡는다)
    const cfg = countCfg(item);
    const stepper = cfg
      ? `<span class="seed-stepper" aria-label="${safe} 판수">` +
        `<button type="button" data-seed-step="-1" data-seed-name="${safe}" aria-label="판수 줄이기">−</button>` +
        `<span class="seed-count">${countOf(item)}판</span>` +
        `<button type="button" data-seed-step="1" data-seed-name="${safe}" aria-label="판수 늘리기">+</button>` +
        `</span>`
      : "";
    return (
      `<div class="seed-card${on ? " is-active" : ""}" role="button" tabindex="0" data-seed-item="${safe}" aria-pressed="${on}">` +
      iconHtml +
      `<span class="seed-card-body">` +
      `<span class="seed-card-name">${safe}</span>` +
      `<span class="seed-card-amount">${seedFmt(weeklyOf(item))}${cfg ? `<small>판당 ${seedFmt(cfg.per)}</small>` : ""}</span>` +
      `</span>` +
      stepper +
      `</div>`
    );
  }

  function groupHtml(group, result) {
    const capText = group.cap == null
      ? ""
      : `<span class="seed-group-cap">그룹 한도 ${seedFmt(group.cap)}${group.capNote ? ` (${escapeHtml(group.capNote)})` : ""}</span>`;
    const rows = group.rows
      .map((row) => `<div class="seed-cards" style="--seed-cols: ${group.cols}">${row.map(cardHtml).join("")}</div>`)
      .join("");
    return (
      `<section class="seed-group${result.over ? " is-capped" : ""}">` +
      `<header class="seed-group-head">` +
      `<h4>${escapeHtml(group.name)}</h4>${capText}` +
      `<strong class="seed-group-sum">${seedFmt(result.capped)}${result.over ? `<small>선택 ${seedFmt(result.sum)}</small>` : ""}</strong>` +
      `</header>` +
      `<div class="seed-rows">${rows}</div>` +
      `</section>`
    );
  }

  function zoneHtml(zone) {
    const r = compute(zone);
    const capped = r.sum > zone.cap;
    return (
      `<section class="seed-zone" data-seed-zone="${zone.key}">` +
      `<header class="seed-zone-head">` +
      `<div class="seed-zone-title"><h3>${escapeHtml(zone.title)}</h3></div>` +
      `<div class="seed-zone-actions">` +
      `<button type="button" data-seed-all="${zone.key}">전체 선택</button>` +
      `<button type="button" data-seed-none="${zone.key}">전체 해제</button>` +
      `</div>` +
      `</header>` +
      `<div class="seed-total${capped ? " is-capped" : ""}">` +
      `<div class="seed-total-row"><span>선택 합계 (그룹 한도 적용)</span><strong>${seedFmt(r.sum)}</strong></div>` +
      `<div class="seed-total-row"><span>주간 한도</span><strong>${seedFmt(zone.cap)}</strong></div>` +
      `<div class="seed-total-row is-total"><span>주간 최대 획득</span><strong>${simIcon("시드.png", 22)}${seedFmt(r.total)}</strong></div>` +
      `</div>` +
      `<div class="seed-groups">${zone.groups.map((g, i) => groupHtml(g, r.groups[i])).join("")}</div>` +
      `</section>`
    );
  }

  function render() {
    const box = els.seedBody;
    if (!box) return;
    const totals = SEED_ZONES.map((z) => compute(z).total);
    const grand = totals.reduce((a, b) => a + b, 0);
    const grandCap = SEED_ZONES.reduce((a, z) => a + z.cap, 0);
    box.innerHTML =
      `<div class="seed-summary">` +
      SEED_ZONES.map((z, i) => `<div class="seed-summary-item"><span>${escapeHtml(z.title)}</span><strong>${seedFmt(totals[i])}</strong><small>한도 ${seedFmt(z.cap)}</small></div>`).join("") +
      `<div class="seed-summary-item is-grand"><span>이번 주 합계</span><strong>${simIcon("시드.png", 24)}${seedFmt(grand)}</strong><small>한도 ${seedFmt(grandCap)}</small></div>` +
      `</div>` +
      SEED_ZONES.map(zoneHtml).join("");
  }

  function load() {
    if (loaded) return;
    loaded = true;
    restore();
    render();
  }

  function wire() {
    const box = els.seedBody;
    if (!box) return;

    box.addEventListener("click", (event) => {
      const step = event.target.closest("[data-seed-step]");
      if (step) {
        const item = findItem(step.dataset.seedName);
        if (item) setCount(item[0], countOf(item) + Number(step.dataset.seedStep));
        return;
      }
      const card = event.target.closest("[data-seed-item]");
      if (card) return toggle(card.dataset.seedItem);
      const all = event.target.closest("[data-seed-all]");
      if (all) return setZone(all.dataset.seedAll, true);
      const none = event.target.closest("[data-seed-none]");
      if (none) return setZone(none.dataset.seedNone, false);
    });

    // 카드가 div라 Enter/Space로도 켜고 끌 수 있게 한다
    box.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest("button")) return;
      const card = event.target.closest("[data-seed-item]");
      if (!card) return;
      event.preventDefault();
      toggle(card.dataset.seedItem);
    });
  }

  return { load, wire };
})();

// ══════════════════════════════════════════════════════════════
//  테일즈 정보 > 사냥터 1킬 계산기 (레이아웃 초안)
//  사냥터 몬스터 HP와 에타 레벨별 최대 대미지를 견주어 한 방(스킬 타수 합)에 잡히는지 본다.
//  총 대미지 = (에타 레벨별 최대 대미지 × 타수 + 무기 추가 대미지) × (1 + 추가 대미지 % 합)
//  무기 추가 대미지는 %가 아니라 상수로 더한다.
// ══════════════════════════════════════════════════════════════

// 사냥터. hp는 임시값이라 화면에서 직접 고칠 수 있게 둔다
const OK_GROUNDS = [
  { key: "siokahn", name: "시오칸하임 대장간", hp: 24500000 },
  { key: "golgoda", name: "골고다 협곡 방어전 · 공허의 영역", hp: 300000000 }, // 두 곳 HP가 같아 버튼 하나로 묶는다
];

// 추가 대미지 입력칸. 배치 순서 그대로 (한 줄에 3개). options가 있으면 목록, 없으면 직접 입력.
// pct 표가 있으면 값(LV)을 %로 바꾼다. icon은 대미지 계산기와 같은 images/ 파일.
const OK_EXTRAS = [
  { key: "stone", name: "장비 강화석 부가 옵션", icon: "장비강화석.png", unit: "%", options: [0, 45, 46, 47, 48], def: 45 },
  { key: "fever", name: "피버 추가 대미지 부가 옵션", icon: "피버.png", unit: "%", options: [0, 8, 9, 10, 11, 12, 13], def: 0, excl: "undead" },
  { key: "undead", name: "언데드 추가 대미지 부가 옵션", icon: "언데드.webp", unit: "%", options: [0, 11, 12, 13, 14, 15], def: 0, excl: "fever",
    help: { title: "언데드 추가 대미지 부가 옵션", lines: ["카드 옵션 \"언데드\"를 이용하여 HP를 15% 미만을 유지하고, 아래 무기 부가 옵션을 사용함", "\"자신의 HP가 15% 미만이면 대상에게 11~15% 추가 피해를 줍니다\""] } },
  { key: "title", name: "칭호 추가 대미지", icon: "칭호.png", unit: "%", options: [0, 15, 20], def: 0 },
  { key: "snipe", name: "저격 연마", icon: "저격연마.png", unit: "LV", options: [5, 6, 7, 8, 9, 10], def: 5, pct: { 0: 0, 1: 5, 2: 10, 3: 15, 4: 20, 5: 25, 6: 28, 7: 31, 8: 34, 9: 37, 10: 40 } },
  { key: "etc", name: "기타", unit: "%", def: 0 },
];

const OK_SAVE_KEY = "tw-onekill-save-v1";

const oneKillCalc = (() => {
  // mode: "level" = 에타 레벨표의 최대 대미지로 계산 | "damage" = 1타 대미지를 직접 넣어 계산
  const state = { ground: OK_GROUNDS[0].key, hpOverride: {}, extras: {}, mode: "level", loaded: false };

  const ground = () => OK_GROUNDS.find((g) => g.key === state.ground) || OK_GROUNDS[0];
  const fmt = (n) => Math.round(n).toLocaleString("ko-KR");

  // 큰 숫자 칸(1타 대미지·무기 추가 대미지·몬스터 HP)은 글자 칸으로 두고 쉼표를 자동으로 넣는다.
  // 읽을 때는 숫자만 남기고, 보여줄 때는 세 자리마다 쉼표를 찍는다
  const digits = (v) => Number(String(v ?? "").replace(/[^\d]/g, "")) || 0;
  const withComma = (v) => (digits(v) ? digits(v).toLocaleString("ko-KR") : "");
  const groundHp = () => digits(state.hpOverride[state.ground] ?? ground().hp);

  // 입력 중에 쉼표를 다시 찍으면서 커서는 같은 숫자 자리에 둔다
  function formatCommaInput(input) {
    if (!input) return;
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    const digitsBefore = raw.slice(0, caret).replace(/[^\d]/g, "").length;
    const next = withComma(raw);
    if (next === raw) return;
    input.value = next;
    let pos = 0, seen = 0;
    while (pos < next.length && seen < digitsBefore) {
      if (/\d/.test(next[pos])) seen += 1;
      pos += 1;
    }
    try { input.setSelectionRange(pos, pos); } catch { /* 포커스가 없으면 무시 */ }
  }

  // 에타 레벨표(dmg)에서 그 레벨의 최대 대미지를 읽는다
  function etaMaxDamage(level) {
    const row = (etaInfo.data?.levels || []).find((r) => Number(r.lv) === level);
    return row ? Number(String(row.dmg).replace(/[^\d]/g, "")) || 0 : 0;
  }

  const okLevel = () => Math.min(100, Math.max(1, Number(els.okEtaLevel?.value) || 0));

  // 계산에 쓰는 1타 대미지. 기준에 따라 레벨표 값이거나 직접 넣은 값이다
  function baseDamage() {
    if (state.mode === "damage") return digits(els.okDamage?.value);
    return etaMaxDamage(okLevel());
  }

  const extraValue = (ex) => Number(state.extras[ex.key] ?? ex.def ?? 0) || 0;

  const weaponBonus = () => digits(els.okWeapon?.value);

  // 추가 대미지 항목 합 (%). 무기 추가 대미지는 상수라 여기 넣지 않는다
  function extraPercent() {
    return OK_EXTRAS.reduce((sum, ex) => {
      const raw = extraValue(ex);
      return sum + (ex.pct ? (ex.pct[raw] ?? 0) : raw);
    }, 0);
  }

  // (1타 대미지 × 타수 + 무기 추가 대미지) × (1 + 추가 대미지 합 %)
  function okTotalDamage(base, hits) {
    return (base * hits + weaponBonus()) * (1 + extraPercent() / 100);
  }

  function save() {
    try { localStorage.setItem(OK_SAVE_KEY, JSON.stringify({ ground: state.ground, hp: state.hpOverride, extras: state.extras, mode: state.mode, level: els.okEtaLevel?.value, damage: digits(els.okDamage?.value), hits: els.okHits?.value, weapon: digits(els.okWeapon?.value) })); } catch { /* 저장은 편의일 뿐 */ }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(OK_SAVE_KEY) || "null");
      if (!saved) return;
      if (OK_GROUNDS.some((g) => g.key === saved.ground)) state.ground = saved.ground;
      state.hpOverride = saved.hp || {};
      state.extras = saved.extras || {};
      if (saved.mode === "level" || saved.mode === "damage") state.mode = saved.mode;
      if (els.okEtaLevel && saved.level) els.okEtaLevel.value = saved.level;
      if (els.okDamage && saved.damage != null) els.okDamage.value = withComma(saved.damage);
      if (els.okHits && saved.hits) els.okHits.value = saved.hits;
      if (els.okWeapon && saved.weapon != null) els.okWeapon.value = withComma(saved.weapon);
    } catch { /* 깨진 저장값은 무시 */ }
  }

  function renderGrounds() {
    if (!els.okGroundRow) return;
    els.okGroundRow.innerHTML = OK_GROUNDS.map((g) => `
      <button type="button" class="buff-base-btn${g.key === state.ground ? " is-active" : ""}" data-ok-ground="${g.key}">${escapeHtml(g.name)}</button>
    `).join("");
  }

  // 기준 버튼 활성 표시. 입력 칸(에타 레벨 / 1타 대미지)은 둘 다 두고 기준이 아닌 쪽만 잠근다
  function renderMode() {
    els.okModeRow?.querySelectorAll("[data-ok-mode]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.okMode === state.mode);
    });
    document.querySelectorAll("[data-ok-mode-field]").forEach((field) => {
      const off = field.dataset.okModeField !== state.mode;
      field.classList.toggle("is-locked", off);
      field.querySelectorAll("input").forEach((input) => { input.disabled = off; });
    });
  }

  function renderExtras() {
    if (!els.okExtraRow) return;
    els.okExtraRow.innerHTML = OK_EXTRAS.map((ex) => {
      const value = extraValue(ex);
      // 피버와 언데드는 같이 못 쓴다. 상대가 0보다 크면 이쪽은 잠근다
      const locked = ex.excl && extraValue(OK_EXTRAS.find((x) => x.key === ex.excl)) > 0;
      const control = ex.options
        ? `<select data-ok-extra="${ex.key}"${locked ? " disabled" : ""}>${ex.options.map((o) => `<option value="${o}"${o === value ? " selected" : ""}>${ex.pct ? `LV${o} - ${ex.pct[o]}%` : `${o}%`}</option>`).join("")}</select>`
        : `<input type="number" min="0" step="1" inputmode="numeric" placeholder="0" data-ok-extra="${ex.key}" value="${escapeHtml(String(value))}" />`;
      return `
      <label class="field ok-field${locked ? " is-locked" : ""}">
        <span class="ok-label">${ex.icon ? simIcon(ex.icon, 20) : ""}${escapeHtml(ex.name)}${ex.help ? ` <button type="button" class="eta-help-button" data-ok-help="${ex.key}" title="${escapeHtml(ex.help.title)} 안내" aria-label="${escapeHtml(ex.help.title)} 안내">?</button>` : ""}</span>
        <span class="ok-unit-wrap">${control}${ex.pct ? "" : "<em>%</em>"}</span>
      </label>`;
    }).join("");
  }

  function renderResult() {
    if (!els.okResult) return;
    const level = okLevel();
    const hits = Number(els.okHits?.value) || 4;
    const hp = groundHp();
    const max = baseDamage();
    const total = okTotalDamage(max, hits);
    const byDamage = state.mode === "damage";
    const ratio = hp > 0 ? total / hp : 0;             // 한 번 공격이 HP의 몇 %인지
    const kills = ratio > 0 ? Math.ceil(1 / ratio) : 0; // 몇 번 때려야 잡는지
    const shortPct = hp > 0 ? Math.max(0, (hp - total) / hp) * 100 : 0;

    let verdict = "";
    if (!max) {
      verdict = byDamage ? "1타 대미지를 넣어 주세요." : "에타 레벨을 1~100 사이로 넣어 주세요.";
    } else if (kills <= 1) {
      verdict = `<strong>1킬</strong><span>(${(ratio * 100).toFixed(1)}%) · 여유 ${fmt(total - hp)}</span>`;
    } else {
      verdict = `<strong>${kills > 5 ? "5킬 이상" : `${kills}킬`}</strong><span>(${(ratio * 100).toFixed(1)}%) · 1킬까지 ${fmt(hp - total)} 부족</span>`;
      // 부족분이 10% 이내일 때만 채우는 길을 보여준다. 그보다 크면 수치가 비현실적이라 뺀다
      if (shortPct <= 10) {
        verdict += `<span class="ok-need">추가 대미지로 채우면 <b>+${Math.ceil((hp / (max * hits + weaponBonus()) - 1) * 100 - extraPercent())}%p</b> 더 필요</span>
          <span class="ok-need">무기 추가 대미지로 채우면 <b>+${fmt(Math.ceil(hp / (1 + extraPercent() / 100) - max * hits - weaponBonus()))}</b> 더 필요</span>`;
      }
    }

    els.okResult.innerHTML = `
      <div class="eta-calc-grid ok-grid">
        <div class="eta-calc-cell is-main">
          <span>${escapeHtml(ground().name)} 몬스터 HP</span>
          <strong class="ok-hp-edit"><input id="okHpInput" type="text" inputmode="numeric" autocomplete="off" value="${withComma(hp)}" aria-label="몬스터 HP" /></strong>
        </div>
        <div class="eta-calc-cell is-main">
          <span>예상 총 대미지 <small>${byDamage ? `1타 ${max ? fmt(max) : "-"}` : `에타 ${level} 최대 ${max ? fmt(max) : "-"}`} × ${hits}타${weaponBonus() ? ` + 무기 ${fmt(weaponBonus())}` : ""} · 추가 +${extraPercent()}%</small></span>
          <strong>${max ? fmt(total) : "-"}</strong>
        </div>
      </div>
      <div class="ok-verdict ${!max ? "" : kills <= 1 ? "is-ok" : "is-short"}">${verdict}</div>
    `;
  }

  function renderAll() {
    renderGrounds();
    renderMode();
    renderExtras();
    renderResult();
  }

  async function load() {
    if (state.loaded) return;
    state.loaded = true;
    restore();
    renderAll();
    if (!etaInfo.data) { await ensureEtaInfo(); renderResult(); }
  }

  function wire() {
    els.okGroundRow?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-ok-ground]");
      if (!button) return;
      state.ground = button.dataset.okGround;
      save();
      renderGrounds();
      renderResult();
    });
    els.okModeRow?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-ok-mode]");
      if (!button || button.dataset.okMode === state.mode) return;
      state.mode = button.dataset.okMode;
      save();
      renderMode();
      renderResult();
    });
    els.okEtaLevel?.addEventListener("input", () => { save(); renderResult(); });
    els.okDamage?.addEventListener("input", () => { formatCommaInput(els.okDamage); save(); renderResult(); });
    els.okHits?.addEventListener("change", () => { save(); renderResult(); });
    els.okWeapon?.addEventListener("input", () => { formatCommaInput(els.okWeapon); save(); renderResult(); });
    // 목록(select)은 change, 직접 입력(input)은 input으로 온다. 둘 다 받는다
    // [?] 버튼: 시뮬레이터 확률표 모달을 그대로 빌려 안내 문구를 띄운다
    els.okExtraRow?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-ok-help]");
      if (!button) return;
      event.preventDefault();
      const ex = OK_EXTRAS.find((x) => x.key === button.dataset.okHelp);
      if (!ex?.help) return;
      openRateModal(ex.help.title, "", ex.help.lines.map((line) => `<p class="modal-text">${escapeHtml(line)}</p>`).join(""));
    });
    ["input", "change"].forEach((type) => els.okExtraRow?.addEventListener(type, (event) => {
      const key = event.target.dataset?.okExtra;
      if (!key) return;
      state.extras[key] = event.target.value;
      // 배타 상대가 있으면 0으로 되돌리고 잠금 상태를 다시 그린다
      const ex = OK_EXTRAS.find((x) => x.key === key);
      if (ex?.excl) {
        if (Number(event.target.value) > 0) state.extras[ex.excl] = 0;
        renderExtras();
      }
      save();
      renderResult();
    }));
    // HP 칸은 결과 안에 있어 매번 다시 그려지므로, 입력 중에는 값만 바꾸고 판정 문구만 갱신한다
    els.okResult?.addEventListener("input", (event) => {
      if (event.target.id !== "okHpInput") return;
      state.hpOverride[state.ground] = digits(event.target.value);
      save();
      const verdict = els.okResult.querySelector(".ok-verdict");
      const keep = document.activeElement;
      renderResult();
      if (keep?.id === "okHpInput") { const el = document.querySelector("#okHpInput"); el?.focus(); el?.setSelectionRange?.(el.value.length, el.value.length); }
      void verdict;
    });
  }

  return { load, wire };
})();

// ══════════════════════════════════════════════════════════════
//  테일즈 정보 > 필요 명중 계산기
//  왼쪽: 능력치 계산(DEX) / 가운데: 장비 명중 보정 합계 / 오른쪽: 사냥터 선택 + 결과
//
//  능력치 공식 (2026-09-15 사용자 제공, 같은 날 게임 실측으로 보정)
//    기본 능력치 = [(기본 상태 + 기운 비율 + [(비율 증가 + 고정값 증가) × 1.1]) × 배율 A]   ※ 비율 증가는 버프마다 소수점 버림, 배율 A는 모두 곱셈
//    최종 능력치 = 기본 능력치 + [기본 능력치 × 배율 B] + 최종 고정치
//    ×1.1은 게임 실측(펫 30: 525/485, 룬 20: 413, 일루미: 1020→1142)에서 확인된 값이다. 테일즈위버의 기운만 ×1.1을
//    타지 않았다(기운 자체가 ×1.1의 출처일 가능성 있음). 출처 미확인이라 상수로 둔다
//  장비 명중은 장비 DB의 "명중" 열(중간값)과 명중 인챈트를 부위별로 더한다.
//  사냥터 목록은 assets/hit-grounds.json, 최종 판정식은 아직 정해지지 않아 결과 칸은 재료만 보여준다.
// ══════════════════════════════════════════════════════════════
const HIT_SAVE_KEY = "tw-hit-save-v1";
const HIT_GROUNDS_URL = "./assets/hit-grounds.json";
const HIT_STATS = ["DEX"];   // 명중은 DEX만 본다 (AGI는 2026-09-15 제외)
const HIT_FIXED_MULT = 1.1;  // 비율 증가(기운 제외) + 고정값 증가 합에 곱해지는 배율 (게임 실측)
// 장비 DB에서 고르는 부위와, 명중 수치를 수동으로 넣는 줄(manual).
// "명중률"이라 적힌 줄도 실제 적용은 명중 보정 수치라 같은 합계에 더한다
const HIT_SLOTS = [
  { slot: "무기" }, { slot: "무기 어빌리티", manual: true },
  { slot: "갑옷" }, { slot: "손목" }, { slot: "투구" }, { slot: "머리" }, { slot: "몸" },
  { slot: "손" }, { slot: "손 어빌리티", manual: true }, { slot: "손 부가옵션 명중률", manual: true },
  { slot: "다리" },
  { slot: "아티팩트" }, { slot: "효과", manual: true },
  { slot: "시에나 (명중률 %)", manual: true },
  { slot: "기타", manual: true, negative: true },   // 감소 옵션도 넣을 수 있게 음수 허용
];

// 버프 정의. kind: pct(비율, 버프마다 버림) / fixed(고정값) / multA(배율 A, 곱) / multB(배율 B, %) / final(최종 고정치)
//   hit: DEX가 아니라 명중 보정 수치에 더한다 (이자벨(명중) +10, 특선 묘약(명중) +20, 룬 스킬(명중률) 0~20). 이름은 명중률이지만 적용은 수치다
// input: check(체크) / num(체크 + 숫자 하나, min~max). def: 체크했을 때 처음 들어가는 값
// excl: 같은 그룹은 택1 (하나를 켜면 다른 쪽이 잠긴다)
// icon: images/ 아래 경로 (경험치 버프 계산기와 같은 CDN). 없는 것은 첫 글자 자리표시
// 화면에는 이 순서대로 한 줄에 두 개씩 놓인다 (짝은 2026-09-15 사용자 지정)
const HIT_BUFFS = [
  { key: "snowman", name: "눈사람 특제 포션", kind: "pct", input: "check", value: 30, icon: "눈사람.png", excl: "snow" },
  { key: "illumi", name: "일루미네이션 축제 음료", kind: "pct", input: "check", value: 30, icon: "일루미.png", excl: "snow" },
  { key: "twSpirit", name: "테일즈위버의 기운", kind: "pct", input: "check", value: 10, icon: "기운.png", outsideMult: true },
  { spacer: true },   // 짝 배치를 유지하려고 이 줄 오른쪽은 비운다
  { key: "isabelBless", name: "이자벨 (고정 능력치)", kind: "fixed", input: "check", value: 20, icon: "이자벨_고정.png", excl: "bless" },
  { key: "bless", name: "축복의 물약", kind: "fixed", input: "check", value: 20, icon: "축복.png", excl: "bless" },
  { key: "isabelMult", name: "이자벨 (비율 능력치)", kind: "multA", input: "check", value: 1.1, icon: "이자벨_비율.png", excl: "multA" },
  { key: "exorcist", name: "퇴마사의 축복", kind: "multA", input: "check", value: 1.1, icon: "퇴마사.png", excl: "multA" },
  { key: "isabelFixed", name: "특선 묘약 (고정 능력치)", kind: "fixed", input: "check", value: 100, icon: "이자벨_고정.png" },
  { key: "isabelPct", name: "특선 묘약 (비율 능력치)", kind: "pct", input: "check", value: 50, icon: "이자벨_비율.png" },
  { key: "isabelHit", name: "이자벨 (명중)", kind: "hit", input: "check", value: 10, icon: "이자벨_명중.png" },
  { key: "isabelHitSpecial", name: "특선 묘약 (명중)", kind: "hit", input: "check", value: 20, icon: "이자벨_명중.png" },
  { key: "trust", name: "개-신뢰의 물약", kind: "fixed", input: "num", min: 28, max: 34, def: 34, icon: "신뢰.png" },
  { key: "fever", name: "피버 상태", kind: "fixed", input: "check", value: 30, icon: "피버.png" },
  // 통찰의 비약: 고정값 자리 (게임 실측 1,282 → 1,409). 대/특대는 택1
  { key: "insight", name: "통찰의 비약 (대)", kind: "fixed", input: "check", value: 100, icon: "통찰_대.png", excl: "insight" },
  { key: "insightXL", name: "통찰의 비약 (특대)", kind: "fixed", input: "check", value: 200, icon: "통찰_특대.png", excl: "insight" },
  { key: "crown", name: "크라운", kind: "final", input: "num", min: 0, max: 300, icon: "크라운.png" },
  { key: "relicGoods", name: "신조의 성물", kind: "final", input: "num", min: 0, max: 300, icon: "신조의_성물.png" },
  { key: "helmet", name: "투구 부가 옵션", kind: "fixed", input: "num", min: 0, max: 60, icon: "Exp/투구_부가.png" },
  { key: "card", name: "몬스터 카드 옵션", kind: "fixed", input: "num", min: 0, max: 70, icon: "Exp/카드.png" },
  { key: "petS", name: "펫 S 스킬", kind: "fixed", input: "num", min: 0, max: 70, icon: "펫_덱스.png" },
  // 능력 강화는 레벨로 넣고 %로 바꾼다. LV1~5 = 1~5%, LV6~10 = 8·11·14·17·20% (2026-09-15 게임 실측)
  { key: "enhance", name: "능력 강화 (LV)", kind: "multB", input: "num", min: 0, max: 10, def: 10, icon: "능력_강화.png",
    levels: [0, 1, 2, 3, 4, 5, 8, 11, 14, 17, 20] },
  { key: "club", name: "클럽 효과", kind: "fixed", input: "num", min: 0, max: 7, def: 7, icon: "클럽_덱스.png" },
  { key: "clubS", name: "클럽 S효과", kind: "fixed", input: "check", value: 20, icon: "클럽S_덱스.png" },
  { key: "rune", name: "룬 스킬 (DEX)", kind: "fixed", input: "num", min: 0, max: 20, def: 20, icon: "룬_가벼운몸놀림.png" },
  { key: "runeHit", name: "룬 스킬 (명중률)", kind: "hit", input: "num", min: 0, max: 20, def: 20, icon: "룬_예리한눈.png" },
  { key: "siena", name: "시에나의 기운 (DEX)", kind: "final", input: "num", min: 0, max: 999, icon: "시에나.png" },
  // 시에나의 기운 "모든 스탯 +N". DEX 항목과 별개로 배율 뒤에 더해진다
  { key: "sienaAll", name: "시에나의 기운 (모든 스탯)", kind: "final", input: "num", min: 0, max: 999, icon: "시에나.png" },
  { key: "encourage", name: "인커리지", kind: "multB", input: "check", value: 10, icon: "엔커리지.png" },
  { spacer: true },
];

const hitCalc = (() => {
  const hit = {
    loaded: false,
    base: { DEX: 310 },   // 기본 상태 초기값 (2026-09-15 사용자 지정)
    buffs: {},                 // check 항목: true/false, num 항목: { on, value }
    character: CHARACTER_NAMES[0],
    type: "",
    equip: {},                 // 슬롯 → { name, enchant }
    grounds: [],
    ground: "",
  };
  const els = {};
  const q = (sel) => document.querySelector(sel);
  const fmt = (n) => Math.round(n).toLocaleString("ko-KR");
  const num = (v) => Number(v) || 0;
  const findBuff = (key) => HIT_BUFFS.find((b) => b.key === key);
  const realBuffs = () => HIT_BUFFS.filter((b) => !b.spacer);

  function buffValue(buff) {
    const saved = hit.buffs[buff.key];
    if (buff.input === "check") return saved ? buff.value : 0;
    // 숫자 항목: 체크가 켜져 있을 때만, 범위 안으로 잘라서 쓴다
    if (!saved || typeof saved !== "object" || !saved.on) return 0;
    const v = Math.min(buff.max, Math.max(buff.min, num(saved.value)));
    // 레벨표가 있으면 레벨 → 효과값으로 바꾼다 (능력 강화)
    return buff.levels ? (buff.levels[Math.round(v)] ?? 0) : v;
  }

  // 한 스탯의 기본 능력치·최종 능력치와 중간값
  function computeStat(stat) {
    const base = Math.max(0, num(hit.base[stat]));
    let pct = 0, pctOutside = 0, fixed = 0, multA = 1, multB = 0, final = 0;
    realBuffs().forEach((buff) => {
      const v = buffValue(buff);
      if (!v) return;
      if (buff.kind === "pct" && buff.outsideMult) pctOutside += Math.floor(base * v / 100);
      else if (buff.kind === "pct") pct += Math.floor(base * v / 100);
      else if (buff.kind === "fixed") fixed += v;
      else if (buff.kind === "multA") multA *= v;
      else if (buff.kind === "multB") multB += v;
      else if (buff.kind === "final") final += v;
      // hit는 DEX 계산에 들어가지 않는다 (buffHitBonus에서 명중 보정으로 모은다)
    });
    const bonusApplied = Math.floor((pct + fixed) * HIT_FIXED_MULT);
    const basic = Math.floor((base + pctOutside + bonusApplied) * multA);
    const total = basic + Math.floor(basic * multB / 100) + final;
    return { base, pct, pctOutside, fixed, bonusApplied, multA, multB, final, basic, total };
  }

  // 명중 보정 수치에 더하는 버프 합 (이자벨(명중)·특선 묘약(명중))
  const buffHitBonus = () => realBuffs().reduce((sum, buff) => sum + (buff.kind === "hit" ? buffValue(buff) : 0), 0);

  // ── 장비 ──
  const records = () => state.records || [];   // 장비 DB (부팅 때 시트에서 읽는다)
  const recordByName = (name) => records().find((r) => r.name === name);

  function hitOf(name) {
    const rec = name && name !== "수동 입력" ? recordByName(name) : null;
    const s = rec?.stats?.["명중"];
    return s ? { value: num(s.max), limit: num(s.limit) } : { value: 0, limit: 0 };
  }

  function equipRows() {
    return HIT_SLOTS.map(({ slot, manual, negative }) => {
      const saved = hit.equip[slot] || {};
      if (manual) {
        const value = negative ? num(saved.value) : Math.max(0, num(saved.value));
        return { slot, manual: true, negative: !!negative, value, sum: value };
      }
      const candidates = records().length ? buildEquipmentCandidates(slot, hit.type, hit.character) : ["수동 입력"];
      const name = candidates.includes(saved.name) ? saved.name : "수동 입력";
      const h = hitOf(name);
      return { slot, candidates, name, hit: h.value, sum: h.value };
    });
  }

  const equipTotal = () => equipRows().reduce((sum, r) => sum + r.sum, 0);
  // 명중 보정 합계 = 장비·수동 줄 합 + 버프(이자벨·특선 묘약 명중)
  const hitTotal = () => equipTotal() + buffHitBonus();

  // ── 저장 ──
  function save() {
    try {
      localStorage.setItem(HIT_SAVE_KEY, JSON.stringify({
        base: hit.base, buffs: hit.buffs, character: hit.character, type: hit.type,
        equip: hit.equip, ground: hit.ground,
      }));
    } catch { /* 저장은 편의일 뿐 */ }
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(HIT_SAVE_KEY) || "null");
      if (!saved) return;
      if (saved.base) hit.base = { DEX: num(saved.base.DEX) || 310 };
      if (saved.buffs) hit.buffs = saved.buffs;
      if (CHARACTER_NAMES.includes(saved.character)) hit.character = saved.character;
      if (saved.type) hit.type = saved.type;
      if (saved.equip) {
        hit.equip = saved.equip;
        // 줄 이름을 바꾼 뒤(2026-09-15)에도 예전에 넣은 값이 이어지게 한다
        if (hit.equip["시에나의 기운 (명중률 %)"] && !hit.equip["시에나 (명중률 %)"]) {
          hit.equip["시에나 (명중률 %)"] = hit.equip["시에나의 기운 (명중률 %)"];
        }
      }
      if (saved.ground) hit.ground = saved.ground;
    } catch { /* 깨진 저장값은 무시 */ }
  }

  // ── 렌더 ──
  const hitIcon = (buff) => buff.icon
    ? `<span class="buff-icon"><img src="${BUFF_ICON_BASE}${encodeImagePath(buff.icon)}" alt="" loading="lazy" decoding="async" /></span>`
    : `<span class="buff-icon is-text" aria-hidden="true">${escapeHtml(buff.name.slice(0, 1))}</span>`;

  // 같은 excl 그룹의 다른 항목이 켜져 있으면 잠근다 (택1)
  const isLockedBuff = (buff) => !!buff.excl && realBuffs()
    .some((other) => other.excl === buff.excl && other.key !== buff.key && hit.buffs[other.key] === true);

  // 버프 계산기와 같은 카드형 체크리스트. 체크 항목은 수치를 숨기고, 숫자 항목은 체크하면 입력 칸이 나온다
  function renderStats() {
    if (!els.stat) return;
    const r = { DEX: computeStat("DEX") };
    const cell = (buff) => {
      if (buff.spacer) return `<div class="buff-cell is-spacer" aria-hidden="true"></div>`;
      const saved = hit.buffs[buff.key];
      const isNum = buff.input === "num";
      const on = isNum ? !!(saved && typeof saved === "object" && saved.on) : !!saved;
      const locked = isLockedBuff(buff);
      return `<div class="buff-cell">
        <label class="buff-item${locked ? " is-locked" : ""}">
          <input type="checkbox" class="buff-check" data-hit-check="${buff.key}"${on ? " checked" : ""}${locked ? " disabled" : ""} />
          ${hitIcon(buff)}
          <span class="buff-name">${escapeHtml(buff.name)}</span>
        </label>
        ${isNum && on ? `
          <input class="buff-num" type="number" inputmode="numeric" min="${buff.min}" max="${buff.max}" step="1"
            placeholder="${buff.min}~${buff.max}" data-hit-num="${buff.key}" value="${escapeHtml(String(num(saved.value) || ""))}" />
          <span class="buff-unit">${buff.levels ? "LV" : buff.kind === "multB" ? "%" : ""}</span>` : ""}
      </div>`;
    };
    const groups = `<div class="buff-grid hit-grid">${HIT_BUFFS.map(cell).join("")}</div>`;

    els.stat.innerHTML = `
      <div class="hit-base-row">
        ${HIT_STATS.map((st) => `<label class="field ok-field"><span>기본 ${st}</span><input type="number" inputmode="numeric" min="0" step="1" placeholder="0" data-hit-base="${st}" value="${hit.base[st] || ""}" /></label>`).join("")}
      </div>
      ${groups}
      <div class="hit-stat-total">
        <div><span>기본 능력치</span>${HIT_STATS.map((st) => `<b>${st} <em data-hit-total="basic-${st}">${fmt(r[st].basic)}</em></b>`).join("")}</div>
        <div class="is-final"><span>최종 능력치</span>${HIT_STATS.map((st) => `<b>${st} <em data-hit-total="total-${st}">${fmt(r[st].total)}</em></b>`).join("")}</div>
      </div>
    `;
  }

  function renderEquip() {
    if (!els.equip) return;
    const types = resolveCalculatorTypes(hit.character);
    if (!types.includes(hit.type)) hit.type = types[0];
    const rows = equipRows();
    const loading = !records().length;
    els.equip.innerHTML = `
      <div class="hit-equip-head">
        <label class="field ok-field"><span>캐릭터</span>
          <select data-hit-character>${CHARACTER_NAMES.map((n) => `<option value="${escapeHtml(n)}"${n === hit.character ? " selected" : ""}>${escapeHtml(n)}</option>`).join("")}</select>
        </label>
        <label class="field ok-field"><span>계산 타입</span>
          <select data-hit-type>${types.map((t) => `<option value="${t}"${t === hit.type ? " selected" : ""}>${escapeHtml(CALC_TYPE_DISPLAY[t] || t)}</option>`).join("")}</select>
        </label>
      </div>
      ${loading ? `<p class="ok-note">장비 DB를 불러오는 중입니다…</p>` : ""}
      <table class="hit-table hit-equip-table" aria-label="장비 명중 보정">
        <thead><tr><th>부위</th><th>장비</th><th>명중</th></tr></thead>
        <tbody>
          ${rows.map((r) => r.manual ? `
            <tr class="is-manual">
              <td class="hit-name">${escapeHtml(r.slot)}</td>
              <td class="hit-manual-label">수동 입력</td>
              <td class="hit-cell"><input type="number" inputmode="${r.negative ? "text" : "numeric"}"${r.negative ? "" : ' min="0"'} step="1" placeholder="0" data-hit-manual="${escapeHtml(r.slot)}" value="${r.value || ""}" /></td>
            </tr>` : `
            <tr>
              <td class="hit-name">${escapeHtml(r.slot)}</td>
              <td><div class="equip-pick">${equipIconHtml(r.name)}<select data-hit-equip="${escapeHtml(r.slot)}">${r.candidates.map((c) => `<option value="${escapeHtml(c)}"${c === r.name ? " selected" : ""}>${escapeHtml(c)}</option>`).join("")}</select></div></td>
              <td class="hit-cell is-val" data-hit-slot-sum="${escapeHtml(r.slot)}">${r.name === "수동 입력" ? "-" : fmt(r.hit)}</td>
            </tr>`).join("")}
        </tbody>
        <tfoot>
          <tr class="hit-total is-sub"><th colspan="2">버프 명중 보정 <small>이자벨·특선 묘약·룬 (명중)</small></th><td data-hit-buff-bonus>${fmt(buffHitBonus())}</td></tr>
          <tr class="hit-total"><th colspan="2">명중 보정 합계</th><td data-hit-equip-total>${fmt(hitTotal())}</td></tr>
        </tfoot>
      </table>
    `;
  }

  // 사냥터 키: 그룹이 있으면 "그룹/이름" (같은 이름이 다른 그룹에 있을 수 있다)
  const groundKey = (g) => (g.group ? `${g.group}/${g.name}` : g.name);
  const groundRange = (g) => (g.min === g.max ? fmt(g.min) : `${fmt(g.min)}~${fmt(g.max)}`);
  const selectedGround = () => hit.grounds.find((g) => groundKey(g) === hit.ground) || null;

  function renderGrounds() {
    if (!els.ground) return;
    if (!hit.grounds.length) {
      els.ground.innerHTML = `<p class="ok-note">사냥터 목록이 아직 없습니다.</p>`;
      return;
    }
    // 리스트 박스. 그룹 순서는 파일 순서대로, 그룹 없는 항목은 "기타 사냥터"로 묶는다
    const groups = [];
    hit.grounds.forEach((g) => {
      const title = g.group || "기타 사냥터";
      let entry = groups.find((x) => x.title === title);
      if (!entry) { entry = { title, items: [] }; groups.push(entry); }
      entry.items.push(g);
    });
    const option = (g) => `<option value="${escapeHtml(groundKey(g))}"${groundKey(g) === hit.ground ? " selected" : ""}>${escapeHtml(g.name)} (${groundRange(g)})</option>`;
    els.ground.innerHTML = `
      <p class="hit-ground-note"><strong>주의 :</strong> 이 명중 조건은 대략적인 명중 조건이므로 캐릭터에 따라 실제와 다를 수 있습니다.</p>
      <label class="field ok-field hit-ground-field">
        <span>사냥터 (필요 명중)</span>
        <select data-hit-ground-select>
          <option value=""${hit.ground ? "" : " selected"}>선택</option>
          ${groups.map((grp) => `<optgroup label="${escapeHtml(grp.title)}">${grp.items.map(option).join("")}</optgroup>`).join("")}
        </select>
      </label>`;
  }

  function renderResult() {
    if (!els.result) return;
    const dex = computeStat("DEX");
    const ground = selectedGround();
    const mine = dex.total + hitTotal();
    let verdict = `<span>사냥터를 고르면 필요 명중과 비교합니다.</span>`;
    let cls = "";
    if (ground) {
      // 범위의 윗값 이상이면 확실히 명중, 아랫값 미만이면 부족, 사이면 경계
      const label = `${escapeHtml(ground.name)} 필요 ${groundRange(ground)}`;
      if (mine >= ground.max) {
        cls = "is-ok";
        verdict = `<strong>명중 가능</strong><span>${label} · 여유 ${fmt(mine - ground.max)}</span>`;
      } else if (mine >= ground.min) {
        cls = "is-edge";
        verdict = `<strong>경계</strong><span>${label} · 확실하려면 ${fmt(ground.max - mine)} 더 필요</span>`;
      } else {
        cls = "is-short";
        verdict = `<strong>명중 부족</strong><span>${label} · ${fmt(ground.min - mine)}${ground.min === ground.max ? "" : `~${fmt(ground.max - mine)}`} 부족</span>`;
      }
    }
    els.result.innerHTML = `
      <div class="hit-result-grid">
        <div><span>최종 DEX</span><strong>${fmt(dex.total)}</strong></div>
        <div><span>명중 보정 합계</span><strong>${fmt(hitTotal())}</strong></div>
        <div class="is-sum"><span>최종 DEX + 명중 보정 합계</span><strong>${fmt(mine)}</strong></div>
      </div>
      <div class="ok-verdict hit-verdict ${cls}">${verdict}</div>
    `;
  }

  function renderAll() {
    renderStats();
    renderEquip();
    renderGrounds();
    renderResult();
  }

  async function loadGrounds() {
    try {
      const data = await fetchJson(HIT_GROUNDS_URL);
      hit.grounds = Array.isArray(data?.grounds)
        ? data.grounds.filter((g) => g && g.name).map((g) => ({
            group: String(g.group || ""), name: String(g.name),
            min: num(g.min), max: num(g.max) || num(g.min),
          }))
        : [];
    } catch (error) {
      console.info("사냥터 목록을 불러오지 못했습니다.", error);
      hit.grounds = [];
    }
  }

  async function load() {
    if (hit.loaded) return;
    hit.loaded = true;
    els.stat = q("#hitStatArea");
    els.equip = q("#hitEquipArea");
    els.ground = q("#hitGroundArea");
    els.result = q("#hitResultArea");
    restore();
    renderAll();
    await loadGrounds();
    renderGrounds();
    renderResult();
  }

  // 장비 DB가 늦게 도착했을 때 (부팅 중 시트 로딩이 끝나면 불린다)
  function refreshEquipment() {
    if (!hit.loaded) return;
    renderEquip();
    renderResult();
  }

  function wire() {
    const panel = q('[data-extra-panel="hit"]');
    if (!panel) return;

    // 입력값은 상태에 넣고, 바뀐 영역만 다시 그린다. 숫자 칸은 포커스를 잃지 않게 표 전체를 다시 그리지 않는다
    panel.addEventListener("input", (event) => {
      const t = event.target;
      if (t.dataset.hitBase) { hit.base[t.dataset.hitBase] = num(t.value); }
      else if (t.dataset.hitNum) {
        hit.buffs[t.dataset.hitNum] = { on: true, value: num(t.value) };
      } else if (t.dataset.hitManual != null) {
        hit.equip[t.dataset.hitManual] = { value: num(t.value) };
      } else return;
      save();
      refreshTotals();
    });

    panel.addEventListener("change", (event) => {
      const t = event.target;
      if (t.dataset.hitCheck) {
        const buff = findBuff(t.dataset.hitCheck);
        // 숫자 항목은 체크 상태와 값을 같이 들고 있는다 (체크를 꺼도 값은 남겨 다시 켤 때 그대로)
        hit.buffs[t.dataset.hitCheck] = buff?.input === "num"
          ? { on: t.checked, value: num(hit.buffs[t.dataset.hitCheck]?.value) || num(buff.def) }
          : t.checked;
        if (t.checked && buff?.excl) {
          realBuffs().forEach((other) => {
            if (other.excl !== buff.excl || other.key === buff.key) return;
            hit.buffs[other.key] = other.input === "num" ? { on: false, value: num(hit.buffs[other.key]?.value) } : false;
          });
        }
        save(); renderStats(); renderEquip(); renderResult();
      }
      else if (t.dataset.hitCharacter != null) { hit.character = t.value; hit.type = ""; hit.equip = {}; save(); renderEquip(); renderResult(); }
      else if (t.dataset.hitType != null) { hit.type = t.value; hit.equip = {}; save(); renderEquip(); renderResult(); }
      else if (t.dataset.hitEquip != null) {
        hit.equip[t.dataset.hitEquip] = { ...(hit.equip[t.dataset.hitEquip] || {}), name: t.value };
        save(); renderEquip(); renderResult();
      }
    });

    panel.addEventListener("change", (event) => {
      const select = event.target.closest("[data-hit-ground-select]");
      if (!select) return;
      hit.ground = select.value;
      save();
      renderResult();
    });
  }

  // 숫자 입력 중에는 합계 칸만 갱신한다 (표를 다시 그리면 커서가 빠진다)
  function refreshTotals() {
    const r = { DEX: computeStat("DEX") };
    HIT_STATS.forEach((st) => {
      const basic = els.stat?.querySelector(`[data-hit-total="basic-${st}"]`);
      const total = els.stat?.querySelector(`[data-hit-total="total-${st}"]`);
      if (basic) basic.textContent = fmt(r[st].basic);
      if (total) total.textContent = fmt(r[st].total);
    });
    const total = els.equip?.querySelector("[data-hit-equip-total]");
    if (total) total.textContent = fmt(hitTotal());
    const bonus = els.equip?.querySelector("[data-hit-buff-bonus]");
    if (bonus) bonus.textContent = fmt(buffHitBonus());
    renderResult();
  }

  return { load, wire, refreshEquipment };
})();

// ══════════════════════════════════════════════════════════════
//  TWChatOverlay 탭 — GitHub README + 최신 릴리스 다운로드
// ══════════════════════════════════════════════════════════════

const OVERLAY_REPO = "TWHome-Git/TWChatOverlay";
const OVERLAY_REPO_URL = `https://github.com/${OVERLAY_REPO}`;
const OVERLAY_RAW_BASE = `https://raw.githubusercontent.com/${OVERLAY_REPO}/HEAD/`;
const OVERLAY_README_API = `https://api.github.com/repos/${OVERLAY_REPO}/readme`;
const OVERLAY_RELEASE_API = `https://api.github.com/repos/${OVERLAY_REPO}/releases/latest`;

// "idle"일 때만 요청한다. 실패하면 다시 "idle"로 되돌려서 탭을 다시 눌렀을 때 재시도되게 한다.
const overlay = { readme: "idle", release: "idle" };

function loadOverlayTab() {
  if (overlay.readme === "idle") loadOverlayReadme();
  if (overlay.release === "idle") loadOverlayRelease();
}

// 릴리스 하나를 읽어 버튼에 첨부 파일 링크와 버전 정보를 채운다
async function fillOverlayRelease(apiUrl, link, metaEl, fallbackHref, fallbackText, { withSize = true } = {}) {
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
    if (withSize && asset?.size) meta.push(formatOverlaySize(asset.size));
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

  const loaded = await fillOverlayRelease(
    OVERLAY_RELEASE_API,
    els.overlayDownload,
    els.overlayReleaseMeta,
    `${OVERLAY_REPO_URL}/releases/latest`,
    "Latest Release"
  );

  // 실패하면 탭을 다시 눌렀을 때 재시도한다
  overlay.release = loaded ? "loaded" : "idle";
}

// ── 홈 ──
// 첫 화면. 메뉴 카드는 index.html에 적혀 있고, 여기서는 위쪽 요약 숫자만 채운다.
// 인구 요약은 인구 통계 탭과 같은 집계 파일(37KB)을 쓰고, 오버레이 버전은 릴리스 API를 쓴다.
const home = { stats: "idle", release: "idle", visits: "idle", lastUpdate: null }; // lastUpdate: 넥슨 랭킹 Last Update "yyyy-MM-dd HH:mm:ss"

function loadHomeTab() {
  boardLoadList(false);   // 홈에도 글 목록을 보여준다
  if (home.stats === "idle") loadHomeStats();
  if (home.release === "idle") loadHomeRelease();
  if (home.visits === "idle") loadHomeVisits();
}

// 오늘·누적 방문자를 히어로 아래 한 줄로 보여준다. 수치는 "/" 경로의 방문(세션) 수 = 사람 수에 가깝다.
// 1순위: Apps Script 프록시 — GoatCounter 인증 API로 KST 자정 기준 "오늘"을 구한다.
//        (공개 counter API는 날짜를 UTC 자정으로만 끊을 수 있어 KST 자정을 표현 못 함)
// 2순위(프록시 장애 시): 공개 counter API — 하루 경계가 KST 09시로 밀리고 최대 4시간 캐시된 근사값.
// 둘 다 실패하면 그 줄을 숨긴 채로 둔다 (사이트 동작에는 영향 없음).
const VISITS_PROXY_URL = "https://script.google.com/macros/s/AKfycbz5K3J47MMwwaJpj1YqAAg5EDOR2wOWjv9h_-oCxhDT3CjmHNmaH3yEkD1rjVsC2onbyA/exec";
// 공개 카운터는 "/" 경로(사람 수)만 본다. TOTAL은 탭 이벤트까지 합친 값이라 쓰지 않는다
const VISITS_COUNTER_URL = "https://holedis88.goatcounter.com/counter//.json";

const VISITS_CACHE_KEY = "tw-visits-cache-v1";

async function loadHomeVisits() {
  const el = document.querySelector("#homeVisits");
  if (!el) return;
  home.visits = "loading";
  const num = (v) => Number(String(v ?? "").replace(/\D/g, ""));  // "7 219" 같은 표기를 숫자로
  const fetchJson = (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
  const kstDate = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const render = (today, total) => {
    const fmt = (v) => (typeof v === "number" ? v.toLocaleString("ko-KR") : v);
    el.innerHTML = `오늘 방문 <strong>${fmt(today)}</strong><span class="home-visits-sep">·</span>누적 방문 <strong>${fmt(total)}</strong>`;
    el.hidden = false;
  };
  const done = (today, total) => {
    render(today, total);
    etaWriteCache(VISITS_CACHE_KEY, { date: kstDate(), today, total });
    home.visits = "ready";
  };

  // 값이 오기까지 1~2초 걸려 그동안 줄이 비어 보인다. 지난번 값을 먼저 보여주고 뒤에서 갱신한다.
  // 오늘 수치는 같은 날(KST)일 때만 재사용하고, 날이 바뀌었으면 "-"로 둔다
  const cached = etaReadCache(VISITS_CACHE_KEY);
  if (cached && typeof cached.total === "number") {
    render(cached.date === kstDate() && typeof cached.today === "number" ? cached.today : "-", cached.total);
  }

  // 프록시는 가끔 JSON 대신 구글 임시 오류 페이지(HTML)를 돌려준다. 한 번 더 시도한다
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const p = await fetchJson(VISITS_PROXY_URL);
      if (p.today == null || p.error) throw new Error(p.error || "proxy empty");
      done(num(p.today), num(p.total));
      return;
    } catch (error) {
      console.info(`방문자 프록시 실패 (${attempt}/2)`, error);
    }
  }
  try {
    const d = new Date();
    const today = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const [total, day] = await Promise.all([
      fetchJson(VISITS_COUNTER_URL),
      fetchJson(`${VISITS_COUNTER_URL}?start=${today}`),
    ]);
    done(num(day.count ?? day.count_unique), num(total.count ?? total.count_unique));
  } catch (error) {
    console.info("방문자 수를 불러오지 못했습니다.", error);
    home.visits = cached ? "ready" : "error";
  }
}

// 집계 파일에서 한 날짜·한 서버의 전체 인원 (캐릭터·레벨 구간 합)
function popTotalOf(date, server) {
  const byCode = etaPop.days?.[date]?.[server];
  if (!byCode) return null;
  let total = 0;
  Object.values(byCode).forEach((bands) => {
    (bands || []).forEach((n) => { total += Number(n) || 0; });
  });
  return total;
}

// 넥슨 랭킹의 Last Update 시각. 실패해도 홈 카드는 날짜만으로 그린다.
let etaMetaPromise = null;
function loadEtaMeta() {
  if (!etaMetaPromise) {
    etaMetaPromise = fetch(ETA_META_URL, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((meta) => {
        home.lastUpdate = clean(meta?.LastUpdate || "") || null;
      })
      .catch((error) => {
        console.warn("에타 갱신 시각 로딩 실패", error);
      });
  }
  return etaMetaPromise;
}

async function loadHomeStats() {
  home.stats = "loading";
  try {
    await Promise.all([loadEtaPopulation(), loadEtaMeta()]);
    renderHomeStats();
    home.stats = etaPop.days ? "loaded" : "idle";
  } catch (error) {
    console.warn("홈 요약 로딩 실패", error);
    home.stats = "idle";
  }
}

function renderHomeStats() {
  if (!els.homeStats) return;
  const dates = Object.keys(etaPop.days || {}).sort();
  if (!dates.length) {
    els.homeStats.innerHTML = `<div class="home-stat"><span>에타 전체 인구</span><strong>-</strong><small>데이터 없음</small></div>`;
    return;
  }

  const latest = dates[dates.length - 1];
  // 서버별로 "그 서버가 있는 마지막 날짜"를 쓴다. 수집이 하루 빠진 서버가 0명으로 보이지 않게
  const servers = popServerNames();
  const cards = [];

  const deltaHtml = (now, before, label) => {
    if (now == null || before == null) return `<small>${escapeHtml(label)} 비교 불가</small>`;
    const diff = now - before;
    const cls = diff > 0 ? "up" : diff < 0 ? "down" : "same";
    const sign = diff > 0 ? "▲" : diff < 0 ? "▼" : "";
    return `<small class="home-delta ${cls}">${sign}${formatNumber(Math.abs(diff))} <em>${escapeHtml(label)}</em></small>`;
  };

  // 통합: 모든 서버가 있는 마지막 날짜 기준
  const allDates = dates.filter((d) => servers.every((s) => popTotalOf(d, s) != null));
  if (servers.length > 1 && allDates.length) {
    const d0 = allDates[allDates.length - 1];
    const d1 = allDates[allDates.length - 2];
    const sum = (d) => servers.reduce((acc, s) => acc + (popTotalOf(d, s) || 0), 0);
    cards.push(`<div class="home-stat"><span>에타 전체 인구</span><strong>${formatNumber(sum(d0))}</strong>${deltaHtml(sum(d0), d1 ? sum(d1) : null, "어제 대비")}</div>`);
  }

  // 카드 순서: 전체 인구 / 순위 갱신일 / 하이아칸 / 네냐플 (2×2 격자에서 윗줄이 요약, 아랫줄이 서버별)
  // 넥슨 랭킹 갱신 시각이 있으면 그 날짜·시각을, 없으면 집계 마지막 날짜만 보여준다
  const lastUpdate = home.lastUpdate || "";
  const updateDate = lastUpdate.slice(0, 10) || latest;
  const updateTime = lastUpdate.slice(11, 16);
  cards.push(`<div class="home-stat home-stat-date"><span>순위 갱신일</span><strong>${escapeHtml(updateDate)}</strong><small>${updateTime ? `${escapeHtml(updateTime)} 갱신` : "매일 오전 갱신"}</small></div>`);

  servers.forEach((server) => {
    const own = dates.filter((d) => popTotalOf(d, server) != null);
    if (!own.length) return;
    const d0 = own[own.length - 1];
    const d1 = own[own.length - 2];
    const weekIdx = own.length - 8;
    const dw = weekIdx >= 0 ? own[weekIdx] : null;
    const now = popTotalOf(d0, server);
    cards.push(`<div class="home-stat"><span>${escapeHtml(server)}</span><strong>${formatNumber(now)}</strong>${deltaHtml(now, d1 ? popTotalOf(d1, server) : null, "어제 대비")}${dw ? deltaHtml(now, popTotalOf(dw, server), "1주 대비") : ""}</div>`);
  });

  els.homeStats.innerHTML = cards.join("");
}

async function loadHomeRelease() {
  if (!els.homeOverlayDownload || !els.homeOverlayMeta) return;
  home.release = "loading";
  const loaded = await fillOverlayRelease(
    OVERLAY_RELEASE_API,
    els.homeOverlayDownload,
    els.homeOverlayMeta,
    `${OVERLAY_REPO_URL}/releases/latest`,
    "Latest Release",
    { withSize: false } // 홈에서는 버전과 날짜만. 용량까지 붙이면 너무 길다
  );
  home.release = loaded ? "loaded" : "idle";
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
// 계산기(계수·필요 명중)에서 고른 장비의 아이콘. 장비 DB 목록과 같은 이미지를 작게 보여준다.
// 수동 입력이거나 이미지가 없으면 빈 자리만 남겨 줄이 흔들리지 않게 한다
function equipIconHtml(name) {
  const record = name && name !== "수동 입력" ? state.records.find((r) => r.name === name) : null;
  const img = record?.imageFile
    ? `<img src="${IMAGE_BASE}${encodeURIComponent(record.imageFile)}" alt="" loading="lazy" decoding="async" />`
    : "";
  return `<span class="equip-pick-icon${img ? "" : " is-empty"}">${img}</span>`;
}

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
    // 고른 장비의 아이콘을 셀렉트 앞에 붙인다 (바꾸면 renderCalculator가 다시 그린다)
    const pick = document.createElement("div");
    pick.className = "equip-pick";
    pick.innerHTML = equipIconHtml(row.selectedEquipment);
    pick.appendChild(select);
    tr.appendChild(cellWith(pick, null, "아이템"));

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
      const key = button.dataset.mainTab;
      activateMainTab(key);
      // 상단 탭을 누르면 그 탭의 기본 페이지부터 보여준다 (직전에 보던 화면으로 바로 들어가지 않는다)
      const sub = ROUTE_SUB[key];
      if (sub) sub.open(ROUTE_DEFAULT_SUB[key] || "home");
      else routeWrite();
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
    avatar.shown = 0; // 조건이 바뀌었으니 앞쪽부터 다시 그린다
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
      avatar.shown = 0;
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

  // 목록은 제 스크롤 칸 안에서, 갤러리는 페이지째 스크롤된다
  els.avatarListWrap?.addEventListener("scroll", () => {
    const wrap = els.avatarListWrap;
    if (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 400) avatarShowMore();
  }, { passive: true });

  addEventListener("scroll", () => {
    if (avatar.viewMode !== "gallery") return;
    const gallery = els.avatarGallery;
    if (!gallery || gallery.hidden || !gallery.offsetParent) return; // 다른 탭을 보는 중
    if (innerHeight + scrollY >= document.body.offsetHeight - 400) avatarShowMore();
  }, { passive: true });

  els.avatarViewTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-avatar-view]");
    if (button) setAvatarViewMode(button.dataset.avatarView);
  });

  // 갤러리 카드도 표의 줄과 같게 눌러 상세로 들어간다
  els.avatarGallery?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-index]");
    if (!card) return;
    avatar.detailIndex = Number(card.dataset.index);
    avatar.view = "detail";
    renderAvatar();
    routeWrite();
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

  document.querySelectorAll("[data-dmg-step-tab]").forEach((button) => {
    button.addEventListener("click", () => activateDamageStep(button.dataset.dmgStepTab));
  });

  els.infoTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateInfoTab(button.dataset.infoTab);
    });
  });

  els.buffTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateBuffTab(button.dataset.buffTab);
    });
  });

  expBuff.wire();
  seedCalc.wire();
  oneKillCalc.wire();
  hitCalc.wire();
  rareBuff.wire();

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
    state.shown = 0; // 조건이 바뀌었으니 앞쪽부터 다시 그린다
    populateTypeSelect();
    applyFilters();
  });

  els.typeSelect.addEventListener("change", () => {
    state.type = els.typeSelect.value;
    state.page = 0;
    state.view = "list";
    state.listScroll = 0;
    state.shown = 0; // 조건이 바뀌었으니 앞쪽부터 다시 그린다
    applyFilters();
  });

  els.searchInput.addEventListener("input", () => {
    state.query = els.searchInput.value.trim().toLowerCase();
    state.page = 0;
    state.view = "list";
    state.listScroll = 0;
    state.shown = 0; // 조건이 바뀌었으니 앞쪽부터 다시 그린다
    applyFilters();
  });

  els.equipListWrap?.addEventListener("scroll", () => {
    const wrap = els.equipListWrap;
    if (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 400) equipShowMore();
  }, { passive: true });

  // 200행이면 1만 픽셀이 넘어 어떤 화면에서도 스크롤이 생긴다.
  // 바닥 300px 전부터 미리 채워 끊김을 줄인다.
  els.etaListWrap?.addEventListener("scroll", () => {
    const wrap = els.etaListWrap;
    if (wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 300) etaShowMore();
  }, { passive: true });

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
  wireEtaPopulation();

  els.etaCompareSelect?.addEventListener("change", () => {
    eta.compareDays = Number(els.etaCompareSelect.value) || 1;
    loadEtaPreviousRankings(etaLoadSeq);
  });

  els.etaNewDateSelect?.addEventListener("change", () => {
    etaNew.date = els.etaNewDateSelect.value;
    etaNew.highlight = "";
    loadEtaNewcomerData();
  });

  // 기록 검색 결과의 날짜를 누르면 기준 날짜를 그 날로 바꾸고 해당 아이디를 강조한다
  els.etaMoveResult?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-eta-move-date]");
    if (!button) return;
    etaNew.date = button.dataset.etaMoveDate;
    etaNew.highlight = button.dataset.etaMoveUser || "";
    etaNew.scrollTo = true;
    if (els.etaNewDateSelect) els.etaNewDateSelect.value = etaNew.date;
    els.etaMoveResult.querySelectorAll(".eta-move-jump.is-active").forEach((el) => el.classList.remove("is-active"));
    button.classList.add("is-active");
    loadEtaNewcomerData();
  });

  // 기록 파일은 검색을 처음 걸 때만 받는다. 탭만 열어 보는 사람에게는 안 받는다
  let etaMoveTimer = null;
  els.etaMoveSearch?.addEventListener("input", () => {
    clearTimeout(etaMoveTimer);
    etaMoveTimer = setTimeout(async () => {
      etaMoves.query = els.etaMoveSearch.value.trim();
      if (etaMoves.query && !etaMoves.data) {
        renderEtaMoveSearch(); // 불러오는 중이라고 먼저 알린다
        await loadEtaMoves();
        if (etaMoves.query !== els.etaMoveSearch.value.trim()) return;
      }
      renderEtaMoveSearch();
    }, 250);
  });

  els.etaRankingHead?.addEventListener("click", (event) => {
    const head = event.target.closest("[data-eta-sort]");
    if (!head || head.dataset.etaSort === eta.sort) return;
    eta.sort = head.dataset.etaSort;
    etaResetScroll();
    renderEtaRanking();
  });

  els.etaNewServerTabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-eta-server]");
    if (!button || button.dataset.etaServer === eta.server) return;
    eta.server = button.dataset.etaServer;
    eta.category = "전체";
    renderEtaServerTabs();
    renderEtaSidebar();
    renderEtaRanking();
    renderEtaNewcomers();
    renderEtaMoveSearch(); // 기록도 서버별로 나뉜다
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
    renderEtaNewcomers();
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

// 재료 칩에서 넘어올 때 쓴다. 지금 걸린 필터에 그 장비가 없으면 필터를 풀고 찾아간다.
function openEquipmentById(id) {
  if (!id) return;

  let index = state.filtered.findIndex((record) => record.id === id);
  if (index < 0) {
    if (!state.records.some((record) => record.id === id)) return;
    state.category = "all";
    state.type = "all";
    state.query = "";
    els.searchInput.value = "";
    populateCategorySelect(); // 분류 목록도 카테고리를 따라가야 한다
    applyFilters();
    index = state.filtered.findIndex((record) => record.id === id);
    if (index < 0) return;
  }

  state.compareId = ""; // 분류가 달라지면 이전 비교 대상은 의미가 없다
  openEquipmentDetail(index);
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
      // 장비 정보 + 착용 조건 + 스탯 9종
      STAT_NAMES.length + 2,
      state.records.length > 0,
      "검색 결과가 없습니다",
      "조건을 조금 넓혀보세요.",
    );
    return;
  }

  // 한 행에 스탯 칸이 아홉이라 행당 노드가 서른을 넘는다. 344행을 한 번에 그리면
   // 0.2초쯤 멈추므로 앞쪽만 그리고 스크롤이 바닥에 닿을 때 이어 붙인다
  state.shown = Math.min(state.filtered.length, Math.max(EQUIP_CHUNK, state.shown));
  els.equipmentListBody.innerHTML = equipRowsHtml(state.filtered.slice(0, state.shown), 0);

  if (els.equipListWrap) els.equipListWrap.scrollTop = state.listScroll;
}

const EQUIP_CHUNK = 100;

function equipShowMore() {
  if (state.view !== "list" || state.shown >= state.filtered.length) return;
  const from = state.shown;
  const next = state.filtered.slice(from, from + EQUIP_CHUNK);
  state.shown += next.length;
  els.equipmentListBody.insertAdjacentHTML("beforeend", equipRowsHtml(next, from));
}

// data-index는 state.filtered의 자리다. 이어 붙일 때 0부터 다시 매기면
// 행을 눌렀을 때 엉뚱한 장비가 열린다
function equipRowsHtml(records, offset) {
  return records.map((record, i) => {
    const index = offset + i;
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
        ${listWearCellHtml(record)}
        ${statCells}
      </tr>
    `;
  }).join("");
}

// 시트에는 숫자만 들어 있다. 정렬·필터 여지를 남기려고 그대로 두고, 레벨이라는 건
// 화면에서 붙여 알린다. 이미 "Lv 300"처럼 적힌 시트도 있어 그때는 손대지 않는다.
function formatWearLevel(value) {
  const text = clean(value);
  return /^\d+$/.test(text) ? `Lv ${text}` : text;
}

// 착용 조건 칸. 시트에 아직 안 채운 장비가 많아 값이 있는 것만 줄로 쌓는다.
function listWearCellHtml(record) {
  const lines = [formatWearLevel(record.wearLevel), record.wearStat].filter(Boolean);
  if (!lines.length) return `<td class="equip-wear is-zero">-</td>`;
  return `<td class="equip-wear">${lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("")}</td>`;
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

// 상세 카드 히어로 오른쪽 빈 자리에 붙는 착용 조건.
// 아직 안 채운 장비가 많아 값이 없으면 칸 자체를 만들지 않는다.
function cardWearHtml(record) {
  const lines = [formatWearLevel(record.wearLevel), record.wearStat].filter(Boolean);
  if (!lines.length) return "";
  return `
      <div class="item-wear">
        <span class="item-wear-label">착용 조건</span>
        ${lines.map((line) => `<strong>${escapeHtml(line)}</strong>`).join("")}
      </div>`;
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
      ${cardWearHtml(record)}
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
  els.equipmentCard.querySelectorAll("[data-material-target]").forEach((chip) => {
    chip.addEventListener("click", () => openEquipmentById(chip.dataset.materialTarget));
  });
}

// 재료 이름이 장비 이름과 같으면(이전 단계 무기·방어구·아티팩트) 그 장비 레코드를 돌려준다
function equipmentByMaterialName(material) {
  const key = routeNameKey(stripTrailingQuantity(clean(material)));
  if (!key) return null;
  return state.records.find((record) => routeNameKey(record.name) === key) || null;
}

function materialChipHtml(item) {
  const urls = materialImageUrls(item);
  const [src, ...fallbacks] = urls;
  const image = src
    ? `<img class="material-icon" src="${src}" alt="" loading="lazy" decoding="async" data-fallbacks="${escapeHtml(JSON.stringify(fallbacks))}" />`
    : "";
  const inner = `${image}<span>${escapeHtml(item)}</span>`;
  const target = equipmentByMaterialName(item);

  // 재료가 곧 다른 장비면 눌러서 그 장비 정보로 넘어갈 수 있게 한다
  if (target) {
    return `
      <button class="material-chip is-equipment" type="button" data-material-target="${escapeHtml(target.id)}" title="${escapeHtml(target.name)} 정보 보기">
        ${inner}
      </button>
    `;
  }

  return `
    <b class="material-chip">
      ${inner}
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

// 합계 상한 (넘어가도 이 값으로 고정)
const DMG_SERIES_CAP = 73;
const DMG_FINAL_CAP = 45;

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
  const core = Math.min(20, Math.max(0, dmgV("dmgCoreSet")));
  const etaFinal = Math.min(5, dmgSel("dmgEtaFinal")) * 4;
  const corridor = Math.min(5, dmgSel("dmgCorridorFinal"));
  return Math.min(DMG_FINAL_CAP, club + core + etaFinal + corridor + dmgV("dmgFinalEtc"));
}
function dmgSpecialFactor() {
  const r = Math.min(50, Math.max(0, dmgV("dmgSpecialReduction")));
  return 1 - r / 100;
}
function dmgSeriesPercent() {
  const art = DMG_SERIES_ARTIFACT[dmgSel("dmgSeriesArtifact")] ?? 15;
  const wrist = DMG_SERIES_WRIST[dmgSel("dmgSeriesWrist")] ?? 25;
  const lunaria = dmgSel("dmgSeriesLunaria"); // 0~10 콤보 (index=값)
  return Math.min(DMG_SERIES_CAP, art + wrist + lunaria);
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
  dmgFillSelect("dmgCorridorFinal", Array.from({ length: 6 }, (_, i) => `LV${i} - ${i}%`));
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
  dmgEls.dmgSeriesSum.textContent = `${dmgSeriesPercent()}% / ${DMG_SERIES_CAP}%`;
  dmgEls.dmgAddDmgSum.textContent = `${dmgAdditionalDamagePercent()}%`;
  dmgEls.dmgFinalSum.textContent = `${dmgFinalPercent()}% / ${DMG_FINAL_CAP}%`;
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

  // min/max가 붙은 숫자 칸은 범위를 벗어나면 값 자체를 잘라낸다.
  // dmgRefresh/dmgSaveState보다 먼저 등록해야 잘라낸 값이 계산·저장에 쓰인다.
  const clampRange = (event) => {
    const el = event.target;
    if (!(el instanceof HTMLInputElement) || el.type !== "number") return;
    if (el.value === "" || el.value === "-") return;
    const n = Number(el.value);
    if (!Number.isFinite(n)) return;
    const min = el.min === "" ? -Infinity : Number(el.min);
    const max = el.max === "" ? Infinity : Number(el.max);
    const clamped = Math.min(max, Math.max(min, n));
    if (clamped !== n) el.value = String(clamped);
  };
  panel.addEventListener("input", clampRange);
  panel.addEventListener("change", clampRange);

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
// ── 시뮬레이션 공용 ────────────────────────────────────────────
// 기대값은 평균만 알려 준다. 실제로 몇 번 만에 붙는지는 사람마다 다르므로
// 확률을 그대로 굴려 한 판을 보여준다.
//
// 아주 낮은 확률에서는 한 판이 수백만 번까지 갈 수 있어 상한을 둔다.
// 상한에 닿으면 화면에 그렇게 적는다.
const SIM_ATTEMPT_CAP = 20000000;

// 성공할 때까지의 시도 횟수 (기하분포)
function simDrawAttempts(rate) {
  if (rate >= 1) return 1;
  let n = 1;
  while (Math.random() >= rate) {
    n += 1;
    if (n >= SIM_ATTEMPT_CAP) return n;
  }
  return n;
}

// 성공을 successes번 채울 때까지의 시도 횟수 (음이항분포)
function simDrawUntil(successes, rate) {
  if (rate >= 1) return successes;
  let n = 0;
  for (let hit = 0; hit < successes; ) {
    n += 1;
    if (Math.random() < rate) hit += 1;
    if (n >= SIM_ATTEMPT_CAP) break;
  }
  return n;
}

// 한 판이 기대값에서 얼마나 벌어졌는지 재료 옆에 붙인다.
// 더 썼으면 붉게, 덜 썼으면 초록으로 적어 한눈에 좋고 나쁨이 보이게 한다.
function simDelta(sampled, expected, unit = "") {
  const gap = Math.round(sampled) - Math.round(expected);
  if (!gap) return "";
  const dir = gap > 0 ? "up" : "down";
  return `<b class="sim-delta ${dir}">${gap > 0 ? "+" : "−"}${formatNumber(Math.abs(gap))}${unit}</b>`;
}

function simCapped(total) {
  return total >= SIM_ATTEMPT_CAP;
}

// ── 운 백분위 ────────────────────────────────────────────────
// 기대값과의 차이만 보면 이번 판이 흔한 편인지 드문 편인지 알 수 없다.
// 시도 횟수의 분포(기하/음이항의 합)는 오른쪽으로 크게 치우쳐 정규 근사가 맞지 않으므로
// 같은 조건을 여러 판 굴려 보고(몬테카를로) 나보다 적게 굴린 판의 비율을 센다.
// 굴림이 많은 조건에서는 판수를 줄여 화면이 멈추지 않게 한다.
const SIM_LUCK_DRAW_BUDGET = 3000000;

// 몬테카를로용 기하분포. 한 판을 보여주는 simDrawAttempts와 달리 역함수로 한 번에 뽑는다
function simLuckDraw(rate) {
  if (rate >= 1) return 1;
  const n = Math.ceil(Math.log(1 - Math.random()) / Math.log(1 - rate));
  return Math.min(SIM_ATTEMPT_CAP, Math.max(1, n));
}

// 굴려 둔 판들(samples) 가운데 내 결과(actual)가 몇 등인지. 값이 작을수록 운이 좋은 지표여야 한다
function simLuckFromSamples(samples, actual) {
  if (!samples || samples.length < 50 || !(actual > 0)) return null;
  let luckier = 0, same = 0, sum = 0, sumSq = 0;
  for (const value of samples) {
    sum += value;
    sumSq += value * value;
    if (value < actual) luckier += 1;
    else if (value === actual) same += 1;
  }
  const mean = sum / samples.length;
  const sd = Math.sqrt(Math.max(0, sumSq / samples.length - mean * mean));
  if (!(sd > 0)) return null;
  // 상위 % = 나보다 운이 좋았던 판의 비율. 동률은 절반만 센다
  const top = Math.min(99.99, Math.max(0.01, ((luckier + same / 2) / samples.length) * 100));
  // 막대 위 ◆ 위치는 순위(상위 %)를 종 모양의 같은 넓이 지점으로 옮겨 찍는다.
  // 평균과의 차이/표준편차로 찍으면 치우친 분포(시도 횟수)에서 상위 9%가 가운데 가까이 찍혀 글과 어긋난다
  return { top, z: -simProbit(top / 100), rank: simLuckRank(top), trials: samples.length };
}

// 표준정규분포의 역함수(누적확률 p → z). Acklam 근사, 오차 1e-9 수준
function simProbit(p) {
  const q = Math.min(1 - 1e-9, Math.max(1e-9, p));
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (q < lo) {
    const r = Math.sqrt(-2 * Math.log(q));
    return (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1);
  }
  if (q > 1 - lo) return -simProbit(1 - q);
  const r = q - 0.5;
  const t = r * r;
  return (((((a[0] * t + a[1]) * t + a[2]) * t + a[3]) * t + a[4]) * t + a[5]) * r / (((((b[0] * t + b[1]) * t + b[2]) * t + b[3]) * t + b[4]) * t + 1);
}

// steps: [{ rate, successes }] (successes 없으면 1회 성공). actual: 이번 판에 실제로 굴린 총 시도
function simLuckStats(steps, actual) {
  const plan = steps.filter((step) => step.rate > 0 && step.rate < 1);
  if (!plan.length || !(actual > 0)) return null;
  const perTrial = plan.reduce((n, step) => n + (step.successes || 1), 0);
  const trials = Math.max(800, Math.min(6000, Math.round(SIM_LUCK_DRAW_BUDGET / Math.max(1, perTrial))));
  const samples = [];
  for (let t = 0; t < trials; t += 1) {
    let total = 0;
    for (const step of plan) {
      const need = step.successes || 1;
      for (let k = 0; k < need; k += 1) total += simLuckDraw(step.rate);
    }
    samples.push(total);
  }
  return simLuckFromSamples(samples, actual);
}

// 정규분포 모양 막대에 내 위치를 ◆로 찍는다
function simLuckGraph(z) {
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

// 순위는 10,000명 기준으로 센다. 100명 기준이면 상위 97.7%와 99%가 같은 "98~99등"으로 뭉개진다
const SIM_LUCK_PEOPLE = 10000;
const simLuckRank = (top) => Math.max(1, Math.min(SIM_LUCK_PEOPLE, Math.round((top / 100) * SIM_LUCK_PEOPLE)));
const simLuckText = (rank, top, strong = "b") =>
  `운 순위: ${SIM_LUCK_PEOPLE.toLocaleString("ko-KR")}명 중 <${strong === "b" ? "b" : 'span class="sim-status-strong"'}>${rank.toLocaleString("ko-KR")}등</${strong === "b" ? "b" : "span"}> (상위 ${top.toFixed(2)}%)`;

// 결과 요약 맨 아래에 붙이는 운 표기
function simLuckRow(stats) {
  if (!stats) return "";
  return `<div class="sim-luck" title="같은 조건으로 ${stats.trials.toLocaleString("ko-KR")}판을 굴려 견준 순위입니다">`
    + `<div>${simLuckText(stats.rank, stats.top)}</div>`
    + `<div class="sim-luck-bar">`
    + `<div class="sim-graph-legend"><span>운 좋음</span><span>평균</span><span>운 나쁨</span></div>`
    + `<div class="sim-graph">${simLuckGraph(stats.z)}</div>`
    + `</div></div>`;
}

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
    "coreBoxPrice", "coreBoxPriceField", "coreCalc", "coreSim", "coreSummary", "coreTable", "coreElso", "coreDiscount",
    "relicCurrent", "relicTarget", "relicDifficulty", "relicCalc", "relicSim", "relicSummary", "relicTable",
    "enhStart", "enhTarget", "enhCalc", "enhSim", "enhSummary", "enhTable",
    "sienaStart", "sienaTarget", "sienaCalc", "sienaSim", "sienaSummary", "sienaTable",
    "auraBoard", "auraRoll", "auraAuto", "auraReset", "auraCost", "auraLog", "auraTargets", "auraTargetNote", "auraSeedPrice", "auraElsoPrice", "auraRollCount",
    "hammerStat", "hammerSlots", "hammerTarget", "hammerPrice", "hammerRoll", "hammerRollCount", "hammerReset", "hammerAuto",
    "hammerTable", "hammerCost", "hammerStatus", "hammerPlan", "hammerLog",
    "relicRateButton", "coreRateButton",
    "rateModal", "rateModalTitle", "rateModalNote", "rateModalBody",
    "inhFormula", "inhEnchants", "inhIncrement", "inhTotal", "inhFusionMax",
    "inhStatus", "inhSummary", "inhTable",
    "eqcPart", "eqcFrom", "eqcTo", "eqcSteps", "eqcTotal", "eqcIsolet", "eqcIsoletField",
  ].forEach((id) => (simEls[id] = q(id)));

  wireRateModal();
  wirePierceHelp();

  wireEncryptSim();
  wireCoreSim();
  wireHammerSim();
  wireRelicSim();
  wireEnhanceSim();
  wireSienaSim();
  wireAuraSim();
  // 상속·장비 제작은 계산기 탭 화면이지만 입력 요소를 simEls로 함께 잡아 두어 여기서 엮는다
  wireInheritSim();
  wireEquipCraft();
}

// ══════════════════════════════════════════════════════════════
//  상속 시뮬레이터
// ══════════════════════════════════════════════════════════════
//
// 주문서 수는 게임 내 "상속 주문서" 안내를 그대로 옮겼다.
//   주문서 1개 : 인크립트 횟수 0~1, 능력치 총합 12~18
//   주문서 n개 : 인크립트 횟수 n,  능력치 총합 (19 + (n-2)*6) ~ (+5)
//   기본 조건은 채웠는데 능력치 총합이 별도 조건을 넘으면 1개 추가 (미달은 그대로)
//
// 이클립스 이상은 별도 규칙이다.
//   - 주문서는 어비스 이상과 같이 2배
//   - 인챈트는 70%만 넘어가고 소수점은 버린다. 능력치마다 각각 계산한다
//   - 합성 횟수가 MAX일 때만 상속할 수 있다
const INHERIT_ENCHANT_ROWS = 2;
const ECLIPSE_RATE = 0.7;
const HIGH_GRADE_SCROLL_MULTIPLIER = 2;

// 인크립트 횟수 n에 해당하는 능력치 총합 구간
function inheritStatBand(increments) {
  const n = Math.max(1, increments);
  if (n === 1) return { n, min: 12, max: 18 };
  const min = 19 + (n - 2) * 6;
  return { n, min, max: min + 5 };
}

function inheritScrollCount(increments, statTotal, grade) {
  const band = inheritStatBand(increments);
  const bonus = statTotal > band.max;   // 초과 달성이면 1개 추가, 미달은 그대로
  const base = band.n + (bonus ? 1 : 0);
  // 어비스 이상은 같은 계산에 2배를 매긴다
  const multiplier = grade === "normal" ? 1 : HIGH_GRADE_SCROLL_MULTIPLIER;
  return { count: base * multiplier, band, bonus, base, multiplier };
}

// 이클립스 이상은 능력치마다 따로 70%를 적용하고 버림한다
function inheritedValue(value, grade) {
  return grade === "eclipse" ? Math.floor(value * ECLIPSE_RATE) : value;
}

// 공식은 코드가 실제로 쓰는 상수로 그린다. 문구만 따로 적어두면 값을 고칠 때
// 공지에 실린 상속 불가 목록이다. 계산 결과에는 쓰지 않고 안내로만 보여준다
const INHERIT_BLOCKED_ITEMS = [
  "眞-언홀리 프레이어", "眞-트와일라잇 아이", "眞-강령술사의 로브",
  "眞-더 레이지", "眞-아슈켈론", "眞-지배자의 반지",
  "眞-괴짜 발명가의 로봇 신발", "眞-기계 제어의 아뮬렛", "眞-철권통치의 왕관",
  "眞-글로이우스", "眞-카디널 로드", "眞-공성추",
  "眞-다크 레이븐 슈츠", "眞-실험용 가운", "眞-전투 지휘관의 아머",
  "眞-토마호크", "眞-어쌔신 밴드",
  "기간제 장비", "귀곡성 장비", "네오테시스 1, 2 장비",
  "카릴가 장비", "별의 전장 장비", "영혼의 랜턴 장비",
  "초기 합성 횟수가 1인 산스루리아 장비",
];

function inheritNoticeHtml() {
  const cells = INHERIT_BLOCKED_ITEMS
    .map((name) => `<li>${escapeHtml(name)}</li>`).join("");
  return `<ul class="inherit-notice-grid">${cells}</ul>`;
}

// 화면과 계산이 어긋난다.
function renderInheritFormula() {
  if (!simEls.inhFormula) return;
  const x = HIGH_GRADE_SCROLL_MULTIPLIER;
  const pct = Math.round(ECLIPSE_RATE * 100);

  // 게임 내 "상속 주문서" 안내를 그대로 옮기고, 어비스·이클립스 항목을 덧붙였다.
  // 배수·비율은 계산에 쓰는 상수를 그대로 끼워 넣어 화면과 계산이 어긋나지 않게 한다.
  const block = (label, basic, extra) => `
    <div class="inherit-formula-block">
      <div class="inherit-formula-title">${label}</div>
      <table class="inherit-formula-table">
        <tbody>
          <tr><th>기본조건</th><td>${basic}</td></tr>
          <tr><th>별도조건</th><td>${extra}</td></tr>
        </tbody>
      </table>
    </div>
  `;

  simEls.inhFormula.innerHTML = `
    <div class="inherit-formula-head">
      상속 주문서
      <button id="inhNoticeToggle" class="inherit-notice-toggle" type="button">주의 사항</button>
    </div>
    <p class="inherit-formula-intro">
      상속 주문서는 Lv 200 이상 장비의 인챈트, 강화를 상속할 때 필요한 아이템입니다.
      추출할 장비의 인챈트 총합, 인크립트 횟수와 장비 강화 레벨에 따라
      필요한 주문서의 숫자가 다릅니다.
    </p>

    <div class="inherit-formula-cols">
      <div>
    ${block("[1] 주문서 1개", "인크립트 횟수 0~1", "능력치 총합 12~18")}
    ${block("[2] 주문서 n개 (n≥2)", "인크립트 횟수 n",
            "능력치 총합 (19 + (n−2) × 6) ~ (19 + (n−2) × 6 + 5)")}

    <p class="inherit-formula-note">
      기본조건은 달성했지만, 별도조건보다 초과 달성했을 경우에는
      주문서 1개 추가 (별도조건 미달은 제외)
    </p>
      </div>
      <div>
    <div class="inherit-formula-block">
      <div class="inherit-formula-title">[3] 어비스 이상 장비</div>
      <ul class="inherit-formula-list">
        <li>위에서 구한 주문서 수가 <b>${x}배</b>가 됩니다.</li>
      </ul>
    </div>

    <div class="inherit-formula-block">
      <div class="inherit-formula-title">[4] 이클립스 이상 장비</div>
      <ul class="inherit-formula-list">
        <li>상속서는 어비스 이상 장비와 동일하게 <b>${x}배</b>가 필요합니다.</li>
        <li>상속에 사용된 장비 인챈트 수치의 <b>${pct}%</b>만 상속됩니다.
            (예: 70 인챈트 → ${Math.floor(70 * ECLIPSE_RATE)})</li>
        <li>남는 소수점은 버림 처리됩니다.
            (예: 72 인챈트 → ${(72 * ECLIPSE_RATE).toFixed(1)} → ${Math.floor(72 * ECLIPSE_RATE)})</li>
        <li>2개 이상의 능력치에 인챈트가 되어 있으면 각 인챈트별로 각각 ${pct}% 적용됩니다.</li>
        <li>합성 횟수가 <b>MAX</b>인 상태에서만 상속할 수 있습니다.</li>
      </ul>
    </div>
      </div>
    </div>
  `;
}

function renderInheritEnchantRows() {
  if (!simEls.inhEnchants) return;
  // 계산에는 수치만 쓰이고 어떤 능력치인지는 쓰이지 않는다. 이름 대신 번호만 붙인다.
  // 아래 인크립트 횟수 칸과 같은 .field 모양으로 맞춘다
  simEls.inhEnchants.innerHTML = Array.from({ length: INHERIT_ENCHANT_ROWS }, (_, i) => `
    <label class="field">
      <span>스탯${i + 1}</span>
      <input type="number" min="0" step="1" value="0" data-inh-value="${i}" />
    </label>
  `).join("");
}

function readInheritRows() {
  const rows = [];
  for (let i = 0; i < INHERIT_ENCHANT_ROWS; i += 1) {
    const value = Number(simEls.inhEnchants.querySelector(`[data-inh-value="${i}"]`)?.value) || 0;
    if (value > 0) rows.push({ stat: `스탯${i + 1}`, value });
  }
  return rows;
}

function renderInheritResult() {
  const rows = readInheritRows();
  const statTotal = rows.reduce((sum, r) => sum + r.value, 0);
  const increments = Math.max(0, Number(simEls.inhIncrement?.value) || 0);
  const grade = document.querySelector('input[name="inhGrade"]:checked')?.value || "normal";
  const fusionMax = !!simEls.inhFusionMax?.checked;

  if (simEls.inhTotal) simEls.inhTotal.textContent = formatNumber(statTotal);

  // 이클립스 이상은 합성 MAX가 아니면 아예 진행할 수 없다
  const blocked = grade === "eclipse" && !fusionMax;
  simEls.inhStatus.innerHTML = blocked
    ? '<b class="sim-neg">이클립스 이상 장비는 합성 횟수가 MAX일 때만 상속할 수 있습니다.</b>'
    : rows.length
      ? '<b class="sim-pos">상속 가능</b>'
      : "추출할 장비의 인챈트를 입력하세요.";

  const { count, band, bonus, base, multiplier } = inheritScrollCount(increments, statTotal, grade);

  simEls.inhSummary.innerHTML = `
    <div class="sim-summary-title">필요 주문서 <b>${blocked ? "-" : formatNumber(count)}</b>장</div>
    <p class="sim-summary-note">
      인크립트 ${formatNumber(increments)}회 → 기본 ${formatNumber(band.n)}장,
      능력치 총합 기준 구간 ${formatNumber(band.min)}~${formatNumber(band.max)}
      ${bonus ? " (구간 초과로 1장 추가)" : ""}
      ${multiplier > 1
        ? ` → ${formatNumber(base)}장 × ${multiplier}배 = ${formatNumber(count)}장`
        : ""}
    </p>
  `;

  simEls.inhTable.innerHTML = rows.length
    ? `
      <thead><tr><th>능력치</th><th>추출 수치</th><th>상속 수치</th></tr></thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            <th>${escapeHtml(r.stat)}</th>
            <td data-label="추출 수치">${formatNumber(r.value)}</td>
            <td data-label="상속 수치"><b>${blocked ? "-" : formatNumber(inheritedValue(r.value, grade))}</b></td>
          </tr>`).join("")}
      </tbody>
    `
    : "";
}

function wireInheritSim() {
  if (!simEls.inhEnchants) return;
  renderInheritFormula();
  renderInheritEnchantRows();

  // 목록이 길어 설명 옆에 펼치면 계산기가 밀린다. 확률표와 같은 창으로 띄운다
  document.getElementById("inhNoticeToggle")?.addEventListener("click", () =>
    openRateModal("상속 이용이 가능하지 않은 아이템 리스트", "", inheritNoticeHtml()));

  const panel = document.querySelector('[data-calculator-panel="inherit"]');
  panel?.addEventListener("input", renderInheritResult);
  panel?.addEventListener("change", renderInheritResult);

  renderInheritResult();
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
    // 표시용: 상위 % = 100 - percentile(나보다 운 나쁜 사람 비율) → 10,000명 중 등수(순위)로 표현
    const topPercent = Math.max(0, Math.min(100, 100 - luck.percentile));
    const luckText = simLuckText(simLuckRank(topPercent), topPercent, "span");
    rows.push(`<div>${luckText}</div>`);
    rows.push(`<div class="sim-graph-legend"><span>운 좋음</span><span>평균</span><span>운 나쁨</span></div>`);
    rows.push(`<div class="sim-graph">${simLuckGraph(luck.z)}</div>`);
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

// 엘소로 강화할 때 단계별 비용 (2026-09-17 사용자 제공). 상자(가루) 비용은 엘소와 무관하게 시드다
const CORE_ELSO_COST = [
  0,
  600, 660, 720, 780,          // 0진 1~4강
  840, 900, 960, 1020, 1060,   // 1진 0~4강
  1140, 1200, 1260, 1320, 1380, // 2진
  1800, 1860, 1920, 1980, 2040, // 3진
  2100, 2160, 2220, 2280, 2340, // 4진
];

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
    elso: CORE_ELSO_COST[i] || 0,
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
function coreRun(sampled) {
  const startIdx = parseInt(simEls.coreStartStage.value, 10);
  const targetIdx = parseInt(simEls.coreTargetStage.value, 10);
  if (startIdx >= targetIdx) {
    alert("목표 단계는 시작 단계보다 높아야 합니다.");
    return;
  }
  const isMainStat = simEls.coreMainStat.checked;
  const isSubStat = !isMainStat;
  const hasDust = simEls.coreHasDust.checked;
  const useElso = !!simEls.coreElso?.checked;           // 강화 비용을 시드 대신 엘소로
  const discount = simEls.coreDiscount?.checked ? 0.8 : 1; // 강화 비용 20% 할인 (시드·엘소 공통, 상자는 제외)

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

  for (let i = startIdx + 1; i <= targetIdx; i++) {
    if (coreStages[i].rate <= 0) {
      alert(`${coreStages[i].display} 단계 확률이 0%라 계산할 수 없습니다.`);
      return;
    }
  }

  // 코어 한 개를 시작 → 목표까지 올리는 데 드는 양. draw=true면 확률대로 뽑고, 아니면 기대값
  const runOne = (draw) => {
    const rows = [];
    const total = { dust: 0, crystal: 0, seedCost: 0, elso: 0 };
    for (let i = startIdx + 1; i <= targetIdx; i++) {
      const step = coreStages[i];
      const attempts = draw ? simDrawAttempts(step.rate) : 1 / step.rate;

      let dustPer = step.dust, crystalPer = step.crystal;
      let feePer = useElso ? step.elso : step.seed;
      if (isSubStat) {
        dustPer = Math.floor(dustPer / 2);
        crystalPer = Math.floor(crystalPer / 2);
        feePer = Math.floor(feePer / 2);
      }
      feePer = Math.round(feePer * discount);

      const dustExp = Math.round(dustPer * attempts);
      const crystalExp = Math.round(crystalPer * attempts);
      const feeExp = Math.round(feePer * attempts);
      const dustCost = !hasDust ? dustExp * dustUnitPrice : 0;
      // 시드 비용 = 상자(가루) 비용 + (시드로 강화할 때) 강화 비용. 엘소 강화면 강화 비용은 엘소로 따로 센다
      const seedCost = dustCost + (useElso ? 0 : feeExp);
      const elso = useElso ? feeExp : 0;

      total.dust += dustExp;
      total.crystal += crystalExp;
      total.seedCost += seedCost;
      total.elso += elso;
      rows.push({ step, attempts, dustExp, crystalExp, feeExp, seedCost, elso });
    }
    return { rows, total };
  };

  const model = runOne(false);
  const scale = (t, n) => ({ dust: t.dust * n, crystal: t.crystal * n, seedCost: t.seedCost * n, elso: t.elso * n });
  let one, six, luck = null;
  if (sampled) {
    // 코어 6개는 각각 따로 뽑아서 더한다 (1개 결과 × 6이 아니라)
    const runs = Array.from({ length: CORE_SLOT_COUNT }, () => runOne(true));
    one = runs[0];
    // 운 순위는 이번에 굴린 그대로(코어 6개 전부)를 기준으로 낸다
    const luckSteps = [];
    for (let slot = 0; slot < CORE_SLOT_COUNT; slot += 1) {
      for (let i = startIdx + 1; i <= targetIdx; i++) luckSteps.push({ rate: coreStages[i].rate });
    }
    luck = simLuckStats(luckSteps, runs.reduce((a, r) => a + r.rows.reduce((b, x) => b + x.attempts, 0), 0));
    six = runs.reduce((acc, r) => ({
      dust: acc.dust + r.total.dust, crystal: acc.crystal + r.total.crystal,
      seedCost: acc.seedCost + r.total.seedCost, elso: acc.elso + r.total.elso,
    }), { dust: 0, crystal: 0, seedCost: 0, elso: 0 });
  } else {
    one = model;
    six = scale(model.total, CORE_SLOT_COUNT);
  }

  coreRenderTable(one.rows, useElso);
  coreRenderSummary({
    isMainStat, startIdx, targetIdx, sampled, useElso, discount, luck,
    one: one.total, six, modelOne: model.total, modelSix: scale(model.total, CORE_SLOT_COUNT),
  });
}

function coreCalc() {
  coreRun(false);
}

function coreSim() {
  coreRun(true);
}
function coreRenderTable(rows, useElso) {
  const feeHead = useElso ? `<span class="sim-elso">ELSO</span>강화 비용` : `${simIcon("시드.png")}강화 비용`;
  const head = [
    "단계",
    "확률",
    "시도",
    `${simIcon("코어가루.png")}가루`,
    `${simIcon("코어결정.png")}결정`,
    feeHead,
    `${simIcon("시드.png")}${useElso ? "상자 비용" : "총 기대비용"}`,
  ];
  // 폰에서는 표를 카드로 펴므로 셀마다 이름을 달아둔다 (머리글이 안 보인다)
  const labels = ["단계", "확률", "시도", "가루", "결정", "강화 비용", useElso ? "상자 비용" : "총 기대비용"];
  const body = rows
    .map((r) => {
      const fee = useElso ? `${r.feeExp.toLocaleString("ko-KR")} 엘소` : `${coreFmtEok(r.feeExp)}억`;
      const cells = [r.step.display, `${r.step.ratePct}%`, coreFmtCount(r.attempts), r.dustExp.toLocaleString("ko-KR"), r.crystalExp.toLocaleString("ko-KR"), fee, `${coreFmtEok(r.seedCost)}억`];
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
  const kind = s.sampled ? "시뮬레이션" : "기대값";
  const note = [s.useElso ? "엘소 강화" : "", s.discount < 1 ? "강화 비용 20% 할인" : ""].filter(Boolean).join(" · ");
  const gap = (value, expected, unit = "") => (s.sampled ? simDelta(value, expected, unit) : "");
  const mats = (t, m) =>
    `<div class="sim-summary-mats">` +
    `<span>${simIcon("코어가루.png", 24)}${t.dust.toLocaleString("ko-KR")}개${gap(t.dust, m.dust)}</span>` +
    `<span>${simIcon("코어결정.png", 24)}${t.crystal.toLocaleString("ko-KR")}개${gap(t.crystal, m.crystal)}</span>` +
    `<span>${simIcon("시드.png", 24)}${coreFmtEok(t.seedCost)}억${gap(t.seedCost / 1e8, m.seedCost / 1e8, "억")}</span>` +
    (s.useElso ? `<span><span class="sim-elso">ELSO</span>${t.elso.toLocaleString("ko-KR")}${gap(t.elso, m.elso)}</span>` : "") +
    `</div>`;

  simEls.coreSummary.innerHTML =
    `<div class="sim-summary-title">${escapeHtml(statLabel)} | ${escapeHtml(range)} ${escapeHtml(kind)}${note ? ` <small>(${escapeHtml(note)})</small>` : ""}</div>` +
    `<div class="sim-summary-cols">` +
    `<div class="sim-summary-col"><span class="sim-summary-label">코어 1개</span>${mats(s.one, s.modelOne)}</div>` +
    `<div class="sim-summary-col"><span class="sim-summary-label">코어 ${CORE_SLOT_COUNT}개 전체${s.sampled ? " (각각 뽑아 합산)" : ""}</span>${mats(s.six, s.modelSix)}</div>` +
    `</div>` +
    simLuckRow(s.luck);
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
  simEls.coreSim?.addEventListener("click", coreSim);
}

// ── 에이라의 망치 시뮬 (HammerSimulatorView) ───────────────────
// 게임 창처럼 한 번씩 굴린다. 잠그지 않은 줄은 전부 다시 굴러가고, 잠근 줄은 그대로 남는다.
// 굴릴 때 스탯 종류와 수치가 함께 정해지므로, 원하는 스탯이 나올 확률은 그 스탯의 등급 확률 합이다.
//
// 확률표 (무기·손목, 2026-09-18 사용자 제공)
//   하 1~2 / 중 4~5 / 상 6~10, 수치는 구간 안에서 같은 확률
const HAMMER_STATS = [
  { key: "stab", name: "찌르기 공격력", low: 0.112 },
  { key: "hack", name: "베기 공격력", low: 0.110 },
  { key: "magic", name: "마법 공격력", low: 0.112 },
  { key: "mdef", name: "마법 방어력", low: 0.112 },
  { key: "mhack", name: "마법 베기 공격력", low: 0.112 },
  { key: "hybrid", name: "물리 복합 공격력", low: 0.112 },
];
// 등급별 확률과 수치 구간. 하만 스탯마다 조금 다르고(베기 11.0%) 중·상은 같다
const HAMMER_GRADES = [
  { key: "low", name: "하", mid: 0, values: [1, 2] },
  { key: "mid", name: "중", rate: 0.05, values: [4, 5] },
  { key: "high", name: "상", rate: 0.005, values: [6, 7, 8, 9, 10] },
];
// 목표 스탯에 함께 잡히는 줄 (2026-09-18 사용자 제공)
//   물리 복합 = 찌르기 · 베기 · 물리 복합, 마법 베기 = 베기 · 마법 공격력 · 마법 베기
const HAMMER_INCLUDES = {
  hybrid: ["stab", "hack", "hybrid"],
  mhack: ["hack", "magic", "mhack"],
};
const hammerIncluded = (statKey) => HAMMER_INCLUDES[statKey] || [statKey];

const HAMMER_SLOT_MAX = 10;         // 단계는 1~10단계
const HAMMER_SEED_PER_LOCK = 1_000_000;  // 잠금 k개 → 시드 (k+1) × 100만
const HAMMER_PRICE_DEFAULT = 80_000_000; // 망치 1개 기본 시세 (시드)
// 기대값·운 순위·단계표에 쓰는 모의 판 수. 300판이면 기대값이 ±7%쯤 흔들려 5,000판으로 굴린다(오차 ±1.5% 안쪽)
const HAMMER_RUNS = 5000;

// 잠금 k개일 때 드는 비용. 망치는 (k ÷ 2 내림) + 1개
const hammerSeedCost = (locks) => (locks + 1) * HAMMER_SEED_PER_LOCK;
const hammerCount = (locks) => Math.floor(locks / 2) + 1;

// 한 줄을 굴린 결과. { stat, grade, value }
function hammerRollLine() {
  let r = Math.random();
  for (const stat of HAMMER_STATS) {
    for (const grade of HAMMER_GRADES) {
      const rate = grade.key === "low" ? stat.low : grade.rate;
      if (r < rate) {
        const values = grade.values;
        return { stat: stat.key, grade: grade.key, value: values[Math.floor(Math.random() * values.length)] };
      }
      r -= rate;
    }
  }
  // 확률 합이 1이라 여기까지 오지 않지만, 부동소수 오차 대비로 마지막 줄을 돌려준다
  return { stat: "hybrid", grade: "low", value: 1 };
}

const hammer = {
  slots: 7,         // 기본 7단계
  target: 45,
  stopNote: "",     // 10회 재설정이 왜 멈췄는지 (다음 동작 때 지운다)
  autoBase: null,   // 직접 입력한 상태에서 자동 굴리기를 시작했을 때의 기대값 (다 채운 뒤 견주기용)
  stat: "stab",
  price: HAMMER_PRICE_DEFAULT,
  lines: [],        // { stat, grade, value } | null
  locks: [],        // 줄마다 보호 여부
  rolls: 0,
  seed: 0,
  hammers: 0,
  loaded: false,
};

const hammerStatName = (key) => HAMMER_STATS.find((s) => s.key === key)?.name || "";
// 목표에 잡히는 줄이 나올 확률 (하 + 중 + 상, 함께 잡히는 스탯까지 합산)
function hammerHitRate(statKey) {
  return hammerValueDist(statKey).reduce((sum, d) => sum + d.p, 0);
}
// 목표에 잡히는 줄이 나왔을 때의 수치 분포 [{ value, p }]
function hammerValueDist(statKey) {
  const keys = hammerIncluded(statKey);
  const bag = new Map();
  keys.forEach((key) => {
    const stat = HAMMER_STATS.find((s) => s.key === key);
    if (!stat) return;
    HAMMER_GRADES.forEach((g) => {
      const rate = g.key === "low" ? stat.low : g.rate;
      g.values.forEach((v) => bag.set(v, (bag.get(v) || 0) + rate / g.values.length));
    });
  });
  return [...bag.entries()].sort((a, b) => a[0] - b[0]).map(([value, p]) => ({ value, p }));
}

const hammerSum = () => hammer.lines.reduce((sum, line, i) => sum + (hammerCounts(i) ? line.value : 0), 0);
// 목표에 잡히는 줄만 합계에 들어간다 (물리 복합·마법 베기는 함께 잡히는 스탯 포함)
const hammerCounts = (i) => !!hammer.lines[i] && hammerIncluded(hammer.stat).includes(hammer.lines[i].stat);
const hammerLockCount = () => hammer.locks.filter(Boolean).length;

// ── 추천 계산 ──
// 잠금이 늘수록 굴림값이 비싸진다. 그래서 "수치 T 이상이면 잠근다" 기준 하나를 끝까지 쓰면 손해다.
// 초반에는 높은 값만 받아 싸게 굴리고, 목표가 가까워지면 낮은 값도 받아 끝내는 쪽이 싸다.
// 그래서 (잠근 개수 k, 남은 수치 R)마다 기준을 따로 푼다. R이 작은 쪽부터 채우면 한 번에 정확히 풀린다.
//
// 한 판에서 잠그지 않은 줄은 전부 다시 굴러가므로, 기준 이상으로 나온 줄만 받아 잠근다고 보면
// 다음 상태는 (받은 개수, 받은 수치 합)으로 정해진다. 그 분포를 먼저 만들어 둔다.
function hammerAcceptDist(statKey, slots) {
  const dist = hammerValueDist(statKey);
  const maxValue = 10;
  const table = [];   // table[T][m] = { p0, list: [{ c, s, p }] }
  for (let t = 1; t <= maxValue; t += 1) {
    const accept = dist.filter((d) => d.value >= t);
    const pSkip = 1 - accept.reduce((sum, d) => sum + d.p, 0);
    const perM = [];
    // 줄 수 m에 대해 (받은 개수, 합) 분포를 차곡차곡 쌓는다
    let cur = [[1]];    // cur[c][s] = 확률
    perM[0] = cur;
    for (let m = 1; m <= slots; m += 1) {
      const next = [];
      cur.forEach((row, c) => {
        if (!row) return;
        row.forEach((p, sum) => {
          if (!p) return;
          next[c] = next[c] || [];
          next[c][sum] = (next[c][sum] || 0) + p * pSkip;
          accept.forEach((d) => {
            const nc = c + 1;
            const ns = sum + d.value;
            next[nc] = next[nc] || [];
            next[nc][ns] = (next[nc][ns] || 0) + p * d.p;
          });
        });
      });
      cur = next;
      perM[m] = cur;
    }
    table[t] = perM;
  }
  return table;
}

// (잠근 개수, 남은 수치)마다 최적 기준과 남은 기대비용을 푼다
function hammerSolve(target, slots, price, statKey) {
  const maxLock = Math.max(0, slots - 1);
  const table = hammerAcceptDist(statKey, slots);
  const cost = [];
  for (let k = 0; k <= maxLock; k += 1) cost[k] = hammerSeedCost(k) + hammerCount(k) * price;

  // C[k][R] = 남은 수치 R을 잠금 k개 상태에서 채우는 데 드는 기대비용
  const C = Array.from({ length: maxLock + 1 }, () => new Float64Array(target + 1));
  const policy = Array.from({ length: maxLock + 1 }, () => new Int8Array(target + 1));

  const dist = hammerValueDist(statKey);
  // 굴린 줄들의 합 분포. 잠그지 않아도 한 판에 목표를 넘기면 그대로 끝난다.
  // 이 경우를 빼놓으면 굳이 낮은 값을 잠가 비싼 단계로 올라가는 쪽을 고르게 된다.
  const totalDist = [];     // totalDist[m][sum] = 확률
  totalDist[0] = [1];
  const pNone = 1 - dist.reduce((sum, d) => sum + d.p, 0);
  for (let m = 1; m <= slots; m += 1) {
    const prev = totalDist[m - 1];
    const next = [];
    prev.forEach((p, sum) => {
      if (!p) return;
      next[sum] = (next[sum] || 0) + p * pNone;
      dist.forEach((d) => { next[sum + d.value] = (next[sum + d.value] || 0) + p * d.p; });
    });
    totalDist[m] = next;
  }
  const finishAll = (R, m) => totalDist[m].reduce((sum, p, value) => (value >= R ? sum + p : sum), 0);

  for (let R = 1; R <= target; R += 1) {
    for (let k = maxLock; k >= 0; k -= 1) {
      const m = slots - k;
      if (m <= 0) { C[k][R] = Infinity; policy[k][R] = 0; continue; }
      if (k === maxLock) {
        // 더 잠글 수 없으니 남은 줄이 한 판에 R 이상을 띄워야 끝난다
        const p = finishAll(R, m);
        C[k][R] = p > 0 ? cost[k] / p : Infinity;
        policy[k][R] = 1;
        continue;
      }
      const pFinishAll = finishAll(R, m);
      let best = Infinity;
      let bestT = 1;
      for (let t = 1; t <= 10; t += 1) {
        const dist = table[t][m];
        let rest = 0;
        let stay = 0;
        let finish = 0;   // 잠근 값만으로 목표를 넘겨 끝난 경우
        let ok = true;
        for (let c = 0; c < dist.length; c += 1) {
          const row = dist[c];
          if (!row) continue;
          for (let sum = 0; sum < row.length; sum += 1) {
            const p = row[sum];
            if (!p) continue;
            if (c === 0) { stay += p; continue; }   // 아무것도 못 받은 판
            // 잠글 칸이 모자라면 높은 값부터 잠근다. 몇 개만 남기는 셈이라 합계도 그만큼만 센다
            const room = maxLock - k;
            const take = Math.min(c, room);
            const gain = take === c ? sum : Math.round((sum * take) / c);
            const nk = k + take;
            const nR = Math.max(0, R - gain);
            if (nR === 0) { finish += p; continue; }   // 여기서 끝
            const v = C[nk][nR];
            if (!Number.isFinite(v)) { ok = false; break; }
            rest += p * v;
          }
          if (!ok) break;
        }
        if (!ok || stay >= 1) continue;
        // 잠그지 않은 줄까지 합쳐 끝나는 경우를 더한다 (이미 센 몫은 뺀다)
        const extraFinish = Math.max(0, pFinishAll - finish);
        const idle = Math.max(0, stay - extraFinish);
        if (idle >= 1) continue;
        const value = (cost[k] + rest) / (1 - idle);
        if (value < best) { best = value; bestT = t; }
      }
      C[k][R] = best;
      policy[k][R] = bestT;
    }
  }
  return { C, policy, maxLock };
}

// 푼 기준대로 실제로 굴려 보며 단계별 예상치를 모은다
function hammerRoute(solved, startValues, target, slots, price, statKey, runs = HAMMER_RUNS) {
  const dist = hammerValueDist(statKey);
  const hit = dist.reduce((sum, d) => sum + d.p, 0);
  const { policy, maxLock } = solved;
  const stageBag = new Map();   // 잠금 수 → { rolls: [], cost: [], end: [] }
  const totals = [];
  const rollCounts = [];
  const hammerCounts = [];
  const cap = 4000;

  for (let run = 0; run < runs; run += 1) {
    let kept = [...startValues].sort((a, b) => b - a).slice(0, maxLock);
    let sum = kept.reduce((a, b) => a + b, 0);
    let spent = 0;
    let rolls = 0;
    let hammers = 0;
    const stages = new Map();
    while (sum < target && rolls < cap) {
      const k = Math.min(kept.length, maxLock);
      const m = slots - k;
      if (m <= 0) break;
      const R = Math.max(1, Math.min(target, target - sum));
      const t = policy[k][R] || 1;
      const step = hammerSeedCost(k) + hammerCount(k) * price;
      spent += step;
      rolls += 1;
      hammers += hammerCount(k);
      const bag = stages.get(k) || { rolls: 0, cost: 0, threshold: t };
      bag.rolls += 1;
      bag.cost += step;
      stages.set(k, bag);

      const beforeSum = sum;   // 이번 판을 굴리기 전 잠가 둔 합
      let rolledSum = 0;       // 이번 판에 나온 모든 줄의 합 (잠근 것 포함)
      for (let i = 0; i < m; i += 1) {
        if (Math.random() >= hit) continue;
        let r = Math.random() * hit;
        for (const d of dist) {
          if (r < d.p) {
            rolledSum += d.value;
            if (d.value >= t && kept.length < maxLock) { kept.push(d.value); sum += d.value; }
            break;
          }
          r -= d.p;
        }
      }
      // 판 위의 합 = 이번 판 전에 잠가 둔 값 + 이번에 나온 줄 전부.
      // 이번에 잠근 값은 이미 rolledSum에 들어 있으니 kept에 다시 더하면 두 번 세게 된다
      const board = beforeSum + rolledSum;
      if (board >= target) { sum = board; break; }
      const cur = stages.get(k);
      cur.end = sum;
    }
    if (rolls >= cap) continue;
    totals.push(spent);
    rollCounts.push(rolls);
    hammerCounts.push(hammers);
    stages.forEach((v, k) => {
      const bag = stageBag.get(k) || { rolls: [], cost: [], end: [], thresholds: [] };
      bag.rolls.push(v.rolls);
      bag.cost.push(v.cost);
      bag.thresholds.push(v.threshold);
      if (v.end != null) bag.end.push(v.end);
      stageBag.set(k, bag);
    });
  }
  if (!totals.length) return null;
  return {
    // 다 채운 뒤 "이번 판이 몇 등인지" 셀 때 쓴다 (중앙값만으로는 순위를 알 수 없다)
    costs: totals,
    // 기대값은 평균. 굴린 횟수 분포가 오른쪽으로 길게 늘어져 중앙값은 평균보다 낮게 나온다
    cost: hammerMean(totals),
    rolls: hammerMean(rollCounts),
    hammers: hammerMean(hammerCounts),
    stages: [...stageBag.entries()].sort((a, b) => a[0] - b[0]).map(([k, bag]) => ({
      locks: k,
      // 그 단계에서 실제로 쓴 기준 (단계가 시작될 때의 남은 수치로 정해진다)
      threshold: Math.round(hammerMedian(bag.thresholds)),
      rolls: hammerMedian(bag.rolls),
      cost: hammerMedian(bag.cost),
      end: bag.end.length ? hammerMedian(bag.end) : null,
    })),
  };
}

function hammerMean(list) {
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
}

function hammerMedian(list) {
  if (!list.length) return 0;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// 지금 가진 값 중 몇 개를 들고 갈지 고른다.
// 잠그면 그 줄은 남지만 이후 굴림값이 비싸진다. 그래서 낮은 값은 버리고 다시 굴리는 쪽이 쌀 수 있다.
// 값이 높은 순으로 j개만 들고 가는 경우를 모두 재보고 가장 싼 j를 고른다.
function hammerBestKeep(solved, values, target) {
  const sorted = [...values].sort((a, b) => b - a);
  const { C, maxLock } = solved;
  let best = null;
  for (let j = 0; j <= Math.min(sorted.length, maxLock); j += 1) {
    const kept = sorted.slice(0, j);
    const sum = kept.reduce((a, b) => a + b, 0);
    if (sum >= target) return { keep: j, kept, cost: 0, sum };
    const cost = C[j][Math.max(1, target - sum)];
    if (!Number.isFinite(cost)) continue;
    if (!best || cost < best.cost) best = { keep: j, kept, cost, sum };
  }
  return best;
}

const hammerCondKey = () => `${hammer.target}|${hammer.slots}|${hammer.price}|${hammer.stat}`;

// 아무것도 없는 상태에서 목표까지 드는 값 (다 채운 뒤 견주기용).
// 굴려서 얻는 값이라 구할 때마다 조금씩 다르다. 같은 조건이면 한 번만 구해 화면의 숫자가 흔들리지 않게 한다
let hammerScratchCache = null;
function hammerScratchPlan() {
  const key = hammerCondKey();
  if (!hammerScratchCache || hammerScratchCache.key !== key) {
    hammerScratchCache = { key, plan: hammerRoute(hammerSolved(), [], hammer.target, hammer.slots, hammer.price, hammer.stat) };
  }
  return hammerScratchCache.plan;
}

// 지금 화면 상태에서의 추천. 계산이 무거워 같은 조건이면 다시 풀지 않는다
let hammerSolveCache = null;
function hammerSolved() {
  const key = hammerCondKey();
  if (!hammerSolveCache || hammerSolveCache.key !== key) {
    hammerSolveCache = { key, solved: hammerSolve(hammer.target, hammer.slots, hammer.price, hammer.stat) };
  }
  return hammerSolveCache.solved;
}

// 수천 판을 굴리므로 화면을 그릴 때마다 다시 풀지 않는다. 조건과 가진 값이 같으면 앞 결과를 쓴다
let hammerPlanCache = null;
function hammerBestPlan() {
  const have = hammer.lines.map((line, i) => (hammerCounts(i) ? line.value : 0)).filter(Boolean);
  const key = `${hammerCondKey()}|${[...have].sort((a, b) => b - a).join(",")}`;
  if (hammerPlanCache && hammerPlanCache.key === key) return hammerPlanCache.plan;
  const plan = hammerBestPlanFresh(have);
  hammerPlanCache = { key, plan };
  return plan;
}

function hammerBestPlanFresh(have) {
  const solved = hammerSolved();
  const pick = hammerBestKeep(solved, have, hammer.target);
  if (!pick) return null;
  const route = hammerRoute(solved, pick.kept, hammer.target, hammer.slots, hammer.price, hammer.stat);
  if (!route) return null;
  // 다 들고 갔을 때와 견줘 얼마나 차이가 나는지 (버리는 편이 쌀 때 알려 준다)
  const keepAllSum = have.reduce((a, b) => a + b, 0);
  const keepAllCost = have.length
    ? solved.C[Math.min(have.length, solved.maxLock)][Math.max(1, hammer.target - keepAllSum)]
    : null;
  const R = Math.max(1, hammer.target - pick.sum);
  const k = Math.min(pick.keep, solved.maxLock);
  return {
    ...route,
    solved,
    have,
    pick,
    keepAllCost: Number.isFinite(keepAllCost) ? keepAllCost : null,
    nowThreshold: solved.policy[k][Math.min(R, hammer.target)] || 1,
  };
}

// ── 화면 ──
const hammerFmtSeed = (v) => (v >= 1e8 ? `${(v / 1e8).toFixed(1)}억` : `${Math.round(v / 1e4).toLocaleString("ko-KR")}만`);

// 추천 루트가 "잠그고 남기라"고 하는 줄 번호들. 목표 스탯 줄 중 값이 높은 순으로 추천 개수만큼이며,
// 안내 문구의 "N 이상인 줄만 잠그고 / X만 남기고"와 같은 판단이다. 목표를 채운 뒤에는 고를 것이 없다
function hammerKeepRows() {
  const keep = new Set();
  if (hammerSum() >= hammer.target) return keep;
  const counted = [];
  for (let i = 0; i < hammer.slots; i += 1) if (hammerCounts(i)) counted.push(i);
  if (!counted.length) return keep;
  counted.sort((a, b) => hammer.lines[b].value - hammer.lines[a].value);
  const pick = hammerBestKeep(hammerSolved(), counted.map((i) => hammer.lines[i].value), hammer.target);
  counted.slice(0, pick?.keep || 0).forEach((i) => keep.add(i));
  return keep;
}

function renderHammerTable() {
  if (!simEls.hammerTable) return;
  const keepRows = hammerKeepRows();
  const rows = [];
  for (let i = 0; i < hammer.slots; i += 1) {
    const line = hammer.lines[i];
    const mine = hammerCounts(i);
    const name = line ? hammerStatName(line.stat) : "-";
    rows.push(`
      <tr class="${[mine ? "is-target" : "", keepRows.has(i) ? "is-keep" : "", hammer.locks[i] && line ? "is-locked" : "", line ? "is-lockable" : ""].filter(Boolean).join(" ")}"${line ? ' title="눌러서 잠금을 바꿉니다"' : ""}>
        <td class="hammer-lock">
          <label><input type="checkbox" data-hammer-lock="${i}"${hammer.locks[i] ? " checked" : ""}${line ? "" : " disabled"} /><span class="hammer-lock-mark" aria-hidden="true">${hammer.locks[i] ? "🔒" : "🔓"}</span></label>
        </td>
        <td class="hammer-step">${i + 1}단계</td>
        <td class="hammer-line">${line ? `${escapeHtml(name)} <b>+${line.value}</b>` : "<span class=\"hammer-empty\">비어 있음</span>"}</td>
        <td class="hammer-manual"><input type="number" min="0" max="10" step="1" inputmode="numeric" placeholder="0" data-hammer-value="${i}" value="${mine ? line.value : ""}" title="목표 스탯 수치를 직접 넣습니다" /></td>
      </tr>`);
  }
  const locks = hammerLockCount();
  simEls.hammerTable.innerHTML = `
    <thead><tr><th>보호</th><th>단계</th><th>단계별 능력치</th><th>직접 입력</th></tr></thead>
    <tbody>${rows.join("")}</tbody>`;
  if (simEls.hammerCost) {
    simEls.hammerCost.innerHTML = `
      <span>이번 재설정 <b>${hammerFmtSeed(hammerSeedCost(locks))} 시드 · 망치 ${hammerCount(locks)}개</b></span>
      ${hammer.stopNote ? `<p class="hammer-stop-note">${hammer.stopNote}</p>` : ""}`;
  }
}

function renderHammerStatus() {
  if (!simEls.hammerStatus) return;
  const sum = hammerSum();
  const done = sum >= hammer.target;
  simEls.hammerStatus.innerHTML = `
    <div class="hammer-gauge"><span style="width:${Math.min(100, (sum / hammer.target) * 100).toFixed(1)}%"></span></div>
    <div class="hammer-status-line">
      <b class="${done ? "sim-pos" : ""}">${escapeHtml(hammerIncluded(hammer.stat).map(hammerStatName).join(" + "))} ${formatNumber(sum)} / ${formatNumber(hammer.target)}</b>
      ${done ? "<span>목표 달성</span>" : `<span>${formatNumber(hammer.target - sum)} 남음</span>`}
    </div>`;
}

// 지금 가진 값을 그대로 쓸지, 일부를 버리고 다시 굴릴지 한 줄로 알려 준다
// 지금 가진 줄을 어떻게 할지에 대한 덧붙임. 문장마다 줄을 바꿔 적는다
function hammerKeepNote(plan) {
  if (!plan.have.length) return "";
  const drop = plan.have.length - plan.pick.keep;
  const gain = plan.keepAllCost != null ? plan.keepAllCost - plan.pick.cost : 0;
  const cheaper = gain > 0 ? `<br>그대로 들고 가는 것보다 <b>${hammerFmtSeed(gain)}</b> 저렴합니다.` : "";
  if (drop <= 0) return `<br>지금 가진 ${formatNumber(plan.have.length)}줄은 그대로 두는 것이 가장 저렴합니다.`;
  if (!plan.pick.keep) return `<br>지금 ${formatNumber(plan.have.length)}줄은 모두 버리고 처음부터 다시 재설정하는 쪽이 낫습니다.${cheaper}`;
  return `<br><b>${plan.pick.kept.join(" · ")}</b>만 남기고 낮은 ${formatNumber(drop)}줄은 버리세요.${cheaper}`;
}


// 결과 칸 맨 위의 "라벨 : 값" 행들. 기대값과 현재 누적을 같은 형식(금액 · 망치 · 재설정)으로 위아래에 맞춰 적어
// 바로 견줄 수 있게 한다. 한 번도 재설정하지 않았으면 누적 행은 뺀다
const hammerStatValue = (cost, hammers, rolls) => `<b>${hammerFmtSeed(cost)}</b> · 망치 <b>${formatNumber(Math.round(hammers))}개</b> · 재설정 <b>${formatNumber(Math.round(rolls))}회</b>`;
function hammerStatRows(rows) {
  const total = hammer.rolls ? [["현재 누적", hammerStatValue(hammer.seed + hammer.hammers * hammer.price, hammer.hammers, hammer.rolls)]] : [];
  return `<dl class="hammer-plan-stats">${[rows[0], ...total, ...rows.slice(1)].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>`;
}

function renderHammerPlan() {
  if (!simEls.hammerPlan) return;
  const sum = hammerSum();
  if (sum >= hammer.target) {
    // 다 채운 뒤에는 기대값과, 이번 판(왼쪽 "누적")이 거기서 얼마나 벗어났는지를 한 줄씩 적는다.
    // 이번 판의 금액 자체는 누적에만 적는다. 같은 금액을 여러 곳에 적으면 어느 것이 맞는지 헷갈린다.
    // 수치를 직접 입력해 두고 자동 굴리기로 끝냈다면 그 상태에서의 기대값과 견준다
    if (hammer.autoBase && hammer.autoBase.key !== hammerCondKey()) hammer.autoBase = null;
    const base = hammer.autoBase || hammerScratchPlan();
    const used = hammer.seed + hammer.hammers * hammer.price;
    const gaps = base && hammer.rolls ? [
      ["비용", simDelta(used / 1e8, base.cost / 1e8, "억")],
      ["망치", simDelta(hammer.hammers, base.hammers, "개")],
      ["재설정", simDelta(hammer.rolls, base.rolls, "회")],
    ].filter(([, delta]) => delta) : [];
    simEls.hammerPlan.innerHTML = `
      <p class="hammer-plan-done"><b>목표를 채웠습니다.</b> 더 올리려면 목표치를 높여 보세요.</p>
      ${base ? `
        ${hammerStatRows([
          ["기대값", `${hammerStatValue(base.cost, base.hammers, base.rolls)} <small>(${hammer.autoBase ? "입력한 상태에서" : "처음부터"} ${formatNumber(hammer.target)}까지, 평균)</small>`],
          ...(hammer.rolls ? [["차이", gaps.length ? gaps.map(([label, delta]) => `${label} ${delta}`).join(" · ") : "없음"]] : []),
        ])}
        ${hammer.rolls ? simLuckRow(simLuckFromSamples(base.costs, used)) : ""}
      ` : ""}`;
    return;
  }
  const plan = hammerBestPlan();
  if (!plan) {
    simEls.hammerPlan.innerHTML = `<p class="hammer-plan-empty">이 조건으로는 계산이 끝나지 않습니다. 목표치를 낮추거나 단계 수를 늘려 보세요.</p>`;
    return;
  }
  // 잠금이 꽉 찬 마지막 단계에서는 더 잠글 줄이 없다. 남은 한 줄에서 모자란 수치 이상이 나오면 그대로 끝난다.
  // 이때 "N 이상 잠금"이라고 적으면 뜻이 통하지 않으므로 "N 이상 나오면 끝"으로 적는다
  const maxLock = Math.max(0, hammer.slots - 1);
  const nowLast = Math.min(plan.pick.keep, maxLock) >= maxLock;
  const lastNeed = (st, i) => {
    const held = i === 0 && nowLast ? plan.pick.sum : Math.round(st.end ?? plan.pick.sum);
    return Math.max(1, hammer.target - held);
  };
  const rows = plan.stages.map((st, i) => {
    const last = st.locks >= maxLock;
    return `
      <tr${i === 0 ? ' class="is-now"' : ""}>
        <td data-label="잠금">${st.locks}개</td>
        <td data-label="이때 잠글 값">${last ? `${lastNeed(st, i)} 이상 나오면 끝` : `${st.threshold} 이상`}</td>
        <td data-label="재설정">${formatNumber(Math.round(st.rolls))}회</td>
        <td data-label="비용" class="sim-cost">${hammerFmtSeed(st.cost)}</td>
        <td data-label="단계 끝 누적">${last ? `${formatNumber(hammer.target)} 이상` : (st.end != null ? formatNumber(Math.round(st.end)) : formatNumber(hammer.target))}</td>
      </tr>`;
  }).join("");

  const statLabel = escapeHtml(hammerIncluded(hammer.stat).map(hammerStatName).join(" · "));
  const drop = plan.have.length - plan.pick.keep;
  let nowText;
  if (nowLast) {
    const keepText = drop > 0 ? `<b>${plan.pick.kept.join(" · ")}</b> ${formatNumber(maxLock)}줄만 잠그고` : `가진 ${formatNumber(maxLock)}줄을 모두 잠그고`;
    nowText = `${keepText}, 남은 1줄에서 ${statLabel} <b>${Math.max(1, hammer.target - plan.pick.sum)} 이상</b>이 나올 때까지 재설정하세요.`;
  } else if (plan.nowThreshold <= 1) {
    nowText = `지금은 ${statLabel}이 나온 줄은 <b>수치와 상관없이 모두</b> 잠그고 나머지를 재설정하세요.${hammerKeepNote(plan)}`;
  } else {
    nowText = `지금은 ${statLabel} <b>${plan.nowThreshold} 이상</b>인 줄만 잠그고 나머지를 재설정하세요.${hammerKeepNote(plan)}`;
  }

  simEls.hammerPlan.innerHTML = `
    ${hammerStatRows([["남은 기대값", `${hammerStatValue(plan.cost, plan.hammers, plan.rolls)} <small>(목표까지, 평균)</small>`]])}
    <p class="hammer-plan-now">${nowText}</p>
    <table class="sim-table hammer-plan-table">
      <thead><tr><th>잠금</th><th>이때 잠글 값</th><th>재설정</th><th>비용</th><th>단계 끝 누적</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="hammer-plan-note">잠금이 늘수록 재설정 비용이 비싸지므로 초반에는 높은 값만 받고, 목표가 가까워지면 낮은 값도 받는 것이 가장 저렴합니다.</p>`;
}

function renderHammer() {
  renderHammerTable();
  renderHammerStatus();
  renderHammerPlan();
}

function hammerClearLog() {
  if (!simEls.hammerLog) return;
  simEls.hammerLog.hidden = true;
  simEls.hammerLog.innerHTML = "";
}

// 잠그지 않은 줄을 한 번 재설정한다 (비용 누적 포함). 화면은 부르는 쪽에서 그린다
function hammerRollOnce() {
  const locks = hammerLockCount();
  hammer.seed += hammerSeedCost(locks);
  hammer.hammers += hammerCount(locks);
  hammer.rolls += 1;
  for (let i = 0; i < hammer.slots; i += 1) {
    if (hammer.locks[i] && hammer.lines[i]) continue;
    hammer.lines[i] = hammerRollLine();
  }
}

// 추천 루트 기준으로 지금 멈춰야 하는지. 목표를 채웠거나, 잠글 만한 줄(추천 기준 이상)이 새로 떴으면 그 이유를 돌려준다.
// 기준은 자동 재설정과 같이 "잠가 둔 줄"만으로 정한다. 잠그지 않은 줄은 다음 판에 사라지기 때문이다
function hammerStopReason() {
  if (hammerSum() >= hammer.target) return "목표를 채웠습니다.";
  const maxLock = Math.max(0, hammer.slots - 1);
  const held = hammer.lines.map((line, i) => (line && hammerCounts(i) && hammer.locks[i] ? line.value : 0)).filter(Boolean);
  if (hammerLockCount() >= maxLock) return "";   // 더 잠글 수 없다. 목표를 채울 때까지 재설정할 뿐이다
  const remain = Math.max(1, Math.min(hammer.target, hammer.target - held.reduce((a, b) => a + b, 0)));
  const threshold = hammerSolved().policy[Math.min(held.length, maxLock)][remain] || 1;
  const hits = hammer.lines
    .map((line, i) => (line && hammerCounts(i) && !hammer.locks[i] && line.value >= threshold ? line.value : 0))
    .filter(Boolean)
    .sort((x, y) => y - x);
  if (!hits.length) return "";
  const what = threshold <= 1 ? "잠글 줄" : `<b>${threshold} 이상</b>`;
  return `${what}(+${hits.join(", +")})이 떠서 멈췄습니다. 잠글 줄을 골라 주세요.`;
}

// times번 재설정한다. 여러 번일 때는 추천 루트 기준에 닿으면 그 자리에서 멈춘다
function hammerRoll(times = 1) {
  if (hammerLockCount() >= hammer.slots) {
    alert("모두 잠그면 재설정할 줄이 없습니다. 하나는 풀어 주세요.");
    return;
  }
  // 직접 재설정하면 자동 재설정 로그는 지난 내역이 되어 누적과 맞지 않으므로 지운다
  hammerClearLog();
  hammer.stopNote = "";
  let done = 0;
  let reason = "";
  while (done < times) {
    hammerRollOnce();
    done += 1;
    if (times > 1) {
      reason = hammerStopReason();
      if (reason) break;
    }
  }
  if (times > 1) {
    hammer.stopNote = reason
      ? `${formatNumber(times)}회 중 ${formatNumber(done)}회째에 ${reason}`
      : `${formatNumber(times)}회 재설정하는 동안 잠글 만한 줄이 나오지 않았습니다.`;
  }
  renderHammer();
}

// 추천 루트(수치 T 이상만 잠금)대로 목표까지 실제로 굴려 본다.
// 기준 T는 시작할 때 한 번 정한다. 정책 자체가 "T 이상이면 잠근다" 한 줄이라 도중에 바뀌지 않는다.
const HAMMER_AUTO_CAP = 3000;

function hammerAuto() {
  if (hammerSum() >= hammer.target) {
    alert("이미 목표를 채웠습니다.");
    return;
  }
  const best = hammerBestPlan();
  if (!best) {
    alert("이 조건으로는 계산이 끝나지 않습니다. 목표치를 낮추거나 단계 수를 늘려 주세요.");
    return;
  }
  hammer.stopNote = "";
  const before = { rolls: hammer.rolls, seed: hammer.seed, hammers: hammer.hammers };
  // 수치를 직접 입력해 둔 채로 시작했다면 다 채운 뒤에도 "그 상태에서의 기대값"과 견주도록 남겨 둔다
  hammer.autoBase = !before.rolls && best.have.length
    ? { cost: best.cost, rolls: best.rolls, hammers: best.hammers, costs: best.costs, key: hammerCondKey() }
    : null;
  const stages = [];   // 잠금 개수가 바뀔 때마다 한 칸. 단계마다 얼마를 썼는지 남긴다
  // 누적 수치는 "잠가 둔 합"으로 적는다. 잠그지 않은 줄은 다음 판에 사라지므로 남는 값이 아니다
  const heldSumOf = (set) => [...set].reduce((sum, i) => sum + (hammer.lines[i]?.value || 0), 0);
  const maxLock = Math.max(0, hammer.slots - 1);
  // 이미 잠가 둔 줄은 이어서 들고 간다
  const held = new Set(hammer.lines.map((line, i) => (line && hammerCounts(i) && hammer.locks[i] ? i : -1)).filter((i) => i >= 0));
  let guard = 0;

  while (hammerSum() < hammer.target && guard < HAMMER_AUTO_CAP) {
    // 지금 잠금 개수와 남은 수치에 맞는 기준을 꺼내, 새로 나온 줄 중 기준 이상인 것을 더 잠근다.
    // 이미 잠근 줄은 그대로 둔다. 놓으면 쌓아 둔 수치가 사라진다.
    // 남은 수치는 "잠가 둔 줄"만으로 센다. 굴러다니는 줄은 다음 판에 사라지므로 계획에 넣으면 안 된다
    const heldSum = [...held].reduce((sum, i) => sum + (hammer.lines[i]?.value || 0), 0);
    const remain = Math.max(1, Math.min(hammer.target, hammer.target - heldSum));
    const threshold = best.solved.policy[Math.min(held.size, maxLock)][remain] || 1;
    hammer.lines
      .map((line, i) => ({ i, line }))
      .filter(({ i, line }) => line && !held.has(i) && hammerCounts(i) && line.value >= threshold)
      .sort((a, b) => b.line.value - a.line.value)
      .forEach(({ i }) => { if (held.size < maxLock) held.add(i); });
    hammer.locks = hammer.lines.map((_, i) => held.has(i));
    if (held.size >= hammer.slots) break;

    const locks = held.size;
    let stage = stages[stages.length - 1];
    if (!stage || stage.locks !== locks) {
      stage = { locks, rolls: 0, seed: 0, hammers: 0, startSum: heldSumOf(held), endSum: heldSumOf(held) };
      stages.push(stage);
    }
    hammer.seed += hammerSeedCost(locks);
    hammer.hammers += hammerCount(locks);
    hammer.rolls += 1;
    stage.seed += hammerSeedCost(locks);
    stage.hammers += hammerCount(locks);
    stage.rolls += 1;
    guard += 1;
    for (let i = 0; i < hammer.slots; i += 1) {
      if (hammer.locks[i] && hammer.lines[i]) continue;
      hammer.lines[i] = hammerRollLine();
    }
    stage.endSum = heldSumOf(held);
  }
  // 한 단계 안에서는 잠근 합이 그대로다. 다음 단계가 시작될 때의 값을 그 단계의 끝으로 적는다
  stages.forEach((st, i) => {
    st.endSum = i + 1 < stages.length ? stages[i + 1].startSum : hammerSum();
  });

  // 합계 금액은 왼쪽 "누적" 한 곳에만 적는다. 로그는 단계별 내역만 보여 주고,
  // 직접 굴린 것이 있으면 맨 위 행으로 넣어 표의 합이 누적과 맞게 한다
  const manualRow = before.rolls ? `
    <tr class="hammer-log-manual">
      <td data-label="단계">직접</td>
      <td data-label="잠금">-</td>
      <td data-label="재설정">${formatNumber(before.rolls)}회</td>
      <td data-label="시드">${hammerFmtSeed(before.seed)}</td>
      <td data-label="망치">${formatNumber(before.hammers)}개</td>
      <td data-label="누적 수치">→ <b>${formatNumber(stages.length ? stages[0].startSum : hammerSum())}</b></td>
    </tr>` : "";
  const done = hammerSum() >= hammer.target;
  const rows = stages.map((st, i) => `
    <tr>
      <td data-label="단계">${i + 1}</td>
      <td data-label="잠금">${st.locks}개</td>
      <td data-label="재설정">${formatNumber(st.rolls)}회</td>
      <td data-label="시드">${hammerFmtSeed(st.seed)}</td>
      <td data-label="망치">${formatNumber(st.hammers)}개</td>
      <td data-label="누적 수치">${formatNumber(st.startSum)} → <b>${formatNumber(st.endSum)}</b></td>
    </tr>`).join("");
  simEls.hammerLog.hidden = false;
  simEls.hammerLog.innerHTML = `
    <div class="hammer-log-head">
      <b>자동 재설정 ${done ? "완료" : "중단"}</b>
      <span>${before.rolls ? "직접 재설정 포함" : "단계별 기준 적용"}</span>
      ${done ? "" : `<span class="sim-neg">${formatNumber(HAMMER_AUTO_CAP)}회를 넘겨 멈췄습니다</span>`}
    </div>
    <div class="hammer-log-wrap">
      <table class="sim-table hammer-log-table">
        <thead><tr><th>단계</th><th>잠금</th><th>재설정</th><th>시드</th><th>망치</th><th>누적 수치</th></tr></thead>
        <tbody>${manualRow}${rows}</tbody>
      </table>
    </div>`;
  renderHammer();
}

function hammerReset() {
  hammer.autoBase = null;
  hammer.stopNote = "";
  hammer.lines = [];
  hammer.locks = [];
  hammer.rolls = 0;
  hammer.seed = 0;
  hammer.hammers = 0;
  hammerClearLog();
  renderHammer();
}

function wireHammerSim() {
  if (!simEls.hammerTable) return;
  simEls.hammerStat.innerHTML = HAMMER_STATS.map((s) => optionHtml(s.key, s.name)).join("");
  simEls.hammerStat.value = hammer.stat;
  simEls.hammerSlots.innerHTML = Array.from({ length: HAMMER_SLOT_MAX }, (_, i) => optionHtml(String(i + 1), `${i + 1}단계`)).join("");
  simEls.hammerSlots.value = String(hammer.slots);
  simEls.hammerTarget.value = String(hammer.target);
  simEls.hammerPrice.value = String(hammer.price / 10000);

  simEls.hammerStat.addEventListener("change", () => { hammer.stat = simEls.hammerStat.value; renderHammer(); });
  simEls.hammerSlots.addEventListener("change", () => {
    hammer.slots = Number(simEls.hammerSlots.value) || 7;
    hammer.lines = hammer.lines.slice(0, hammer.slots);
    hammer.locks = hammer.locks.slice(0, hammer.slots);
    renderHammer();
  });
  simEls.hammerTarget.addEventListener("input", () => {
    hammer.target = Math.max(1, Number(simEls.hammerTarget.value) || 1);
    renderHammer();
  });
  simEls.hammerPrice.addEventListener("input", () => {
    hammer.price = Math.max(0, (Number(simEls.hammerPrice.value) || 0) * 10000);
    renderHammer();
  });
  // 횟수 칸에 적은 만큼 재설정한다. 비워 두거나 1이면 한 번만
  simEls.hammerRoll.addEventListener("click", () => {
    const times = Math.min(1000, Math.max(1, Math.floor(Number(simEls.hammerRollCount?.value) || 1)));
    if (simEls.hammerRollCount) simEls.hammerRollCount.value = String(times);
    hammerRoll(times);
  });
  simEls.hammerAuto.addEventListener("click", hammerAuto);
  simEls.hammerReset.addEventListener("click", hammerReset);

  simEls.hammerTable.addEventListener("change", (event) => {
    const lock = event.target.dataset?.hammerLock;
    if (lock == null) return;
    hammer.locks[Number(lock)] = event.target.checked;
    renderHammerTable();
  });
  // 체크박스가 작아 누르기 번거로우므로 줄 아무 곳이나 눌러도 잠금이 바뀐다.
  // 체크박스·직접 입력 칸을 누른 것은 그쪽 동작에 맡긴다 (두 번 바뀌지 않게)
  simEls.hammerTable.addEventListener("click", (event) => {
    if (event.target.closest("input, label, button, a")) return;
    const box = event.target.closest("tbody tr")?.querySelector("[data-hammer-lock]");
    if (!box || box.disabled) return;
    const i = Number(box.dataset.hammerLock);
    hammer.locks[i] = !hammer.locks[i];
    renderHammerTable();
  });
  // 굴리지 않고 지금 가진 수치를 직접 넣는 칸. 목표 스탯으로 채운다
  simEls.hammerTable.addEventListener("input", (event) => {
    const idx = event.target.dataset?.hammerValue;
    if (idx == null) return;
    const i = Number(idx);
    const value = Math.min(10, Math.max(0, Number(event.target.value) || 0));
    hammer.lines[i] = value ? { stat: hammer.stat, grade: value >= 6 ? "high" : value >= 4 ? "mid" : "low", value } : null;
    if (!value) hammer.locks[i] = false;
    // 입력 중이라 표를 통째로 다시 그리면 커서가 빠진다. 그 줄만 손본다
    const row = event.target.closest("tr");
    if (row) {
      row.classList.toggle("is-target", !!value);
      const cell = row.children[2];
      if (cell) {
        cell.innerHTML = value
          ? `${escapeHtml(hammerStatName(hammer.stat))} <b>+${value}</b>`
          : '<span class="hammer-empty">비어 있음</span>';
      }
      const lock = row.querySelector("[data-hammer-lock]");
      if (lock) {
        lock.disabled = !value;
        if (!value) lock.checked = false;
      }
      row.classList.toggle("is-lockable", !!value);
      if (!value) row.classList.remove("is-locked");
    }
    // 값이 바뀌면 어느 줄을 남길지도 달라진다. 표를 다시 그리지 않고 강조 표시만 맞춘다
    const keepRows = hammerKeepRows();
    simEls.hammerTable.querySelectorAll("tbody tr").forEach((tr, n) => tr.classList.toggle("is-keep", keepRows.has(n)));
    renderHammerStatus();
    renderHammerPlan();
  });
  renderHammer();
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
function relicRun(sampled) {
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
  const luckSteps = [];
  let totalAttempts = 0;
  let totalPowder = 0, totalEssence = 0, totalMoonStone = 0, totalMoonPiece = 0;
  const model = { powder: 0, moonPiece: 0 };
  let reached = currentLevel;
  let stopReason = null;

  for (let level = currentLevel + 1; level <= targetLevel; level++) {
    const chance = RELIC_RATES[level - 1][difficulty - 1];
    if (chance <= 0) {
      stopReason = `${relicFmtLevel(level)} 강화 확률이 0%라 ${relicFmtLevel(level - 1)}에서 정지`;
      break;
    }
    const cost = costs[level - 1];
    const expected = sampled
      ? simDrawUntil(cost.required, chance)
      : cost.required / chance;
    const modelAttempt = cost.required / chance;
    luckSteps.push({ rate: chance, successes: cost.required });
    totalAttempts += expected;
    model.powder += modelAttempt * cost.powder;
    model.moonPiece += modelAttempt * cost.moonPiece;
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
  // 정수와 월광석은 단계마다 정해진 양이라 판마다 달라지지 않는다
  const gap = (value, expected) => (sampled ? simDelta(value, expected) : "");
  const mats = [];
  if (totalPowder > 0 || totalEssence > 0) {
    mats.push(`<span>${simIcon("응축된신조의가루.png", 24)}${relicFmtNum(totalPowder)}개${gap(totalPowder, model.powder)}</span>`);
    mats.push(`<span>${simIcon("신조의정수.png", 24)}${relicFmtNum(totalEssence)}개</span>`);
  }
  if (totalMoonPiece > 0 || totalMoonStone > 0) {
    mats.push(`<span>${simIcon("달의파편.png", 24)}${relicFmtNum(totalMoonPiece)}개${gap(totalMoonPiece, model.moonPiece)}</span>`);
    mats.push(`<span>${simIcon("월광석.png", 24)}${relicFmtNum(totalMoonStone)}개</span>`);
  }
  let html = `<div class="sim-summary-title">| ${escapeHtml(name)} | ${escapeHtml(relicFmtLevel(currentLevel))} → ${escapeHtml(relicFmtLevel(targetLevel))} | ${escapeHtml(relicFmtLevel(reached))} MAX | ${sampled ? "시뮬레이션" : "기대값"} |</div>`;
  html += `<div class="sim-summary-mats">${mats.join("")}</div>`;
  if (sampled) html += simLuckRow(simLuckStats(luckSteps, totalAttempts));
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
      <td class="rr-mat">${s.elso.toLocaleString("ko-KR")}</td>
    </tr>`;
  }).join("");

  return `<table class="rr-table rr-core">
    <thead><tr>
      <th class="rr-corner">단계</th>
      <th class="${curType ? "is-on" : ""}">머큐리얼/어비스</th>
      <th class="${curType ? "" : "is-on"}">이클립스/루비코나</th>
      <th>가루</th><th>결정</th><th>시드</th><th>엘소</th>
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

function relicCalc() {
  relicRun(false);
}

function relicSim() {
  relicRun(true);
}

function wireRelicSim() {
  simEls.relicCalc.addEventListener("click", relicCalc);
  simEls.relicSim?.addEventListener("click", relicSim);
}

// ── 장비 강화 시뮬 (EquipEnhanceSimulatorView) ─────────────────
// 12~15단계 구간이다. 실패해도 단계가 떨어지지 않고 행운석·부적도 쓸 수 없어
// 단계마다 한 번씩 뽑으면 된다. 첨자 = 출발 단계 − ENH_BASE, 시드는 만 단위다.
const ENH_BASE = 12;

const ENH_STEPS = [
  { success: 0.010, stone: 1, seedMan: 744 },  // 12 → 13
  { success: 0.009, stone: 2, seedMan: 806 },
  { success: 0.008, stone: 3, seedMan: 868 },  // 14 → 15
];

const ENH_TOP = ENH_BASE + ENH_STEPS.length;

function enhStep(level) {
  return ENH_STEPS[level - ENH_BASE];
}

function enhRate(level) {
  const step = enhStep(level);
  return step ? step.success / 100 : 0;
}

function enhFmtPct(rate) {
  // 0.01/100 을 되돌리면 0.009999… 가 나온다. 소수 셋째 자리에서 끊는다
  const pct = Math.round(rate * 100000) / 1000;
  if (pct === 0) return "0%";
  return `${pct < 1 ? pct.toFixed(3) : String(pct)}%`;
}

// 시뮬레이션 값은 실제로 굴린 횟수라 정수다. 기대값만 소수로 보여준다
function enhFmtCount(value, sampled) {
  if (sampled || value >= 100) return Math.round(value).toLocaleString("ko-KR");
  return value.toFixed(value >= 10 ? 1 : 2);
}

function enhRun(sampled) {
  const start = parseInt(simEls.enhStart.value, 10);
  const target = parseInt(simEls.enhTarget.value, 10);
  if (start >= target) {
    alert("목표 단계는 시작 단계보다 높아야 합니다.");
    return;
  }

  const rows = [];
  const luckSteps = [];
  let total = 0, totalStone = 0, totalSeed = 0;
  const model = { total: 0, stone: 0, seed: 0 };

  for (let level = start; level < target; level += 1) {
    const step = enhStep(level);
    const rate = enhRate(level);
    const attempt = sampled ? simDrawAttempts(rate) : 1 / rate;
    const expected = 1 / rate;
    luckSteps.push({ rate });

    total += attempt;
    totalStone += attempt * step.stone;
    totalSeed += attempt * step.seedMan;
    model.total += expected;
    model.stone += expected * step.stone;
    model.seed += expected * step.seedMan;

    rows.push({
      level,
      rate,
      attempt,
      total,
      stone: attempt * step.stone,
      seed: attempt * step.seedMan,
    });
  }

  enhRenderTable(rows, sampled);

  const n = (v) => enhFmtCount(v, sampled);
  const gap = (value, expected, unit) => (sampled ? simDelta(value, expected, unit) : "");
  const mats = [
    `<span>${sampled ? "총" : "기대"} 시도 ${n(total)}회${gap(total, model.total)}</span>`,
    `<span>${simIcon("빛나는장비강화석.png", 24)}${n(totalStone)}개${gap(totalStone, model.stone)}</span>`,
    `<span>${simIcon("시드.png", 24)}${formatMan(totalSeed)}${gap(totalSeed / 10000, model.seed / 10000, "억")}</span>`,
  ];

  simEls.enhSummary.innerHTML =
    `<div class="sim-summary-title">| ${start}단계 → ${target}단계 | ${sampled ? "시뮬레이션" : "기대값"} |</div>`
    + `<div class="sim-summary-mats">${mats.join("")}</div>`
    + (sampled ? simLuckRow(simLuckStats(luckSteps, total)) : "");
}

function enhRenderTable(rows, sampled) {
  const head = ["단계", "성공 확률", sampled ? "시도" : "기대 시도", "누적 시도",
    `${simIcon("빛나는장비강화석.png")}강화석`, `${simIcon("시드.png")}시드`];
  // 폰에서는 표를 카드로 펴므로 셀마다 이름을 달아둔다 (머리글이 안 보인다)
  const labels = ["단계", "성공 확률", "시도", "누적 시도", "강화석", "시드"];
  const n = (v) => enhFmtCount(v, sampled);
  const body = rows
    .map((r) => {
      const cells = [
        `${r.level} → ${r.level + 1}`,
        enhFmtPct(r.rate),
        `${n(r.attempt)}회`,
        `${n(r.total)}회`,
        `${n(r.stone)}개`,
        formatMan(r.seed),
      ];
      return "<tr>" + cells
        .map((c, i) => `<td data-label="${escapeHtml(labels[i])}">${escapeHtml(c)}</td>`)
        .join("") + "</tr>";
    })
    .join("");
  simEls.enhTable.innerHTML =
    `<thead><tr>${head.map((h) => `<th><span class="sim-th">${h}</span></th>`).join("")}</tr></thead><tbody>${body}</tbody>`;
}

function enhCalc() {
  enhRun(false);
}

function enhSim() {
  enhRun(true);
}

function enhPopulateSelects() {
  const stages = (from, to) => {
    let html = "";
    for (let i = from; i <= to; i += 1) html += `<option value="${i}">${i}단계</option>`;
    return html;
  };
  simEls.enhStart.innerHTML = stages(ENH_BASE, ENH_TOP - 1);
  simEls.enhTarget.innerHTML = stages(ENH_BASE + 1, ENH_TOP);
  simEls.enhTarget.value = String(ENH_TOP);
}


// ── 시에나 증폭 시뮬 ─────────────────
// 1~10단계. 실패해도 단계가 떨어지지 않으므로 단계마다 성공할 때까지 굴린 횟수만 세면 된다.
// 재료(힌덴의 가루·장인의 혼)와 비용(시드·엘소)은 시도할 때마다 든다.
// 기대값과 시뮬레이션을 나란히 보면 이번 판이 운이 좋았는지 나빴는지 알 수 있다.
const SIENA_STEPS = [
  { from: 1, rate: 0.80, hinden: 12, soul: 0, seed: 110000000, elso: 16500 },
  { from: 2, rate: 0.60, hinden: 14, soul: 0, seed: 121000000, elso: 18150 },
  { from: 3, rate: 0.40, hinden: 16, soul: 0, seed: 133100000, elso: 19965 },
  { from: 4, rate: 0.20, hinden: 19, soul: 0, seed: 146410000, elso: 21961 },
  { from: 5, rate: 0.10, hinden: 26, soul: 0, seed: 175692000, elso: 26353 },
  { from: 6, rate: 0.03, hinden: 36, soul: 0, seed: 210830400, elso: 31623 },
  { from: 7, rate: 0.02, hinden: 50, soul: 1, seed: 252996480, elso: 37950 },
  { from: 8, rate: 0.01, hinden: 70, soul: 2, seed: 303595776, elso: 45518 },
  { from: 9, rate: 0.005, hinden: 119, soul: 3, seed: 455393664, elso: 68306 },
];

const SIENA_TOP = 10;

const sienaStep = (level) => SIENA_STEPS.find((step) => step.from === level);

function sienaFmtPct(rate) {
  const pct = Math.round(rate * 100000) / 1000;
  return `${pct < 1 ? pct.toFixed(1) : String(pct)}%`;
}

// 시뮬레이션 값은 실제로 굴린 횟수라 정수다. 기대값만 소수로 보여준다
function sienaFmtCount(value, sampled) {
  if (sampled || value >= 100) return Math.round(value).toLocaleString("ko-KR");
  return value.toFixed(value >= 10 ? 1 : 2);
}

function sienaRun(sampled) {
  const start = parseInt(simEls.sienaStart.value, 10);
  const target = parseInt(simEls.sienaTarget.value, 10);
  if (start >= target) {
    alert("목표 단계는 시작 단계보다 높아야 합니다.");
    return;
  }

  const rows = [];
  const luckSteps = [];
  let total = 0, hinden = 0, soul = 0, seed = 0, elso = 0;
  const model = { total: 0, hinden: 0, soul: 0, seed: 0, elso: 0 };

  for (let level = start; level < target; level += 1) {
    const step = sienaStep(level);
    if (!step) continue;
    const attempt = sampled ? simDrawAttempts(step.rate) : 1 / step.rate;
    const expected = 1 / step.rate;
    luckSteps.push({ rate: step.rate });

    total += attempt;
    hinden += attempt * step.hinden;
    soul += attempt * step.soul;
    seed += attempt * step.seed;
    elso += attempt * step.elso;
    model.total += expected;
    model.hinden += expected * step.hinden;
    model.soul += expected * step.soul;
    model.seed += expected * step.seed;
    model.elso += expected * step.elso;

    rows.push({
      level,
      rate: step.rate,
      attempt,
      expected,
      total,
      hinden: attempt * step.hinden,
      soul: attempt * step.soul,
      seed: attempt * step.seed,
      elso: attempt * step.elso,
    });
  }

  sienaRenderTable(rows, sampled);

  const n = (value) => sienaFmtCount(value, sampled);
  const gap = (value, expected, unit) => (sampled ? simDelta(value, expected, unit) : "");
  const mats = [
    `<span>${sampled ? "총" : "기대"} 시도 ${n(total)}회${gap(total, model.total)}</span>`,
    `<span>${simIcon("힌덴의가루.png", 24)}${n(hinden)}개${gap(hinden, model.hinden)}</span>`,
    `<span>${simIcon("시드.png", 24)}${formatMan(seed / 10000)}${gap(seed / 100000000, model.seed / 100000000, "억")}</span>`,
    `<span>엘소 ${n(elso)}${gap(elso, model.elso)}</span>`,
  ];

  // 장인의 혼은 개수 단위라 정수로 보여주고, 안 드는 구간만 고르면 줄에서 아예 뺀다
  if (soul > 0) {
    mats.splice(2, 0, `<span>${simIcon("장인의혼.png", 24)}${Math.ceil(soul).toLocaleString("ko-KR")}개${gap(soul, model.soul)}</span>`);
  }

  simEls.sienaSummary.innerHTML =
    `<div class="sim-summary-title">| ${start}단계 → ${target}단계 | ${sampled ? "시뮬레이션" : "기대값"} |</div>`
    + `<div class="sim-summary-mats">${mats.join("")}</div>`
    + (sampled ? simLuckRow(simLuckStats(luckSteps, total)) : "");
}

function sienaRenderTable(rows, sampled) {
  const head = ["단계", "성공 확률", sampled ? "시도" : "기대 시도", "누적 시도",
    `${simIcon("힌덴의가루.png")}힌덴의 가루`, `${simIcon("장인의혼.png")}장인의 혼`, `${simIcon("시드.png")}시드`, "엘소"];
  // 폰에서는 표를 카드로 펴므로 셀마다 이름을 달아둔다 (머리글이 안 보인다)
  const labels = ["단계", "성공 확률", "시도", "누적 시도", "힌덴의 가루", "장인의 혼", "시드", "엘소"];
  const n = (value) => sienaFmtCount(value, sampled);
  const body = rows.map((row) => {
    const cells = [
      `${row.level} → ${row.level + 1}`,
      sienaFmtPct(row.rate),
      `${n(row.attempt)}회`,
      `${n(row.total)}회`,
      `${n(row.hinden)}개`,
      row.soul > 0 ? `${Math.ceil(row.soul).toLocaleString("ko-KR")}개` : "-",
      formatMan(row.seed / 10000),
      n(row.elso),
    ];
    return "<tr>" + cells
      .map((cell, i) => `<td data-label="${escapeHtml(labels[i])}">${escapeHtml(cell)}</td>`)
      .join("") + "</tr>";
  }).join("");
  simEls.sienaTable.innerHTML =
    `<thead><tr>${head.map((h) => `<th><span class="sim-th">${h}</span></th>`).join("")}</tr></thead><tbody>${body}</tbody>`;
}

function sienaPopulateSelects() {
  const stages = (from, to) => {
    let html = "";
    for (let i = from; i <= to; i += 1) html += `<option value="${i}">${i}단계</option>`;
    return html;
  };
  simEls.sienaStart.innerHTML = stages(1, SIENA_TOP - 1);
  simEls.sienaTarget.innerHTML = stages(2, SIENA_TOP);
  simEls.sienaTarget.value = String(SIENA_TOP);
}

// ── 시에나의 기운 추가 옵션 재설정 시뮬 ───────────────────────────
//
// 확률표: https://static.tales.nexon.com/Probability/Game/16-1#mk-3
// 3·7·10단계에 슬롯이 하나씩 열린다. 슬롯끼리는 같은 종류(등급 무관)가 나오지 않고,
// 나온 종류는 빼고 남은 확률을 다시 100%로 나눠 뽑는다.
// 환류의 서는 모든 슬롯을 앞에서부터 차례로 다시 뽑고, 정환의 서는 고른 슬롯 하나만 다시 뽑는다.
const auraRange = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// [종류, 등급, 획득 확률(%), 나올 수 있는 값(동일 확률)]
const AURA_TABLE = [
  ["공격력 증가", "하", 0.9, [1, 2]],
  ["방어력 증가", "하", 5, [1, 2]],
  ["방어 무시 공격 확률", "하", 0.4, [1]],
  ["중딜레이 감소", "하", 0.4, [0.5]],
  ["모든 스탯 증가", "하", 5, auraRange(5, 10)],
  ["크리티컬 발동 확률 증가", "하", 5, auraRange(1, 3)],
  ["HP 증가", "하", 10, auraRange(5, 9)],
  ["MP 증가", "하", 10, auraRange(1, 5)],
  ["SP 증가", "하", 10, auraRange(1, 5)],
  ["공격력 증가", "중", 0.42, auraRange(3, 5)],
  ["방어력 증가", "중", 3, auraRange(3, 5)],
  ["방어 무시 공격 확률", "중", 0.1, [2]],
  ["중딜레이 감소", "중", 0.1, [1]],
  ["모든 스탯 증가", "중", 3, auraRange(11, 20)],
  ["크리티컬 발동 확률 증가", "중", 3, auraRange(4, 7)],
  ["HP 증가", "중", 8, auraRange(10, 14)],
  ["MP 증가", "중", 8, auraRange(6, 10)],
  ["SP 증가", "중", 8, auraRange(6, 10)],
  ["공격력 증가", "상", 0.05, auraRange(8, 10)],
  ["방어력 증가", "상", 0.57, auraRange(8, 10)],
  ["방어 무시 공격 확률", "상", 0.03, [3]],
  ["중딜레이 감소", "상", 0.03, [2]],
  ["모든 스탯 증가", "상", 0.5, auraRange(21, 30)],
  ["크리티컬 발동 확률 증가", "상", 0.5, auraRange(8, 10)],
  ["HP 증가", "상", 6, auraRange(15, 20)],
  ["MP 증가", "상", 6, auraRange(11, 15)],
  ["SP 증가", "상", 6, auraRange(11, 15)],
].map(([type, grade, rate, values]) => ({ type, grade, rate, values }));

const AURA_TYPES = [...new Set(AURA_TABLE.map((row) => row.type))];
const AURA_STAGES = [3, 7, 10];
const AURA_GRADE_RANK = { "하": 0, "중": 1, "상": 2 };
const AURA_GRADE_CLASS = { "하": "is-low", "중": "is-mid", "상": "is-high" };
// 시드는 만 단위(formatMan), 엘소는 개수
const AURA_BOOKS = {
  ret: { name: "환류의 서", icon: "환류의서.png", seed: 100, elso: 150, cash: 584 },
  jung: { name: "정환의 서", icon: "정환의서.png", seed: 10000, elso: 15000, cash: 1300 },
};
const AURA_IMG_BASE = SIM_IMG_BASE;
const auraBookIcon = (book) => `<img class="aura-book-icon" src="${AURA_IMG_BASE}${encodeURIComponent(AURA_BOOKS[book].icon)}" alt="" />`;
const AURA_LOG_MAX = 3; // 최근 기록만 보여준다

const aura = {
  slots: 1,       // 처음엔 시에나 3단계(슬롯 1개)
  pay: "seed",
  book: "ret",
  options: [],
  changed: [],    // 직전 재설정에서 바뀐 슬롯
  pick: 0,        // 정환의 서로 바꿀 슬롯
  // 자동 재설정 목표. 줄마다 종류와 최소 수치를 고른다(종류가 빈 줄은 목표 아님)
  goals: [{ type: "", min: 0 }, { type: "", min: 0 }, { type: "", min: 0 }],
  used: { ret: 0, jung: 0 },
  auto: null,     // 마지막 자동 재설정 결과
  stopNote: "",   // 여러 번 재설정하다 목표가 나와 멈췄을 때 안내
  log: [],
};

// 이미 나온 종류는 빼고 남은 확률 비율대로 하나 뽑는다
function auraRollOption(excludeTypes) {
  const pool = AURA_TABLE.filter((row) => !excludeTypes.includes(row.type));
  const total = pool.reduce((sum, row) => sum + row.rate, 0);
  let r = Math.random() * total;
  let row = pool[pool.length - 1];
  for (const candidate of pool) {
    r -= candidate.rate;
    if (r < 0) { row = candidate; break; }
  }
  const value = row.values[Math.floor(Math.random() * row.values.length)];
  return { type: row.type, grade: row.grade, value };
}

// 환류의 서: 첫 슬롯부터 차례로, 앞 슬롯에서 나온 종류를 빼 가며 뽑는다
function auraRollAll(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) out.push(auraRollOption(out.map((o) => o.type)));
  return out;
}

// 정환의 서: 나머지 슬롯에 있는 종류만 빼고 그 슬롯을 다시 뽑는다
function auraRollSlot(options, slot) {
  const next = options.slice();
  next[slot] = auraRollOption(options.filter((_, i) => i !== slot).map((o) => o.type));
  return next;
}

// 종류별로 나올 수 있는 수치(작은 것부터). 수치 콤보 박스와 확률 계산에 쓴다
const AURA_VALUES = Object.fromEntries(AURA_TYPES.map((type) => [type,
  [...new Set(AURA_TABLE.filter((row) => row.type === type).flatMap((row) => row.values))].sort((a, b) => a - b)]));

// 지금 유효한 목표. 열린 줄 수만큼만 보고, 같은 종류는 한 번만 센다
function auraTargets() {
  const seen = new Set();
  return aura.goals.slice(0, auraTargetMax()).filter((goal) => {
    if (!goal.type || seen.has(goal.type)) return false;
    seen.add(goal.type);
    return true;
  });
}

function auraGoalFor(type) {
  return auraTargets().find((goal) => goal.type === type);
}

function auraMeets(option) {
  const goal = option && auraGoalFor(option.type);
  return !!goal && option.value >= goal.min;
}

function auraDone(options) {
  return auraTargets().every((goal) => options.some((o) => o.type === goal.type && o.value >= goal.min));
}

// 한 줄(등급)에서 최소 수치 이상이 나올 비율. 값은 줄 안에서 같은 확률
function auraRowOk(row, min) {
  return row.rate * row.values.filter((v) => v >= min).length / row.values.length;
}

// 환류의 서 한 번으로 목표를 모두 채울 확률과, "채운 결과"를 바로 뽑는 함수.
// 종류 순서를 전부 늘어놓고 더한다(9P3 = 504가지).
function auraRetModel() {
  const typeRate = {};
  const typeOk = {};
  const targets = auraTargets();
  AURA_TABLE.forEach((row) => {
    typeRate[row.type] = (typeRate[row.type] || 0) + row.rate;
    const goal = targets.find((g) => g.type === row.type);
    if (goal) typeOk[row.type] = (typeOk[row.type] || 0) + auraRowOk(row, goal.min);
  });
  // 이 종류가 이번 슬롯에 (목표 수치를 채우며) 나올 확률
  const stepP = (type, remain) => (typeRate[type] / remain)
    * (typeOk[type] !== undefined ? typeOk[type] / typeRate[type] : 1);
  const memo = new Map();
  const walk = (k, used, remain) => {
    if (k === aura.slots) return targets.every((g) => used.includes(g.type)) ? 1 : 0;
    const key = `${k}|${[...used].sort().join(",")}`;
    if (memo.has(key)) return memo.get(key);
    let sum = 0;
    for (const type of AURA_TYPES) {
      if (used.includes(type)) continue;
      const p = stepP(type, remain);
      if (p > 0) sum += p * walk(k + 1, [...used, type], remain - typeRate[type]);
    }
    memo.set(key, sum);
    return sum;
  };
  const total = AURA_TYPES.reduce((sum, t) => sum + typeRate[t], 0);

  // 성공한 판 하나를 성공 조건부 확률대로 뽑는다. 실패 판은 결과에 남지 않으니 굴릴 필요가 없다
  const sample = () => {
    const used = [];
    let remain = total;
    for (let k = 0; k < aura.slots; k += 1) {
      const weights = AURA_TYPES.map((type) => (used.includes(type) ? 0
        : stepP(type, remain) * walk(k + 1, [...used, type], remain - typeRate[type])));
      const type = AURA_TYPES[auraPickWeighted(weights)];
      used.push(type);
      remain -= typeRate[type];
    }
    return used.map((type) => {
      const goal = targets.find((g) => g.type === type);
      return auraRollOfType(type, goal ? goal.min : -Infinity);
    });
  };
  return { chance: walk(0, [], total), sample };
}

function auraPickWeighted(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    r -= weights[i];
    if (r < 0 && weights[i] > 0) return i;
  }
  return weights.findLastIndex((w) => w > 0);
}

// 정해진 종류로, 최소 수치 이상인 옵션 하나(등급·값은 그 조건 안에서 확률대로)
function auraRollOfType(type, min) {
  const rows = AURA_TABLE.filter((row) => row.type === type);
  const row = rows[auraPickWeighted(rows.map((r) => auraRowOk(r, min)))];
  const values = row.values.filter((v) => v >= min);
  return { type, grade: row.grade, value: values[Math.floor(Math.random() * values.length)] };
}

// 성공까지 걸린 횟수(기하분포). 확률이 아주 작아도 한 번에 뽑는다
function auraGeom(p) {
  if (p >= 1) return 1;
  return Math.max(1, Math.ceil(Math.log(1 - Math.random()) / Math.log1p(-p)));
}

// 정환의 서 한 번으로 고른 슬롯에 목표가 나올 확률. 다른 슬롯의 종류는 빠진 채로 뽑는다
function auraJungChance(options, slot) {
  const others = options.filter((_, i) => i !== slot).map((o) => o.type);
  const pool = AURA_TABLE.filter((row) => !others.includes(row.type));
  const total = pool.reduce((sum, row) => sum + row.rate, 0);
  const goal = auraTargets()[0];
  const ok = goal ? pool.filter((row) => row.type === goal.type)
    .reduce((sum, row) => sum + auraRowOk(row, goal.min), 0) : 0;
  return total > 0 ? ok / total : 0;
}

// 운 비교용: 매번 같은 확률이라 기하분포로 여러 판을 바로 뽑는다
function auraLuckSamples(chance) {
  const samples = [];
  if (chance > 0) for (let t = 0; t < 3000; t += 1) samples.push(auraGeom(chance));
  return samples;
}

function auraFormat(option) {
  if (option.type === "모든 스탯 증가") return `${option.type} +${option.value}`;
  if (option.type === "중딜레이 감소") return `${option.type} +${option.value.toFixed(2)}%`;
  return `${option.type} +${option.value}%`;
}

function auraOptionHtml(option, changed) {
  if (!option) return `<span class="aura-opt is-empty">????</span>`;
  return `<span class="aura-opt ${AURA_GRADE_CLASS[option.grade]}${changed ? " is-changed" : ""}${auraMeets(option) ? " is-goal" : ""}">`
    + `${escapeHtml(auraFormat(option))}<small>${option.grade}</small></span>`;
}

function auraSpend(book, times = 1) {
  aura.used[book] += times;
}

// 책을 캐시로 산다면 얼마인지. 기대값은 소수 횟수라 "약"을 붙인다
function auraCashText(book, times, approx = false) {
  if (!(times > 0)) return "";
  const cash = formatNumber(Math.round(times * AURA_BOOKS[book].cash));
  return ` <small class="aura-cash">(${approx ? "약 " : ""}${cash} 캐시)</small>`;
}

// 금액 차이. 기대값보다 많이 썼으면 빨강(+), 적게 썼으면 초록(−)
function auraCostDelta(book, actual, expected) {
  const cost = AURA_BOOKS[book];
  const unit = aura.pay === "seed" ? cost.seed : cost.elso;
  const gap = Math.round(actual * unit) - Math.round(expected * unit);
  if (!gap) return "";
  const text = aura.pay === "seed" ? formatMan(Math.abs(gap)) : formatNumber(Math.abs(gap));
  return `<b class="sim-delta ${gap > 0 ? "up" : "down"}">${gap > 0 ? "+" : "−"}${text}</b>`;
}

function auraCostText(book, times) {
  const cost = AURA_BOOKS[book];
  return aura.pay === "seed"
    ? `${formatMan(cost.seed * times)} 시드`
    : `${formatNumber(Math.round(cost.elso * times))} 엘소`;
}

function auraPushLog(text, options, changed) {
  aura.log.unshift({ n: aura.used.ret + aura.used.jung, book: aura.book, text, options, changed });
  aura.log.length = Math.min(aura.log.length, AURA_LOG_MAX);
}

function auraChangedSlots(before, after) {
  return after.map((o, i) => i).filter((i) => {
    const a = before[i];
    const b = after[i];
    return !a || a.type !== b.type || a.grade !== b.grade || a.value !== b.value;
  });
}

const AURA_ROLL_MAX = 10000;

// 지금 고른 아이템 기준으로 목표를 채웠는지. 환류는 목표 전부, 정환은 고른 슬롯에 목표 하나
function auraGoalMet(options, book, slot) {
  if (!auraTargets().length) return false;
  return book === "ret" ? auraDone(options) : auraMeets(options[slot]);
}

// 적은 횟수만큼 재설정한다. 결과는 바로 적용되고, 목표 옵션이 나오면 남은 횟수는 쓰지 않고 멈춘다
function auraRoll() {
  const book = aura.book;
  const slot = Math.min(aura.pick, aura.slots - 1);
  const want = Math.min(AURA_ROLL_MAX, Math.max(1, Math.floor(Number(simEls.auraRollCount.value) || 1)));
  simEls.auraRollCount.value = String(want);
  aura.stopNote = "";
  let done = 0;
  for (let k = 0; k < want; k += 1) {
    const before = aura.options;
    auraSpend(book);
    aura.options = book === "ret" ? auraRollAll(aura.slots) : auraRollSlot(before, slot);
    aura.changed = book === "ret" ? aura.options.map((o, i) => i) : [slot];
    auraPushLog(
      book === "ret" ? AURA_BOOKS.ret.name : `${AURA_BOOKS.jung.name} (${AURA_STAGES[slot]}단계)`,
      aura.options, aura.changed);
    done += 1;
    if (auraGoalMet(aura.options, book, slot)) {
      if (want > 1) aura.stopNote = `목표 옵션이 나와 ${formatNumber(done)}회째에서 멈췄습니다. (${formatNumber(want)}회 중)`;
      break;
    }
  }
  renderAura();
}

// 환류의 서: 고른 목표가 모두 나올 때까지 전체를 굴린다.
// 정환의 서: 고른 슬롯 하나만, 목표 옵션 하나가 그 슬롯에 나올 때까지 굴린다.
function auraAuto() {
  if (!auraTargets().length) {
    alert("자동 재설정으로 노릴 옵션을 먼저 골라 주세요.");
    return;
  }
  const book = aura.book;
  const slot = Math.min(aura.pick, aura.slots - 1);
  const goal = (options) => (book === "ret" ? auraDone(options) : auraMeets(options[slot]));
  if (goal(aura.options)) {
    alert("이미 목표를 달성했습니다.");
    return;
  }
  const model = book === "ret" ? auraRetModel() : null;
  const chance = book === "ret" ? model.chance : auraJungChance(aura.options, slot);
  if (!(chance > 0)) {
    alert(book === "ret"
      ? "이 조합은 나올 수 없습니다."
      : "다른 슬롯에 같은 종류의 옵션이 있어 이 슬롯에는 나올 수 없습니다.");
    return;
  }
  // 매 회 결과는 서로 독립이라, 실제로 하나씩 굴린 것과 같은 분포로
  // 걸린 횟수(기하분포)와 마지막 성공 결과를 바로 뽑는다. 확률이 아주 낮아도 멈추지 않는다
  const start = aura.options;
  const n = auraGeom(chance);
  let options;
  if (book === "ret") {
    options = model.sample();
  } else {
    const goalType = auraTargets()[0];
    options = start.slice();
    options[slot] = auraRollOfType(goalType.type, goalType.min);
  }
  auraSpend(book, n);
  aura.stopNote = "";
  aura.options = options;
  aura.changed = book === "ret" ? auraChangedSlots(start, options) : [slot];
  aura.auto = {
    book, n,
    expected: 1 / chance,
    luck: simLuckFromSamples(auraLuckSamples(chance), n),
  };
  const where = book === "jung" ? ` (${AURA_STAGES[slot]}단계)` : "";
  // 자동 재설정은 한 번의 결과로 본다. 앞선 기록은 지우고 이번 결과 한 줄만 남긴다
  aura.log = [];
  auraPushLog(`자동 재설정 · ${AURA_BOOKS[book].name}${where} ${formatNumber(n)}회`, options, aura.changed);
  renderAura();
}

// 처음 옵션은 증폭으로 이미 받은 셈이라 비용 없이 뽑는다
function auraReset() {
  aura.options = auraRollAll(aura.slots);
  aura.changed = [];
  aura.pick = Math.min(aura.pick, aura.slots - 1);
  aura.used = { ret: 0, jung: 0 };
  aura.auto = null;
  aura.stopNote = "";
  aura.log = [];
  renderAura();
}

// 3단계(슬롯 1개)나 정환의 서(슬롯 하나만 바꿈)는 목표를 1개만 고른다
function auraTargetMax() {
  return aura.slots === 1 || aura.book === "jung" ? 1 : aura.slots;
}

function auraValueText(type, value) {
  if (type === "모든 스탯 증가") return String(value);
  return `${type === "중딜레이 감소" ? value.toFixed(2) : value}%`;
}

// 목표 줄: [종류] [최소 수치]. 수치는 그 종류에 나올 수 있는 값만 보여준다
function renderAuraTargets() {
  const max = auraTargetMax();
  const taken = (i) => aura.goals.slice(0, max).filter((g, j) => j !== i && g.type).map((g) => g.type);
  simEls.auraTargets.innerHTML = aura.goals.slice(0, max).map((goal, i) => {
    const values = goal.type ? AURA_VALUES[goal.type] : [];
    const types = AURA_TYPES.filter((t) => !taken(i).includes(t));
    return `<div class="aura-goal-row" data-aura-goal="${i}">
      ${max > 1 ? `<span class="aura-goal-n">목표 ${i + 1}</span>` : ""}
      <select data-aura-goal-type aria-label="목표 옵션">
        <option value="">${i === 0 ? "옵션 선택" : "선택 안 함"}</option>
        ${types.map((t) => `<option value="${escapeHtml(t)}"${t === goal.type ? " selected" : ""}>${escapeHtml(t)}</option>`).join("")}
      </select>
      <select data-aura-goal-min aria-label="최소 수치"${goal.type ? "" : " disabled"}>
        ${values.map((v, k) => `<option value="${v}"${v === goal.min ? " selected" : ""}>${auraValueText(goal.type, v)}${k < values.length - 1 ? " 이상" : ""}</option>`).join("")}
      </select>
    </div>`;
  }).join("");
  simEls.auraTargetNote.textContent = max === 1
    ? (aura.book === "jung" ? "고른 슬롯에 나올 때까지" : "1개")
    : `최대 ${max}개`;
}

function renderAura() {
  if (!simEls.auraBoard) return;
  const jung = aura.book === "jung";

  const current = AURA_STAGES.map((stage, i) => {
    const open = i < aura.slots;
    if (!open) return `<li class="is-locked"><div><b>${stage}단계</b>${auraOptionHtml(null, false)}</div></li>`;
    const changed = aura.changed.includes(i);
    const option = auraOptionHtml(aura.options[i], changed);
    if (!jung) return `<li class="${changed ? "is-changed" : ""}"><div><b>${stage}단계</b>${option}</div></li>`;
    return `<li class="${changed ? "is-changed" : ""}"><label>`
      + `<input type="radio" name="auraPick" value="${i}"${aura.pick === i ? " checked" : ""} title="정환의 서로 바꿀 슬롯" />`
      + `<b>${stage}단계</b>${option}</label></li>`;
  }).join("");

  simEls.auraBoard.innerHTML = `
    <div class="aura-col">
      <h4>현재 옵션${jung ? ` <small>바꿀 슬롯을 고르세요</small>` : ""}</h4>
      <ul>${current}</ul>
    </div>`;

  renderAuraTargets();

  // 결제 버튼에 지금 고른 아이템 1회 값을 붙인다
  const book = AURA_BOOKS[aura.book];
  simEls.auraSeedPrice.textContent = formatMan(book.seed);
  simEls.auraElsoPrice.textContent = formatNumber(book.elso);

  // 에이라의 망치 결과 칸과 같은 "라벨 : 값" 행. 기대값·이번 결과·차이를 같은 형식으로 위아래에 맞춘다
  const auto = aura.auto;
  const rows = [];
  if (auto) {
    const name = `${auraBookIcon(auto.book)}${AURA_BOOKS[auto.book].name}`;
    rows.push(["기대값", `<b>${auraCostText(auto.book, auto.expected)}</b> · ${name} <b>${formatNumber(Math.round(auto.expected))}회</b>${auraCashText(auto.book, auto.expected, true)}`]);
    rows.push(["이번 결과", `<b>${auraCostText(auto.book, auto.n)}</b> · ${name} <b>${formatNumber(auto.n)}회</b>${auraCashText(auto.book, auto.n)}`]);
    const gaps = [
      ["비용", auraCostDelta(auto.book, auto.n, auto.expected)],
      ["재설정", simDelta(auto.n, auto.expected, "회")],
    ].filter(([, v]) => v);
    rows.push(["차이", gaps.length ? gaps.map(([k, v]) => `${k} ${v}`).join(" · ") : "기대값과 같음"]);
  }
  // 환류·정환을 섞어 쓰면 금액과 캐시는 둘을 합치고, 횟수는 쓴 아이템마다 적는다
  const usedBooks = ["ret", "jung"].filter((b) => aura.used[b] > 0);
  const shownBooks = usedBooks.length ? usedBooks : [aura.book];
  const spent = shownBooks.reduce((sum, b) => {
    const cost = AURA_BOOKS[b];
    return sum + aura.used[b] * (aura.pay === "seed" ? cost.seed : cost.elso);
  }, 0);
  const spentText = aura.pay === "seed" ? `${formatMan(spent)} 시드` : `${formatNumber(spent)} 엘소`;
  const cashSum = shownBooks.reduce((sum, b) => sum + aura.used[b] * AURA_BOOKS[b].cash, 0);
  const counts = shownBooks.map((b) => `${auraBookIcon(b)}${AURA_BOOKS[b].name} <b>${formatNumber(aura.used[b])}회</b>`).join(" · ");
  rows.push(["누적 사용", `<b>${spentText}</b> · ${counts}${cashSum > 0 ? ` <small class="aura-cash">(${formatNumber(cashSum)} 캐시)</small>` : ""}`]);

  const html = (aura.stopNote ? `<p class="aura-stop-note">${aura.stopNote}</p>` : "")
    + (auto ? `<p class="aura-auto-head"><b>자동 재설정 완료</b></p>` : "")
    + `<dl class="hammer-plan-stats aura-stats">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`
    + (auto ? simLuckRow(auto.luck) : "");
  simEls.auraCost.innerHTML = html;

  simEls.auraLog.innerHTML = aura.log.map((entry) => `
    <li>
      <span class="aura-log-n">#${formatNumber(entry.n)}</span>
      <span class="aura-log-book">${auraBookIcon(entry.book)}${escapeHtml(entry.text)}</span>
      <span class="aura-log-opts">${entry.options.map((o, i) => auraOptionHtml(o, entry.changed.includes(i))).join("")}</span>
    </li>`).join("");
  simEls.auraLog.hidden = !aura.log.length;
}

function wireAuraSim() {
  if (!simEls.auraBoard) return;
  document.querySelectorAll("[data-aura-icon]").forEach((img) => {
    img.src = `${AURA_IMG_BASE}${encodeURIComponent(img.dataset.auraIcon)}`;
  });
  document.querySelectorAll('input[name="auraSlots"]').forEach((input) => {
    input.addEventListener("change", () => {
      aura.slots = Number(input.value);
      auraReset();
    });
  });
  document.querySelectorAll('input[name="auraPay"]').forEach((input) => {
    input.addEventListener("change", () => {
      aura.pay = input.value;
      renderAura();
    });
  });
  document.querySelectorAll('input[name="auraBook"]').forEach((input) => {
    input.addEventListener("change", () => {
      aura.book = input.value;
      renderAura();
    });
  });
  simEls.auraBoard.addEventListener("change", (event) => {
    const input = event.target.closest('input[name="auraPick"]');
    if (input) aura.pick = Number(input.value);
  });
  simEls.auraTargets.addEventListener("change", (event) => {
    const row = event.target.closest("[data-aura-goal]");
    if (!row) return;
    const goal = aura.goals[Number(row.dataset.auraGoal)];
    if (event.target.matches("[data-aura-goal-type]")) {
      goal.type = event.target.value;
      goal.min = goal.type ? AURA_VALUES[goal.type][0] : 0;
    } else if (event.target.matches("[data-aura-goal-min]")) {
      goal.min = Number(event.target.value);
    }
    renderAura();
  });
  simEls.auraRoll.addEventListener("click", auraRoll);
  simEls.auraRollCount.addEventListener("keydown", (event) => {
    if (event.key === "Enter") auraRoll();
  });
  simEls.auraAuto.addEventListener("click", auraAuto);
  simEls.auraReset.addEventListener("click", auraReset);
  auraReset();
}

function wireSienaSim() {
  if (!simEls.sienaStart) return;
  sienaPopulateSelects();
  simEls.sienaCalc.addEventListener("click", () => sienaRun(false));
  simEls.sienaSim?.addEventListener("click", () => sienaRun(true));
}

function wireEnhanceSim() {
  if (!simEls.enhStart) return;
  enhPopulateSelects();
  simEls.enhCalc.addEventListener("click", enhCalc);
  simEls.enhSim?.addEventListener("click", enhSim);
}


// 대미지 계산기 스킬 프리셋·버프 목록 로드 (실패해도 기본값으로 동작)
loadDmgSkills();
loadDmgBuffs();
loadDmgMonsters();

// ══════════════════════════════════════════════════════════════
//  문의 · 건의 게시판
//  글은 구글 시트에 쌓인다. 읽기는 시트를 "웹에 게시"한 CSV로 받고, 쓰기만
//  Apps Script 웹앱을 거친다. (읽기까지 Apps Script로 가면 호출마다 2~3초라
//  목록을 열 때도, 글 하나를 누를 때도 그만큼 기다려야 했다)
//  게시 CSV는 갱신이 몇 분 늦으므로 방금 쓴 글은 브라우저에 따로 기억해 끼워 넣고,
//  마지막으로 받은 목록은 localStorage에 남겨 다음에 열 때 먼저 보여준다.
//  BOARD_CSV_URL이 비어 있으면 예전처럼 읽기도 Apps Script로 간다.
//  설치 방법은 저장소 루트의 board-apps-script.gs 주석에 적어 뒀다.
// ══════════════════════════════════════════════════════════════
const BOARD_API_URL = "https://script.google.com/macros/s/AKfycbyNioDGVAQp8KSIsgUkPwfVMRY8xtG7CAtaUSjWc0Hs4qiaSvKWxBGGcfEUfsUFWG2U/exec";
// 게시판 시트를 파일 → 공유 → 웹에 게시 → "문의게시판" 시트, CSV로 게시한 주소
const BOARD_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS78PnupM0NaJzkrkFCr2Llja9TJKrLcRZqeCqlCUV4GPGlsJd3xSIn3SQAvHwzy_tGtxDbTFtl8oZQ/pub?gid=568412821&single=true&output=csv";

const BOARD_CACHE_KEY = "tw-board-cache-v1";      // 마지막으로 받은 목록
const BOARD_PENDING_KEY = "tw-board-pending-v1";  // 방금 쓴 글. CSV에 나타날 때까지 끼워 넣는다
const BOARD_PENDING_TTL_MS = 30 * 60 * 1000;      // 이만큼 지나도 CSV에 안 보이면 포기한다

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
  // 홈 화면에 같이 그리는 자리. 창을 열지 않아도 글 목록이 보인다
  homeBody: document.querySelector("#homeBoardBody"),
  homeWrite: document.querySelector("#homeBoardWrite"),
};

const boardApi = (params) => `${BOARD_API_URL}?${new URLSearchParams(params)}`;

function boardDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const day = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  // 답변일은 시트에 날짜만 적히므로 0시 0분이면 시간을 붙이지 않는다
  if (d.getHours() === 0 && d.getMinutes() === 0) return day;
  return `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 줄바꿈만 살리고 나머지는 escape 한다. 방문자가 쓴 글이라 HTML을 그대로 넣으면 안 된다
const boardText = (value) => escapeHtml(value || "").replace(/\n/g, "<br />");

// 게시 CSV의 날짜는 시트에 보이는 글자 그대로 온다. 시트 로케일에 따라
// "2026. 9. 14 오후 3:05:00" / "9/14/2026 15:05:00" / "2026-09-14 15:05:00" 중 하나라
// 셋 다 받아서 ISO 문자열로 맞춘다. 못 알아보면 빈 값으로 두어 날짜만 비운다.
// 시트에 적힌 시각은 시트 설정(파일 → 설정 → 시간대)의 시간대를 따르므로 그 시간대를
// 한국(+09:00)으로 두고, 보는 사람의 브라우저 시간대와 무관하게 한국 시각으로 해석한다.
const BOARD_SHEET_TZ = "+09:00";

function boardParseDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const hour24 = (h, ampm) => {
    let hour = Number(h);
    if (ampm === "오후" || /^pm$/i.test(ampm || "")) hour = hour % 12 + 12;
    if (ampm === "오전" || /^am$/i.test(ampm || "")) hour = hour % 12;
    return hour;
  };
  const pad = (n) => String(Number(n) || 0).padStart(2, "0");
  const iso = (y, mo, d, h, mi, s) => {
    const parsed = new Date(`${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}${BOARD_SHEET_TZ}`);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  };
  // 답변일처럼 시간 없이 날짜만 적힌 값도 있어 시간 부분은 전부 선택이다 (없으면 0시)
  let m = text.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?(?:\s*(오전|오후))?(?:\s*(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) return iso(m[1], m[2], m[3], hour24(m[5] || 0, m[4]), m[6], m[7]);
  m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i);
  if (m) return iso(m[3], m[1], m[2], hour24(m[4] || 0, m[7]), m[5], m[6]);
  m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) return iso(m[1], m[2], m[3], m[4], m[5], m[6]);
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

// 게시 CSV → 게시글 목록 (최신 글이 위). 열은 머리글 이름으로 찾고, 없으면 시트 순서를 믿는다
function boardParseCsv(text) {
  const rows = parseDelimited(text, ",");
  if (!rows.length) return [];
  const header = rows[0].map((h) => String(h || "").trim());
  const col = (name, fallback) => {
    const index = header.indexOf(name);
    return index >= 0 ? index : fallback;
  };
  const at = (row, name, fallback) => String(row[col(name, fallback)] ?? "").trim();
  const posts = [];
  for (const row of rows.slice(1)) {
    const id = Number(at(row, "번호", 0)) || 0;
    if (!id) continue;
    posts.push({
      id,
      createdAt: boardParseDate(at(row, "작성일", 1)),
      category: at(row, "분류", 2),
      title: at(row, "제목", 3),
      author: at(row, "작성자", 4) || "익명",
      content: at(row, "내용", 5),
      answer: at(row, "답변", 6),
      answeredAt: boardParseDate(at(row, "답변일", 7)),
    });
  }
  return posts.sort((a, b) => b.id - a.id);
}

function boardReadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function boardWriteJson(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // 시크릿 창 등에서 저장이 막혀도 게시판 자체는 돌아가야 한다
  }
}

function boardReadCache() {
  const cached = boardReadJson(BOARD_CACHE_KEY);
  return cached && Array.isArray(cached.posts) ? cached.posts : null;
}

// 방금 쓴 글 중 아직 CSV에 나타나지 않은 것만 남기고, 목록 맨 앞에 끼워 넣는다
function boardMergePending(posts) {
  const now = Date.now();
  const known = new Set(posts.map((p) => p.id));
  const pending = (boardReadJson(BOARD_PENDING_KEY) || [])
    .filter((p) => p && p.id && !known.has(p.id) && now - (p.savedAt || 0) < BOARD_PENDING_TTL_MS);
  boardWriteJson(BOARD_PENDING_KEY, pending.length ? pending : null);
  if (!pending.length) return posts;
  return [...pending.map((p) => ({ ...p, pending: true })), ...posts].sort((a, b) => b.id - a.id);
}

function boardRememberPending(post) {
  const pending = (boardReadJson(BOARD_PENDING_KEY) || []).filter((p) => p && p.id !== post.id);
  pending.push({ ...post, savedAt: Date.now() });
  boardWriteJson(BOARD_PENDING_KEY, pending);
}

async function boardFetch(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
  return data;
}

async function boardLoadList(force) {
  if (board.loaded && !force) return;
  if (!BOARD_CSV_URL) return boardLoadListViaApi();

  // 지난번 목록이 있으면 그걸 먼저 보여주고 뒤에서 조용히 새로 받는다
  if (!board.loaded) {
    const cached = boardReadCache();
    if (cached) {
      board.posts = boardMergePending(cached);
      board.loaded = true;
    }
  }
  board.busy = !board.loaded;
  board.error = "";
  boardRender();
  try {
    const res = await fetch(BOARD_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = boardParseCsv(await res.text());
    boardWriteJson(BOARD_CACHE_KEY, { savedAt: Date.now(), posts });
    board.posts = boardMergePending(posts);
    board.loaded = true;
    // 글을 보고 있는 중이면 답변이 달렸을 수 있으니 같은 글로 바꿔 끼운다
    if (board.view === "detail" && board.post) {
      board.post = board.posts.find((p) => p.id === board.post.id) || board.post;
    }
  } catch (error) {
    if (!board.loaded) board.error = "글 목록을 불러오지 못했습니다.";
    console.warn("게시판 목록 로딩 실패", error);
  } finally {
    board.busy = false;
    boardRender();
  }
}

// BOARD_CSV_URL이 없을 때의 예전 경로. 목록에 본문이 없어 글을 열 때 한 번 더 받는다
async function boardLoadListViaApi() {
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
  board.error = "";
  const local = board.posts.find((p) => String(p.id) === String(id));
  if (local && local.content !== undefined) {
    // CSV에는 본문까지 들어 있어 따로 받을 것이 없다
    board.post = local;
    board.busy = false;
    boardRender();
    return;
  }
  board.post = null;
  board.busy = true;
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
    const data = await boardFetch(BOARD_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(draft),
    });
    // 게시 CSV에 반영되기 전이라도 방금 쓴 글은 바로 보여야 한다
    if (BOARD_CSV_URL && data.id) {
      boardRememberPending({
        id: Number(data.id),
        createdAt: new Date().toISOString(),
        category: draft.category,
        title: draft.title,
        author: draft.author || "익명",
        content: draft.content,
        answer: "",
        answeredAt: "",
      });
      board.posts = boardMergePending(board.posts.filter((p) => !p.pending));
    }
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
  if (boardEls.homeBody) boardEls.homeBody.innerHTML = notice + error + view;
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

  // 홈에 그린 게시판도 같은 동작 (목록 거르기, 글 열기, 글쓰기)
  if (boardEls.homeBody) {
    boardEls.homeBody.addEventListener("click", (event) => {
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
    boardEls.homeBody.addEventListener("submit", (event) => {
      if (event.target.id !== "boardForm") return;
      event.preventDefault();
      boardSubmit(event.target);
    });
  }
  // 홈의 글쓰기 버튼은 창을 열어 글쓰기 화면부터 보여준다
  boardEls.homeWrite?.addEventListener("click", () => {
    boardEls.modal.hidden = false;
    boardSetView("write");
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

// ══════════════════════════════════════════════════════════════
//  장비 제작 계산기
// ══════════════════════════════════════════════════════════════
//
// 제작표는 장비 DB에서 뽑지 않는다. DB에는 아퀼루스 위쪽만 있어 아카드·인퍼널
// 단계가 통째로 빠지기 때문이다. 아래 표에 직접 적어 둔다.
//
// 형식: 부위 이름을 한 줄에 쓰고, 그 아래 단계를 적는다.
//   결과물 | 이전 단계 | 재료 개수 | 재료 개수 | ...
// 이전 단계 장비는 만들면서 소모되므로 재료로 따로 세지 않는다.
// 재료 이름 안의 괄호(예: 아크론 혈투의 증표(100))는 묶음 크기라 이름의 일부다.
const EQC_RECIPE_TEXT = `
무기
인퍼널 무기 | 아카드 무기 | 수르트의 무기 파편 2 | 환상초 10
아퀼루스 무기 | 인퍼널 무기 | 프시키의 파편 - 파괴 4 | 시트린 10 | 태청금액신단 6
어비스 무기 | 아퀼루스 무기 | 고대 기사의 무기 파편 5 | 요새 수호자의 보석 파편 3 | 심연의 핵 1 | 아크론 혈투의 증표(100) 1
이클립스 무기 | 어비스 무기 | 가짜 달여왕 군단의 무기 파편 3 | 달의 약초 100 | 가공된 달의 광물(1) 1 | 룬의 원석(20) 1 | 가짜 달여왕 군단의 인장(6) 1

손목
인퍼널 손목 | 엔키라 칼라그 손목 | 환상초 1
아퀼루스 손목 | 인퍼널 손목 | 프시키의 파편 - 인도 4 | 시트린 10 | 태청금액신단 6
어비스 손목 | 아퀼루스 손목 | 고대 기사의 방패 조각 5 | 요새 문양이 새겨진 금속 파편 3 | 아크론 혈투의 증표(50) 1
이클립스 손목 | 어비스 손목 | 가짜 달여왕 군단의 방패 조각 3 | 달의 약초 100 | 가공된 달의 광물(1) 1 | 룬의 원석(20) 1 | 가짜 달여왕 군단의 인장(6) 1

갑옷
인퍼널 갑옷 | 엔키라 칼라그 갑옷 | 집행인의 해골 장식 2 | 환상초 10
아퀼루스 갑옷 | 인퍼널 갑옷 | 프시키의 파편 - 단절 4 | 시트린 10 | 태청금액신단 6
어비스 갑옷 | 아퀼루스 갑옷 | 고대 기사의 갑옷 파편 5 | 요새 문양이 새겨진 판금 조각 3 | 아크론 혈투의 증표(50) 1
이클립스 갑옷 | 어비스 갑옷 | 가짜 달여왕 군단의 갑옷 파편 3 | 달의 약초 100 | 가공된 달의 광물(1) 1 | 룬의 원석(20) 1 | 가짜 달여왕 군단의 인장(6) 1

투구
인퍼널 투구 | 엔키라 칼라그 투구 | 광전사의 투구 파편 2 | 환상초 10
아퀼루스 투구 | 인퍼널 투구 | 프시키의 파편 - 분리 4 | 시트린 10 | 태청금액신단 6
어비스 투구 | 아퀼루스 투구 | 고대 기사의 투구 파편 5 | 요새 수호자의 보호구 조각 3 | 아크론 혈투의 증표(50) 1
이클립스 투구 | 어비스 투구 | 가짜 달여왕 군단의 투구 장식 3 | 달의 약초 100 | 가공된 달의 광물(1) 1 | 룬의 원석(20) 1 | 가짜 달여왕 군단의 인장(6) 1

머리
인퍼널 아뮬렛 | 엔키라 칼라그 아뮬렛 | 사서의 보석 파편 2 | 환상초 10
아퀼루스 아뮬렛 | 인퍼널 아뮬렛 | 프시키의 파편 - 형성 4 | 시트린 10 | 태청금액신단 6
어비스 아뮬렛 | 아퀼루스 아뮬렛 | 고대 기사의 펜던트 파편 5 | 요새 문양이 새겨진 목걸이 조각 3 | 아크론 혈투의 증표(50) 1
이클립스 아뮬렛 | 어비스 아뮬렛 | 가짜 달여왕 군단의 펜던트 파편 3 | 달의 약초 100 | 가공된 달의 광물(1) 1 | 룬의 원석(20) 1 | 가짜 달여왕 군단의 인장(6) 1

몸
인퍼널 윙 | 엔키라 칼라그 윙 | 파괴자의 어깨 장식 2 | 환상초 10
아퀼루스 윙 | 인퍼널 윙 | 프시키의 파편 - 안정 4 | 시트린 10 | 태청금액신단 6
어비스 윙 | 아퀼루스 윙 | 고대 기사의 휘장 조각 5 | 요새 수호자의 장식 깃털 3 | 아크론 혈투의 증표(50) 1
이클립스 윙 | 어비스 윙 | 가짜 달여왕 군단의 휘장 장식 3 | 달의 약초 100 | 가공된 달의 광물(1) 1 | 룬의 원석(20) 1 | 가짜 달여왕 군단의 인장(6) 1

손
인퍼널 건틀렛 | 엔키라 칼라그 건틀렛 | 용암 거인의 건틀렛 파편 2 | 환상초 10
아퀼루스 건틀렛 | 인퍼널 건틀렛 | 프시키의 파편 - 고정 4 | 시트린 10 | 태청금액신단 6
어비스 건틀렛 | 아퀼루스 건틀렛 | 고대 기사의 건틀렛 파편 5 | 요새 문양이 새겨진 가죽 조각 3 | 아크론 혈투의 증표(50) 1
이클립스 건틀렛 | 어비스 건틀렛 | 가짜 달여왕 군단의 건틀렛 파편 3 | 달의 약초 100 | 가공된 달의 광물(1) 1 | 룬의 원석(20) 1 | 가짜 달여왕 군단의 인장(6) 1

발
인퍼널 부츠 | 엔키라 칼라그 부츠 | 수감자의 기둥 파편 2 | 환상초 10
아퀼루스 부츠 | 인퍼널 부츠 | 프시키의 파편 - 구원 4 | 시트린 10 | 태청금액신단 6
어비스 부츠 | 아퀼루스 부츠 | 고대 기사의 각갑 파편 5 | 요새 수호자의 부츠 조각 3 | 아크론 혈투의 증표(50) 1
이클립스 부츠 | 어비스 부츠 | 가짜 달여왕 군단의 각갑 파편 3 | 달의 약초 100 | 가공된 달의 광물(1) 1 | 룬의 원석(20) 1 | 가짜 달여왕 군단의 인장(6) 1
`;

// 이솔렛 전용 무기·손목. 무기와 손목이 같은 재료를 쓰고 아카드에서 시작한다
const EQC_ISOLET_TEXT = `
무기
인퍼널 무기 | 아카드 무기 | 수르트의 무기 파편 1 | 환상초 5
아퀼루스 무기 | 인퍼널 무기 | 프시키의 파편 - 파괴 2 | 시트린 5 | 태청금액신단 3
어비스 무기 | 아퀼루스 무기 | 고대 기사의 무기 파편 3 | 요새 수호자의 보석 파편 2 | 심연의 핵 1 | 아크론 혈투의 증표(50) 1
이클립스 무기 | 어비스 무기 | 가짜 달여왕 군단의 무기 파편 2 | 달의 약초 50 | 가공된 달의 광물(1) 1 | 룬의 원석(10) 1 | 가짜 달여왕 군단의 인장(3) 1

손목
인퍼널 손목 | 아카드 손목 | 수르트의 무기 파편 1 | 환상초 5
아퀼루스 손목 | 인퍼널 손목 | 프시키의 파편 - 파괴 2 | 시트린 5 | 태청금액신단 3
어비스 손목 | 아퀼루스 손목 | 고대 기사의 무기 파편 3 | 요새 수호자의 보석 파편 2 | 심연의 핵 1 | 아크론 혈투의 증표(50) 1
이클립스 손목 | 어비스 손목 | 가짜 달여왕 군단의 무기 파편 2 | 달의 약초 50 | 가공된 달의 광물(1) 1 | 룬의 원석(10) 1 | 가짜 달여왕 군단의 인장(3) 1
`;

const EQC_PRICE_KEY = "tw-equip-craft-price-v1";
const EQC_HAGGLE_KEY = "tw-equip-craft-haggle-v1";

// NPC에게 정해진 값으로 사는 재료. 흥정에 성공하면 더 싸게 산다 (만 단위)
const EQC_FIXED_PRICES = {
  "가공된 달의 광물(1)": { base: 100000, haggle: 80000 },
  "룬의 원석(20)": { base: 600000, haggle: 520000 },
  // 이솔렛 전용 이클립스는 10개만 든다. 20개 묶음 값의 절반으로 친다
  "룬의 원석(10)": { base: 300000, haggle: 260000 },
};

// "고대 기사의 무기 파편 5" → { name, count }. 이름에 공백이 많아 뒤에서 자른다
function eqcParseMaterial(text) {
  const match = clean(text).match(/^(.*?)\s+(\d+)$/u);
  if (!match) return { name: clean(text), count: 1 };
  return { name: match[1].trim(), count: Number(match[2]) };
}

// 표 → { 부위: { steps: [{to, from, materials}], tiers: [...] } }
function eqcParseRecipes(text) {
  const parts = new Map();
  let current = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (!line.includes("|")) {
      current = { steps: [], tiers: [] };
      parts.set(line, current);
      continue;
    }
    if (!current) continue;
    const [to, from, ...mats] = line.split("|").map((s) => s.trim());
    current.steps.push({ to, from, materials: mats.map(eqcParseMaterial) });
  }
  // 단계 목록: 첫 재료(이전 단계)부터 마지막 결과물까지
  for (const part of parts.values()) {
    if (!part.steps.length) continue;
    part.tiers = [part.steps[0].from, ...part.steps.map((s) => s.to)];
  }
  return parts;
}

const EQC_RECIPES = eqcParseRecipes(EQC_RECIPE_TEXT);
const EQC_ISOLET_RECIPES = eqcParseRecipes(EQC_ISOLET_TEXT);
const EQC_PARTS = [...EQC_RECIPES.keys()];

const eqc = { part: EQC_PARTS[0] || "", from: "", to: "", isolet: false, prices: {}, haggle: {} };

// 이솔렛 체크는 전용 제작표가 있는 부위(무기·손목)에서만 먹는다
function eqcIsIsolet() {
  return eqc.isolet && EQC_ISOLET_RECIPES.has(eqc.part);
}

function eqcPart() {
  const table = eqcIsIsolet() ? EQC_ISOLET_RECIPES : EQC_RECIPES;
  return table.get(eqc.part) || { steps: [], tiers: [] };
}

// 첫 단계는 시작 장비를 사서 넣어야 하니 재료에 포함한다.
// 그 뒤 단계가 쓰는 중간 장비는 앞 단계에서 만들어 나오므로 넣지 않는다.
function eqcStepMaterials(step, index) {
  if (index > 0) return step.materials;
  return [{ name: step.from, count: 1 }, ...step.materials];
}

function eqcReadStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch (error) {
    return {};
  }
}

function eqcWriteHaggle() {
  try {
    localStorage.setItem(EQC_HAGGLE_KEY, JSON.stringify(eqc.haggle));
  } catch (error) {
    // 저장 공간 부족 등은 무시
  }
}

function eqcWritePrices() {
  try {
    localStorage.setItem(EQC_PRICE_KEY, JSON.stringify(eqc.prices));
  } catch (error) {
    // 저장 공간 부족 등은 무시 (가격 기억은 편의일 뿐)
  }
}

function renderEqcSelects() {
  if (!simEls.eqcPart) return;

  // 이솔렛이 켜져 있으면 전용 제작표가 있는 부위 이름 뒤에 표시를 붙인다
  simEls.eqcPart.innerHTML = EQC_PARTS.map((p) =>
    optionHtml(p, eqc.isolet && EQC_ISOLET_RECIPES.has(p) ? `${p}(이솔렛)` : p)).join("");
  simEls.eqcPart.value = eqc.part;

  if (simEls.eqcIsoletField) {
    simEls.eqcIsoletField.hidden = !EQC_ISOLET_RECIPES.has(eqc.part);
    simEls.eqcIsolet.checked = eqc.isolet;
  }

  const { tiers } = eqcPart();
  // 시작은 마지막 단계를 뺀 나머지, 목표는 시작보다 위쪽
  const starts = tiers.slice(0, -1);
  simEls.eqcFrom.innerHTML = starts.map((n) => optionHtml(n, n)).join("");
  if (!starts.includes(eqc.from)) eqc.from = starts[0] || "";
  simEls.eqcFrom.value = eqc.from;
  simEls.eqcFrom.disabled = !starts.length;

  const goals = tiers.slice(tiers.indexOf(eqc.from) + 1);
  simEls.eqcTo.innerHTML = goals.map((n) => optionHtml(n, n)).join("");
  if (!goals.includes(eqc.to)) eqc.to = goals[goals.length - 1] || "";
  simEls.eqcTo.value = eqc.to;
  simEls.eqcTo.disabled = !goals.length;
}

// 가격은 만 단위로 넣고, 합계는 억·만으로 끊어 보여준다.
// 자릿수가 커지면 만 단위 숫자만으로는 크기가 잘 안 읽힌다.
// 만 단위 금액을 억·만으로 끊는다. 장비 제작과 장비 강화가 같이 쓴다
function formatMan(manValue) {
  const man = Math.round(Number(manValue) || 0);
  if (!man) return "0";
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  const parts = [];
  if (eok) parts.push(`${eok.toLocaleString("ko-KR")}억`);
  if (rest) parts.push(`${rest.toLocaleString("ko-KR")}만`);
  return parts.join(" ");
}

// 고정가 재료는 입력값 대신 정해진 값을 쓴다
function eqcUnitPrice(name) {
  const fixed = EQC_FIXED_PRICES[name];
  if (fixed) return eqc.haggle[name] ? fixed.haggle : fixed.base;
  return Number(eqc.prices[name]) || 0;
}

// 재료 아이콘. 이름이 파일명과 조금씩 달라 장비 상세와 같은 후보 목록을 쓰고,
// 실패하면 handleMaterialImageError가 다음 후보로 넘어간다
// 무기·갑옷·손목·투구는 부위를 묶은 이름이라 그 이름의 아이템이 DB에 없다.
// 계열마다 대표 아이템 하나를 골라 아이콘을 빌린다.
const EQC_TIER_ICON = { "무기": "핸드벨", "갑옷": "로브", "손목": "암릿", "투구": "헬름" };

function eqcIconName(name) {
  // 이솔렛 전용 아카드 손목은 아이콘이 따로 없어 아카드 무기 그림을 쓴다
  if (clean(name) === "아카드 손목") return "아카드 무기";
  const match = /^(인퍼널|아퀼루스|어비스|이클립스)\s+(무기|갑옷|손목|투구)$/u.exec(clean(name));
  return match ? `${match[1]} ${EQC_TIER_ICON[match[2]]}` : name;
}

function eqcMaterialIcon(name) {
  const [src, ...fallbacks] = materialImageUrls(eqcIconName(name));
  if (!src) return "";
  // 숨겨진 탭에서 만들어지므로 lazy로 두면 로드가 걸리지 않는다. 재료 수가 적어 바로 받는다
  return `<img class="material-icon eqc-icon" src="${src}" alt="" decoding="async"`
    + ` data-fallbacks="${escapeHtml(JSON.stringify(fallbacks))}" />`;
}

function renderEqcResult() {
  if (!simEls.eqcSteps) return;

  const { steps, tiers } = eqcPart();
  const clear = () => {
    simEls.eqcSteps.innerHTML = "";
    simEls.eqcTotal.innerHTML = "";
  };

  if (!tiers.length) return clear();

  const start = tiers.indexOf(eqc.from);
  const end = tiers.indexOf(eqc.to);
  if (start < 0 || end <= start) return clear();

  const used = steps.slice(start, end);

  // 단계를 좌우 칸으로 나누고 재료는 그 안에 세로로 쌓는다.
  // 어느 구간에 무엇이 드는지 나란히 놓고 비교할 수 있다.
  simEls.eqcSteps.innerHTML = used.map((step, index) => `
    <section class="eqc-step-card" data-eqc-step="${escapeHtml(step.to)}">
      <h4>${escapeHtml(step.from)}<span aria-hidden="true"> → </span>${escapeHtml(step.to)}</h4>
      ${eqcStepMaterials(step, index).map((m) => {
        const fixed = EQC_FIXED_PRICES[m.name];
        const name = escapeHtml(m.name);
        return `
        <div class="eqc-mat">
          <div class="eqc-mat-name">
            <span>
              ${eqcMaterialIcon(m.name)}${name}
              ${fixed ? `<label class="eqc-haggle">
                <input type="checkbox" data-eqc-haggle="${name}"${eqc.haggle[m.name] ? " checked" : ""} />
                <span>흥정</span>
              </label>` : ""}
            </span>
            <b>${formatNumber(m.count)}</b>
          </div>
          <div class="eqc-mat-calc">
            ${fixed
              ? `<span class="eqc-fixed" data-eqc-fixed="${name}">${formatMan(eqcUnitPrice(m.name))}</span>`
              : `<input type="number" min="0" step="1" inputmode="numeric" value="${Number(eqc.prices[m.name]) || ""}" placeholder="개당 가격 (만)"
                        data-eqc-price="${name}" />`}
            <span class="eqc-sum" data-eqc-sum="${name}" data-eqc-count="${m.count}">${formatMan(eqcUnitPrice(m.name) * m.count)}</span>
          </div>
        </div>`;
      }).join("")}
      <div class="eqc-step-foot">소계 <b class="eqc-step-sum">0</b></div>
    </section>
  `).join("");

  simEls.eqcSteps.querySelectorAll(".eqc-icon").forEach((image) => {
    image.addEventListener("error", handleMaterialImageError);
  });

  renderEqcTotal(used);
}

// 가격을 칠 때마다 다시 그리면 입력 중인 칸이 사라져 포커스가 튄다.
// 그래서 소계와 총합만 따로 갱신한다.
function renderEqcTotal(used) {
  let total = 0;
  used.forEach((step, index) => {
    const sub = eqcStepMaterials(step, index).reduce(
      (sum, m) => sum + eqcUnitPrice(m.name) * m.count, 0);
    total += sub;
    const cell = simEls.eqcSteps.querySelector(`[data-eqc-step="${CSS.escape(step.to)}"] .eqc-step-sum`);
    if (cell) cell.textContent = formatMan(sub);
  });

  simEls.eqcTotal.innerHTML =
    `<div class="sim-summary-title">합계 <b>${formatMan(total)}</b></div>`;
}

function renderEquipCraft() {
  renderEqcSelects();
  renderEqcResult();
}

function wireEquipCraft() {
  if (!simEls.eqcPart) return;
  eqc.prices = eqcReadStore(EQC_PRICE_KEY);
  eqc.haggle = eqcReadStore(EQC_HAGGLE_KEY);

  simEls.eqcPart.addEventListener("change", () => {
    eqc.part = simEls.eqcPart.value;
    eqc.from = "";
    eqc.to = "";
    renderEquipCraft();
  });
  simEls.eqcFrom.addEventListener("change", () => {
    eqc.from = simEls.eqcFrom.value;
    eqc.to = "";
    renderEquipCraft();
  });
  simEls.eqcTo.addEventListener("change", () => {
    eqc.to = simEls.eqcTo.value;
    renderEqcResult();
  });
  // 이솔렛은 시작 장비가 달라(아카드) 시작·목표를 다시 고른다. 목표는 같은 이름이면 유지된다
  simEls.eqcIsolet?.addEventListener("change", () => {
    eqc.isolet = simEls.eqcIsolet.checked;
    eqc.from = "";
    renderEquipCraft();
  });

  // 가격을 칠 때마다 다시 그리면 입력 중인 칸이 사라져 포커스가 튄다.
  // 그래서 바뀐 재료의 줄과 소계·총합만 갱신한다.
  const refreshMaterial = (name) => {
    const price = eqcUnitPrice(name);
    simEls.eqcSteps.querySelectorAll(`[data-eqc-sum="${CSS.escape(name)}"]`).forEach((cell) => {
      const count = Number(cell.dataset.eqcCount) || 0;
      cell.textContent = formatMan(price * count);
    });
    const { steps, tiers } = eqcPart();
    renderEqcTotal(steps.slice(tiers.indexOf(eqc.from), tiers.indexOf(eqc.to)));
  };

  simEls.eqcSteps.addEventListener("input", (event) => {
    const input = event.target.closest("[data-eqc-price]");
    if (!input) return;
    const name = input.dataset.eqcPrice;
    eqc.prices[name] = Math.max(0, Number(input.value) || 0);
    eqcWritePrices();

    // 같은 재료가 여러 단계에 있을 수 있어 나머지 칸도 맞춰 둔다
    simEls.eqcSteps.querySelectorAll(`[data-eqc-price="${CSS.escape(name)}"]`).forEach((el) => {
      if (el !== input) el.value = input.value;
    });
    refreshMaterial(name);
  });

  simEls.eqcSteps.addEventListener("change", (event) => {
    const box = event.target.closest("[data-eqc-haggle]");
    if (!box) return;
    const name = box.dataset.eqcHaggle;
    eqc.haggle[name] = box.checked;
    eqcWriteHaggle();

    simEls.eqcSteps.querySelectorAll(`[data-eqc-haggle="${CSS.escape(name)}"]`).forEach((el) => {
      if (el !== box) el.checked = box.checked;
    });
    simEls.eqcSteps.querySelectorAll(`[data-eqc-fixed="${CSS.escape(name)}"]`).forEach((el) => {
      el.textContent = formatMan(eqcUnitPrice(name));
    });
    refreshMaterial(name);
  });

  renderEquipCraft();
}

// 정의가 모두 끝난 뒤에 시작한다 (뒤쪽 const를 부팅 중에 건드리기 때문)
boot().catch((error) => {
  console.error(error);
  els.dataStatus.textContent = "데이터 로드 실패";
  els.equipmentCard.replaceChildren(els.emptyTemplate.content.cloneNode(true));
});
