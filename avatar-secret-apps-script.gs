// 아바타 시뮬레이터 숨긴 장비 암호 — 매주 월요일(한국 시간 0시) 새 16자리 암호로 바뀌고, 그 주 암호를 메일로 보낸다.
//
// 암호는 어디에도 적어 두지 않는다: 스크립트 속성의 비밀 키(KEY, setup()이 무작위로 만든다)와 그 주 월요일 날짜로
// 매번 같은 값을 다시 계산한다 (HMAC-SHA256). 사이트에는 암호가 아니라 그 주 암호의 해시만 알려 주고(doGet),
// 시뮬레이터는 검색창에 넣은 글의 해시를 만들어 맞춰 본다 (avatar-sim/js/app.js SECRET_URL).
//
// 처음 한 번:
//   1. script.google.com 에서 새 프로젝트를 만들고 이 파일 내용을 붙여 넣는다
//   2. 위쪽 함수 목록에서 setup 을 골라 실행한다 (권한 허용: 메일 보내기, 트리거). 이번 주 암호 메일이 바로 온다
//   3. 배포 > 새 배포 > 웹 앱 / 실행 계정: 나 / 액세스 권한: 모든 사용자 → 웹 앱 URL 을 시뮬레이터에 넣는다
// 응답: {"week": "2026-10-05", "hash": "<sha256 hex>"}
// 메일을 다시 받고 싶으면 sendNow 를 실행한다. 비밀 키를 바꾸면(속성 KEY 삭제 후 setup) 이번 주 암호도 바뀐다.
//
// 스크립트를 고친 뒤에는 배포 > 배포 관리 > 연필 > 버전 "새 버전" > 배포. (새로 배포하면 URL이 바뀐다)

// 헷갈리는 글자(0 O o 1 l I)는 뺐다. 네 종류가 모두 한 글자 이상 들어간다
const CLASSES = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%&*?"];
const ALL = CLASSES.join("");
const LENGTH = 16;
const SALT = "TWSIM|";                     // 해시 앞머리 (app.js 와 같아야 한다)

function setup() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("KEY")) props.setProperty("KEY", Utilities.getUuid() + Utilities.getUuid());
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === "sendWeekly").forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("sendWeekly").timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(0).nearMinute(5)
    .inTimezone("Asia/Seoul").create();
  sendNow();
}

// 한국 시간으로 이번 주 월요일 (yyyy-mm-dd): 암호가 바뀌는 단위
function weekKey_(date) {
  const kst = new Date((date || new Date()).getTime() + 9 * 3600 * 1000);
  const back = (kst.getUTCDay() + 6) % 7;                          // 월요일까지 며칠 전인지
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - back)).toISOString().slice(0, 10);
}

function password_(week) {
  const key = PropertiesService.getScriptProperties().getProperty("KEY");
  if (!key) throw new Error("setup() 을 먼저 실행하세요");
  const b = Utilities.computeHmacSha256Signature("avatar-secret|" + week, key).map((v) => (v + 256) % 256);
  const out = [];
  for (let i = 0; i < LENGTH; i++) out.push(ALL[b[i] % ALL.length]);
  // 빠진 종류가 있으면 정해진 자리를 그 종류 글자로 바꾼다 (다른 종류를 지우지 않는 자리로)
  CLASSES.forEach((set, c) => {
    if (out.some((ch) => set.includes(ch))) return;
    for (let k = 0; k < LENGTH; k++) {
      const pos = (b[16 + c] + k) % LENGTH;
      const own = CLASSES.findIndex((s) => s.includes(out[pos]));
      if (out.filter((ch) => CLASSES[own].includes(ch)).length > 1) { out[pos] = set[b[20 + c] % set.length]; return; }
    }
  });
  return out.join("");
}

function hash_(week) {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + week + "|" + password_(week), Utilities.Charset.UTF_8);
  return d.map((v) => ((v + 256) % 256).toString(16).padStart(2, "0")).join("");
}

// 월요일 0시 트리거
function sendWeekly() { sendNow(); }

function sendNow() {
  const week = weekKey_();
  const start = new Date(week + "T00:00:00+09:00"), end = new Date(start.getTime() + 6 * 86400 * 1000);
  const md = (d) => Utilities.formatDate(d, "Asia/Seoul", "M/d");
  const pw = password_(week);
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
    `[테일즈DB] 아바타 시뮬레이터 이번 주 암호 (${md(start)}~${md(end)})`,
    `이번 주 암호: ${pw}\n\n` +
    `쓰는 법: 아바타 시뮬레이터 검색창에 암호를 넣고 [전부 해제]를 누르면 숨긴 장비가 보입니다.\n` +
    `기간: ${md(start)} (월) 0시 ~ ${md(end)} (일) 24시, 한국 시간. 다음 주 월요일 0시에 새 암호로 바뀌고 메일이 다시 옵니다.`);
}

function doGet() {
  const week = weekKey_();
  return ContentService.createTextOutput(JSON.stringify({ week, hash: hash_(week) })).setMimeType(ContentService.MimeType.JSON);
}
