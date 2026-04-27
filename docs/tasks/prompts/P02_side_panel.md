# [P02] Phase 2: Side Panel UI

## 전제 조건
P01 완료 상태. `handleProgrammersResult`가 정상 동작하고 있음.

## 작업 목표
Chrome Side Panel API를 이용해 **커밋 액션 피드백 UI** 구현.
AI 분석 없이, 커밋 성공/실패 알림 + 시도 통계 시각화에 집중.

### Side Panel에서 보여줄 것 (우선순위 순)
1. 가장 최근 커밋 결과 (성공/실패, 파일명, 경로)
2. 현재 문제 시도 현황 (몇 번째 시도인지, 첫 시도부터 경과 시간)
3. 오늘의 제출 요약 (총 N회 제출, 정답 M개)
4. 최근 커밋 이력 (마지막 5건)

### Side Panel에서 보여주지 않을 것 (이 Phase에서)
- AI 분석/피드백 (P07)
- Notion 연동 버튼 (P05)
- 전체 통계 대시보드 (P06)

---

## 작업 1: manifest.json에 Side Panel 권한 추가

```bash
cat manifest.json   # 현재 permissions 확인
```

`manifest.json` 에 추가:
```json
{
  "permissions": [
    "sidePanel"
  ],
  "side_panel": {
    "default_path": "sidepanel/index.html"
  }
}
```

기존 permissions 배열에 `"sidePanel"` 추가 (merge). 덮어쓰지 말 것.

---

## 작업 2: Side Panel 파일 구조 생성

```
sidepanel/
├── index.html
├── panel.js
└── panel.css
```

---

## 작업 3: Side Panel HTML (sidepanel/index.html)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Algolog</title>
  <link rel="stylesheet" href="panel.css">
</head>
<body>
  <!-- 헤더 -->
  <header class="ctl-header">
    <span class="ctl-logo">ALG</span>
    <span class="ctl-title">Algolog</span>
    <span id="status-dot" class="status-dot status-idle" title="대기 중"></span>
  </header>

  <!-- 섹션 1: 최근 커밋 결과 -->
  <section class="panel-section" id="section-last-commit">
    <h3 class="section-title">마지막 커밋</h3>
    <div id="last-commit-empty" class="empty-state">아직 커밋 없음</div>
    <div id="last-commit-card" class="commit-card hidden">
      <div class="commit-result-badge" id="commit-result-badge">-</div>
      <div class="commit-meta">
        <div class="commit-problem" id="commit-problem-name">-</div>
        <div class="commit-filename" id="commit-filename">-</div>
        <div class="commit-path" id="commit-path">-</div>
      </div>
      <div class="commit-time" id="commit-time">-</div>
    </div>
  </section>

  <!-- 섹션 2: 현재 문제 시도 통계 -->
  <section class="panel-section" id="section-attempts">
    <h3 class="section-title">현재 문제</h3>
    <div id="attempts-empty" class="empty-state">문제를 열면 통계가 표시됩니다</div>
    <div id="attempts-card" class="attempts-card hidden">
      <div class="problem-title" id="attempts-problem-title">-</div>
      <div class="attempts-grid">
        <div class="stat-item">
          <span class="stat-value" id="stat-attempt-count">0</span>
          <span class="stat-label">번째 시도</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="stat-elapsed">0분</span>
          <span class="stat-label">경과 시간</span>
        </div>
        <div class="stat-item">
          <span class="stat-value" id="stat-wrong-count">0</span>
          <span class="stat-label">오답 횟수</span>
        </div>
      </div>
      <!-- 미니 타임라인: 시도별 결과 시각화 -->
      <div class="attempt-timeline" id="attempt-timeline"></div>
    </div>
  </section>

  <!-- 섹션 3: 오늘 요약 -->
  <section class="panel-section" id="section-today">
    <h3 class="section-title">오늘</h3>
    <div class="today-grid">
      <div class="stat-item">
        <span class="stat-value" id="today-total">0</span>
        <span class="stat-label">총 제출</span>
      </div>
      <div class="stat-item">
        <span class="stat-value" id="today-correct">0</span>
        <span class="stat-label">정답</span>
      </div>
      <div class="stat-item">
        <span class="stat-value" id="today-problems">0</span>
        <span class="stat-label">해결 문제</span>
      </div>
    </div>
  </section>

  <!-- 섹션 4: 최근 커밋 이력 -->
  <section class="panel-section" id="section-history">
    <h3 class="section-title">최근 기록</h3>
    <ul class="history-list" id="history-list">
      <li class="empty-state">아직 기록 없음</li>
    </ul>
  </section>

  <script src="panel.js"></script>
</body>
</html>
```

---

## 작업 4: Side Panel CSS (sidepanel/panel.css)

다크 테마 기반. 프로그래머스/백준 문제 페이지 위에 얹혀도 눈에 잘 들어오는 디자인.

```css
:root {
  --bg:          #0d1117;
  --surface:     #161b22;
  --surface-2:   #21262d;
  --border:      #30363d;
  --text:        #e6edf3;
  --text-muted:  #8b949e;
  --accent:      #58a6ff;
  --correct:     #3fb950;
  --wrong:       #f85149;
  --timeout:     #d29922;
  --runtime:     #a371f7;
  --compile:     #ff7b72;
  --font:        -apple-system, 'Noto Sans KR', sans-serif;
  --radius:      8px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
  min-width: 280px;
  max-width: 400px;
}

/* 헤더 */
.ctl-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}
.ctl-logo {
  font-weight: 800;
  font-size: 11px;
  background: var(--accent);
  color: #000;
  padding: 2px 6px;
  border-radius: 4px;
}
.ctl-title { font-weight: 600; flex: 1; }
.status-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  transition: background 0.3s;
}
.status-idle      { background: var(--border); }
.status-committing{ background: var(--timeout); animation: pulse 1s infinite; }
.status-success   { background: var(--correct); }
.status-error     { background: var(--wrong); }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

/* 섹션 공통 */
.panel-section {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}

/* 커밋 결과 카드 */
.commit-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: var(--surface-2);
  border-radius: var(--radius);
  padding: 10px 12px;
}
.commit-result-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}
.badge-correct  { background: var(--correct);  color: #000; }
.badge-wrong    { background: var(--wrong);    color: #fff; }
.badge-timeout  { background: var(--timeout);  color: #000; }
.badge-runtime  { background: var(--runtime);  color: #fff; }
.badge-compile  { background: var(--compile);  color: #000; }

.commit-meta { flex: 1; min-width: 0; }
.commit-problem { font-weight: 600; font-size: 13px; }
.commit-filename, .commit-path {
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}
.commit-time { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }

/* 시도 통계 */
.attempts-card {
  background: var(--surface-2);
  border-radius: var(--radius);
  padding: 10px 12px;
}
.problem-title {
  font-weight: 600;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attempts-grid, .today-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.stat-item { text-align: center; }
.stat-value { display: block; font-size: 20px; font-weight: 700; color: var(--accent); }
.stat-label { font-size: 11px; color: var(--text-muted); }

/* 타임라인 */
.attempt-timeline {
  display: flex;
  gap: 4px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.timeline-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  cursor: default;
}

/* 이력 */
.history-list { list-style: none; }
.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
}
.history-item:last-child { border-bottom: none; }
.history-badge {
  width: 6px; height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.history-problem { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.history-time { color: var(--text-muted); font-size: 11px; flex-shrink: 0; }

/* 공통 유틸 */
.hidden { display: none !important; }
.empty-state { color: var(--text-muted); font-size: 12px; text-align: center; padding: 8px 0; }
```

---

## 작업 5: Side Panel JS (sidepanel/panel.js)

```javascript
// sidepanel/panel.js

// 결과 색상 매핑
const RESULT_COLORS = {
  correct:        'var(--correct)',
  wrong:          'var(--wrong)',
  timeout:        'var(--timeout)',
  runtime_error:  'var(--runtime)',
  compile_error:  'var(--compile)',
  memory_exceeded:'var(--timeout)',
  partial:        'var(--accent)',
};
const RESULT_LABEL = {
  correct:        '정답',
  wrong:          '오답',
  timeout:        '시간초과',
  runtime_error:  '런타임에러',
  compile_error:  '컴파일에러',
  memory_exceeded:'메모리초과',
  partial:        '부분점수',
};

// ── 상태 ──────────────────────────────────────────────────────
let state = {
  lastCommit:     null,   // { result, problemName, fileName, commitPath, timestamp }
  currentProblem: null,   // { id, title, site, firstAttemptAt, attempts: [] }
  todayStats:     { total: 0, correct: 0, problems: new Set() },
  history:        [],     // 최근 5건
};

// ── 렌더링 ────────────────────────────────────────────────────
function render() {
  renderLastCommit();
  renderAttempts();
  renderToday();
  renderHistory();
}

function renderLastCommit() {
  const { lastCommit } = state;
  if (!lastCommit) return;

  document.getElementById('last-commit-empty').classList.add('hidden');
  const card = document.getElementById('last-commit-card');
  card.classList.remove('hidden');

  const badge = document.getElementById('commit-result-badge');
  badge.textContent = RESULT_LABEL[lastCommit.result] || lastCommit.result;
  badge.className = `commit-result-badge badge-${lastCommit.result}`;

  document.getElementById('commit-problem-name').textContent = lastCommit.problemName;
  document.getElementById('commit-filename').textContent    = lastCommit.fileName;
  document.getElementById('commit-path').textContent        = lastCommit.commitPath;
  document.getElementById('commit-time').textContent        = formatTime(lastCommit.timestamp);
}

function renderAttempts() {
  const { currentProblem } = state;
  if (!currentProblem) return;

  document.getElementById('attempts-empty').classList.add('hidden');
  const card = document.getElementById('attempts-card');
  card.classList.remove('hidden');

  document.getElementById('attempts-problem-title').textContent = currentProblem.title;
  document.getElementById('stat-attempt-count').textContent     = currentProblem.attempts.length;

  const elapsed = currentProblem.firstAttemptAt
    ? Math.floor((Date.now() - currentProblem.firstAttemptAt) / 60000)
    : 0;
  document.getElementById('stat-elapsed').textContent = elapsed < 60
    ? `${elapsed}분`
    : `${Math.floor(elapsed/60)}시간 ${elapsed%60}분`;

  const wrongCount = currentProblem.attempts.filter(a => a !== 'correct').length;
  document.getElementById('stat-wrong-count').textContent = wrongCount;

  // 타임라인
  const timeline = document.getElementById('attempt-timeline');
  timeline.innerHTML = currentProblem.attempts.map(result =>
    `<div class="timeline-dot" style="background:${RESULT_COLORS[result] || '#8b949e'}"
          title="${RESULT_LABEL[result] || result}"></div>`
  ).join('');
}

function renderToday() {
  document.getElementById('today-total').textContent    = state.todayStats.total;
  document.getElementById('today-correct').textContent  = state.todayStats.correct;
  document.getElementById('today-problems').textContent = state.todayStats.problems.size;
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (state.history.length === 0) return;

  list.innerHTML = state.history.map(h => `
    <li class="history-item">
      <div class="history-badge" style="background:${RESULT_COLORS[h.result]}"></div>
      <span class="history-problem">${h.problemName}</span>
      <span class="history-time">${formatTime(h.timestamp)}</span>
    </li>
  `).join('');
}

// ── 유틸 ──────────────────────────────────────────────────────
function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1)  return '방금';
  if (diff < 60) return `${diff}분 전`;
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function setStatusDot(status) {
  const dot = document.getElementById('status-dot');
  dot.className = `status-dot status-${status}`;
}

// ── 메시지 수신 ────────────────────────────────────────────────
// background.js 또는 content script에서 chrome.runtime.sendMessage로 수신
chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg.type !== 'CTL_COMMIT_EVENT') return;

  const { result, problemId, problemName, site, fileName, commitPath, success } = msg.payload;

  // 상태 업데이트
  const now = Date.now();

  // 마지막 커밋
  state.lastCommit = { result, problemName, fileName, commitPath, timestamp: now };

  // 현재 문제 추적
  if (!state.currentProblem || state.currentProblem.id !== problemId) {
    state.currentProblem = {
      id: problemId,
      title: problemName,
      site,
      firstAttemptAt: now,
      attempts: [],
    };
  }
  state.currentProblem.attempts.push(result);

  // 오늘 통계
  state.todayStats.total++;
  if (result === 'correct') {
    state.todayStats.correct++;
    state.todayStats.problems.add(`${site}_${problemId}`);
  }

  // 이력 (최근 5건)
  state.history.unshift({ result, problemName, timestamp: now });
  if (state.history.length > 5) state.history.pop();

  // 상태 점 업데이트
  setStatusDot(success ? (result === 'correct' ? 'success' : 'error') : 'error');
  setTimeout(() => setStatusDot('idle'), 3000);

  render();
});

// 초기 렌더링
render();
```

---

## 작업 6: background.js에서 Side Panel 열기 + 메시지 전달

`background.js`에서:

```javascript
// 1. 아이콘 클릭 시 Side Panel 열기
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// 2. content script → background → side panel 메시지 릴레이
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CTL_COMMIT_EVENT') {
    // 모든 탭의 Side Panel으로 브로드캐스트
    chrome.runtime.sendMessage(msg).catch(() => {
      // Side Panel이 닫혀있으면 무시
    });
  }
  // 기존 메시지 핸들러는 그대로 유지
});
```

---

## 작업 7: content script에서 커밋 완료 후 메시지 전송

P01에서 작성한 `handleProgrammersResult`에서 커밋 후:

```javascript
// 기존 코드에서 주석 처리했던 notifySidePanel 호출 활성화
chrome.runtime.sendMessage({
  type: 'CTL_COMMIT_EVENT',
  payload: {
    result: ctlResult,
    problemId,
    problemName: title,
    site: '프로그래머스',
    fileName,
    commitPath,
    success: true,  // 커밋 성공 여부
  },
});
```

---

## 완료 기준
- [ ] 아이콘 클릭 시 Side Panel이 열림
- [ ] 프로그래머스에서 제출 후 Side Panel의 "마지막 커밋" 카드 업데이트 확인
- [ ] 같은 문제 3번 시도 시 타임라인에 점 3개 표시
- [ ] 첫 시도부터 경과 시간 카운트 확인
- [ ] 오늘 총 제출 수 / 정답 수 카운트 확인
- [ ] 상태 점(status dot): 커밋 중 주황, 성공 초록, 오답 빨강, 3초 후 회색 복귀
