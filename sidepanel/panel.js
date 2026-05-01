const PANEL_STATE_KEY = globalThis.CTL_STORAGE_KEYS?.sidePanelState || 'ctl_side_panel_state';
const RESULT_COLORS = {
  correct: 'var(--correct)',
  wrong: 'var(--wrong)',
  timeout: 'var(--timeout)',
  runtime_error: 'var(--runtime)',
  compile_error: 'var(--compile)',
  memory_exceeded: 'var(--timeout)',
  partial: 'var(--accent)',
  run: 'var(--accent)',
};
const RESULT_LABELS = {
  correct: '정답',
  wrong: '오답',
  timeout: '시간초과',
  runtime_error: '런타임에러',
  compile_error: '컴파일에러',
  memory_exceeded: '메모리초과',
  partial: '부분점수',
  run: '코드실행',
};
const STATUS_TITLES = {
  idle: '대기 중',
  committing: '커밋 중',
  success: '커밋 성공',
  error: '확인 필요',
};

let state = createEmptyState();
let idleTimer = null;

function $(id) {
  return document.getElementById(id);
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyState() {
  return {
    lastCommit: null,
    currentProblem: null,
    todayStats: { date: todayKey(), total: 0, correct: 0, problems: [] },
    history: [],
    processedEventIds: [],
  };
}

function normalizeState(rawState) {
  const next = { ...createEmptyState(), ...(rawState || {}) };
  next.todayStats = {
    date: next.todayStats?.date || todayKey(),
    total: Number(next.todayStats?.total || 0),
    correct: Number(next.todayStats?.correct || 0),
    problems: Array.isArray(next.todayStats?.problems) ? next.todayStats.problems : [],
  };
  if (next.todayStats.date !== todayKey()) {
    next.todayStats = { date: todayKey(), total: 0, correct: 0, problems: [] };
  }
  if (next.currentProblem) {
    next.currentProblem = {
      ...next.currentProblem,
      attempts: Array.isArray(next.currentProblem.attempts) ? next.currentProblem.attempts : [],
      attemptCount: Number(next.currentProblem.attemptCount || 0),
    };
  }
  next.history = Array.isArray(next.history) ? next.history.slice(0, 5) : [];
  next.processedEventIds = Array.isArray(next.processedEventIds) ? next.processedEventIds.slice(-50) : [];
  return next;
}

function render() {
  renderLastCommit();
  renderAttempts();
  renderToday();
  renderHistory();
}

function renderLastCommit() {
  const empty = $('last-commit-empty');
  const card = $('last-commit-card');
  const lastCommit = state.lastCommit;

  if (!lastCommit) {
    empty.classList.remove('hidden');
    card.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  card.classList.remove('hidden');

  const result = lastCommit.result || 'wrong';
  const badge = $('commit-result-badge');
  badge.textContent = RESULT_LABELS[result] || result;
  badge.className = `commit-result-badge badge-${result}`;

  const commitState = $('commit-state');
  const didSucceed = lastCommit.success !== false;
  commitState.textContent = didSucceed ? '커밋 성공' : '커밋 실패';
  commitState.className = `commit-state ${didSucceed ? 'commit-state-success' : 'commit-state-error'}`;
  commitState.title = lastCommit.errorMessage || commitState.textContent;

  $('commit-problem-name').textContent = lastCommit.problemName || '-';
  $('commit-filename').textContent = lastCommit.fileName || '-';
  $('commit-path').textContent = lastCommit.commitPath || '-';
  $('commit-time').textContent = formatTime(lastCommit.timestamp);
}

function renderAttempts() {
  const empty = $('attempts-empty');
  const card = $('attempts-card');
  const currentProblem = state.currentProblem;

  if (!currentProblem) {
    empty.classList.remove('hidden');
    card.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  card.classList.remove('hidden');

  const attempts = Array.isArray(currentProblem.attempts) ? currentProblem.attempts : [];
  const attemptCount = Math.max(Number(currentProblem.attemptCount || 0), attempts.length);
  $('attempts-problem-title').textContent = currentProblem.title || '-';
  $('stat-attempt-count').textContent = attemptCount;

  const elapsed = currentProblem.firstAttemptAt
    ? Math.max(0, Math.floor((Date.now() - currentProblem.firstAttemptAt) / 60000))
    : 0;
  $('stat-elapsed').textContent = elapsed < 60
    ? `${elapsed}분`
    : `${Math.floor(elapsed / 60)}시간 ${elapsed % 60}분`;

  $('stat-wrong-count').textContent = attempts.filter((result) => result !== 'correct').length;

  const timeline = $('attempt-timeline');
  timeline.replaceChildren();
  attempts.forEach((result) => {
    const dot = document.createElement('div');
    dot.className = 'timeline-dot';
    dot.style.background = RESULT_COLORS[result] || 'var(--text-muted)';
    dot.title = RESULT_LABELS[result] || result;
    timeline.appendChild(dot);
  });
}

function renderToday() {
  $('today-total').textContent = state.todayStats.total;
  $('today-correct').textContent = state.todayStats.correct;
  $('today-problems').textContent = state.todayStats.problems.length;
}

function renderHistory() {
  const list = $('history-list');
  list.replaceChildren();

  if (!state.history.length) {
    const item = document.createElement('li');
    item.className = 'empty-state';
    item.textContent = '아직 기록 없음';
    list.appendChild(item);
    return;
  }

  state.history.forEach((historyItem) => {
    const item = document.createElement('li');
    item.className = 'history-item';

    const badge = document.createElement('div');
    badge.className = 'history-badge';
    badge.style.background = historyItem.success === false
      ? 'var(--wrong)'
      : (RESULT_COLORS[historyItem.result] || 'var(--text-muted)');

    const problem = document.createElement('span');
    problem.className = 'history-problem';
    problem.textContent = historyItem.problemName || '-';

    const result = document.createElement('span');
    result.className = 'history-result';
    result.textContent = historyItem.success === false
      ? '실패'
      : (RESULT_LABELS[historyItem.result] || historyItem.result || '-');

    const time = document.createElement('span');
    time.className = 'history-time';
    time.textContent = formatTime(historyItem.timestamp);

    item.append(badge, problem, result, time);
    list.appendChild(item);
  });
}

function formatTime(ts) {
  if (!ts) return '-';
  const date = new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff < 1) return '방금';
  if (diff < 60) return `${diff}분 전`;
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function setStatusDot(status) {
  const dot = $('status-dot');
  dot.className = `status-dot status-${status}`;
  dot.title = STATUS_TITLES[status] || STATUS_TITLES.idle;
}

function flashStatusFromEvent(event) {
  if (!event) return;
  clearTimeout(idleTimer);

  if (event.phase === 'start') {
    setStatusDot('committing');
    return;
  }

  if (event.success === false || event.result !== 'correct') {
    setStatusDot('error');
  } else {
    setStatusDot('success');
  }
  idleTimer = setTimeout(() => setStatusDot('idle'), 3000);
}

function loadState() {
  chrome.storage.local.get([PANEL_STATE_KEY], (data) => {
    state = normalizeState(data[PANEL_STATE_KEY]);
    render();
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message) return;

  if (message.type === 'CTL_COMMIT_EVENT') {
    flashStatusFromEvent(message.payload);
    return;
  }

  if (message.type === 'CTL_PANEL_STATE_UPDATED') {
    state = normalizeState(message.payload?.state);
    render();
    flashStatusFromEvent(message.payload?.event);
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes[PANEL_STATE_KEY]) return;
  state = normalizeState(changes[PANEL_STATE_KEY].newValue);
  render();
});

document.addEventListener('DOMContentLoaded', loadState);
setInterval(renderAttempts, 30000);
