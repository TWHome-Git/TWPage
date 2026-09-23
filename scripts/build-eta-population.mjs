// 에타 랭킹 스냅샷에서 캐릭터별·레벨 구간별 인원수만 뽑아 assets/eta-population.json에 쌓는다.
//
// 날짜별 스냅샷(eta_ranking.json)은 하루치가 1MB 가까워 브라우저가 기간만큼 받을 수 없다.
// 여기서 미리 세어 두면 73일이 37KB로 줄어 인구 추이 탭이 파일 하나만 받으면 된다.
//
// 이미 집계한 날짜는 건너뛰므로, 매일 돌아도 새로 생긴 하루치만 받는다.
//
// 저장 형태:  days["2026-09-05"]["하이아칸"]["11"] = [구간0, 구간1, ...]
// 뒤쪽 0은 잘라 두므로 배열 길이가 구간 수보다 짧을 수 있다.
//
// 레벨업에 쓴 라피스도 같이 센다. 구간별 인원 변화로는 정확히 알 수 없다.
// (같은 날 올라간 사람과 그만둔 사람이 섞이면 한 숫자로 합쳐지고, 높은 레벨로 새로 들어온 사람은
//  올라간 것처럼 보인다.) 그래서 여기서 사람마다 어제 레벨과 오늘 레벨을 견줘 미리 세어 둔다.
// 저장 형태:  cost["2026-09-05"]["하이아칸"]["11"] = [20→21 인원, 40→41, 60→61, 80→81, 90→91]

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const INDEX_URL = "https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/main/ranking_index.json";
const snapshotUrl = (sha) => `https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/${sha}/eta_ranking.json`;
const OUT_PATH = fileURLToPath(new URL("../assets/eta-population.json", import.meta.url));

// 저장 형식이 바뀌면 올린다. 파일의 version이 다르면 전체를 다시 집계한다.
const VERSION = 3;
// 레벨 구간 상한. 1-20 / 21-40 / 41-60 / 61-80 / 81-90 / 91-100
const BAND_TOPS = [20, 40, 60, 80, 90, 100];

// 라피스를 쓰는 레벨. 이 레벨에서 다음 레벨로 올릴 때 든다
const COST_LEVELS = [20, 40, 60, 80, 90];

function bandOf(level) {
  const index = BAND_TOPS.findIndex((top) => level <= top);
  return index < 0 ? BAND_TOPS.length - 1 : index;
}

// raw.githubusercontent.com이 가끔 연결을 끊는다. 몇 번 다시 걸어 본다.
async function fetchJson(url, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // 원본 파일 앞에 BOM이 붙어 있다. response.json()이 걸러 주기는 하지만 직접 떼고 파싱한다.
      const text = await response.text();
      return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw lastError;
}

// 신규 구조: { Servers: { 서버명: [...] } } / 구 구조: { Rankings: [...] } — 앱의 parseEtaServers와 같은 규칙
function serverEntries(snapshot) {
  if (snapshot?.Servers && typeof snapshot.Servers === "object") return Object.entries(snapshot.Servers);
  return [["하이아칸", Array.isArray(snapshot?.Rankings) ? snapshot.Rankings : []]];
}

function countByCharacter(rows) {
  const counts = new Map();
  (rows || []).forEach((row) => {
    if (!String(row?.UserId ?? "").trim()) return;
    const code = Number(row.CharacterCode) || 0;
    if (!counts.has(code)) counts.set(code, new Array(BAND_TOPS.length).fill(0));
    counts.get(code)[bandOf(Number(row.Level) || 0)] += 1;
  });

  return Object.fromEntries(
    [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      // 뒤쪽 0은 잘라 파일을 줄인다
      .map(([code, bands]) => {
        let last = bands.length - 1;
        while (last > 0 && bands[last] === 0) last -= 1;
        return [code, bands.slice(0, last + 1)];
      }),
  );
}

// 사람별 레벨. 키는 "캐릭터코드|아이디"
function levelsByCharacter(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    const userId = String(row?.UserId ?? "").trim();
    if (!userId) return;
    map.set(`${Number(row.CharacterCode) || 0}|${userId}`, Number(row.Level) || 0);
  });
  return map;
}

// 어제와 오늘을 견줘 캐릭터별로 넘어간 구간 수를 센다. 어제 없던 사람은 세지 않는다
function countCrossings(prevRows, rows) {
  const prev = levelsByCharacter(prevRows);
  const counts = new Map();
  (rows || []).forEach((row) => {
    const userId = String(row?.UserId ?? "").trim();
    if (!userId) return;
    const code = Number(row.CharacterCode) || 0;
    const before = prev.get(`${code}|${userId}`);
    const now = Number(row.Level) || 0;
    if (before === undefined || now <= before) return;
    COST_LEVELS.forEach((level, index) => {
      if (before <= level && level < now) {
        if (!counts.has(code)) counts.set(code, new Array(COST_LEVELS.length).fill(0));
        counts.get(code)[index] += 1;
      }
    });
  });
  return Object.fromEntries([...counts.entries()].sort((a, b) => a[0] - b[0]));
}

function crossingsBySnapshot(prevSnapshot, snapshot) {
  const prevServers = new Map(serverEntries(prevSnapshot));
  const out = {};
  serverEntries(snapshot).forEach(([name, rows]) => {
    const counts = countCrossings(prevServers.get(name), rows);
    if (Object.keys(counts).length) out[name] = counts;
  });
  return out;
}

async function readExisting() {
  try {
    const payload = JSON.parse(await readFile(OUT_PATH, "utf8"));
    // 형식이 바뀌었으면 기존 값을 버리고 전부 다시 집계한다
    if (payload?.version !== VERSION) return { days: {}, cost: {} };
    return { days: payload.days || {}, cost: payload.cost || {} };
  } catch {
    return { days: {}, cost: {} };
  }
}

async function main() {
  const index = await fetchJson(INDEX_URL);
  const { days, cost } = await readExisting();
  const all = Object.keys(index).sort();
  const missing = all.filter((date, i) => !days[date] || (i > 0 && !cost[date]));

  if (!missing.length) {
    console.log(`추가할 날짜 없음 (보유 ${Object.keys(days).length}일)`);
    return;
  }

  // 라피스는 어제 자료와 견줘야 하므로 날짜 순서대로 받고, 직전 하루치를 들고 간다.
  // 새 날짜 하나만 추가할 때도 그 전날 한 건만 더 받으면 된다.
  const failed = [];
  let prevDate = null;
  let prevSnapshot = null;
  for (const date of missing) {
    const before = all[all.indexOf(date) - 1];
    try {
      if (before && prevDate !== before) {
        prevSnapshot = await fetchJson(snapshotUrl(index[before]));
        prevDate = before;
      }
      const snapshot = await fetchJson(snapshotUrl(index[date]));
      days[date] = Object.fromEntries(
        serverEntries(snapshot).map(([name, rows]) => [name, countByCharacter(rows)]),
      );
      if (prevSnapshot && prevDate === before) cost[date] = crossingsBySnapshot(prevSnapshot, snapshot);
      prevSnapshot = snapshot;
      prevDate = date;
    } catch (error) {
      failed.push(`${date}: ${error.message}`);
      prevSnapshot = null;
      prevDate = null;
    }
  }

  const sorted = Object.fromEntries(Object.keys(days).sort().map((date) => [date, days[date]]));
  const sortedCost = Object.fromEntries(Object.keys(cost).sort().map((date) => [date, cost[date]]));
  const payload = {
    version: VERSION,
    generated: new Date().toISOString().slice(0, 10),
    bandTops: BAND_TOPS,
    costLevels: COST_LEVELS,
    days: sorted,
    cost: sortedCost,
  };
  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload), "utf8");

  const dates = Object.keys(sorted);
  console.log(`새로 받은 날짜: ${missing.length - failed.length}`);
  console.log(`전체 날짜: ${dates.length} (${dates[0]} ~ ${dates[dates.length - 1]})`);
  if (failed.length) {
    console.log(`실패 ${failed.length}건 — 다음 실행에서 다시 시도한다`);
    failed.forEach((line) => console.log(`  ${line}`));
  }
}

await main();
