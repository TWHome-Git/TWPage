## 1. 프로젝트 목적

Google Sheets에 유지하는 실제 장비 DB를 읽어서 웹페이지에서 장비 검색, 장비 상세 스탯, 재료, 장비 비교, 계산기/시뮬레이터 메뉴 UI를 제공하는 정적 웹사이트입니다.

초기에는 Google Sheets 안에서 검색 UI를 만들려고 했지만, 스크립트 실행 메시지와 느린 반응 때문에 정적 웹페이지 방식으로 전환했습니다.

이 문서는 Claude 기준으로 다시 정리한 버전입니다. 이전에 다른 AI(예: Codex) 작업 방식에 맞춰 있던 파일과 설명은 모두 정리했고, 현재 폴더에 실제로 존재하는 내용만 기준으로 작성했습니다.

## 2. 기술 스택

- HTML: `index.html`
- CSS: `assets/styles.css`
- JavaScript: `assets/app.js`
- 프레임워크: 없음
- 빌드 도구: 없음
- 패키지 매니저: 없음
- 데이터 원본: Google Sheets 공개 CSV
- 이미지 자산: 로컬 PNG 파일
- 폰트: Google Fonts `IBM Plex Sans KR`

`npm install`, `npm run build`가 필요 없습니다. 이 폴더 자체가 그대로 배포 결과물입니다.

## 3. 현재 폴더 구조

```
├─ index.html
├─ .nojekyll
├─ Project.md
├─ assets/
│  ├─ app.js
│  └─ styles.css
└─ equipment-images/   (PNG 373개)
```

이전 문서에는 `web/` 하위 폴더, `.github/workflows/deploy-pages.yml`, `README.md`, `PROJECT_HANDOFF.md`, `character-images/`, `.codex-work/`, `outputs/`가 있었지만 현재 이 폴더에는 없습니다.

주의: `assets/app.js`는 `CHARACTER_IMAGE_BASE = "./character-images/"`를 참조하고 있는데, 실제 `character-images/` 폴더가 없습니다. 계수 계산기 캐릭터 카드 이미지가 현재 깨져 있을 가능성이 높습니다. 이미지가 남아 있는 곳이 있는지 확인하거나, 새로 준비해서 이 폴더에 추가해야 합니다.

## 4. 로컬 실행 방법

```powershell
python -m http.server 5173
```

브라우저 접속:

```text
http://127.0.0.1:5173/
```

## 5. 배포 방식

현재 이 폴더에는 GitHub Pages 배포 워크플로우 파일이 없습니다. 과거에는 `.github/workflows/deploy-pages.yml`로 `web/` 폴더를 GitHub Pages artifact로 자동 업로드했지만, 그 설정 파일은 삭제되어 지금 폴더에는 없습니다.

배포를 다시 연결하려면 다음을 정해야 합니다.

- 이 폴더를 그대로 어떤 저장소/브랜치에 올릴지
- GitHub Actions를 다시 쓸지, 다른 방식(예: 수동 push, Netlify 등)을 쓸지

## 6. 데이터 연결 방식

데이터 URL은 `assets/app.js` 상단에 있습니다.

```js
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS78PnupM0NaJzkrkFCr2Llja9TJKrLcRZqeCqlCUV4GPGlsJd3xSIn3SQAvHwzy_tGtxDbTFtl8oZQ/pub?gid=898941035&single=true&output=csv";
```

현재 방식:

- Google Sheets를 `파일 -> 공유 -> 웹에 게시`로 공개 CSV 게시
- 웹페이지가 CSV를 `fetch(..., { cache: "no-store" })`로 직접 읽음
- Google 게시 CSV 자체에 캐시가 있어서 시트 수정 후 반영까지 약간 지연될 수 있음

주의:

- `SNAPSHOT_URL = "./data/equipment-snapshot.json"` fallback 코드가 있지만 `data/equipment-snapshot.json` 파일은 없습니다.
- Google Sheets CSV 로딩이 실패하면 로컬 스냅샷 fallback도 실패해서 페이지가 완전히 비게 됩니다.
- 안정성을 높이려면 `data/equipment-snapshot.json` 생성 스크립트를 추가하는 것이 좋습니다.

## 7. CSV 컬럼 매핑

`assets/app.js`의 `toRecord(row, index)` 기준입니다.

- `A열`, `row[0]`: 이미지 파일명
- `C열`, `row[2]`: 장비명
- `D열`, `row[3]`: 카테고리
- `E열`, `row[4]`: 분류
- `F열`부터: 스탯 값
- `AG열`, `row[32]`: 착용 조건
- `AH:AM열`, `row[33]`부터 `row[38]`: 재료 목록

스탯은 `STAT_NAMES` 순서대로 `MIN`, `MAX`, `LIMIT` 3칸씩 읽습니다.

현재 스탯 목록:

- 찌르기
- 베기
- 물리방어
- 마법공격
- 마법방어
- 명중
- 회피
- 민첩
- 크리티컬

## 8. 현재 구현된 기능

### 상단 탭

4개 탭: 장비 검색 / 계산기 / 시뮬레이터 / 추가 메뉴. 가장 바깥 배경/테두리 프레임은 탭 전환 시 흔들리지 않게 고정되어 있습니다.

### 장비 검색 — 동작함

- 전체 장비를 Google Sheets CSV에서 읽음
- 카테고리 필터, 분류 필터, 검색어 필터
- 페이지당 장비 카드 1개, 이전/다음 버튼 이동
- Google Sheet 원본 순서를 기본 정렬로 유지
- 결과 개수 표시, DB 연결 상태 표시

카테고리 표시 순서:

```js
["무기", "손목", "갑옷", "장비 세트", "아티팩트"]
```

### 장비 상세 카드 — 동작함

- 장비 이미지, 카테고리/분류, 장비명, 착용 조건, 스탯 테이블, 재료 목록
- 스탯 표시: `MIN` / `MAX` / `LIMIT` / `한계 = LIMIT - MAX`
- 0 이하 값은 `-`로 표시, `LIMIT`은 검정 볼드, `한계`는 파란 볼드

### 재료 이미지 — 동작함

- 재료 chip에 이미지 표시, 한 줄에 3개씩 배치
- 재료명 뒤 수량 표기는 이미지 매칭 전에 제거
- 공백은 `_`로 변환해서 이미지 파일명과 매칭 (예: `인퍼널 대거(1)` -> `인퍼널_대거.png`)
- fallback 로직은 `materialImageNameCandidates()`와 `handleMaterialImageError()`에 있음

### 장비 비교 — 동작함

- 현재 선택한 장비와 같은 `분류`(row[4])가 동일한 장비만 비교 목록에 표시
- 비교 값은 기본적으로 `MAX` 기준, `한계작 비교` 체크 시 일부 스탯은 `LIMIT` 기준
- 한계작 비교 대상 스탯: `["찌르기", "베기", "마법공격", "마법방어"]`
- 비교 색상: 플러스 파란색, 마이너스 빨간색, 변화 없음 검정색

### 계산기 탭 — UI 뼈대만 있음, 계산 로직 없음

하위 탭: 계수 계산기 / 대미지 계산기

계수 계산기:

- 캐릭터 선택 카드 19개 (`CHARACTER_NAMES`, `character-images/`에서 이미지 로드 — 현재 폴더 없음)
- 캐릭터 선택 시 상세 입력 테이블 화면으로 전환, 뒤로 버튼으로 복귀
- `activateCalculatorTab`, `showCoefficientDetail`, `showCoefficientSelect` 등 화면 전환 로직은 있음
- 입력 테이블(부위별 찌르기/베기/명중/계수)과 결과 요약은 현재 하드코딩된 샘플 값(HTML에 정적으로 박혀 있음), 실제 계산 함수는 없음

대미지 계산기:

- 기본 정보 카드, 대미지 입력 카드, 결과 영역 카드 UI만 있음
- 실제 계산 로직 없음

### 시뮬레이터 탭 — 메뉴 구조만 있음

하위 탭: 인크립트 시뮬 / 코어 강화 시뮬 / 신조 렐릭 시뮬. `activateSimulatorTab`으로 탭 전환은 되지만 각 시뮬레이션 실제 로직은 없습니다.

### 추가 메뉴 탭

현재 placeholder 영역입니다.

## 9. 최근 UI 결정 사항

- 기존 장비 검색 스타일을 기준으로 계산기/시뮬레이터 스타일 통일
- X 버튼 제거
- 계산기/시뮬레이터 제목 영역을 장비 검색 제목 영역과 유사하게 맞춤
- 계산기 내부 제목줄 제거, 상단 탭 바로 아래 구분선 추가
- 가장 바깥 배경/테두리 프레임은 모든 탭에서 동일 높이로 고정, 내부 콘텐츠는 자연 높이 유지
- 계수 계산기 캐릭터 아이콘을 축소하고 한 줄 표시 개수를 늘림

현재 주요 CSS 변수:

```css
:root {
  --main-panel-min-height: 825px;
}
```

이 값이 가장 바깥 프레임의 기준 높이입니다.

## 10. 캐시와 갱신

브라우저 캐시를 피하기 위해 `index.html`에서 CSS/JS에 버전 쿼리를 붙입니다.

```html
<link rel="stylesheet" href="./assets/styles.css?v=20260710-fixed-outer-frame" />
<script src="./assets/app.js?v=20260710-fixed-outer-frame" type="module"></script>
```

CSS나 JS 수정 후 배포했는데 브라우저가 예전 화면을 보여주면 `?v=...` 값을 바꾸는 방식으로 캐시를 우회합니다.

## 11. 알려진 이슈 / 확인 필요 사항

- `character-images/` 폴더가 없어서 계수 계산기 캐릭터 이미지가 깨져 있을 가능성 높음
- `data/equipment-snapshot.json`이 없어서 CSV 로딩 실패 시 fallback 없음
- 배포 워크플로우가 삭제되어 현재 자동 배포 수단이 없음 — 재구성 필요
- 계수 계산기 / 대미지 계산기의 실제 계산 공식이 아직 정리되어 있지 않음 (게임 내 공식 정리 필요)

## 12. 다음 작업 후보

1. `character-images/` 복구 또는 재준비
2. 배포 방식 재설정 (저장소, 브랜치, GitHub Actions 여부 결정)
3. `data/equipment-snapshot.json` 생성 방식 추가
4. 계수 계산기 실제 계산 로직 연결
5. 대미지 계산기 실제 계산 로직 연결
6. 인크립트 시뮬 구현
7. 코어 강화 시뮬 구현
8. 신조 렐릭 시뮬 구현
9. 모바일 화면에서 장비 비교 영역 UX 추가 개선
10. 이미지 누락 여부 점검 스크립트 추가

## 13. 작업 시 주의할 점

- 프레임워크 없는 정적 사이트입니다. React/Vite/Astro 등으로 전환하기 전에 사용자 의도를 다시 확인할 것.
- Google Sheets DB를 계속 유지하는 방향입니다.
- 장비 비교는 접미사 문자열이 아니라 `분류`(row[4]) 기준으로 비교합니다.
- 재료 목록은 현재 `AH:AM` 범위를 읽습니다.
- 이미지 파일명은 한글 파일명과 `_` 변환에 민감합니다.
- 시트 공개 CSV URL이 바뀌면 `assets/app.js` 상단 `SHEET_CSV_URL`을 수정해야 합니다.
- Google Sheets 웹 게시 CSV는 반영 지연이 있을 수 있습니다.

## 14. 빠른 검증 명령

JavaScript 문법 확인:

```powershell
node --check .\assets\app.js
```

로컬 서버:

```powershell
python -m http.server 5173
```

접속:

```text
http://127.0.0.1:5173/
```
