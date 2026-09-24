// 에타 랭킹 스냅샷에서 아이디별 날짜별 에타 레벨·보유 정수를 뽑아 assets/eta-history/에 쌓는다.
//
// 순위표에서 아이디를 누르면 그 아이디의 레벨·획득 정수 그래프를 보여 준다. 원본은 하루치가 1MB라
// 브라우저가 기간만큼 받을 수 없고, 전체 아이디를 한 파일에 담으면 그것도 수 MB가 된다.
// 그래서 아이디를 해시로 64조각에 나눠 두고, 화면에서는 그 아이디가 든 조각 하나만 받는다.
//
// 이미 집계한 날짜는 건너뛰므로 매일 돌아도 새로 생긴 하루치만 받는다.
//
// 저장 형태
//   index.json     = { version, generated, dates: ["yyyy-MM-dd", ...] }
//   NN.json (64개) = { version, servers: { 서버명: { 아이디: { l: [레벨...], e: [정수...] } } } }
//   l·e 배열은 dates와 자리가 같고, 그날 순위에 없으면 null이다.
//   아이디가 어느 조각에 드는지는 etaHistoryShard()로 정한다. 앱(app.js)에 같은 함수가 있다.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const INDEX_URL = "https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/main/ranking_index.json";
const snapshotUrl = (sha) => `https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/${sha}/eta_ranking.json`;
const OUT_DIR = fileURLToPath(new URL("../assets/eta-history/", import.meta.url));

// 저장 형식이 바뀌면 올린다. 파일의 version이 다르면 전체를 다시 집계한다.
const VERSION = 1;
const SHARDS = 64;

// 아이디 → 조각 번호. FNV-1a 32비트를 UTF-16 코드 단위로 돌린다. app.js의 etaHistoryShard와 같아야 한다
function etaHistoryShard(userId) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < userId.length; i += 1) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % SHARDS;
}

const shardName = (n) => `${String(n).padStart(2, "0")}.json`;

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

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const index = await fetchJson(INDEX_URL);
  const allDates = Object.keys(index).sort();

  const existingIndex = await readJson(`${OUT_DIR}index.json`);
  const existingDates = existingIndex?.version === VERSION ? existingIndex.dates || [] : [];
  const done = new Set(existingDates);
  const targets = allDates.filter((date) => !done.has(date));

  if (!targets.length) {
    console.log(`추가할 날짜 없음 (보유 ${done.size}일)`);
    return;
  }

  // 조각 파일을 모두 읽어 둔다. 형식이 바뀌었으면 비어 있는 채로 시작한다
  const shards = [];
  for (let n = 0; n < SHARDS; n += 1) {
    const loaded = existingDates.length ? await readJson(`${OUT_DIR}${shardName(n)}`) : null;
    shards[n] = loaded?.version === VERSION ? loaded : { version: VERSION, servers: {} };
  }

  // 새 날짜를 받아 서버·아이디별 값으로 모은다
  const fetched = new Map(); // 날짜 → { 서버: Map(아이디 → { l, e }) }
  const failed = [];
  for (const date of targets) {
    try {
      const snapshot = await fetchJson(snapshotUrl(index[date]));
      const perServer = {};
      for (const [server, rows] of serverEntries(snapshot)) {
        const bag = (perServer[server] ||= new Map());
        for (const row of rows || []) {
          const userId = String(row?.UserId ?? "").trim();
          if (!userId) continue;
          bag.set(userId, { l: Number(row.Level) || 0, e: Number(row.Essence) || 0 });
        }
      }
      fetched.set(date, perServer);
      console.log(`${date} 받음`);
    } catch (error) {
      failed.push(`${date}: ${error.message}`);
    }
  }

  // 날짜 배열을 새로 정하고, 기존 배열을 그 자리에 맞춰 옮긴다
  const dates = [...new Set([...existingDates, ...fetched.keys()])].sort();
  const slotOf = new Map(dates.map((date, i) => [date, i]));
  const oldSlot = existingDates.map((date) => slotOf.get(date));
  const blank = () => new Array(dates.length).fill(null);

  for (const shard of shards) {
    for (const bag of Object.values(shard.servers)) {
      for (const entry of Object.values(bag)) {
        const l = blank();
        const e = blank();
        (entry.l || []).forEach((value, i) => { if (oldSlot[i] != null) l[oldSlot[i]] = value; });
        (entry.e || []).forEach((value, i) => { if (oldSlot[i] != null) e[oldSlot[i]] = value; });
        entry.l = l;
        entry.e = e;
      }
    }
  }

  for (const [date, perServer] of fetched) {
    const slot = slotOf.get(date);
    for (const [server, bag] of Object.entries(perServer)) {
      for (const [userId, value] of bag) {
        const shard = shards[etaHistoryShard(userId)];
        const serverBag = (shard.servers[server] ||= {});
        const entry = (serverBag[userId] ||= { l: blank(), e: blank() });
        entry.l[slot] = value.l;
        entry.e[slot] = value.e;
      }
    }
  }

  await mkdir(OUT_DIR, { recursive: true });
  for (let n = 0; n < SHARDS; n += 1) {
    await writeFile(`${OUT_DIR}${shardName(n)}`, JSON.stringify(shards[n]), "utf8");
  }
  const generated = new Date().toISOString().slice(0, 10);
  await writeFile(`${OUT_DIR}index.json`, JSON.stringify({ version: VERSION, generated, dates }), "utf8");

  const ids = shards.reduce((sum, shard) => sum + Object.values(shard.servers).reduce((s, bag) => s + Object.keys(bag).length, 0), 0);
  console.log(`새로 받은 날짜: ${fetched.size}`);
  console.log(`전체 날짜: ${dates.length} (${dates[0]} ~ ${dates[dates.length - 1]}), 아이디 ${ids}`);
  if (failed.length) {
    console.log(`실패 ${failed.length}건 — 다음 실행에서 다시 시도한다`);
    failed.forEach((line) => console.log(`  ${line}`));
  }
}

await main();
