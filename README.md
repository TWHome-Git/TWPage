# TW DB 장비 검색

Google Sheet 공개 CSV를 읽어서 장비 검색, 재료, 장비 비교를 보여주는 정적 웹페이지입니다.

## 폴더 구조

- `web/`: GitHub Pages에 배포되는 실제 웹사이트 파일
- `.github/workflows/deploy-pages.yml`: `web/` 폴더를 GitHub Pages로 자동 배포하는 워크플로우
- `web/.nojekyll`: GitHub Pages에서 Jekyll 처리를 끄기 위한 파일

## GitHub Pages 배포 방법

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더에서 아래 명령을 실행합니다.

```powershell
git add README.md .gitignore .github web
git commit -m "Prepare GitHub Pages deployment"
git branch -M main
git remote add origin https://github.com/YOUR_ID/YOUR_REPOSITORY.git
git push -u origin main
```

3. GitHub 저장소 페이지에서 `Settings` -> `Pages`로 이동합니다.
4. `Build and deployment`의 `Source`를 `GitHub Actions`로 선택합니다.
5. `Actions` 탭에서 `Deploy GitHub Pages`가 성공하면 사이트가 열립니다.

배포 주소는 보통 아래 형태입니다.

```text
https://YOUR_ID.github.io/YOUR_REPOSITORY/
```

## 데이터 갱신

웹페이지는 `web/assets/app.js`의 공개 CSV 주소를 직접 읽습니다. Google Sheet를 수정한 뒤에는 Google 게시 CSV 캐시 때문에 반영까지 잠시 걸릴 수 있습니다.

## 로컬 확인

간단한 정적 서버로 확인할 수 있습니다.

```powershell
cd web
python -m http.server 5173
```

브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:5173/
```
