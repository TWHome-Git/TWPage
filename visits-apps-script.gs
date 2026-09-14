// 홈 방문 카운터 프록시 — GoatCounter 인증 API로 KST 자정 기준 "오늘 방문"을 구한다.
// 토큰은 코드에 넣지 않고 스크립트 속성(GC_TOKEN)에 저장한다.
//
// 배포: 배포 > 새 배포 > 웹 앱 / 실행 계정: 나 / 액세스 권한: 모든 사용자
// 응답: {"today": 123, "total": 7757, "boundary": "KST 00:00"}
//
// 수치의 뜻: "/" 경로의 방문(visit) 수. 사이트는 첫 화면에서 "/" 페이지뷰를 한 번 보내고 탭 이동은
// 이벤트로 보내므로(app.js visitTrack), 이 값은 사람(세션) 수에 가깝다. 대시보드 상단의 visits 합계는
// 탭 이벤트까지 포함해 더 크다.
//
// 스크립트를 고친 뒤에는 배포 > 배포 관리 > 연필 > 버전 "새 버전" > 배포. (새로 배포하면 URL이 바뀐다)

const GC_SITE = "https://holedis88.goatcounter.com";

function doGet() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get("visits");
  if (hit) return json_(hit);

  const token = PropertiesService.getScriptProperties().getProperty("GC_TOKEN");
  const out = { today: null, total: null, boundary: "KST 00:00" };

  // "/"(첫 화면)과 "/home"(2026-09-13~14 탭 집계 초기에 홈 착륙을 이 경로로 셈)의 페이지뷰만 센다.
  // 탭 이동은 이벤트로 오므로 total에서 total_events를 빼면 페이지뷰(사람 수)만 남는다.
  const people = (startIso) => {
    const url = GC_SITE + "/api/v0/stats/total?start=" + encodeURIComponent(startIso)
      + "&path_by_name=true&include_paths=" + encodeURIComponent("/") + "&include_paths=" + encodeURIComponent("/home");
    const r = UrlFetchApp.fetch(url, { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw new Error("api " + r.getResponseCode());
    const j = JSON.parse(r.getContentText());
    if (j.total == null) throw new Error("no total: " + r.getContentText().slice(0, 200));
    return Number(j.total) - Number(j.total_events || 0);
  };

  // 오늘(KST) 자정 → 지금, UTC 시각으로 변환해 인증 API에 요청
  const kstDate = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
  const start = new Date(kstDate + "T00:00:00+09:00").toISOString();
  try {
    out.today = people(start);
  } catch (e) {
    out.error = String(e);
  }

  // 누적도 같은 API로 센다. 공개 카운터(/counter/*.json)는 최대 4시간 캐시라
  // 오늘 수치는 오르는데 누적은 하루 종일 그대로인 것처럼 보였다. 시작일은 집계 시작 전 아무 날.
  try {
    out.total = people("2020-01-01T00:00:00Z");
  } catch (e) {
    if (!out.error) out.error = String(e);
  }
  // 인증 API가 막히면 공개 카운터("/" 경로, 캐시된 값)라도 쓴다
  if (out.total == null) {
    try {
      const t = JSON.parse(UrlFetchApp.fetch(GC_SITE + "/counter//.json").getContentText());
      out.total = Number(String(t.count ?? t.count_unique).replace(/\D/g, ""));
    } catch (e) {}
  }

  const body = JSON.stringify(out);
  if (out.today != null && out.total != null && !out.error) cache.put("visits", body, 120); // 2분 캐시
  return json_(body);
}

function json_(body) {
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
