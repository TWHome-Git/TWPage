// 에타 랭킹 스냅샷에서 캐릭터별 인원수만 뽑아 assets/eta-population.json에 쌓는다.
//
// 날짜별 스냅샷(eta_ranking.json)은 하루치가 1MB 가까워 브라우저가 기간만큼 받을 수 없다.
// 여기서 미리 세어 두면 73일이 17KB로 줄어 인구 추이 탭이 파일 하나만 받으면 된다.
//
// 이미 집계한 날짜는 건너뛰므로, 매일 돌아도 새로 생긴 하루치만 받는다.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const INDEX_URL = "https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/main/ranking_index.json";
const snapshotUrl = (sha) => `https://raw.githubusercontent.com/TWHome-Git/TWHomeDB/${sha}/eta_ranking.json`;
const OUT_PATH = fileURLToPath(new URL("../assets/eta-population.json", import.meta.url));

// raw.githubusercontent.com이 가끔 연결을 끊는다. 몇 번 다시 걸어 본다.
async function fetchJson(url, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
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
    counts.set(code, (counts.get(code) || 0) + 1);
  });
  return Object.fromEntries([...counts.entries()].sort((a, b) => a[0] - b[0]));
}

async function readExisting() {
  try {
    return JSON.parse(await readFile(OUT_PATH, "utf8"))?.days || {};
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
  const payload = { generated: new Date().toISOString().slice(0, 10), days: sorted };
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
