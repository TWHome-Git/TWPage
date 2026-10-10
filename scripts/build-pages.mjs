// index.html을 틀로 삼아 화면마다 진짜 주소의 HTML 파일을 만든다.
//
// 사이트는 화면을 자바스크립트로 바꿔 보여 주는 한 장짜리 페이지인데, GitHub Pages는 그 경로에
// 파일이 있어야 정상(200)으로 응답한다. 그래서 /eta/, /calculator/damage/ 같은 주소마다
// index.html을 복사해 두고, 제목·설명·대표 주소만 그 화면에 맞게 바꾼다. 본문은 모두 같고
// 어느 화면을 열지는 앱이 주소를 읽어 정한다.
//
// 만드는 것
//   <탭>/index.html, <탭>/<하위탭>/index.html   화면별 페이지
//   404.html                                     파일이 없는 주소(장비 이름 등)에서 앱을 띄우는 페이지
//   sitemap.xml                                  위 화면 주소 전부
//   assets/site-version.json                     사이트 판 (앱이 새 배포를 알아채고 새로고침한다)
// 그리고 index.html 의 자원 주소(app.js · styles.css · mobile.css 의 ?v=)를 파일 내용의 해시로 맞추고,
// <meta name="tw-site-version"> 에 사이트 판을 적는다 (손으로 ?v= 를 올리지 않아도 된다)
//
// index.html이나 이 파일을 고쳤으면 다시 돌린다:  node scripts/build-pages.mjs
// (올릴 때 잊어도 .github/workflows/build-pages.yml이 대신 돌려 커밋한다)

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SITE = "https://talesdb.xyz/";
const SITE_NAME = "테일즈DB";

// 하위 탭이 기본값이면 주소에서 뺀다. app.js의 ROUTE_DEFAULT_SUB와 같아야 한다
const DEFAULT_SUB = { info: "seed", eta: "ranking", equipment: "equipment", calculator: "equipment", simulator: "encrypt" };
// 메인 탭 → 하위 탭 버튼의 data 속성 이름
const SUB_ATTR = { info: "info", eta: "eta", equipment: "db", calculator: "calculator", simulator: "simulator" };

// 화면별 제목·설명은 assets/route-meta.json에 있다 (앱도 같은 파일로 탭 제목을 바꾼다).
// 적어 두지 않은 화면은 버튼 글자로 기본 문구를 만든다
const GENERATED = "<!-- 이 파일은 scripts/build-pages.mjs가 index.html에서 만든다. 직접 고치지 말고 index.html을 고친 뒤 다시 돌린다 -->";

// 버튼 태그에서 탭 키와 글자를 읽는다. 아직 공개하지 않은(data-local-only) 화면은 뺀다.
// 알리지 않는(data-unlisted) 화면은 주소로 열리게 페이지는 만들되 noindex를 달고 사이트맵에서 뺀다
function tabsOf(html, attr) {
  const out = [];
  const re = new RegExp(`<button\\b([^>]*\\bdata-${attr}-tab="([a-z0-9]+)"[^>]*)>([^<]*)</button>`, "g");
  let m;
  while ((m = re.exec(html))) {
    if (/\bdata-local-only\b/.test(m[1])) continue;
    if (!out.some((t) => t.key === m[2])) out.push({ key: m[2], label: m[3].trim(), unlisted: /\bdata-unlisted\b/.test(m[1]) });
  }
  return out;
}

function routesOf(html) {
  const routes = [];
  for (const main of tabsOf(html, "main")) {
    if (main.key === "home") continue;
    routes.push({ path: main.key, label: main.label, parent: "" });
    const attr = SUB_ATTR[main.key];
    if (!attr) continue;
    for (const sub of tabsOf(html, attr)) {
      if (sub.key === DEFAULT_SUB[main.key]) continue;   // 기본 하위 탭은 메인 탭 주소가 대신한다
      routes.push({ path: `${main.key}/${sub.key}`, label: sub.label, parent: main.label, unlisted: sub.unlisted });
    }
  }
  return routes;
}

const escapeAttr = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// 틀의 머리 정보에서 한 줄을 통째로 바꾼다. 못 찾으면 틀이 바뀐 것이므로 멈춘다
function replaceOnce(html, pattern, replacement, what) {
  if (!pattern.test(html)) throw new Error(`틀에서 ${what} 자리를 찾지 못했습니다`);
  return html.replace(pattern, () => replacement);
}

function pageHtml(template, { title, description, url, noindex }) {
  let html = template;
  const t = escapeAttr(title);
  const d = escapeAttr(description);
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${t}</title>`, "title");
  html = replaceOnce(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${d}" />`, "description");
  html = replaceOnce(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`, "canonical");
  html = replaceOnce(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`, "og:url");
  html = replaceOnce(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${t}" />`, "og:title");
  html = replaceOnce(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${d}" />`, "og:description");
  html = replaceOnce(html, /<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${t}" />`, "twitter:title");
  html = replaceOnce(html, /<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${d}" />`, "twitter:description");
  if (noindex) html = html.replace(/<link rel="canonical" href="[^"]*" \/>/, (line) => `${line}\n    <meta name="robots" content="noindex" />`);
  return html.replace(/<!doctype html>/i, (line) => `${line}\n${GENERATED}`);
}

// 자원 주소의 ?v= 와 사이트 판은 내용의 해시다. 줄바꿈은 LF로 맞춰 센다 (윈도우 작업본은 CRLF, GitHub은 LF라
// 그대로 세면 워크플로가 매번 다른 값을 적는다)
const STAMPED_ASSETS = ["assets/app.js", "assets/styles.css", "assets/mobile.css"];
const SITE_VERSION_META = /<meta name="tw-site-version" content="[^"]*" \/>/;
const digest = (text) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex").slice(0, 10);

async function stampVersions(source) {
  let html = source;
  for (const file of STAMPED_ASSETS) {
    const v = digest(await readFile(join(ROOT, file), "utf8"));
    const url = `./${file}`;
    const at = html.indexOf(`${url}?v=`);
    if (at < 0) throw new Error(`틀에서 ${file} 주소 자리를 찾지 못했습니다`);
    html = html.slice(0, at) + `${url}?v=${v}` + html.slice(html.indexOf('"', at));
  }
  // 사이트 판: 판 표시 줄을 뺀 틀 전체. 자원 판과 아바타 시뮬레이터 판(data-sim-v)이 다 이 안에 들어 있다
  const site = digest(html.replace(SITE_VERSION_META, ""));
  html = replaceOnce(html, SITE_VERSION_META, `<meta name="tw-site-version" content="${site}" />`, "tw-site-version");
  return { html, site };
}

async function main() {
  const source = await readFile(join(ROOT, "index.html"), "utf8");
  const { html: template, site } = await stampVersions(source);
  if (template !== source) await writeFile(join(ROOT, "index.html"), template, "utf8");
  await writeFile(join(ROOT, "assets", "site-version.json"), JSON.stringify({ v: site }) + "\n", "utf8");
  if (!/<base href="\/" \/>/.test(template)) throw new Error('index.html에 <base href="/" />가 없습니다. 하위 폴더의 페이지가 자원을 찾지 못합니다');

  const meta = JSON.parse(await readFile(join(ROOT, "assets", "route-meta.json"), "utf8"));
  const routes = routesOf(template);
  const written = [];
  for (const route of routes) {
    const [title, description] = (meta[route.path] && [meta[route.path].title, meta[route.path].description])
      || [`테일즈위버 ${route.label}`, `${SITE_NAME}의 ${route.parent ? `${route.parent} · ` : ""}${route.label} 화면입니다. 테일즈위버 플레이에 필요한 자료와 도구를 한곳에 모았습니다.`];
    const file = join(ROOT, route.path, "index.html");
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, pageHtml(template, { title: `${title} | ${SITE_NAME}`, description, url: `${SITE}${route.path}/`, noindex: route.unlisted }), "utf8");
    if (!route.unlisted) written.push(route.path);
  }

  // 파일이 없는 주소로 들어왔을 때 GitHub Pages가 내주는 페이지. 같은 앱이 떠서 주소를 읽고 그 화면을 연다
  await writeFile(join(ROOT, "404.html"), pageHtml(template, {
    title: `${SITE_NAME} - 테일즈위버 에타 순위 · 계산기 · 시뮬레이터`,
    description: "테일즈DB(테일즈위버 DB)의 화면을 여는 중입니다.",
    url: SITE,
    noindex: true,
  }), "utf8");

  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const urls = ["", ...written.map((path) => `${path}/`)];
  await writeFile(join(ROOT, "sitemap.xml"), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((path) => `  <url><loc>${SITE}${path}</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq></url>`),
    "</urlset>",
    "",
  ].join("\n"), "utf8");

  // 같은 주소를 한 줄씩 적은 텍스트 사이트맵. 검색엔진이 XML을 못 읽겠다고 할 때 대신 제출한다
  await writeFile(join(ROOT, "sitemap.txt"), urls.map((path) => `${SITE}${path}`).join("\n") + "\n", "utf8");

  console.log(`화면 ${written.length}개 + 404.html + sitemap.xml + sitemap.txt`);
  written.forEach((path) => console.log(`  /${path}/`));
}


await main();
