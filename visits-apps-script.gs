// 홈 방문 카운터 프록시 — GoatCounter 인증 API로 KST 자정 기준 "오늘 방문"을 구한다.
// 토큰은 코드에 넣지 않고 스크립트 속성(GC_TOKEN)에 저장한다.
//
// 배포: 배포 > 새 배포 > 웹 앱 / 실행 계정: 나 / 액세스 권한: 모든 사용자
// 응답: {"today": 123, "total": 7757, "boundary": "KST 00:00"}

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

  // 누적은 공개 카운터로 충분 (인증 불필요)
  try {
    const t = JSON.parse(UrlFetchApp.fetch(GC_SITE + "/counter/TOTAL.json").getContentText());
    out.total = Number(String(t.count_unique ?? t.count).replace(/\D/g, ""));
  } catch (e) {}

  const body = JSON.stringify(out);
  if (out.today != null && !out.error) cache.put("visits", body, 120); // 2분 캐시
  return json_(body);
}

function json_(body) {
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
