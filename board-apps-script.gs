/**
 * TWPage 문의 게시판 백엔드 (Google Apps Script 웹앱)
 *
 * ── 설치 ──
 * 1) 게시판용 구글 시트를 새로 만들고, 시트(탭) 이름을 "문의게시판"으로 바꾼다.
 * 2) 확장 프로그램 → Apps Script → 이 파일 내용을 통째로 붙여넣는다.
 * 3) 배포 → 새 배포 → 유형 "웹 앱"
 *      실행 계정      : 나
 *      액세스 권한    : 모든 사용자          ← 익명 방문자가 글을 쓰려면 반드시 이것
 * 4) 배포하면 나오는 https://script.google.com/macros/s/.../exec 주소를
 *    assets/app.js의 BOARD_API_URL 에 넣는다.
 * 5) 시트 첫 행은 setupSheet()가 알아서 만든다. 직접 만들 필요 없다.
 *
 * ── 답변 다는 법 ──
 * 시트에서 해당 줄의 G열(답변)에 내용을 적으면 끝이다. 답변일은 자동으로 찍힌다.
 * (onEdit 트리거가 처리하므로 H열은 건드리지 않아도 된다)
 *
 * ── 스크립트를 고친 뒤에는 ──
 * 배포 → 배포 관리 → 연필 → 버전 "새 버전" → 배포. 새로 배포하지 말 것.
 * 새로 배포하면 URL이 바뀌어서 사이트 쪽 상수도 함께 고쳐야 한다.
 */

var SHEET_NAME = '문의게시판';
var HEADERS = ['번호', '작성일', '분류', '제목', '작성자', '내용', '답변', '답변일'];
var CATEGORIES = ['버그', '건의', '문의'];

// 같은 사람이 연달아 도배하지 못하게 막는 최소 간격
var MIN_POST_INTERVAL_SEC = 30;

var LIMITS = { title: 100, author: 20, content: 2000 };

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

/** 설치 직후 한 번 실행하면 시트 머리글이 만들어진다 (선택) */
function setupSheet() {
  sheet_();
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function str_(v) {
  return String(v == null ? '' : v).trim();
}

function iso_(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/** 시트 한 줄 → 게시글 객체. 본문은 목록에서 필요 없으므로 full일 때만 넣는다 */
function toPost_(row, full) {
  var post = {
    id: Number(row[0]) || 0,
    createdAt: iso_(row[1]),
    category: str_(row[2]),
    title: str_(row[3]),
    author: str_(row[4]),
    answer: str_(row[6]),
    answeredAt: iso_(row[7]),
  };
  if (full) post.content = str_(row[5]);
  return post;
}

/**
 * GET
 *   ?action=list            목록 (본문 제외)
 *   ?action=post&id=12      글 하나 (본문 포함)
 */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last < 2) return json_({ ok: true, posts: [], categories: CATEGORIES });

    var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();

    if (p.action === 'post') {
      var id = Number(p.id) || 0;
      for (var i = 0; i < values.length; i++) {
        if (Number(values[i][0]) === id) {
          return json_({ ok: true, post: toPost_(values[i], true) });
        }
      }
      return json_({ ok: false, error: '없는 글입니다.' });
    }

    // 최신 글이 위로 오게
    var posts = values
      .filter(function (r) { return Number(r[0]) > 0; })
      .map(function (r) { return toPost_(r, false); })
      .reverse();

    return json_({ ok: true, posts: posts, categories: CATEGORIES });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/**
 * POST — 글 작성
 *
 * 브라우저에서 Content-Type을 text/plain으로 보내야 한다.
 * application/json이면 CORS 프리플라이트(OPTIONS)가 뜨는데 Apps Script는
 * OPTIONS를 처리하지 못해 요청 자체가 막힌다.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // 봇이 채우는 미끼 칸. 사람이 쓴 글이면 항상 비어 있다
    if (str_(body.website)) return json_({ ok: false, error: '잘못된 요청입니다.' });

    var category = str_(body.category);
    var title = str_(body.title);
    var author = str_(body.author) || '익명';
    var content = str_(body.content);

    if (CATEGORIES.indexOf(category) < 0) return json_({ ok: false, error: '분류를 선택해 주세요.' });
    if (!title) return json_({ ok: false, error: '제목을 입력해 주세요.' });
    if (!content) return json_({ ok: false, error: '내용을 입력해 주세요.' });
    if (title.length > LIMITS.title) return json_({ ok: false, error: '제목이 너무 깁니다.' });
    if (author.length > LIMITS.author) return json_({ ok: false, error: '이름이 너무 깁니다.' });
    if (content.length > LIMITS.content) return json_({ ok: false, error: '내용이 너무 깁니다.' });

    // 번호 채번과 도배 검사가 겹치지 않도록 잠근다
    lock.waitLock(10000);

    var sh = sheet_();
    var last = sh.getLastRow();
    var nextId = 1;
    if (last >= 2) {
      var tail = sh.getRange(last, 1, 1, 2).getValues()[0];
      nextId = (Number(tail[0]) || 0) + 1;
      var prev = tail[1] instanceof Date ? tail[1].getTime() : 0;
      if (prev && Date.now() - prev < MIN_POST_INTERVAL_SEC * 1000) {
        return json_({ ok: false, error: '잠시 후 다시 시도해 주세요.' });
      }
    }

    sh.appendRow([nextId, new Date(), category, title, author, content, '', '']);
    return json_({ ok: true, id: nextId });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/** G열(답변)에 글을 적으면 H열(답변일)을 자동으로 찍는다 */
function onEdit(e) {
  try {
    var range = e.range;
    var sh = range.getSheet();
    if (sh.getName() !== SHEET_NAME) return;
    if (range.getColumn() !== 7 || range.getRow() < 2) return;
    var answered = str_(range.getValue());
    sh.getRange(range.getRow(), 8).setValue(answered ? new Date() : '');
  } catch (ignore) {}
}
