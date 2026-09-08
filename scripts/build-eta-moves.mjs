// 에타 랭킹 스냅샷에서 날짜별 순위 진입·이탈 아이디만 뽑아 assets/eta-moves.json에 쌓는다.
//
// 진입·이탈 탭은 고른 날짜와 그 앞 날짜, 두 개만 받아 비교한다. 그래서 "이 아이디가
// 언제 드나들었나"는 답할 수 없다. 76일을 다 받으려면 68MB라 브라우저가 감당 못 한다.
// 여기서 미리 훑어 두면 아이디 검색이 파일 하나로 끝난다.
//
// 이미 집계한 날짜는 건너뛰므로 매일 돌아도 새로 생긴 하루치만 받는다.
// 다만 하루를 판정하려면 앞 날짜도 있어야 해서 두 개를 받는다.
//
// 저장 형태:  servers["하이아칸"]["아이디"] = { i: [날짜 인덱스...], o: [...] }
// i = 진입, o = 이탈. 날짜는 dates 배열의 자리로 적어 파일을 줄인다.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const INDEX_URL = "https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/main/ranking_index.json";
const snapshotUrl = (sha) => `https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/${sha}/eta_ranking.json`;
const OUT_PATH = fileURLToPath(new URL("../assets/eta-moves.json", import.meta.url));

// 저장 형식이 바뀌면 올린다. 파일의 version이 다르면 전체를 다시 집계한다.
const VERSION = 1;

// raw.githubusercontent.com이 가끔 연결을 끊는다. 몇 번 다시 걸어 본다.
async function fetchJson(url, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // 원본 파일 앞에 BOM이 붙어 있다.
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

function rowsOf(snapshot) {
  return Object.fromEntries(
    serverEntries(snapshot).map(([name, rows]) => [
      name,
      (rows || []).filter((row) => String(row?.UserId ?? "").trim()),
    ]),
  );
}

// 수집이 캐릭터 단위로 통째로 빠진 날이 있다. 그런 날과 비교하면 그 캐릭터 전원이
// 진입이나 이탈로 잡히므로 아예 뺀다. 앱의 etaNewcomerGroups와 같은 규칙이다.
function movesBetween(current, previous) {
  const codesOf = (rows) => new Set(rows.map((row) => Number(row.CharacterCode) || 0));
  const currentCodes = codesOf(current);
  const previousCodes = codesOf(previous);

  const skipped = new Set();
  for (const code of new Set([...currentCodes, ...previousCodes])) {
    if (currentCodes.has(code) !== previousCodes.has(code)) skipped.add(code);
  }

  const kept = (row) => !skipped.has(Number(row.CharacterCode) || 0);
  const currentIds = new Set(current.map((row) => row.UserId));
  const previousIds = new Set(previous.map((row) => row.UserId));

  return {
    entered: current.filter((row) => kept(row) && !previousIds.has(row.UserId)).map((row) => row.UserId),
    left: previous.filter((row) => kept(row) && !currentIds.has(row.UserId)).map((row) => row.UserId),
  };
}

async function readExisting() {
  try {
    const payload = JSON.parse(await readFile(OUT_PATH, "utf8"));
    if (payload?.version !== VERSION) return null;
    return payload;
  } catch {
    return null;
  }
}

async function main() {
  const index = await fetchJson(INDEX_URL);
  const allDates = Object.keys(index).sort();

  const existing = await readExisting();
  // 이미 판정한 날짜. 첫 날은 앞 날짜가 없어 판정 대상이 아니다
  const done = new Set(existing?.dates || []);
  const targets = allDates.slice(1).filter((date) => !done.has(date));

  if (!targets.length) {
    console.log(`추가할 날짜 없음 (보유 ${done.size}일)`);
    return;
  }

  // 하루를 판정하려면 앞 날짜도 있어야 한다. 이어진 날은 같은 스냅샷을 두 번 쓰므로 들고 있는다
  const snapshots = new Map();
  const load = async (date) => {
    if (!snapshots.has(date)) snapshots.set(date, rowsOf(await fetchJson(snapshotUrl(index[date]))));
    return snapshots.get(date);
  };

  const moves = new Map(); // 날짜 → 서버 → { entered, left }
  const failed = [];
  for (const date of targets) {
    const previousDate = allDates[allDates.indexOf(date) - 1];
    try {
      const [current, previous] = [await load(date), await load(previousDate)];
      const perServer = {};
      for (const name of new Set([...Object.keys(current), ...Object.keys(previous)])) {
        perServer[name] = movesBetween(current[name] || [], previous[name] || []);
      }
      moves.set(date, perServer);
    } catch (error) {
      failed.push(`${date}: ${error.message}`);
    }
    // 앞 날짜는 다음 판정에서 쓰이지 않는다. 76일치를 다 들고 있으면 메모리가 는다
    snapshots.delete(previousDate);
  }

  // 기존 결과와 합쳐 아이디별로 다시 엮는다
  const dates = [...new Set([...(existing?.dates || []), ...moves.keys()])].sort();
  const dateSlot = new Map(dates.map((date, i) => [date, i]));
  const servers = {};

  const put = (server, userId, kind, slot) => {
    const bag = (servers[server] ||= {});
    const entry = (bag[userId] ||= { i: [], o: [] });
    entry[kind].push(slot);
  };

  // 이전 결과를 새 날짜 배열 기준으로 옮겨 담는다
  for (const [server, bag] of Object.entries(existing?.servers || {})) {
    for (const [userId, entry] of Object.entries(bag)) {
      for (const kind of ["i", "o"]) {
        for (const oldSlot of entry[kind] || []) {
          const date = existing.dates[oldSlot];
          if (dateSlot.has(date)) put(server, userId, kind, dateSlot.get(date));
        }
      }
    }
  }

  for (const [date, perServer] of moves) {
    const slot = dateSlot.get(date);
    for (const [server, { entered, left }] of Object.entries(perServer)) {
      entered.forEach((userId) => put(server, userId, "i", slot));
      left.forEach((userId) => put(server, userId, "o", slot));
    }
  }

  // 자리를 오름차순으로 맞추고 빈 배열은 뺀다
  for (const bag of Object.values(servers)) {
    for (const [userId, entry] of Object.entries(bag)) {
      const next = {};
      if (entry.i.length) next.i = [...new Set(entry.i)].sort((a, b) => a - b);
      if (entry.o.length) next.o = [...new Set(entry.o)].sort((a, b) => a - b);
      bag[userId] = next;
    }
  }

  const payload = { version: VERSION, generated: new Date().toISOString().slice(0, 10), dates, servers };
  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload), "utf8");

  const ids = Object.values(servers).reduce((sum, bag) => sum + Object.keys(bag).length, 0);
  console.log(`새로 판정한 날짜: ${targets.length - failed.length}`);
  console.log(`전체 날짜: ${dates.length} (${dates[0]} ~ ${dates[dates.length - 1]}), 아이디 ${ids}`);
  if (failed.length) {
    console.log(`실패 ${failed.length}건 — 다음 실행에서 다시 시도한다`);
    failed.forEach((line) => console.log(`  ${line}`));
  }
}

await main();
