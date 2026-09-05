// 에타 랭킹 스냅샷에서 캐릭터별·레벨 구간별 인원수만 뽑아 assets/eta-population.json에 쌓는다.
//
// 날짜별 스냅샷(eta_ranking.json)은 하루치가 1MB 가까워 브라우저가 기간만큼 받을 수 없다.
// 여기서 미리 세어 두면 73일이 37KB로 줄어 인구 추이 탭이 파일 하나만 받으면 된다.
//
// 이미 집계한 날짜는 건너뛰므로, 매일 돌아도 새로 생긴 하루치만 받는다.
//
// 저장 형태:  days["2026-09-05"]["하이아칸"]["11"] = [구간0, 구간1, ...]
// 뒤쪽 0은 잘라 두므로 배열 길이가 구간 수보다 짧을 수 있다.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const INDEX_URL = "https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/main/ranking_index.json";
const snapshotUrl = (sha) => `https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/${sha}/eta_ranking.json`;
const OUT_PATH = fileURLToPath(new URL("../assets/eta-population.json", import.meta.url));

// 저장 형식이 바뀌면 올린다. 파일의 version이 다르면 전체를 다시 집계한다.
const VERSION = 2;
// 레벨 구간 상한. 1-20 / 21-40 / 41-60 / 61-80 / 81-90 / 91-100
const BAND_TOPS = [20, 40, 60, 80, 90, 100];

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

async function readExisting() {
  try {
    const payload = JSON.parse(await readFile(OUT_PATH, "utf8"));
    // 형식이 바뀌었으면 기존 값을 버리고 전부 다시 집계한다
    if (payload?.version !== VERSION) return {};
    return payload.days || {};
  } catch {
    return {};
  }
}

async function main() {
  const index = await fetchJson(INDEX_URL);
  const days = await readExisting();
  const missing = Object.keys(index).sort().filter((date) => !days[date]);

  if (!missing.length) {
    console.log(`추가할 날짜 없음 (보유 ${Object.keys(days).length}일)`);
    return;
  }

  // raw 서버를 몰아치지 않게 4개씩 끊어 받는다
  const failed = [];
  for (let i = 0; i < missing.length; i += 4) {
    const batch = missing.slice(i, i + 4);
    await Promise.all(batch.map(async (date) => {
      try {
        const snapshot = await fetchJson(snapshotUrl(index[date]));
        days[date] = Object.fromEntries(
          serverEntries(snapshot).map(([name, rows]) => [name, countByCharacter(rows)]),
        );
      } catch (error) {
        failed.push(`${date}: ${error.message}`);
      }
    }));
  }

  const sorted = Object.fromEntries(Object.keys(days).sort().map((date) => [date, days[date]]));
  const payload = {
    version: VERSION,
    generated: new Date().toISOString().slice(0, 10),
    bandTops: BAND_TOPS,
    days: sorted,
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
