// 홈 방문 카운터 프록시 — GoatCounter 인증 API로 KST 자정 기준 "오늘 방문"을 구한다.
// 토큰은 코드에 넣지 않고 스크립트 속성(GC_TOKEN)에 저장한다.
//
// 배포: 배포 > 새 배포 > 웹 앱 / 실행 계정: 나 / 액세스 권한: 모든 사용자
// 응답: {"today": 123, "total": 7757, "boundary": "KST 00:00"}
//
// 수치의 뜻: GoatCounter의 "방문(visit)"이다. 한 사람이 같은 경로를 하루에 여러 번 봐도 1로 세지만,
// 이 사이트는 탭마다 다른 경로(/eta/ranking, /calculator …)를 보내므로 한 사람이 탭 6개를 보면 6으로
// 잡힌다. GoatCounter 대시보드의 "visits"와 같은 값이다.
//
// 스크립트를 고친 뒤에는 배포 > 배포 관리 > 연필 > 버전 "새 버전" > 배포. (새로 배포하면 URL이 바뀐다)

const GC_SITE = "https://holedis88.goatcounter.com";

function doGet() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get("visits");
  if (hit) return json_(hit);

  const token = PropertiesService.getScriptProperties().getProperty("GC_TOKEN");
  const out = { today: null, total: null, boundary: "KST 00:00" };

  // 오늘(KST) 자정 → 지금, UTC 시각으로 변환해 인증 API에 요청
  const kstDate = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
  const start = new Date(kstDate + "T00:00:00+09:00").toISOString();
  try {
    const r = UrlFetchApp.fetch(
      GC_SITE + "/api/v0/stats/total?start=" + encodeURIComponent(start),
      { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true }
    );
    if (r.getResponseCode() === 200) {
      const j = JSON.parse(r.getContentText());
      // total = 사이트 시간대 기준 방문자 수 (total_utc는 UTC 기준이라 쓰면 안 됨)
      const v = j.total ?? j.count_unique ?? j.count;
      if (v != null) out.today = Number(String(v).replace(/\D/g, ""));
      else out.debug = j; // 필드를 못 찾으면 원본을 보여줘 진단할 수 있게
    } else {
      out.error = "api " + r.getResponseCode();
    }
  } catch (e) {
    out.error = String(e);
  }

  // 누적도 같은 인증 API로 센다. 공개 카운터(/counter/TOTAL.json)는 최대 4시간 캐시라
  // 오늘 수치는 오르는데 누적은 하루 종일 그대로인 것처럼 보였다. 시작일은 집계 시작 전 아무 날.
  try {
    const r = UrlFetchApp.fetch(
      GC_SITE + "/api/v0/stats/total?start=" + encodeURIComponent("2020-01-01T00:00:00Z"),
      { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true }
    );
    if (r.getResponseCode() === 200) {
      const j = JSON.parse(r.getContentText());
      if (j.total != null) out.total = Number(j.total);
    }
  } catch (e) {}
  // 인증 API가 막히면 공개 카운터(캐시된 값)라도 쓴다
  if (out.total == null) {
    try {
      const t = JSON.parse(UrlFetchApp.fetch(GC_SITE + "/counter/TOTAL.json").getContentText());
      out.total = Number(String(t.count ?? t.count_unique).replace(/\D/g, ""));
    } catch (e) {}
  }

  const body = JSON.stringify(out);
  if (out.today != null && !out.error) cache.put("visits", body, 120); // 2분 캐시
  return json_(body);
}

function json_(body) {
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
