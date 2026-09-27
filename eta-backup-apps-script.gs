/**
 * 에타 인구 자료 백업 (Google Apps Script)
 *
 * 사이트의 assets/eta-population.json을 하루 한 번 읽어, 구글 시트에 날짜별로 쌓는다.
 * 깃헙 저장소가 사라지거나 옮겨져도 여기 쌓인 값은 내 구글 드라이브에 남는다.
 *
 * ── 설치 ──
 * 1) 드라이브에서 새 스프레드시트를 만든다 (이름은 아무거나, 예: "에타 인구 백업").
 * 2) 확장 프로그램 → Apps Script → 이 파일 내용을 통째로 붙여넣고 저장한다.
 * 3) 함수 목록에서 backupNow 를 골라 한 번 실행한다. (처음에는 권한 승인 창이 뜬다)
 *    지금까지 쌓인 날짜가 모두 들어온다.
 * 4) 왼쪽 시계 아이콘(트리거) → 트리거 추가
 *      실행할 함수      : backupNow
 *      이벤트 소스      : 시간 기반
 *      트리거 유형      : 일 단위 타이머
 *      시간            : 오전 10~11시   (사이트 갱신이 보통 아침 9시쯤 끝난다)
 *
 * ── 시트 ──
 * "인구"   날짜 · 서버 · 캐릭터 · 구간별 인원 · 합계        (그날의 인원)
 * "소모"   날짜 · 서버 · 캐릭터 · 구간을 넘어간 인원 · 라피스 · 설계자의 반지
 * 이미 들어 있는 날짜는 건너뛰므로, 매일 돌아도 그날 것만 붙는다.
 *
 * ── 개인 기록 (드라이브 폴더) ──
 * 사람별 날짜별 레벨·정수는 양이 많아 시트 대신 파일로 담는다.
 * 드라이브에 "TWPage 백업/eta-history" 폴더를 만들고 원본 파일을 그대로 받아 둔다.
 * 이 파일들은 처음부터 지금까지가 한 파일에 다 들어 있어, 최신 한 벌만 있으면 된다.
 * 그래서 매일 같은 이름으로 덮어쓰고, 달이 바뀌면 그달 폴더에 한 벌을 따로 남긴다.
 *
 * ── 확인 ──
 * 실행 기록은 Apps Script 왼쪽 "실행"에서 볼 수 있다. 실패하면 구글이 메일로 알려 준다.
 */

var SOURCE_URL = 'https://talesdb.xyz/assets/eta-population.json';

var POP_SHEET = '인구';
var COST_SHEET = '소모';

// 개인 기록 파일을 담을 드라이브 폴더와 받아올 파일들
var DRIVE_FOLDER = 'TWPage 백업';
var HISTORY_FOLDER = 'eta-history';
var SITE_BASE = 'https://talesdb.xyz/assets/';
var HISTORY_FILE_COUNT = 64;   // 00.json ~ 63.json (캐릭터별 파일). 캐릭터가 늘면 이 수를 올린다

// 레벨 구간 상한과, 그 구간으로 올라설 때 드는 재료 (20→21 라피스 1개 …)
var BAND_TOPS = [20, 40, 60, 80, 90, 100];
var COST_LAPIS = [1, 3, 3, 3, 5];
var COST_RING = [0, 0, 0, 0, 1];

var CHARACTERS = {
  0: '루시안', 1: '보리스', 2: '막시민', 3: '시벨린', 4: '조슈아',
  5: '란지에', 6: '이자크', 7: '밀라', 8: '티치엘', 9: '이스핀',
  10: '나야트레이', 11: '아나이스', 12: '클로에', 13: '벤야', 14: '이솔렛',
  15: '로아미니', 16: '녹턴', 17: '리체', 18: '예프넨',
};

function bandLabels_() {
  var labels = [];
  for (var i = 0; i < BAND_TOPS.length; i++) {
    labels.push(((BAND_TOPS[i - 1] || 0) + 1) + '-' + BAND_TOPS[i]);
  }
  return labels;
}

function popHeaders_() {
  return ['날짜', '서버', '캐릭터코드', '캐릭터'].concat(bandLabels_()).concat(['합계']);
}

function costHeaders_() {
  var heads = ['날짜', '서버', '캐릭터코드', '캐릭터'];
  for (var i = 0; i < COST_LAPIS.length; i++) heads.push(BAND_TOPS[i] + '→' + (BAND_TOPS[i] + 1));
  return heads.concat(['라피스', '설계자의 반지']);
}

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

/** 그 시트에 이미 들어 있는 날짜들 */
function doneDates_(sh) {
  var done = {};
  var last = sh.getLastRow();
  if (last < 2) return done;
  sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (row) {
    var value = row[0];
    var key = value instanceof Date ? Utilities.formatDate(value, 'Asia/Seoul', 'yyyy-MM-dd') : String(value).trim();
    if (key) done[key] = true;
  });
  return done;
}

/** 시트에 날짜는 글자 그대로 넣는다. 자동 날짜 변환으로 형식이 흔들리지 않게 한다 */
function appendRows_(sh, rows) {
  if (!rows.length) return;
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

/** 드라이브에서 폴더를 찾고, 없으면 만든다 */
function folder_(parent, name) {
  var found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}

/** 같은 이름의 파일이 있으면 내용만 바꾸고, 없으면 새로 만든다 */
function putFile_(folder, name, text) {
  var found = folder.getFilesByName(name);
  if (found.hasNext()) {
    var file = found.next();
    file.setContent(text);
    // 같은 이름이 여러 개 생겼으면 하나만 남긴다
    while (found.hasNext()) found.next().setTrashed(true);
    return file;
  }
  return folder.createFile(name, text, MimeType.PLAIN_TEXT);
}

/**
 * 사람별 기록 파일을 드라이브에 담는다.
 * 매달 1일에는 그달 폴더(예: 2026-09)에 한 벌을 따로 남겨, 원본이 잘못돼도 되돌릴 수 있게 한다.
 */
function backupHistory() {
  var root = folder_(DriveApp.getRootFolder(), DRIVE_FOLDER);
  var latest = folder_(root, HISTORY_FOLDER);
  var today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  var archive = today.slice(8) === '01' ? folder_(root, today.slice(0, 7)) : null;

  var names = ['index.json'];
  for (var i = 0; i < HISTORY_FILE_COUNT; i++) names.push((i < 10 ? '0' + i : String(i)) + '.json');

  var saved = 0;
  var missing = [];
  names.forEach(function (name) {
    var res = UrlFetchApp.fetch(SITE_BASE + HISTORY_FOLDER + '/' + name, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      missing.push(name);
      return;
    }
    var text = res.getContentText();
    putFile_(latest, name, text);
    if (archive) putFile_(archive, name, text);
    saved++;
  });

  var message = '개인 기록 ' + saved + '개 저장' + (archive ? ' (' + today.slice(0, 7) + ' 보관본 포함)' : '')
    + (missing.length ? ' · 없는 파일 ' + missing.length + '개' : '');
  Logger.log(message);
  return message;
}

function backupNow() {
  var res = UrlFetchApp.fetch(SOURCE_URL, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('자료를 받지 못했습니다 (HTTP ' + res.getResponseCode() + ')');
  var payload = JSON.parse(res.getContentText());
  var days = payload.days || {};
  var cost = payload.cost || {};

  var popSh = sheet_(POP_SHEET, popHeaders_());
  var costSh = sheet_(COST_SHEET, costHeaders_());
  var popDone = doneDates_(popSh);
  var costDone = doneDates_(costSh);

  var dates = Object.keys(days).sort();
  var popRows = [];
  var costRows = [];

  dates.forEach(function (date) {
    if (!popDone[date]) {
      var servers = days[date] || {};
      Object.keys(servers).sort().forEach(function (server) {
        var byCode = servers[server] || {};
        Object.keys(byCode).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (code) {
          var bands = byCode[code] || [];
          var row = [date, server, Number(code), CHARACTERS[Number(code)] || ('코드' + code)];
          var sum = 0;
          for (var i = 0; i < BAND_TOPS.length; i++) {
            var n = Number(bands[i]) || 0;
            row.push(n);
            sum += n;
          }
          row.push(sum);
          popRows.push(row);
        });
      });
    }

    if (!costDone[date] && cost[date]) {
      var costServers = cost[date] || {};
      Object.keys(costServers).sort().forEach(function (server) {
        var byCode = costServers[server] || {};
        Object.keys(byCode).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (code) {
          var counts = byCode[code] || [];
          var row = [date, server, Number(code), CHARACTERS[Number(code)] || ('코드' + code)];
          var lapis = 0;
          var ring = 0;
          for (var i = 0; i < COST_LAPIS.length; i++) {
            var people = Number(counts[i]) || 0;
            row.push(people);
            lapis += people * COST_LAPIS[i];
            ring += people * COST_RING[i];
          }
          row.push(lapis);
          row.push(ring);
          costRows.push(row);
        });
      });
    }
  });

  appendRows_(popSh, popRows);
  appendRows_(costSh, costRows);

  var message = '인구 ' + popRows.length + '줄, 소모 ' + costRows.length + '줄 추가 (자료 ' + dates.length + '일)';
  Logger.log(message);

  // 개인 기록까지 한 번에 담는다. 여기서 실패해도 위 시트 값은 이미 들어가 있다
  message += ' · ' + backupHistory();
  Logger.log(message);
  return message;
}
