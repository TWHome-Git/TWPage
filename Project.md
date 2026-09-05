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
│  ├─ styles.css
│  └─ *.json           (buffs / eta_info / skills)
├─ avatar-images/
│  ├─ Icons/           (WebP 2475개 — 아바타 목록용 아이콘, `부위/이름1.webp`)
│  ├─ Details/         (WebP 2278개 — 아바타 착용 상세 이미지, `부위/이름2.webp`)
│  └─ Sets/            (WebP 84개 — 세트 대표 이미지, 부위 구분 없음)
├─ ability-images/     (PNG 5개)
├─ character-images/   (PNG 19개)
├─ equipment-images/   (PNG 373개)
└─ images/             (PNG 41개 + buff/ 50개 + etachar/ 19개)
```

### 아바타 이미지 폴더 구분

아바타 이미지는 용도에 따라 세 폴더로 나뉩니다.

- `avatar-images/Icons/` — 아바타 DB **목록**에 뜨는 작은 아이콘. 게임 아바타 상점 UI에서 잘라낸 55x55 무손실 WebP입니다.
- `avatar-images/Details/` — 아바타 **상세**(착용) 이미지. 캐릭터가 해당 아바타를 착용한 모습입니다.
- `avatar-images/Sets/` — 세트 대표 이미지. 한 아바타가 여러 세트에 속할 수 있어 H열에 `" / "`로 여러 개 올 수 있습니다.

Icons와 Details는 파일이 2000개를 넘어 GitHub 웹 목록이 1000개에서 잘립니다. 그래서 각각 **부위별 하위 폴더**(`투구` / `머리` / `몸` / `효과` / `다리`)로 한 번 더 나눠 담습니다. Sets는 84개뿐이라 나누지 않습니다.

```
avatar-images/Icons/투구/파일럿_캡1.webp
avatar-images/Details/투구/파일럿_캡2.webp
```

Google Sheets 아바타 시트는 A열(아바타 리스트 이미지)과 B열(아바타 상세 이미지)에 **폴더 경로 없이 파일명만** 적습니다(예: `파일럿_캡1.webp`, `파일럿_캡2.webp`). 최상위 폴더는 `assets/app.js`의 `AVATAR_ICON_BASE` / `AVATAR_DETAIL_BASE` / `AVATAR_SET_BASE`가 붙이고, 부위 하위 폴더는 같은 행의 F열(부위) 값을 그대로 써서 `avatarSlotPath()`가 붙입니다.

따라서 **파일은 자기 부위 폴더에 들어 있어야 하고, 시트의 부위 값을 바꾸면 파일도 그 폴더로 옮겨야 합니다.** 부위가 빈 행은 하위 폴더 없이 최상위에서 찾습니다.

## 4. 로컬 실행 방법

```powershell
python -m http.server 5173
```

브라우저 접속:

```text
http://127.0.0.1:5173/
```

## 5. 배포 방식

GitHub Pages로 서비스 중입니다. 주소는 <https://twhome-git.github.io/TWPage/> 입니다.

배포는 GitHub Actions 워크플로우가 아니라 **GitHub이 브랜치를 직접 빌드해 주는 레거시 Pages 방식**입니다. `main`에 push하면 GitHub이 알아서 배포합니다. 빌드 단계가 없으므로 이 폴더가 그대로 배포 결과물입니다.

`.github/workflows`에 있는 워크플로우는 배포와 무관한 별개의 작업입니다.

| 파일 | 언제 | 하는 일 |
| --- | --- | --- |
| `cdn-warm.yml` | `v*` 태그 push | 새 태그가 덮는 이미지를 jsDelivr에서 한 번씩 받아 캐시를 데운다 |
| `eta-population.yml` | 매일 02:00 UTC (11시 KST) | 에타 스냅샷에서 캐릭터별·레벨 구간별 인원수를 세어 `assets/eta-population.json`에 없는 날짜만 덧붙이고, 바뀌면 커밋한다 |

`eta-population.yml`이 커밋을 밀면 그 push로 Pages가 다시 배포됩니다. 집계 로직은 `scripts/build-eta-population.mjs`에 있고, 로컬에서 `node scripts/build-eta-population.mjs`로도 돌릴 수 있습니다.

배포 상태는 API로 확인할 수 있습니다.

```bash
curl -s "https://api.github.com/repos/TWHome-Git/TWPage/deployments?per_page=3"
```

커밋마다 `"environment": "github-pages"` 배포 기록이 남습니다. 개별 배포의 진행 상태(`queued` / `in_progress` / `success`)는 `deployments/<id>/statuses`로 볼 수 있습니다.

push 후 사이트에 반영되기까지 보통 1~5분 걸립니다. 반영이 안 된 것 같으면 배포가 끝났는지부터 확인하세요. `index.html`의 `?v=...` 값을 보면 새 버전이 나갔는지 바로 알 수 있습니다.

```bash
curl -s "https://twhome-git.github.io/TWPage/index.html" | grep -o 'app.js?v=[^"]*'
```

## 6. 데이터 연결 방식

데이터 URL은 `assets/app.js` 상단의 `SHEET_CSV_URL`, `ABILITY_CSV_URL`, `AVATAR_CSV_URL` 상수에 있습니다.
문서에는 주소를 적지 않습니다(불필요한 접근을 줄이기 위해). 실제 값은 코드에서 확인하세요.

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

- 캐릭터 선택 카드 19개 (`CHARACTER_NAMES`, `character-images/`에서 이미지 로드)
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

### 이미지 CDN 태그 (중요)

아바타/어빌리티 이미지는 jsDelivr로 서빙하고, `assets/app.js`의 `CDN_IMAGE_ROOT`가 **semver 태그로 고정**되어 있습니다.

```js
const CDN_IMAGE_ROOT = "https://cdn.jsdelivr.net/gh/TWHome-Git/TWPage@v1.0.0/";
```

jsDelivr는 참조 방식에 따라 캐시 정책을 다르게 줍니다. 실측값입니다.

| 참조 | Cache-Control | 엣지 캐시 |
|---|---|---|
| `@main` | `max-age=604800, s-maxage=43200` | 12시간마다 만료 |
| `@images-v1` (semver 아닌 태그) | `max-age=604800, s-maxage=43200` | 12시간마다 만료 |
| `@v1.0.0` (semver 태그) | `max-age=31536000, immutable` | 1년 |
| `@<커밋 SHA>` | `max-age=31536000, immutable` | 1년 |

엣지 캐시에 있으면 이미지 한 장에 10~20ms, 만료돼서 없으면 400~800ms입니다.

**이미지를 추가하거나 교체하면 새 semver 태그를 찍고 `CDN_IMAGE_ROOT`를 함께 올려야 합니다.**

```bash
git tag v1.0.1 && git push origin v1.0.1
# assets/app.js의 CDN_IMAGE_ROOT를 @v1.0.1로 수정 후 커밋
```

기존 태그를 옮기면 안 됩니다. 캐시가 `immutable`이라 이미 배포된 태그 URL은 1년간 옛 내용을 그대로 내보냅니다. 태그를 올리지 않으면 새로 추가한 이미지는 404가 납니다.

## 11. 알려진 이슈 / 확인 필요 사항

- `data/equipment-snapshot.json`이 없어서 CSV 로딩 실패 시 fallback 없음. `assets/app.js`의 `SNAPSHOT_URL`이 이 경로를 가리키고, 시트를 못 불러오면 여기서 읽으려 하는데 파일 자체가 없습니다
- 계수 계산기 / 대미지 계산기의 실제 계산 공식이 아직 정리되어 있지 않음 (게임 내 공식 정리 필요)

## 12. 다음 작업 후보

1. `data/equipment-snapshot.json` 생성 방식 추가
2. 계수 계산기 실제 계산 로직 연결
3. 대미지 계산기 실제 계산 로직 연결
4. 인크립트 시뮬 구현
5. 코어 강화 시뮬 구현
6. 신조 렐릭 시뮬 구현
7. 모바일 화면에서 장비 비교 영역 UX 추가 개선
8. 이미지 누락 여부 점검 스크립트 추가

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
