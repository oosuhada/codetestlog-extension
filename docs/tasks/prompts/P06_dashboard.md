# [P06] Phase 6: 통계 대시보드 (GitHub Pages)

## 전제 조건
P01~P03 중 최소 하나 완료. GitHub 레포에 CTL 규칙으로 커밋된 파일이 존재.

## 작업 목표
GitHub Pages로 배포되는 **통계 대시보드 SPA** 제작.
GitHub API로 커밋 이력을 파싱해서 정답률, 시도 횟수, 레벨별 분포 등 시각화.

### 이 Phase의 범위
- 정적 HTML + Vanilla JS (빌드 툴 없음, 서버 없음)
- GitHub API로 파일 트리 파싱 (인증 불필요, public 레포 기준)
- AI 분석 없음 (P07)
- 익스텐션과 별도: `익스텐션_레포/dashboard/` 폴더에 배치

---

## 작업 1: 파일 구조 생성

```bash
mkdir -p dashboard/components
```

```
dashboard/
├── index.html
├── app.js
├── style.css
└── components/
    ├── stats_cards.js    ← 요약 카드
    ├── charts.js         ← Chart.js 래퍼
    └── problem_table.js  ← 문제 목록 테이블
```

---

## 작업 2: GitHub API 파서 (app.js)

```javascript
// dashboard/app.js

/**
 * GitHub 레포의 파일 트리를 CTL 규칙으로 파싱
 * @param {string} owner
 * @param {string} repo
 * @returns {Promise<SubmissionRecord[]>}
 */
async function fetchSubmissions(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;
  const res  = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `GitHub API 오류: ${res.status}`);
  }

  const data = await res.json();
  return data.tree
    .filter(f => f.type === 'blob' && isCtlFile(f.path))
    .map(f => parseCtlPath(f.path))
    .filter(Boolean);
}

// CTL 규칙 파일 판별
function isCtlFile(path) {
  return /\/\d{8}_\d{6}_(correct|wrong|timeout|runtime_error|compile_error|memory_exceeded|partial)_/.test(path);
}

/**
 * @typedef {Object} SubmissionRecord
 * @property {string} site
 * @property {string} level
 * @property {string} problemId
 * @property {string} title
 * @property {string} result
 * @property {string} language
 * @property {Date}   submittedAt
 * @property {string} path        - GitHub 파일 경로
 */
function parseCtlPath(path) {
  // 예: "프로그래머스/lv2/42586. 기능개발/20260501_143022_correct_기능개발.py"
  const parts = path.split('/');
  if (parts.length < 4) return null;

  const [site, level, problemFolder, fileName] = parts;

  const fileMatch = fileName.match(/^(\d{8})_(\d{6})_([\w]+)_.+\.(\w+)$/);
  if (!fileMatch) return null;

  const [, dateStr, timeStr, result, ext] = fileMatch;
  const problemMatch = problemFolder.match(/^(\d+)\.\s(.+)$/);
  const problemId    = problemMatch?.[1] || problemFolder;
  const title        = problemMatch?.[2] || problemFolder;

  const y  = dateStr.slice(0,4), mo = dateStr.slice(4,6), d  = dateStr.slice(6,8);
  const h  = timeStr.slice(0,2), mi = timeStr.slice(2,4), s  = timeStr.slice(4,6);
  const submittedAt = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);

  return { site, level, problemId, title, result, language: extToLang(ext), submittedAt, path };
}

const EXT_LANG = {
  py:'Python', java:'Java', js:'JavaScript', ts:'TypeScript',
  cpp:'C++', c:'C', kt:'Kotlin', swift:'Swift', go:'Go', rs:'Rust', rb:'Ruby',
};
function extToLang(ext) { return EXT_LANG[ext] || ext.toUpperCase(); }
```

---

## 작업 3: 통계 계산 (app.js)

```javascript
function calcStats(submissions) {
  const total   = submissions.length;
  const correct = submissions.filter(s => s.result === 'correct').length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  // 문제별 마지막 제출 (해결 여부 판별)
  const byProblem = {};
  submissions.forEach(s => {
    const key = `${s.site}__${s.problemId}`;
    if (!byProblem[key] || s.submittedAt > byProblem[key].submittedAt)
      byProblem[key] = s;
  });
  const uniqueProblems = Object.values(byProblem);
  const solved         = uniqueProblems.filter(s => s.result === 'correct').length;

  // 사이트별 분포
  const bySite = {};
  submissions.forEach(s => { bySite[s.site] = (bySite[s.site] || 0) + 1; });

  // 결과별 분포
  const byResult = {};
  submissions.forEach(s => { byResult[s.result] = (byResult[s.result] || 0) + 1; });

  // 연속 풀이일 계산
  const solvedDays = new Set(
    submissions
      .filter(s => s.result === 'correct')
      .map(s => s.submittedAt.toISOString().slice(0, 10))
  );
  const streak = calcStreak(solvedDays);

  // 최근 30일 일별 제출
  const dailyMap = {};
  const now = new Date();
  submissions.forEach(s => {
    const diff = Math.floor((now - s.submittedAt) / 86400000);
    if (diff <= 30) {
      const key = s.submittedAt.toISOString().slice(0, 10);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    }
  });

  return { total, correct, accuracy, solved, unique: uniqueProblems.length, bySite, byResult, streak, dailyMap };
}

function calcStreak(solvedDays) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (solvedDays.has(key)) streak++;
    else break;
  }
  return streak;
}
```

---

## 작업 4: index.html 레이아웃

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Algolog Dashboard</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
</head>
<body>
  <header class="db-header">
    <div class="header-inner">
      <h1><span class="logo">ALG</span> Algolog</h1>
      <div class="repo-input-area">
        <input id="repo-input" placeholder="username/repo-name" />
        <button id="load-btn">불러오기</button>
      </div>
    </div>
  </header>

  <main id="main" class="hidden">
    <!-- 요약 카드 -->
    <section class="cards-grid">
      <div class="stat-card">
        <span class="card-value" id="stat-total">-</span>
        <span class="card-label">총 제출</span>
      </div>
      <div class="stat-card">
        <span class="card-value" id="stat-solved">-</span>
        <span class="card-label">해결 문제</span>
      </div>
      <div class="stat-card">
        <span class="card-value" id="stat-accuracy">-</span>
        <span class="card-label">정답률</span>
      </div>
      <div class="stat-card">
        <span class="card-value" id="stat-streak">-</span>
        <span class="card-label">연속 풀이일</span>
      </div>
    </section>

    <!-- 차트 -->
    <section class="charts-grid">
      <div class="chart-card">
        <h3>최근 30일 제출</h3>
        <canvas id="chart-daily"></canvas>
      </div>
      <div class="chart-card">
        <h3>결과 분포</h3>
        <canvas id="chart-result"></canvas>
      </div>
      <div class="chart-card">
        <h3>사이트별 제출</h3>
        <canvas id="chart-site"></canvas>
      </div>
    </section>

    <!-- 문제 목록 -->
    <section class="table-section">
      <div class="table-header">
        <h2>풀이 기록</h2>
        <div class="filter-row">
          <select id="filter-site"><option value="">전체 사이트</option></select>
          <select id="filter-result"><option value="">전체 결과</option></select>
          <input id="filter-search" placeholder="문제명 검색" />
        </div>
      </div>
      <table id="problem-table">
        <thead>
          <tr>
            <th>문제명</th><th>사이트</th><th>레벨</th>
            <th>결과</th><th>언어</th><th>날짜</th>
          </tr>
        </thead>
        <tbody id="table-body"></tbody>
      </table>
    </section>
  </main>

  <div id="loading" class="loading hidden">불러오는 중...</div>
  <div id="error"   class="error   hidden"></div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

---

## 작업 5: style.css (다크 테마)

```css
:root {
  --bg:      #0d1117;
  --surface: #161b22;
  --border:  #30363d;
  --text:    #e6edf3;
  --muted:   #8b949e;
  --accent:  #58a6ff;
  --correct: #3fb950;
  --wrong:   #f85149;
  --timeout: #d29922;
  --font:    'Pretendard', 'Noto Sans KR', -apple-system, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); font-family: var(--font); }

.db-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 16px 24px;
}
.header-inner { display: flex; align-items: center; gap: 16px; max-width: 1200px; margin: 0 auto; }
.logo {
  font-weight: 800; font-size: 12px;
  background: var(--accent); color: #000;
  padding: 2px 7px; border-radius: 4px; margin-right: 8px;
}
h1 { font-size: 18px; flex: 1; }

.repo-input-area { display: flex; gap: 8px; }
.repo-input-area input {
  background: var(--bg); border: 1px solid var(--border);
  color: var(--text); padding: 6px 12px; border-radius: 6px;
  font-size: 13px; width: 220px;
}
.repo-input-area button {
  background: var(--accent); color: #000;
  border: none; padding: 6px 14px;
  border-radius: 6px; cursor: pointer; font-weight: 600;
}

main { max-width: 1200px; margin: 24px auto; padding: 0 24px; }

/* 카드 */
.cards-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 20px; text-align: center;
}
.card-value { display: block; font-size: 32px; font-weight: 700; color: var(--accent); }
.card-label { font-size: 13px; color: var(--muted); margin-top: 4px; }

/* 차트 */
.charts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.chart-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 20px;
}
.chart-card h3 { font-size: 13px; color: var(--muted); margin-bottom: 14px; }

/* 테이블 */
.table-section { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.table-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; }
.filter-row { display: flex; gap: 8px; }
.filter-row select, .filter-row input {
  background: var(--bg); border: 1px solid var(--border);
  color: var(--text); padding: 5px 10px; border-radius: 6px; font-size: 12px;
}
table { width: 100%; border-collapse: collapse; }
th { font-size: 11px; color: var(--muted); text-align: left; padding: 10px 20px; border-bottom: 1px solid var(--border); }
td { padding: 10px 20px; font-size: 13px; border-bottom: 1px solid var(--border); }
tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(255,255,255,0.03); }

.result-badge {
  font-size: 11px; font-weight: 600; padding: 2px 8px;
  border-radius: 4px; display: inline-block;
}
.badge-correct  { background: var(--correct);  color: #000; }
.badge-wrong    { background: var(--wrong);    color: #fff; }
.badge-timeout  { background: var(--timeout);  color: #000; }

.hidden { display: none !important; }
.loading { text-align: center; padding: 60px; color: var(--muted); }
.error   { text-align: center; padding: 40px; color: var(--wrong); }
```

---

## 작업 6: GitHub Actions 배포 설정

`익스텐션_레포/.github/workflows/deploy-dashboard.yml`:

```yaml
name: Deploy Dashboard to GitHub Pages
on:
  push:
    branches: [main]
    paths: ['dashboard/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dashboard
```

---

## 완료 기준
- [ ] `dashboard/index.html` 로컬에서 열었을 때 레이아웃 정상 렌더링
- [ ] GitHub 레포명 입력 후 "불러오기" 클릭 시 제출 데이터 파싱됨
- [ ] 4개 요약 카드 수치 표시됨
- [ ] 3개 Chart.js 차트 렌더링됨
- [ ] 사이트/결과 필터 동작 확인
- [ ] 문제명 검색 동작 확인
- [ ] GitHub Actions workflow 파일 생성됨
